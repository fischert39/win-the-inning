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

  const headline = wins > losses
    ? `Not bad — even while away, ${wins} innings closed as wins.`
    : wins > 0
      ? `You missed ${days} days. Some innings auto-closed.`
      : `You missed ${days} days. Innings auto-closed as losses.`

  const cta = wins > losses ? 'Pick Up Where You Left Off' : 'Get Back in the Game'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">

        <div className="text-4xl mb-3">👋</div>
        <h2 className="text-brand-navy font-black text-xl mb-1">Welcome back!</h2>
        <p className="text-slate-500 text-sm mb-5">{headline}</p>

        {total > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-2xl font-black text-green-700">{wins}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mt-0.5">Wins</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <p className="text-2xl font-black text-red-600">{losses}</p>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mt-0.5">Losses</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
              <p className="text-2xl font-black text-yellow-700">{ties}</p>
              <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide mt-0.5">Ties</p>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-5">
          You can re-open any of those innings, make edits, and close them again — just swipe back to the date.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-brand-orange text-white font-black py-3.5 rounded-xl text-sm hover:bg-brand-orange-dark transition-colors"
        >
          {cta} →
        </button>

        {onReview && total > 0 && (
          <button
            onClick={onReview}
            className="w-full text-slate-400 text-sm py-2 hover:text-brand-navy transition-colors"
          >
            Review missed innings →
          </button>
        )}
      </div>
    </div>
  )
}
