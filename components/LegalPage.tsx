import Link from 'next/link'

// Shared shell for /privacy and /terms — public pages, styled to match the app.
export default function LegalPage({ title, updated, children }: {
  title:    string
  updated:  string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 text-sm font-semibold mb-8 hover:text-brand-navy transition-colors">
          <span className="text-lg leading-none">⚾</span> Win the Inning
        </Link>

        <h1 className="text-3xl font-black text-brand-navy leading-tight mb-1">{title}</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated {updated}</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-7 [&_a]:text-brand-orange [&_a]:font-semibold [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_p]:text-slate-600 [&_li]:text-slate-600 [&_strong]:text-brand-navy">
          {children}
        </div>
      </div>
    </div>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 text-[15px] leading-relaxed">
      <h2 className="text-brand-navy font-black text-base">{heading}</h2>
      {children}
    </section>
  )
}
