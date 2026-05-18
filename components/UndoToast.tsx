'use client'

import { useEffect, useState } from 'react'

export interface UndoAction {
  id:       number               // increment to force re-mount on new action
  label:    string
  revert:   () => void           // sync UI revert
  dbRevert: () => Promise<void>  // async DB revert
}

interface Props {
  action:    UndoAction
  onDismiss: () => void
}

const DURATION = 5000

export default function UndoToast({ action, onDismiss }: Props) {
  const [progress, setProgress] = useState(100)
  const [dbError,  setDbError]  = useState(false)
  const [undoing,  setUndoing]  = useState(false)

  useEffect(() => {
    setDbError(false)
    const start = Date.now()
    const timer = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100)
      setProgress(pct)
      if (pct === 0) { clearInterval(timer); onDismiss() }
    }, 40)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.id])

  async function handleUndo() {
    setUndoing(true)
    action.revert()
    try {
      await action.dbRevert()
      onDismiss()
    } catch {
      setDbError(true)
      setUndoing(false)
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
      <div className="bg-slate-800 text-white rounded-2xl shadow-2xl overflow-hidden">
        {dbError ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm flex-1 text-red-400">⚠️ Undo failed — please refresh and try again.</span>
            <button
              onClick={onDismiss}
              className="text-white/40 hover:text-white/70 transition-colors text-xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm flex-1 truncate">{action.label}</span>
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="text-brand-orange font-black text-sm hover:opacity-80 transition-opacity flex-shrink-0 disabled:opacity-50"
            >
              {undoing ? '…' : 'Undo'}
            </button>
            <button
              onClick={onDismiss}
              className="text-white/40 hover:text-white/70 transition-colors text-xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-brand-orange"
            style={{ width: `${progress}%`, transition: 'width 40ms linear' }}
          />
        </div>
      </div>
    </div>
  )
}
