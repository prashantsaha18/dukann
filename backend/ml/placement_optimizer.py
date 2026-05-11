import numpy as np
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class ProductMetrics:
    product_id: str
    name: str
    category: str
    price: float
    cost: float
    daily_velocity: float
    total_sold: int
    shelf_life_days: int

@dataclass
class ZoneInfo:
    zone_id: str
    name: str
    zone_type: str
    visibility_score: int
    capacity: int
    current_products: List[str]

@dataclass
class PlacementScore:
    product_id: str
    zone_id: str
    total_score: float
    velocity_score: float
    margin_score: float
    affinity_score: float
    shelf_life_score: float
    reason: str


# Natural category ↔ zone type bonuses (0-8 pts)
CATEGORY_ZONE_BONUS = {
    ("Dairy",      "cold"):         6,
    ("Frozen",     "cold"):         8,
    ("Beverages",  "cold"):         5,
    ("Beverages",  "checkout"):     4,
    ("Chocolate",  "checkout"):     6,
    ("Snacks",     "checkout"):     5,
    ("Bakery",     "eye_level"):    4,
    ("Bakery",     "high_traffic"): 3,
    ("Staples",    "bulk"):         5,
    ("Personal",   "eye_level"):    3,
    ("Household",  "eye_level"):    2,
    ("Organic",    "eye_level"):    4,
    ("Snacks",     "eye_level"):    3,
    ("Chocolate",  "eye_level"):    4,
    ("Beverages",  "high_traffic"): 3,
    ("Organic",    "high_traffic"): 2,
}


def compute_placement_scores(
    products: List[ProductMetrics],
    zones: List[ZoneInfo],
    affinity_matrix: Dict[str, Dict[str, float]]
) -> List[PlacementScore]:
    """
    Score every (product, zone) pair from 0-100.

    Factor weights:
      Velocity      40%  — fast sellers → high-visibility zones
      Margin        25%  — high-margin → prime spots
      Affinity      20%  — basket-correlated with zone neighbors
      Shelf Life    10%  — perishables → visible zones
      Category Fit   5%  — natural zone-category match bonus
    """
    if not products or not zones:
        return []

    max_vel    = max((p.daily_velocity for p in products), default=1) or 1
    max_margin = max(
        ((p.price - p.cost) / p.price for p in products if p.price > 0),
        default=0.01
    ) or 0.01

    scores = []

    for p in products:
        for z in zones:
            # 1. Velocity score (0-40)
            vel_score = (p.daily_velocity / max_vel) * 40

            # 2. Margin score (0-25)
            margin     = (p.price - p.cost) / p.price if p.price > 0 else 0
            mar_score  = (margin / max_margin) * 25

            # 3. Basket affinity score (0-20)
            neighbors = [ep for ep in z.current_products if ep != p.product_id]
            if neighbors:
                p_aff = affinity_matrix.get(p.product_id, {})
                lifts = [p_aff.get(ep, 1.0) for ep in neighbors]
                avg_lift   = np.mean(lifts)
                aff_score  = min((avg_lift - 1) / 4.0, 1.0) * 20
            else:
                aff_score  = 10   # neutral — empty zone

            # 4. Shelf-life urgency score (0-10)
            if z.visibility_score >= 7:
                # High-vis zone: perishables desperately need it
                if p.shelf_life_days <= 7:
                    sl_score = 10
                elif p.shelf_life_days <= 30:
                    sl_score = 7
                elif p.shelf_life_days <= 90:
                    sl_score = 4
                else:
                    sl_score = 1
            else:
                # Low-vis zone is fine for long shelf-life items
                if p.shelf_life_days >= 180:
                    sl_score = 8
                elif p.shelf_life_days >= 30:
                    sl_score = 5
                else:
                    sl_score = 1    # perishable in low-vis = bad

            # 5. Category-zone fit bonus (0-8)
            bonus = CATEGORY_ZONE_BONUS.get((p.category, z.zone_type), 0)

            total = round(min(100.0, vel_score + mar_score + aff_score + sl_score + bonus), 2)

            # Build human-readable reason
            parts = []
            if vel_score >= 28:
                parts.append(f"bestseller ({p.daily_velocity:.1f} units/day)")
            elif vel_score >= 15:
                parts.append("good seller")
            if mar_score >= 18:
                parts.append(f"high margin ({margin*100:.0f}%)")
            if aff_score >= 14:
                parts.append("strong basket affinity with zone neighbors")
            if sl_score >= 8 and p.shelf_life_days <= 30:
                parts.append("perishable — urgently needs visibility")
            if bonus >= 4:
                parts.append(f"ideal zone type for {p.category}")
            if z.zone_type == "checkout":
                parts.append("impulse-buy location")
            if not parts:
                parts.append("balanced multi-factor score")

            scores.append(PlacementScore(
                product_id     = p.product_id,
                zone_id        = z.zone_id,
                total_score    = total,
                velocity_score = round(vel_score, 2),
                margin_score   = round(mar_score, 2),
                affinity_score = round(aff_score, 2),
                shelf_life_score = round(sl_score, 2),
                reason         = "Place here: " + ", ".join(parts),
            ))

    return sorted(scores, key=lambda x: x.total_score, reverse=True)


def get_top_recommendations(
    scores: List[PlacementScore],
    zones: List[ZoneInfo],
    per_zone: int = 5
) -> Dict[str, List[PlacementScore]]:
    """
    Greedily assign each product to its single best zone.
    No product appears in more than one zone's recommendations.
    """
    recs     = {z.zone_id: [] for z in zones}
    capacity = {z.zone_id: z.capacity for z in zones}
    assigned = set()

    for s in scores:
        if s.product_id in assigned:
            continue
        cap = min(per_zone, capacity.get(s.zone_id, per_zone))
        if len(recs[s.zone_id]) < cap:
            recs[s.zone_id].append(s)
            assigned.add(s.product_id)

    return recs
