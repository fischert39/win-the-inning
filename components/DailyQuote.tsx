interface Props {
  quote: { text: string; author: string }
}

export default function DailyQuote({ quote }: Props) {
  return (
    <div className="bg-gradient-to-r from-brand-navy to-brand-navy-light rounded-2xl p-5 flex gap-4 items-start">
      <span className="text-2xl flex-shrink-0">💬</span>
      <div>
        <p className="text-white text-sm font-medium leading-relaxed italic">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-white/50 text-xs mt-1.5 font-semibold">— {quote.author}</p>
      </div>
    </div>
  )
}
