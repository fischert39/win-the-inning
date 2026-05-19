'use client'

interface Props {
  streak:   { type: 'WIN' | 'LOSS' | null; count: number }
  todayWon: boolean
  isToday:  boolean
}

interface Tier {
  label:   string
  tagline: (count: number) => string
  bg:      string          // gradient / bg class string (for style= or className=)
  textColor:  string
  subColor:   string
  shadow:     string
  glowColor:  string
}

function getTier(count: number): Tier {
  if (count >= 21) return {
    label:     'LEGENDARY',
    tagline:   n => `${n} days straight — you're in another league 🌟`,
    bg:        'linear-gradient(135deg, #9B5DE5 0%, #6A0DAD 50%, #FF6B35 100%)',
    textColor:  '#FFFFFF',
    subColor:   'rgba(255,255,255,0.75)',
    shadow:     '0 8px 32px rgba(155,93,229,0.55)',
    glowColor:  'rgba(155,93,229,0.4)',
  }
  if (count >= 14) return {
    label:     'UNSTOPPABLE',
    tagline:   n => `${n}-day win streak — two full weeks 💎`,
    bg:        'linear-gradient(135deg, #FF6B35 0%, #c04000 100%)',
    textColor:  '#FFFFFF',
    subColor:   'rgba(255,255,255,0.75)',
    shadow:     '0 8px 28px rgba(255,107,53,0.55)',
    glowColor:  'rgba(255,107,53,0.45)',
  }
  if (count >= 7) return {
    label:     'ON FIRE',
    tagline:   n => `${n}-day win streak — a full week of dominance 🏆`,
    bg:        'linear-gradient(135deg, #FF8C42 0%, #FF6B35 60%, #E55A00 100%)',
    textColor:  '#FFFFFF',
    subColor:   'rgba(255,255,255,0.70)',
    shadow:     '0 6px 24px rgba(255,107,53,0.45)',
    glowColor:  'rgba(255,107,53,0.3)',
  }
  if (count >= 3) return {
    label:     'HAT TRICK',
    tagline:   n => `${n}-day win streak — keep the momentum!`,
    bg:        'linear-gradient(135deg, rgba(255,107,53,0.18) 0%, rgba(245,166,35,0.12) 100%)',
    textColor:  '#FF6B35',
    subColor:   '#94a3b8',
    shadow:     'none',
    glowColor:  'transparent',
  }
  return {
    label:     '',
    tagline:   n => `${n}-day win streak — build on it!`,
    bg:        'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(245,166,35,0.07) 100%)',
    textColor:  '#FF6B35',
    subColor:   '#94a3b8',
    shadow:     'none',
    glowColor:  'transparent',
  }
}

export default function StreakBanner({ streak, todayWon, isToday }: Props) {
  if (streak.type !== 'WIN' || streak.count < 1) return null

  const atRisk = isToday && !todayWon
  const count  = streak.count
  const tier   = getTier(count)
  const isBig  = count >= 7

  if (atRisk) {
    // At-risk state: alarming red/amber, urgent copy
    const urgency = count >= 14
      ? `Your ${count}-day streak is on the line! Win TODAY.`
      : count >= 7
      ? `${count}-day streak at risk — don't let it die!`
      : count >= 3
      ? `${count}-day streak — win today to keep it!`
      : `${count}-day streak — win today to keep it going!`

    return (
      <>
        <style>{`
          @keyframes sb-danger-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
            50%      { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
          }
          @keyframes sb-bar-shrink {
            from { width: 100%; }
            to   { width: 15%; }
          }
        `}</style>
        <div
          className="rounded-2xl mb-4 overflow-hidden border-2 border-red-400"
          style={{ background: '#fff7f7', animation: 'sb-danger-pulse 1.6s ease-in-out infinite' }}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="text-4xl leading-none select-none grayscale opacity-50">🔥</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-3xl font-black tabular-nums text-red-500 leading-none">{count}</span>
                <span className="text-sm font-semibold text-red-400">day streak</span>
              </div>
              <p className="text-red-600 text-xs font-bold leading-snug animate-pulse">
                ⚠️ {urgency}
              </p>
            </div>
            <span className="text-2xl select-none">😬</span>
          </div>
          <div className="h-1.5 bg-red-100">
            <div
              className="h-full bg-red-400"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes sb-flicker {
          0%, 100% { transform: scale(1) rotate(-1deg); }
          25%      { transform: scale(1.12) rotate(2deg); }
          50%      { transform: scale(1.05) rotate(-1.5deg); }
          75%      { transform: scale(1.09) rotate(1deg); }
        }
        @keyframes sb-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes sb-label-pop {
          0%   { opacity: 0; transform: scale(0.8) translateY(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        className="rounded-2xl mb-4 overflow-hidden"
        style={{
          background:  tier.bg,
          boxShadow:   tier.shadow,
          border:      isBig ? 'none' : '1px solid rgba(255,107,53,0.2)',
        }}
      >
        <div className="flex items-center gap-4 px-5 py-4">

          {/* Flame */}
          <span
            className="text-5xl leading-none select-none"
            style={{ animation: 'sb-flicker 1.8s ease-in-out infinite' }}
          >
            🔥
          </span>

          {/* Text block */}
          <div className="flex-1 min-w-0">

            {/* Tier label badge (only for Hat Trick+) */}
            {tier.label && (
              <div
                className="inline-flex items-center mb-1"
                style={{ animation: 'sb-label-pop 0.35s ease both' }}
              >
                <span
                  className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: isBig ? 'rgba(255,255,255,0.2)' : 'rgba(255,107,53,0.15)',
                    color:       isBig ? '#ffffff' : '#FF6B35',
                  }}
                >
                  {tier.label}
                </span>
              </div>
            )}

            {/* Count + "day streak" */}
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-black tabular-nums leading-none"
                style={{
                  fontSize:  isBig ? '3rem' : '2.25rem',
                  color:     tier.textColor,
                  filter:    isBig ? 'drop-shadow(0 0 12px rgba(255,255,255,0.3))' : 'none',
                }}
              >
                {count}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: tier.subColor }}
              >
                day streak
              </span>
            </div>

            {/* Tagline */}
            <p
              className="text-xs font-semibold mt-0.5 leading-snug"
              style={{ color: tier.subColor }}
            >
              {todayWon
                ? `✓ Locked in today · ${tier.tagline(count)}`
                : tier.tagline(count)
              }
            </p>
          </div>

          {/* Ghost number watermark for big streaks */}
          {isBig && (
            <span
              className="font-black tabular-nums leading-none select-none"
              style={{
                fontSize: '5rem',
                color: 'rgba(255,255,255,0.12)',
                animation: 'sb-glow-pulse 2.4s ease-in-out infinite',
              }}
            >
              {count}
            </span>
          )}
        </div>

        {/* Milestone glow bar (7+) */}
        {isBig && (
          <div className="h-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        )}
      </div>
    </>
  )
}
