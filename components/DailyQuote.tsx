interface Props {
  quote: { text: string; author: string }
  verse?: { text: string; ref: string } | null
}

export default function DailyQuote({ quote, verse }: Props) {
  return (
    <div className="space-y-2">
      <div className="bg-brand-navy rounded-2xl px-5 py-4">
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mb-2.5">Daily Motivation</p>
        <p className="text-white text-sm font-medium leading-relaxed italic">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-white/40 text-xs mt-2 font-medium">— {quote.author}</p>
      </div>

      {verse && (
        <div className="bg-indigo-950 rounded-2xl px-5 py-4">
          <p className="text-indigo-400/60 text-[10px] font-semibold uppercase tracking-widest mb-2.5">Scripture</p>
          <p className="text-white text-sm font-medium leading-relaxed italic">
            &ldquo;{verse.text}&rdquo;
          </p>
          <p className="text-white/40 text-xs mt-2 font-medium">— {verse.ref}</p>
        </div>
      )}
    </div>
  )
}
