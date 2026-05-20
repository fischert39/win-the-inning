'use client'

import { useMemo } from 'react'
import type { FullSeason } from '@/types'

interface Props {
  season:  FullSeason
  onClose: () => void
}

// Gold/white/orange confetti for a ceremonial feel
const COLORS = ['#FF6B35', '#F5A623', '#FFD700', '#FFFFFF', '#2DC653', '#00B4D8']
const COUNT  = 48

export default function SeasonCeremony({ season, onClose }: Props) {
  const goals = season.season_goals ?? []

  const pieces = useMemo(() => {
    const phi = 1.6180339887
    return Array.from({ length: COUNT }, (_, i) => ({
      id:       i,
      color:    COLORS[i % COLORS.length],
      left:     (i * phi * 100) % 100,
      delay:    (i * 0.05) % 2.0,
      duration: 2.8 + (i % 5) * 0.35,
      size:     5 + (i % 4) * 2,
      rotate:   (i * 61) % 360,
      isCircle: i % 6 === 0,
    }))
  }, [])

  return (
    <>
      <style>{`
        @keyframes sc-fall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          80%  { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(110vh) rotate(600deg); }
        }
        @keyframes sc-in {
          0%   { opacity: 0; transform: scale(0.85) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes sc-badge {
          0%   { opacity: 0; transform: scale(0.6); }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sc-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,107,53,0.5); }
          50%      { text-shadow: 0 0 40px rgba(255,107,53,0.9), 0 0 80px rgba(255,107,53,0.4); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1A1A2E 0%, #0D0D1E 60%, #0f1f0f 100%)' }}
      >
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {pieces.map(p => (
            <div
              key={p.id}
              style={{
                position:        'absolute',
                top:             '-20px',
                left:            `${p.left}%`,
                width:           `${p.size}px`,
                height:          p.isCircle ? `${p.size}px` : `${Math.round(p.size * 0.4)}px`,
                backgroundColor: p.color,
                borderRadius:    p.isCircle ? '50%' : '2px',
                animation:       `sc-fall ${p.duration}s ${p.delay}s ease-in forwards`,
                transform:       `rotate(${p.rotate}deg)`,
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="relative z-10 max-w-sm w-full text-center"
          style={{ animation: 'sc-in 0.5s 0.1s cubic-bezier(0.34,1.2,0.64,1) both' }}
        >
          {/* Sport badge */}
          <div
            className="inline-flex items-center gap-2 bg-brand-orange/20 border border-brand-orange/30 text-brand-orange text-xs font-black px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest"
            style={{ animation: 'sc-badge 0.5s 0.3s both' }}
          >
            ⚾ New Season Begins
          </div>

          {/* Trophy */}
          <div className="text-7xl mb-4 leading-none select-none"
            style={{ animation: 'sc-in 0.5s 0.2s both' }}
          >
            🏆
          </div>

          {/* Headline */}
          <h1
            className="text-white font-black text-4xl leading-tight mb-2"
            style={{ animation: 'sc-glow 2.5s 0.8s ease-in-out infinite' }}
          >
            Season Begins.
          </h1>
          <p className="text-white/50 text-sm mb-6" style={{ animation: 'sc-in 0.4s 0.5s both' }}>
            Every champion starts somewhere.<br />This is your somewhere.
          </p>

          {/* Success definition */}
          {season.success_definition && (
            <div
              className="bg-white/8 border border-white/10 rounded-2xl px-5 py-4 mb-4 text-left"
              style={{ animation: 'sc-in 0.4s 0.6s both' }}
            >
              <p className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-1.5">🎯 Win Condition</p>
              <p className="text-white font-semibold text-sm leading-snug">{season.success_definition}</p>
            </div>
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <div
              className="bg-white/8 border border-white/10 rounded-2xl px-5 py-4 mb-6 text-left"
              style={{ animation: 'sc-in 0.4s 0.7s both' }}
            >
              <p className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-3">Season Goals</p>
              <ul className="space-y-2">
                {goals.map((g, i) => (
                  <li key={g.id ?? i} className="flex items-start gap-2.5 text-sm text-white">
                    <span className="text-brand-orange mt-0.5 flex-shrink-0 text-xs">◆</span>
                    <span className="leading-snug">{g.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onClose}
            className="w-full bg-brand-orange text-white font-black text-lg py-4 rounded-2xl hover:bg-brand-orange-dark transition-colors active:scale-[0.98]"
            style={{
              animation:  'sc-in 0.4s 0.8s both',
              boxShadow: '0 8px 32px rgba(255,107,53,0.4)',
            }}
          >
            Play Ball! ⚾
          </button>
        </div>
      </div>
    </>
  )
}
