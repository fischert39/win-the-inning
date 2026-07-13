import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'Win the Inning, Win the Day',
  description: 'A habit system built on structure, belief, and accountability — wrapped in the framework of a baseball/softball season. Each day is an inning. Win enough and you win the season.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Win the Inning',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D1B2A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={jakarta.variable + ' font-sans'}>
        {/* Anti-flash: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                if (localStorage.getItem('wti_theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
              try {
                var p = localStorage.getItem('wti_palette');
                if (p) {
                  var c = JSON.parse(p);
                  var s = document.documentElement.style;
                  if (c.p)  s.setProperty('--brand-primary',      c.p);
                  if (c.pd) s.setProperty('--brand-primary-dark', c.pd);
                  if (c.n)  s.setProperty('--brand-navy',         c.n);
                  if (c.nl) s.setProperty('--brand-navy-light',   c.nl);
                }
              } catch(e) {}
            })();
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `
        }} />
        {children}
      </body>
    </html>
  )
}
