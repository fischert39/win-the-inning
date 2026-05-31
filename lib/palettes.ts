// ── Accent color options (replaces brand-orange) ─────────────────────────────

export interface AccentOption {
  id:        string
  name:      string
  emoji:     string
  hex:       string    // for UI swatches
  rgb:       string    // "R G B" space-separated — CSS custom property value
  rgbDark:   string    // darker variant (brand-orange-dark)
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'orange',  name: 'Classic',      emoji: '🔥', hex: '#FF6B35', rgb: '255 107 53',  rgbDark: '229 90 37'  },
  { id: 'blue',    name: 'Royal Blue',   emoji: '🔵', hex: '#2563EB', rgb: '37 99 235',   rgbDark: '29 78 216'  },
  { id: 'green',   name: 'Forest',       emoji: '💚', hex: '#16A34A', rgb: '22 163 74',   rgbDark: '21 128 61'  },
  { id: 'purple',  name: 'Purple Reign', emoji: '💜', hex: '#9333EA', rgb: '147 51 234',  rgbDark: '126 34 206' },
  { id: 'red',     name: 'Red Zone',     emoji: '❤️', hex: '#DC2626', rgb: '220 38 38',   rgbDark: '185 28 28'  },
  { id: 'teal',    name: 'Sky High',     emoji: '🩵', hex: '#0891B2', rgb: '8 145 178',   rgbDark: '14 116 144' },
  { id: 'gold',    name: 'Gold Rush',    emoji: '🌙', hex: '#D97706', rgb: '217 119 6',   rgbDark: '180 83 9'   },
  { id: 'silver',  name: 'Steel',        emoji: '⚪', hex: '#64748B', rgb: '100 116 139', rgbDark: '71 85 105'  },
]

// ── Background (navy) options ─────────────────────────────────────────────────

export interface NavyOption {
  id:        string
  name:      string
  hex:       string
  rgb:       string
  rgbLight:  string
}

export const NAVY_OPTIONS: NavyOption[] = [
  { id: 'navy',  name: 'Deep Navy',  hex: '#1A1A2E', rgb: '26 26 46',  rgbLight: '22 33 62'  },
  { id: 'black', name: 'Midnight',   hex: '#0A0A0F', rgb: '10 10 15',  rgbLight: '18 18 26'  },
  { id: 'slate', name: 'Dark Slate', hex: '#0F172A', rgb: '15 23 42',  rgbLight: '30 41 59'  },
]

export const DEFAULT_ACCENT_ID = 'orange'
export const DEFAULT_NAVY_ID   = 'navy'

// ── Parsing / building ────────────────────────────────────────────────────────

/** Parse a stored string like "blue/slate" into its component IDs */
export function parsePalette(stored: string | null | undefined): { accentId: string; navyId: string } {
  if (!stored) return { accentId: DEFAULT_ACCENT_ID, navyId: DEFAULT_NAVY_ID }
  const [a, n] = stored.split('/')
  return {
    accentId: ACCENT_OPTIONS.find(o => o.id === a) ? a : DEFAULT_ACCENT_ID,
    navyId:   NAVY_OPTIONS.find(o => o.id === n)   ? n : DEFAULT_NAVY_ID,
  }
}

/** Build the storage string from two IDs */
export function buildPaletteString(accentId: string, navyId: string): string {
  return `${accentId}/${navyId}`
}

// ── CSS application ───────────────────────────────────────────────────────────

/**
 * Apply palette as CSS custom properties on <html> — no localStorage write.
 * Safe to call for live previews.
 */
export function applyPaletteCss(paletteStr: string | null | undefined): void {
  const { accentId, navyId } = parsePalette(paletteStr)
  const accent = ACCENT_OPTIONS.find(o => o.id === accentId) ?? ACCENT_OPTIONS[0]
  const navy   = NAVY_OPTIONS.find(o => o.id === navyId)     ?? NAVY_OPTIONS[0]
  const s = document.documentElement.style
  s.setProperty('--brand-primary',      accent.rgb)
  s.setProperty('--brand-primary-dark', accent.rgbDark)
  s.setProperty('--brand-navy',         navy.rgb)
  s.setProperty('--brand-navy-light',   navy.rgbLight)
}

/**
 * Apply palette AND persist to localStorage so the next load is flash-free.
 * Call this after a successful DB save.
 */
export function applyPaletteAndCache(paletteStr: string | null | undefined): void {
  applyPaletteCss(paletteStr)
  const { accentId, navyId } = parsePalette(paletteStr)
  const accent = ACCENT_OPTIONS.find(o => o.id === accentId) ?? ACCENT_OPTIONS[0]
  const navy   = NAVY_OPTIONS.find(o => o.id === navyId)     ?? NAVY_OPTIONS[0]
  try {
    localStorage.setItem('wti_palette', JSON.stringify({
      p: accent.rgb, pd: accent.rgbDark,
      n: navy.rgb,   nl: navy.rgbLight,
    }))
  } catch { /* ignore */ }
}
