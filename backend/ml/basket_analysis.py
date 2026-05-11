import pandas as pd
import numpy as np
from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder
import logging

logger = logging.getLogger(__name__)


def run_basket_analysis(transactions, min_support=0.008, min_confidence=0.15, min_lift=1.0):
    """
    Run FP-Growth market basket analysis on list of transactions.
    Each transaction is a list of product_ids.
    Returns association rules sorted by lift descending.
    """
    if len(transactions) < 20:
        logger.warning("Too few transactions for meaningful analysis")
        return []

    try:
        te = TransactionEncoder()
        te_array = te.fit_transform(transactions)
        df = pd.DataFrame(te_array, columns=te.columns_)

        itemsets = fpgrowth(df, min_support=min_support, use_colnames=True, max_len=3)
        if itemsets.empty:
            return []

        rules = association_rules(itemsets, metric="confidence", min_threshold=min_confidence)
        rules = rules[rules["lift"] >= min_lift].copy()

        result = []
        for _, row in rules.iterrows():
            lift = float(row["lift"])
            conf = float(row["confidence"])
            result.append({
                "if_buy":     list(row["antecedents"]),
                "also_buy":   list(row["consequents"]),
                "support":    round(float(row["support"]), 4),
                "confidence": round(conf, 4),
                "lift":       round(lift, 4),
                "strength":   (
                    "STRONG" if lift >= 2.5 and conf >= 0.45 else
                    "MEDIUM" if lift >= 1.5 and conf >= 0.25 else
                    "WEAK"
                )
            })

        return sorted(result, key=lambda x: x["lift"], reverse=True)

    except Exception as e:
        logger.error(f"Basket analysis error: {e}")
        return []


def build_affinity_matrix(product_ids, rules):
    """
    Build product_id → {other_product_id: lift} affinity map.
    Used by placement optimizer to score zone fit.
    """
    matrix = {pid: {} for pid in product_ids}
    for rule in rules:
        for a in rule["if_buy"]:
            for b in rule["also_buy"]:
                if a in matrix:
                    matrix[a][b] = max(matrix[a].get(b, 0), rule["lift"])
                if b in matrix:
                    matrix[b][a] = max(matrix[b].get(a, 0), rule["lift"])
    return matrix
