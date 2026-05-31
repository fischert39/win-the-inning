'use client'

import {
  ACCENT_OPTIONS, NAVY_OPTIONS,
  parsePalette, buildPaletteString, applyPaletteCss,
} from '@/lib/palettes'

interface Props {
  value:    string | null   // "accentId/navyId"
  onChange: (value: string) => void
  dark?:    boolean          // true when rendered on a dark background (PreSeason / TeamSettings)
}

export default function PaletteSelector({ value, onChange, dark = true }: Props) {
  const { accentId, navyId } = parsePalette(value)

  function setAccent(id: string) {
    const next = buildPaletteString(id, navyId)
    applyPaletteCss(next)   // live preview
    onChange(next)
  }

  function setNavy(id: string) {
    const next = buildPaletteString(accentId, id)
    applyPaletteCss(next)   // live preview
    onChange(next)
  }

  const label = dark ? 'text-white/40' : 'text-slate-400'

  return (
    <div className="space-y-4">

      {/* ── Accent color ── */}
      <div>
        <p className={`${label} text-xs font-black uppercase tracking-widest mb-2`}>
          Accent Color
        </p>
        <div className="grid grid-cols-8 gap-1.5">
          {ACCENT_OPTIONS.map(o => (
            <button
              key={o.id}
              onClick={() => setAccent(o.id)}
              title={o.name}
              className={`relative aspect-square rounded-xl border-2 transition-all active:scale-90 ${
                accentId === o.id
                  ? 'border-white shadow-lg scale-110'
                  : 'border-transparent opacity-60 hover:opacity-90 hover:scale-105'
              }`}
              style={{ backgroundColor: o.hex }}
            >
              {accentId === o.id && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-black">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
        <p className={`${label} text-[10px] mt-1.5`}>
          {ACCENT_OPTIONS.find(o => o.id === accentId)?.name ?? 'Classic'}
        </p>
      </div>

      {/* ── Background ── */}
      <div>
        <p className={`${label} text-xs font-black uppercase tracking-widest mb-2`}>
          Background
        </p>
        <div className="grid grid-cols-3 gap-2">
          {NAVY_OPTIONS.map(o => (
            <button
              key={o.id}
              onClick={() => setNavy(o.id)}
              className={`py-3 rounded-xl border-2 text-xs font-bold transition-all active:scale-[0.97] ${
                navyId === o.id
                  ? 'border-white text-white'
                  : 'border-white/20 text-white/50 hover:border-white/40'
              }`}
              style={{ backgroundColor: o.hex }}
            >
              {o.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
