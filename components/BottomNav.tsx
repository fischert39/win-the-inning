'use client'

interface Props {
  tab:      'today' | 'stats' | 'social'
  onChange: (tab: 'today' | 'stats' | 'social') => void
}

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-100 safe-area-pb">
      <div className="max-w-2xl mx-auto flex px-2 py-1">
        {(([
          { id: 'today',  icon: '🏠', label: 'Today'  },
          { id: 'stats',  icon: '📊', label: 'Stats'  },
          { id: 'social', icon: '👥', label: 'Social' },
        ]) as const).map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex-1 flex flex-col items-center py-1.5 transition-colors"
          >
            <div className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
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
            </div>
          </button>
        ))}
      </div>
    </nav>
  )
}
