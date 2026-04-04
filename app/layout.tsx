import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Win the Inning, Win the Day',
  description: 'Turn your big goals into daily micro-wins using the psychology of baseball.',
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
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={inter.className}>
        {/* Anti-flash: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                if (localStorage.getItem('wti_theme') === 'dark') {
                  document.documentElement.classList.add('dark');
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
