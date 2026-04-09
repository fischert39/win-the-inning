'use client'

import { useEffect, useState } from 'react'

interface Props {
  onDismiss: () => void
  onShare:   () => void
}

export default function WinCelebration({ onDismiss, onShare }: Props) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setFading(true), 2200)
    const t2 = setTimeout(onDismiss, 2800)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [onDismiss])

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    onShare()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-center animate-celebration px-8">
        <div className="text-8xl mb-4 animate-bounce-slow">🏆</div>
        <h2 className="text-4xl font-black text-white mb-2">INNING WIN!</h2>
        <p className="text-brand-orange font-bold text-lg mb-6">All 3 Outs Recorded</p>
        <button
          onClick={handleShare}
          className={`bg-white/10 border border-white/20 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/20 transition-all ${fading ? 'opacity-100' : 'opacity-100'}`}
        >
          📤 Share This Win
        </button>
        <p className="text-white/30 text-xs mt-5">Tap anywhere to continue</p>
      </div>
    </div>
  )
}
