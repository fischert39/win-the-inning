'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'wti_notif_prompt'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

type Mode = 'hidden' | 'ask' | 'install'

/**
 * One-time invitation to turn on the daily reminder, shown on the Today tab
 * once the player has closed an inning. On an iPhone/iPad that hasn't added
 * the app to the home screen, reminders can't work yet — so it explains how.
 */
export default function NotificationPrompt() {
  const [mode,    setMode]    = useState<Mode>('hidden')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch { return }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true

    if (isIOS && !standalone) { setMode('install'); return }
    if (!vapidKey || !('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'default') setMode('ask')
  }, [vapidKey])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setMode('hidden')
  }

  async function enable() {
    setLoading(true)
    setError(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { dismiss(); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      })
      if (!res.ok) throw new Error('save failed')
      dismiss()
    } catch {
      setError("Couldn't turn reminders on. You can try again from Profile & Settings.")
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'hidden') return null

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">🔔</span>
        <div className="min-w-0">
          <p className="font-black text-ink text-base">Want a daily reminder?</p>
          {mode === 'ask' ? (
            <p className="text-slate-500 text-sm mt-1 leading-snug">
              One nudge each morning to set your goals — nothing else. You can turn it off any time in Profile &amp; Settings.
            </p>
          ) : (
            <div className="text-slate-500 text-sm mt-1 leading-snug space-y-1">
              <p>On iPhone, reminders work once the app is on your home screen:</p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>Tap the <strong className="text-slate-600">Share</strong> button in Safari.</li>
                <li>Choose <strong className="text-slate-600">Add to Home Screen</strong>.</li>
                <li>Open Win the Inning from your home screen and turn reminders on in Profile &amp; Settings.</li>
              </ol>
            </div>
          )}
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={dismiss}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
        >
          {mode === 'ask' ? 'Not now' : 'Got it'}
        </button>
        {mode === 'ask' && (
          <button
            onClick={enable}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-60"
          >
            {loading ? 'Turning on…' : 'Turn on reminders'}
          </button>
        )}
      </div>
    </div>
  )
}
