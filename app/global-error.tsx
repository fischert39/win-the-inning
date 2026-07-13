'use client'

// Catches errors in the root layout itself, so it must render its own <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#16213E', color: '#fff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif', textAlign: 'center', padding: 24,
      }}>
        <div style={{ maxWidth: 340 }}>
          <p style={{ fontSize: 44, margin: '0 0 12px' }}>🌧️</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>Rain delay</h1>
          <p style={{ fontSize: 14, opacity: 0.65, margin: '0 0 20px' }}>
            Something went wrong on our end. Your data is safe — give it another swing.
          </p>
          <button
            onClick={reset}
            style={{
              width: '100%', padding: '14px 0', background: '#FF6B35', color: '#fff',
              fontWeight: 900, fontSize: 14, border: 'none', borderRadius: 12, cursor: 'pointer',
            }}
          >
            Resume play
          </button>
        </div>
      </body>
    </html>
  )
}
