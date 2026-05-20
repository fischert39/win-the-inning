'use client'

interface Props {
  tab:          'today' | 'stats' | 'social'
  onChange:     (tab: 'today' | 'stats' | 'social') => void
  socialBadge?: number
}

export default function BottomNav({ tab, onChange, socialBadge = 0 }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-100 safe-area-pb">
      <div className="max-w-2xl mx-auto flex px-2 py-1">
        {(([
          { id: 'today',  icon: '🏠', label: 'Today'  },
          { id: 'stats',  icon: '📊', label: 'Stats'  },
          { id: 'social', icon: '👥', label: 'Team' },
        ]) as const).map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex-1 flex flex-col items-center py-3 transition-colors"
          >
            <div className={`relative flex flex-col items-center gap-0.5 px-4 py-3 rounded-xl transition-all ${
              tab === item.id ? 'bg-brand-orange/10' : ''
            }`}>
              <span className={`text-xl leading-none transition-transform ${tab === item.id ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[11px] font-semibold transition-colors ${
                tab === item.id ? 'text-brand-orange' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
              {item.id === 'social' && socialBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                  {socialBadge > 9 ? '9+' : socialBadge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </nav>
  )
}
