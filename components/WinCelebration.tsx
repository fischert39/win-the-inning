'use client'

import { useEffect } from 'react'

interface Props {
  onDismiss: () => void
}

export default function WinCelebration({ onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2800)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-center animate-celebration px-8">
        <div className="text-8xl mb-4 animate-bounce-slow">🏆</div>
        <h2 className="text-4xl font-black text-white mb-2">INNING WIN!</h2>
        <p className="text-brand-orange font-bold text-lg mb-1">All 3 Outs Recorded</p>
        <p className="text-white/40 text-sm mt-6">Tap anywhere to continue</p>
      </div>
    </div>
  )
}
