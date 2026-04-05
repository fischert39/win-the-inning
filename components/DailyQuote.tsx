interface Props {
  quote: { text: string; author: string }
  verse?: { text: string; ref: string } | null
}

export default function DailyQuote({ quote, verse }: Props) {
  return (
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-brand-navy to-brand-navy-light rounded-2xl p-5 flex gap-4 items-start">
        <span className="text-2xl flex-shrink-0">💬</span>
        <div>
          <p className="text-white text-sm font-medium leading-relaxed italic">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-white/50 text-xs mt-1.5 font-semibold">— {quote.author}</p>
        </div>
      </div>

      {verse && (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 flex gap-4 items-start">
          <span className="text-2xl flex-shrink-0">✝️</span>
          <div>
            <p className="text-white text-sm font-medium leading-relaxed italic">
              &ldquo;{verse.text}&rdquo;
            </p>
            <p className="text-white/50 text-xs mt-1.5 font-semibold">— {verse.ref}</p>
          </div>
        </div>
      )}
    </div>
  )
}
