import './globals.css'
import ToastContainer from '@/components/Toast'

export const metadata = {
  title: 'DukanAI — Smart Store Optimizer',
  description: 'ML-powered retail placement & sales intelligence',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
