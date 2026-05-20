'use client'

interface MissedSummary {
  days:   number
  wins:   number
  losses: number
  ties:   number
}

interface Props {
  summary:   MissedSummary
  onClose:   () => void
  onReview?: () => void
}

export default function WelcomeBack({ summary, onClose, onReview }: Props) {
  const { days, wins, losses, ties } = summary
  const total = wins + losses + ties

  const headline =
    days === 1 ? 'One day off. Back in the box.' :
    wins > losses
      ? `${days} days away — and still winning.`
      : wins > 0
        ? `Back in the dugout after ${days} days.`
        : `${days} days off the field. Time to make up ground.`

  const sub =
    total > 0
      ? wins > losses
        ? `${wins} of ${total} auto-closed innings came in as wins. Not bad.`
        : wins > 0
          ? `${total} innings auto-closed while you were away.`
          : `${total} innings auto-closed as losses. Get back in the game.`
      : "Your season is still running. Pick up where you left off."

  const cta = wins > losses ? 'Back in the Game →' : 'Get Back in the Game →'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-brand-navy rounded-2xl w-full max-w-sm p-6 animate-slide-up border border-white/10">

        <div className="text-4xl mb-3">⚾</div>
        <h2 className="text-white font-black text-xl mb-1">{headline}</h2>
        <p className="text-white/50 text-sm mb-5">{sub}</p>

        {total > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-brand-green/15 rounded-xl p-3 text-center border border-brand-green/20">
              <p className="text-2xl font-black text-brand-green">{wins}</p>
              <p className="text-[10px] font-black text-brand-green/70 uppercase tracking-wide mt-0.5">Wins</p>
            </div>
            <div className="bg-brand-red/15 rounded-xl p-3 text-center border border-brand-red/20">
              <p className="text-2xl font-black text-brand-red">{losses}</p>
              <p className="text-[10px] font-black text-brand-red/70 uppercase tracking-wide mt-0.5">Losses</p>
            </div>
            <div className="bg-yellow-500/15 rounded-xl p-3 text-center border border-yellow-500/20">
              <p className="text-2xl font-black text-yellow-400">{ties}</p>
              <p className="text-[10px] font-black text-yellow-400/70 uppercase tracking-wide mt-0.5">Ties</p>
            </div>
          </div>
        )}

        <p className="text-xs text-white/30 mb-5">
          Swipe back to any missed date to re-open, edit, and close it.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-brand-orange text-white font-black py-3.5 rounded-xl text-sm hover:bg-brand-orange-dark transition-colors active:scale-[0.98] shadow-sm shadow-brand-orange/30"
        >
          {cta}
        </button>

        {onReview && total > 0 && (
          <button
            onClick={onReview}
            className="w-full text-white/30 text-sm py-2.5 mt-1 hover:text-white/60 transition-colors"
          >
            Review missed innings →
          </button>
        )}
      </div>
    </div>
  )
}
