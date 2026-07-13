'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <p className="text-5xl mb-4">🌧️</p>
        <h1 className="text-2xl font-black text-white mb-2">Rain delay</h1>
        <p className="text-white/60 text-sm mb-6">
          Something went wrong on our end. Your data is safe — give it another swing.
        </p>
        <button
          onClick={reset}
          className="w-full py-3.5 bg-brand-orange text-white font-black rounded-xl text-sm hover:bg-brand-orange-dark transition-colors active:scale-[0.98] mb-3"
        >
          Resume play
        </button>
        <button
          onClick={() => window.location.assign('/')}
          className="w-full py-3.5 bg-white/10 border border-white/15 text-white font-bold rounded-xl text-sm hover:bg-white/15 transition-colors"
        >
          Back to today
        </button>
      </div>
    </div>
  )
}
