'use client'

import type { FullSeason } from '@/types'

interface Props {
  season:  FullSeason
  onClose: () => void
}

export default function SeasonCeremony({ season, onClose }: Props) {
  const goals = season.season_goals ?? []

  return (
    <div className="fixed inset-0 bg-brand-navy/95 z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-sm w-full text-center animate-celebration">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-orange/20 text-brand-orange text-xs font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-widest">
          ⚾ New Season
        </div>

        {/* Headline */}
        <h1 className="text-white font-black text-4xl leading-tight mb-2">
          Season Begins.
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Every champion starts somewhere. This is your somewhere.
        </p>

        {/* Success definition */}
        {season.success_definition && (
          <div className="bg-white/10 rounded-2xl px-5 py-4 mb-5 text-left">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-1">🎯 Win condition</p>
            <p className="text-white font-semibold text-sm">{season.success_definition}</p>
          </div>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <div className="bg-white/10 rounded-2xl px-5 py-4 mb-8 text-left">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Season goals</p>
            <ul className="space-y-2">
              {goals.map((g, i) => (
                <li key={g.id ?? i} className="flex items-start gap-2 text-sm text-white">
                  <span className="text-brand-orange mt-0.5 flex-shrink-0">◆</span>
                  <span>{g.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full bg-brand-orange text-white font-black text-lg py-4 rounded-2xl hover:bg-brand-orange-dark transition-colors shadow-lg shadow-brand-orange/30"
        >
          Play Ball! ⚾
        </button>
      </div>
    </div>
  )
}
