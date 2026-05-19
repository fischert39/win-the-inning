'use client'

import { useMemo } from 'react'

interface Props {
  runs:      number
  streak:    number   // 0 = no active streak, 1+ = streak count (post-win)
  onDismiss: () => void
  onShare:   () => void
}

const CONFETTI_COLORS = [
  '#FF6B35', '#F5A623', '#FFD700',
  '#2DC653', '#00B4D8', '#9B5DE5',
  '#FFFFFF', '#FF4757',
]

const PIECE_COUNT = 72

interface ConfettiPiece {
  id:       number
  color:    string
  left:     number   // percent
  delay:    number   // seconds
  duration: number   // seconds
  size:     number   // px
  rotate:   number   // degrees
  drift:    number   // px horizontal drift
  isCircle: boolean
}

function useConfetti(): ConfettiPiece[] {
  return useMemo(() => {
    // Golden-ratio spread so pieces don't cluster
    const phi = 1.6180339887
    return Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id:       i,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left:     ((i * phi * 100) % 100),
      delay:    (i * 0.038) % 1.6,
      duration: 2.0 + (i % 7) * 0.28,
      size:     6 + (i % 5) * 2,
      rotate:   (i * 53) % 360,
      drift:    ((i % 9) - 4) * 14,
      isCircle: i % 5 === 0,
    }))
  }, [])
}

function streakMessage(count: number): string | null {
  if (count <= 0) return null
  if (count >= 21) return `🌟 ${count}-day streak — LEGENDARY!`
  if (count >= 14) return `💎 ${count}-day streak — Unstoppable!`
  if (count >= 7)  return `🔥 ${count}-day streak — You're on fire!`
  if (count >= 3)  return `🔥 ${count}-day streak — Don't stop now!`
  if (count === 2) return `🔥 2-day streak — Build on it!`
  return null
}

export default function WinCelebration({ runs, streak, onDismiss, onShare }: Props) {
  const pieces = useConfetti()

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    onShare()
  }

  function handleContinue(e: React.MouseEvent) {
    e.stopPropagation()
    onDismiss()
  }

  const streakMsg  = streakMessage(streak)
  const scoreLine  = runs === 1 ? '1 run scored!' : runs > 1 ? `${runs} runs scored!` : null
  const shutoutMsg = runs === 0 ? "Shut 'em out — 3 outs recorded!" : null

  return (
    <>
      {/* ── Inline keyframes (self-contained, no global CSS needed) ── */}
      <style>{`
        @keyframes wc-confetti-fall {
          0%   { opacity: 1; transform: var(--wc-start-transform); }
          85%  { opacity: 0.9; }
          100% { opacity: 0; transform: var(--wc-end-transform); }
        }
        @keyframes wc-trophy {
          0%   { transform: scale(0.4) rotate(-15deg); opacity: 0; }
          55%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
          75%  { transform: scale(0.95) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes wc-trophy-idle {
          0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
          40%      { transform: translateY(-18px) rotate(4deg) scale(1.08); }
          70%      { transform: translateY(-6px) rotate(-2deg) scale(1.04); }
        }
        @keyframes wc-title {
          0%   { opacity: 0; transform: scale(0.7) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes wc-glow {
          0%, 100% { text-shadow: 0 0 18px rgba(255,107,53,0.7), 0 0 36px rgba(255,107,53,0.3); }
          50%      { text-shadow: 0 0 36px rgba(255,107,53,1),   0 0 72px rgba(255,107,53,0.5); }
        }
        @keyframes wc-score-pop {
          0%   { opacity: 0; transform: scale(0.2) rotate(-12deg); }
          65%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes wc-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wc-streak-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(255,107,53,0); }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1A1A2E 0%, #0D0D1E 55%, #1f0d0a 100%)' }}
        onClick={onDismiss}
      >
        {/* ── Confetti rain ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {pieces.map(p => (
            <div
              key={p.id}
              style={{
                position:  'absolute',
                top:       '-24px',
                left:      `${p.left}%`,
                width:     `${p.size}px`,
                height:    p.isCircle ? `${p.size}px` : `${Math.round(p.size * 0.42)}px`,
                backgroundColor: p.color,
                borderRadius: p.isCircle ? '50%' : '2px',
                '--wc-start-transform': `rotate(${p.rotate}deg) translateX(${p.drift}px)`,
                '--wc-end-transform':   `translateY(110vh) rotate(${p.rotate + 520}deg) translateX(${p.drift * 1.5}px)`,
                animation:  `wc-confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* ── Content card ── */}
        <div
          className="relative z-10 text-center px-8 max-w-xs w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Trophy */}
          <div
            className="text-9xl mb-3 select-none leading-none"
            style={{ animation: 'wc-trophy 0.7s cubic-bezier(0.34,1.4,0.64,1) both, wc-trophy-idle 1.6s 0.9s ease-in-out infinite' }}
          >
            🏆
          </div>

          {/* INNING WIN! */}
          <h1
            className="text-5xl font-black text-white tracking-tight mb-2 leading-none"
            style={{ animation: 'wc-title 0.45s 0.15s ease both, wc-glow 2.4s 0.8s ease-in-out infinite' }}
          >
            INNING WIN!
          </h1>

          {/* Score */}
          {scoreLine && (
            <div
              className="mb-1"
              style={{ animation: 'wc-score-pop 0.55s 0.35s cubic-bezier(0.34,1.5,0.64,1) both' }}
            >
              <span
                className="text-6xl font-black tabular-nums leading-tight"
                style={{ color: '#FF6B35', filter: 'drop-shadow(0 0 22px rgba(255,107,53,0.65))' }}
              >
                {runs}
              </span>
              <span className="text-xl font-bold text-white/50 ml-2 align-bottom mb-1 inline-block">
                {runs === 1 ? 'run' : 'runs'}
              </span>
            </div>
          )}

          {shutoutMsg && (
            <p
              className="text-brand-orange font-bold text-base mb-2"
              style={{ animation: 'wc-slide-up 0.4s 0.3s both' }}
            >
              {shutoutMsg}
            </p>
          )}

          {/* Streak callout */}
          {streakMsg && (
            <div
              className="bg-white/10 rounded-2xl px-4 py-2.5 mt-3 mb-1 backdrop-blur-sm"
              style={{
                animation: 'wc-slide-up 0.4s 0.55s both, wc-streak-pulse 2s 1.2s ease-in-out infinite',
                border: '1px solid rgba(255,107,53,0.3)',
              }}
            >
              <p className="text-white font-bold text-sm leading-snug">{streakMsg}</p>
            </div>
          )}

          {/* Spacer if no streak */}
          {!streakMsg && <div className="mt-3" />}

          {/* Buttons */}
          <div
            className="mt-5 space-y-3"
            style={{ animation: 'wc-slide-up 0.4s 0.75s both' }}
          >
            <button
              onClick={handleShare}
              className="w-full bg-brand-orange text-white font-black text-base py-4 rounded-2xl shadow-lg transition-colors hover:bg-brand-orange-dark active:scale-95"
              style={{ boxShadow: '0 8px 24px rgba(255,107,53,0.4)' }}
            >
              📤 Share This Win
            </button>
            <button
              onClick={handleContinue}
              className="w-full bg-white/10 text-white/70 font-semibold text-sm py-3 rounded-2xl hover:bg-white/15 transition-colors active:scale-95 border border-white/10"
            >
              Continue →
            </button>
          </div>

          <p
            className="text-white/20 text-xs mt-4"
            style={{ animation: 'wc-slide-up 0.4s 1s both' }}
          >
            Tap background to dismiss
          </p>
        </div>
      </div>
    </>
  )
}
