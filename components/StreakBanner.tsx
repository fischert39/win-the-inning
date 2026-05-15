'use client'

interface Props {
  streak:   { type: 'WIN' | 'LOSS' | null; count: number }
  todayWon: boolean
  isToday:  boolean
}

export default function StreakBanner({ streak, todayWon, isToday }: Props) {
  if (streak.type !== 'WIN' || streak.count < 1) return null

  const atRisk = isToday && !todayWon
  const big    = streak.count >= 7

  return (
    <div className={`rounded-2xl mb-4 overflow-hidden transition-all ${
      atRisk
        ? 'bg-amber-50 border-2 border-amber-300'
        : big
          ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-lg shadow-orange-200'
          : 'bg-gradient-to-r from-orange-500/15 to-amber-400/10 border border-orange-200'
    }`}>
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Flame */}
        <span className={`text-5xl leading-none select-none ${
          atRisk ? 'grayscale opacity-40' : 'animate-flicker'
        }`}>
          🔥
        </span>

        {/* Count + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-black tabular-nums leading-none ${
              atRisk ? 'text-amber-600' : big ? 'text-white' : 'text-brand-orange'
            }`}>
              {streak.count}
            </span>
            <span className={`text-sm font-semibold ${
              atRisk ? 'text-amber-700' : big ? 'text-white/80' : 'text-slate-500'
            }`}>
              {streak.count === 1 ? 'day streak' : 'day streak'}
            </span>
          </div>

          {atRisk ? (
            <p className="text-amber-700 text-xs font-bold mt-0.5 animate-pulse">
              ⚡ Win today to keep it alive!
            </p>
          ) : big ? (
            <p className="text-white/70 text-xs font-semibold mt-0.5">
              You're on fire — don't stop now 🏆
            </p>
          ) : todayWon ? (
            <p className={`text-xs font-semibold mt-0.5 text-brand-orange/70`}>
              Streak locked in today ✓
            </p>
          ) : null}
        </div>

        {/* Large count on the right for big streaks */}
        {big && (
          <span className="text-white/20 text-7xl font-black tabular-nums leading-none select-none">
            {streak.count}
          </span>
        )}
      </div>

      {/* At-risk progress bar */}
      {atRisk && (
        <div className="h-1 bg-amber-200">
          <div className="h-full bg-amber-400 animate-pulse" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  )
}
