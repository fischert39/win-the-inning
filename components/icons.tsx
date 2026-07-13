// Small inline SVG icon set (Lucide-style strokes) for UI chrome.
// Emoji stays in celebrations, mascots, and share cards — these are for nav,
// menus, and controls where cross-platform consistency matters.

function base(props: { className?: string }) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: props.className ?? 'w-5 h-5',
  }
}

export function HomeIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )
}

export function ChartIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-6" />
    </svg>
  )
}

export function UsersIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.85" />
    </svg>
  )
}

export function SunIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function MoonIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export function HelpIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}

export function PencilIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

export function ClipboardIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  )
}

export function FlagIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </svg>
  )
}

export function LogOutIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function ShieldIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

export function TargetIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function TrophyIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M6 9a6 6 0 0 0 12 0" />
      <path d="M6 9V3h12v6" />
      <path d="M6 5H3a3 3 0 0 0 3 4" />
      <path d="M18 5h3a3 3 0 0 1-3 4" />
      <path d="M12 15v3" />
      <path d="M8 21h8M10 18h4" />
    </svg>
  )
}

export function XIcon(p: { className?: string }) {
  return (
    <svg {...base(p)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
