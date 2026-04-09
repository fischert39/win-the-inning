'use client'

interface Props {
  tab:      'today' | 'stats' | 'social'
  onChange: (tab: 'today' | 'stats' | 'social') => void
}

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        {([
          { id: 'today',  icon: '🏠', label: 'Today'  },
          { id: 'stats',  icon: '📊', label: 'Stats'  },
          { id: 'social', icon: '👥', label: 'Social' },
        ] as const).map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-bold transition-colors relative ${
              tab === item.id ? 'text-brand-orange' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {tab === item.id && (
              <span className="absolute bottom-0 w-10 h-0.5 bg-brand-orange rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
