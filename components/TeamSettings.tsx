'use client'

import { useState, useEffect } from 'react'

export const MASCOTS = [
  { emoji: '🦅', name: 'Eagles' },
  { emoji: '🐻', name: 'Bears' },
  { emoji: '🦁', name: 'Lions' },
  { emoji: '🐯', name: 'Tigers' },
  { emoji: '🐺', name: 'Wolves' },
  { emoji: '🦈', name: 'Sharks' },
  { emoji: '🔥', name: 'Flames' },
  { emoji: '⚡', name: 'Thunder' },
  { emoji: '💎', name: 'Diamonds' },
  { emoji: '🚀', name: 'Rockets' },
  { emoji: '⚔️', name: 'Warriors' },
  { emoji: '🛡️', name: 'Knights' },
]

interface Props {
  currentTeamName:      string | null
  currentMascot:        string | null
  currentAutoCarry:     boolean
  currentDiscoverable:  boolean
  currentPublicEmail:   string | null
  onSave:               (teamName: string, mascot: string, autoCarry: boolean, discoverable: boolean, publicEmail: string) => Promise<void>
  onClose:              () => void
}

export default function TeamSettings({
  currentTeamName, currentMascot, currentAutoCarry,
  currentDiscoverable, currentPublicEmail, onSave, onClose,
}: Props) {
  const [teamName,      setTeamName]      = useState(currentTeamName ?? '')
  const [mascot,        setMascot]        = useState(currentMascot ?? MASCOTS[0].emoji)
  const [autoCarry,     setAutoCarry]     = useState(currentAutoCarry)
  const [discoverable,  setDiscoverable]  = useState(currentDiscoverable)
  const [publicEmail,   setPublicEmail]   = useState(currentPublicEmail ?? '')
  const [saving,        setSaving]        = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(teamName.trim(), mascot, autoCarry, discoverable, publicEmail.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-black text-brand-navy text-lg mb-4">🏟️ Your Team</h2>

        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
          Team Name
        </label>
        <input
          type="text"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          placeholder="e.g. The Thunder Hawks"
          maxLength={30}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-brand-navy mb-5 outline-none focus:border-brand-orange"
        />

        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Mascot
        </label>
        <div className="grid grid-cols-6 gap-2 mb-5">
          {MASCOTS.map(m => (
            <button
              key={m.emoji}
              onClick={() => setMascot(m.emoji)}
              title={m.name}
              className={`flex items-center justify-center p-2.5 rounded-xl border-2 transition-all ${
                mascot === m.emoji
                  ? 'border-brand-orange bg-brand-orange/5'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
            </button>
          ))}
        </div>

        {/* Auto-carry toggle */}
        <Toggle
          icon="🔄"
          title="Auto-carry incomplete tasks"
          desc="Unfinished goals roll to the next day"
          active={autoCarry}
          onToggle={() => setAutoCarry(v => !v)}
          color="orange"
          className="mb-3"
        />

        {/* Discoverable toggle */}
        <Toggle
          icon="🔍"
          title="Make me findable"
          desc="Others can search for you by name or email"
          active={discoverable}
          onToggle={() => setDiscoverable(v => !v)}
          color="teal"
          className="mb-3"
        />

        {/* Public email for search */}
        {discoverable && (
          <div className="mb-5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
              Email for search <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={publicEmail}
              onChange={e => setPublicEmail(e.target.value)}
              placeholder="e.g. coach@email.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-brand-navy outline-none focus:border-brand-orange"
            />
            <p className="text-slate-400 text-xs mt-1.5">Only used so teammates can find you — never shown publicly.</p>
          </div>
        )}

        {/* Push notifications toggle */}
        <NotificationToggle />

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== NOTIFICATION TOGGLE =====

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function NotificationToggle() {
  const [permission,   setPermission]   = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribed,   setSubscribed]   = useState(false)
  const [loading,      setLoading]      = useState(false)
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  // Not available in this browser or VAPID key not configured
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && !!vapidKey

  useEffect(() => {
    if (!supported) return
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    )
  }, [supported])

  async function toggle() {
    if (!supported || loading) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        // Unsubscribe
        await existing.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        })
        setSubscribed(false)
      } else {
        // Request permission then subscribe
        const perm = await Notification.requestPermission()
        setPermission(perm)
        if (perm !== 'granted') return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!),
        })

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        })
        if (res.ok) setSubscribed(true)
      }
    } catch {
      // Permission denied or subscription failed — state already reflects reality
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  const denied = permission === 'denied'
  const desc = denied
    ? 'Blocked — enable in your browser settings'
    : subscribed
      ? 'Daily 9 AM reminder is active'
      : 'Get a daily nudge to win your inning'

  return (
    <button
      onClick={toggle}
      disabled={denied || loading}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left mb-3 ${
        denied
          ? 'border-slate-100 opacity-50 cursor-not-allowed'
          : subscribed
            ? 'border-brand-orange bg-brand-orange/5'
            : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      <span className="text-xl flex-shrink-0">{loading ? '⏳' : '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-brand-navy font-bold text-sm">Daily reminders</p>
        <p className="text-slate-400 text-xs">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        subscribed ? 'border-brand-orange bg-brand-orange' : 'border-slate-300'
      }`}>
        {subscribed && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  )
}

// ===== SHARED TOGGLE COMPONENT =====

function Toggle({ icon, title, desc, active, onToggle, color, className = '' }: {
  icon:       string
  title:      string
  desc:       string
  active:     boolean
  onToggle:   () => void
  color:      'orange' | 'teal'
  className?: string
}) {
  const ring = color === 'teal'
    ? active ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-slate-200'
    : active ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-100 hover:border-slate-200'
  const dot = color === 'teal'
    ? active ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
    : active ? 'border-brand-orange bg-brand-orange' : 'border-slate-300'

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${ring} ${className}`}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-brand-navy font-bold text-sm">{title}</p>
        <p className="text-slate-400 text-xs">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${dot}`}>
        {active && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  )
}
