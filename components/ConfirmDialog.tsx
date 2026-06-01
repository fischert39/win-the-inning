'use client'

import { useState, useCallback, useRef } from 'react'

export interface ConfirmOptions {
  title:         string
  message?:      string
  confirmLabel?: string
  cancelLabel?:  string
  tone?:         'danger' | 'default'
  icon?:         string
}

/**
 * Promise-based confirm to replace native window.confirm() with a styled modal.
 *
 *   const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title: 'End this season?' }))) return
 *   ...
 *   render `{dialog}` somewhere in the tree.
 */
export function useConfirm() {
  const [opts, setOpts]   = useState<ConfirmOptions | null>(null)
  const resolverRef       = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options)
    return new Promise<boolean>(resolve => { resolverRef.current = resolve })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOpts(null)
  }, [])

  const dialog = opts
    ? <ConfirmDialog {...opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
    : null

  return { confirm, dialog }
}

function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', icon,
  onConfirm, onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const danger = tone === 'danger'
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-slide-up"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        {icon && <p className="text-4xl text-center leading-none">{icon}</p>}
        <p className="font-black text-brand-navy text-center text-lg leading-snug">{title}</p>
        {message && <p className="text-sm text-slate-500 text-center leading-relaxed">{message}</p>}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors active:scale-[0.98] ${
              danger
                ? 'bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200'
                : 'bg-brand-orange hover:bg-brand-orange-dark shadow-sm shadow-brand-orange/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
