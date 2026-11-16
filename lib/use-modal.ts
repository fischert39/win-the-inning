import { useEffect, useRef } from 'react'

// Open modals, innermost last — only the top one answers Escape / traps Tab.
const stack: symbol[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Makes an overlay behave like a dialog: Escape closes it, Tab stays inside
 * it, focus moves in on open and returns to where it was on close.
 *
 *   const modal = useModal(onClose)
 *   return <div {...modal} className="fixed inset-0 …">…</div>
 */
export function useModal(onClose: () => void, label?: string) {
  const ref      = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const id       = Symbol('modal')
    const previous = document.activeElement as HTMLElement | null
    stack.push(id)

    const node = ref.current
    // Don't steal focus from a field the modal focused itself (autoFocus).
    if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true })

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id || !node) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !node.contains(active))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (active === last || !node.contains(active))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.indexOf(id)
      if (i >= 0) stack.splice(i, 1)
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  return {
    ref,
    role: 'dialog' as const,
    'aria-modal': true as const,
    'aria-label': label,
    tabIndex: -1,
  }
}
