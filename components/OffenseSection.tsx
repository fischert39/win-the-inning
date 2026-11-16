'use client'

import { useState } from 'react'
import { useModal } from '@/lib/use-modal'
import type { FullInning, OffenseGoal, HitType } from '@/types'
import { simulateRuns, getBaseState, effectiveOuts } from '@/lib/game-logic'
import { GOAL_PRESETS } from '@/lib/presets'

interface Props {
  inning:             FullInning
  sportEmoji:         string
  templates:          string[]
  recentGoals:        string[]
  onAddGoal:          () => void
  onAddGoalWithText:  (text: string) => void
  onSaveGoalText:     (id: string, val: string) => void
  onToggleGoal:       (id: string) => void
  onSetHitType:       (id: string, type: HitType) => void
  onDeleteGoal:       (id: string) => void
  onCloseInning:      () => void
  onLoadTemplates:    () => void
  onSaveTemplates:    () => void
  canRainDelay:       boolean
  onRainDelay:        () => void
  pinchTokens:        number
  onPinchHit:         () => void
  isFuture?:          boolean
  isOther?:           boolean
  forceOpen?:         boolean
}

const HIT_TYPES: {
  key:      HitType
  label:    string
  sub:      string   // base indicator
  title:    string
  color:    string   // selected classes
  isHomer:  boolean
}[] = [
  { key: 'single', label: '1B', sub: '●○○', title: 'Single — 1 base',   color: 'bg-sky-100 text-sky-700 ring-sky-400',              isHomer: false },
  { key: 'double', label: '2B', sub: '●●○', title: 'Double — 2 bases',  color: 'bg-teal-100 text-teal-700 ring-teal-400',            isHomer: false },
  { key: 'triple', label: '3B', sub: '●●●', title: 'Triple — 3 bases',  color: 'bg-purple-100 text-purple-700 ring-purple-400',      isHomer: false },
  { key: 'homer',  label: 'HR', sub: '🔥',  title: 'Home Run — scores!', color: 'bg-brand-orange text-white ring-brand-orange shadow-sm shadow-brand-orange/40', isHomer: true },
]

function BaseDiamond({ goals }: { goals: OffenseGoal[] }) {
  const [b1, b2, b3] = getBaseState(goals)
  const Base = ({ on, label }: { on: boolean; label: string }) => (
    <span className={`text-lg leading-none transition-all ${on ? 'text-brand-orange scale-125' : 'text-slate-200'}`} title={label}>
      ◆
    </span>
  )
  return (
    <div className="flex flex-col items-center gap-0.5 w-10">
      <div><Base on={b2} label="2nd" /></div>
      <div className="flex gap-3">
        <Base on={b3} label="3rd" />
        <Base on={b1} label="1st" />
      </div>
      <span className="text-[10px] text-slate-300">🏠</span>
    </div>
  )
}

export default function OffenseSection({
  inning, sportEmoji, templates, recentGoals,
  onAddGoal, onAddGoalWithText, onSaveGoalText, onToggleGoal, onSetHitType, onDeleteGoal, onCloseInning,
  onLoadTemplates, onSaveTemplates, canRainDelay, onRainDelay, pinchTokens, onPinchHit,
  isFuture = false, isOther = false, forceOpen = false,
}: Props) {
  const [showRecent,       setShowRecent]       = useState(false)
  const [showPresets,      setShowPresets]      = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showMore,         setShowMore]         = useState(false)

  const closed      = inning.status === 'CLOSED' && !forceOpen
  const readOnly    = closed || isFuture
  // Planning mode: a future day. You can build your lineup (add/edit/delete
  // goals) but can't complete them or set hits until the day arrives.
  const planning    = isFuture && !closed
  const goals       = inning.offense_goals
  const runs        = simulateRuns(goals)
  const outs        = effectiveOuts(inning)
  const canPinchHit = !readOnly && pinchTokens > 0 && !inning.pinch_hit_used && outs < 3
  const completed   = goals.filter(g => g.completed).length
  const target      = inning.target_goals ?? 5
  const showAdd     = !closed && (goals.length === 0 || goals[goals.length - 1].goal.trim() !== '')
  const hasGoals    = goals.some(g => g.goal.trim() !== '')
  const goalTexts   = goals.map(g => g.goal.trim()).filter(Boolean)
  const matchesTmpl = templates.length > 0 &&
    goalTexts.length === templates.length &&
    goalTexts.every((t, i) => t === templates[i])

  const showRainDelay = canRainDelay && !closed && !planning
  const hasMore       = !closed && (hasGoals || showRainDelay || canPinchHit)
  // Chips already added to today's inning (to show as "selected")
  const currentGoalTexts = new Set(goalTexts)

  return (
    <div className="bg-surface rounded-2xl shadow-sm overflow-hidden border-l-4 border-brand-orange">

      {/* ── Live Scoreboard strip ── */}
      {!closed && (
        <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
          {/* Outs */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-[11px] font-black uppercase tracking-widest">Outs</span>
            <div className="flex gap-1.5 ml-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    i < outs
                      ? 'bg-brand-orange shadow-sm shadow-brand-orange/60'
                      : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs font-bold ml-1 tabular-nums ${outs === 3 ? 'text-brand-orange' : 'text-white/60'}`}>
              {outs}/3
            </span>
          </div>

          {/* Base diamond */}
          <BaseDiamondDark goals={goals} />

          {/* Runs */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-[11px] font-black uppercase tracking-widest">Runs</span>
            <span
              className="text-3xl font-black tabular-nums leading-none transition-all duration-300"
              style={{ color: runs > 0 ? '#FF6B35' : 'rgba(255,255,255,0.3)' }}
            >
              {runs}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-ink font-bold text-base">Offense <span className="text-slate-500 font-semibold text-sm">· today&apos;s goals</span></h2>
            {goals.length > 0 ? (
              <p className={`text-xs mt-0.5 font-semibold ${completed >= target ? 'text-green-600' : 'text-slate-500'}`}>
                {completed} / {target} goals completed{completed >= target ? ' ✓' : ''}
              </p>
            ) : (
              <p className="text-slate-500 text-xs mt-0.5">Add what you want to get done today. Finishing goals scores runs.</p>
            )}
          </div>
          {closed && (
            <div className="flex items-center gap-2">
              <BaseDiamond goals={goals} />
              <div className="text-right">
                <span className="text-2xl font-black text-ink tabular-nums">{runs}</span>
                <span className="text-slate-500 text-xs block">Runs</span>
              </div>
            </div>
          )}
        </div>

        {/* Scoring hint — only when open and not planning */}
        {!closed && !planning && (
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Size each goal:{' '}
            <strong className="text-slate-600 font-bold">1B</strong> small ·{' '}
            <strong className="text-slate-600 font-bold">2B</strong> medium ·{' '}
            <strong className="text-slate-600 font-bold">3B</strong> big ·{' '}
            <strong className="text-brand-orange font-bold">HR</strong> huge. Bigger hits score more runs.
          </p>
        )}

        {/* Planning-mode note */}
        {planning && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
            <span className="text-sm leading-none mt-0.5">🗓️</span>
            <p className="text-xs text-sky-700 leading-snug">
              <strong className="font-bold">Planning ahead.</strong> Line up your goals now — you can check them off once the day starts.
            </p>
          </div>
        )}
      </div>

      {/* Goals list */}
      <div className="px-5 space-y-2.5 pb-3">
        {goals.map(goal => (
          <GoalRow
            key={goal.id}
            goal={goal}
            closed={closed}
            planning={planning}
            onSave={val => onSaveGoalText(goal.id, val)}
            onToggle={() => onToggleGoal(goal.id)}
            onSetHit={type => onSetHitType(goal.id, type)}
            onDelete={() => onDeleteGoal(goal.id)}
          />
        ))}

        {goals.length === 0 && (
          <div className="text-center py-3 space-y-2">
            {closed ? (
              <p className="text-slate-300 text-sm italic">Blank scorecard — nothing on the board.</p>
            ) : (
              <>
                <p className="text-slate-300 text-sm">Lineup's empty. Load the bases.</p>
                {templates.length > 0 && (
                  <button
                    onClick={onLoadTemplates}
                    className="text-xs text-brand-orange font-bold hover:underline"
                  >
                    📋 Load my templates ({templates.length} goals)
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick-add panels (only when not closed) */}
      {!closed && (
        <div className="px-5 space-y-2 pb-3">
          {/* Recent Goals */}
          {recentGoals.length > 0 && (
            <CollapsiblePanel label="🕐 Recent Goals" open={showRecent} onToggle={() => setShowRecent(v => !v)}>
              <div className="flex flex-wrap gap-1.5">
                {recentGoals.map(text => (
                  <QuickAddChip key={text} text={text} already={currentGoalTexts.has(text)} onAdd={onAddGoalWithText} />
                ))}
              </div>
            </CollapsiblePanel>
          )}

          {/* Preset Library */}
          <CollapsiblePanel label="⚡ Goal Presets" open={showPresets} onToggle={() => setShowPresets(v => !v)}>
            <div className="space-y-3">
              {GOAL_PRESETS.map(cat => (
                <div key={cat.category}>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{cat.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.goals.map(text => (
                      <QuickAddChip key={text} text={text} already={currentGoalTexts.has(text)} onAdd={onAddGoalWithText} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsiblePanel>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-5 space-y-3">
        {showAdd && (
          <button
            onClick={onAddGoal}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 hover:border-brand-orange text-slate-500 hover:text-brand-orange rounded-xl py-2.5 text-sm font-semibold transition-all"
          >
            + Add {goals.length === 0 ? 'a goal' : 'another goal'}
          </button>
        )}

        {inning.pinch_hit_used && !closed && (
          <div className="w-full py-2.5 rounded-xl font-bold text-sm border border-amber-200 bg-amber-50 text-amber-700 text-center">
            ⚡ Pinch Hitter active — +1 automatic out
          </div>
        )}
        {hasMore && (
          <CollapsiblePanel label="More options" open={showMore} onToggle={() => setShowMore(v => !v)}>
            <div className="space-y-2 pt-1">
              {hasGoals && (
                <MoreOption
                  onClick={onSaveTemplates}
                  icon="📌"
                  title={matchesTmpl ? 'Saved as my templates' : 'Save these goals as templates'}
                  detail="Reuse this list on any day with one tap."
                  active={matchesTmpl}
                />
              )}
              {showRainDelay && (
                <MoreOption
                  onClick={onRainDelay}
                  icon="☔"
                  title="Use Rain Delay"
                  detail="Skip this day without a loss. One per week."
                />
              )}
              {canPinchHit && (
                <MoreOption
                  onClick={onPinchHit}
                  icon="⚡"
                  title={`Use Pinch Hitter (${pinchTokens} left)`}
                  detail="Adds one automatic out to this inning."
                />
              )}
            </div>
          </CollapsiblePanel>
        )}
        {!closed && (
          <button
            onClick={() => { if (!isFuture) setShowCloseConfirm(true) }}
            disabled={isFuture}
            className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all text-white active:scale-[0.98] ${
              isFuture
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-brand-orange hover:bg-brand-orange-dark shadow-md shadow-brand-orange/30'
            }`}
          >
            {isFuture ? '⏳ Available on game day' : '🔒 Close the Inning'}
          </button>
        )}
      </div>

      {/* ── Close the Inning confirmation sheet ── */}
      {showCloseConfirm && (
        <CloseConfirmSheet
          outs={outs}
          runs={runs}
          onConfirm={() => { setShowCloseConfirm(false); onCloseInning() }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  )
}

function GoalRow({
  goal, closed, planning, onSave, onToggle, onSetHit, onDelete,
}: {
  goal:       OffenseGoal
  closed:     boolean
  planning:   boolean
  onSave:     (val: string) => void
  onToggle:   () => void
  onSetHit:   (type: HitType) => void
  onDelete:   () => void
}) {
  // Text + delete are editable while planning; completion + hit type are locked.
  const textLocked       = closed
  const completionLocked = closed || planning
  return (
    <div className={`rounded-xl border transition-all ${goal.completed ? 'bg-brand-orange/5 border-brand-orange/20' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center gap-1 pl-1 pr-1 pt-1">
        {/* Complete — a full 44px target; locked while planning */}
        <button
          onClick={() => { if (!completionLocked) onToggle() }}
          disabled={completionLocked}
          aria-label={goal.completed ? 'Mark goal not done' : 'Mark goal done'}
          aria-pressed={goal.completed}
          title={planning ? 'Available once the day starts' : undefined}
          className={`group w-11 h-11 flex-shrink-0 flex items-center justify-center ${completionLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            goal.completed ? 'bg-brand-green border-brand-green' : 'border-slate-300 group-hover:border-brand-green'
          }`}>
            {goal.completed && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
        </button>
        <input
          type="text"
          value={goal.goal}
          readOnly={textLocked}
          placeholder="What's your goal?"
          aria-label="Goal"
          onChange={e => { if (!textLocked) onSave(e.target.value) }}
          autoCorrect="off"
          autoCapitalize="sentences"
          className={`flex-1 min-w-0 py-2 text-sm bg-transparent outline-none placeholder:text-slate-400 ${
            goal.completed ? 'line-through text-slate-500' : 'text-ink'
          } ${textLocked ? 'cursor-default select-none' : ''}`}
        />
        {!textLocked && (
          <button
            onClick={onDelete}
            aria-label="Delete goal"
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-brand-red transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        )}
      </div>

      {/* Hit type selector — locked when closed or planning */}
      <div className="flex gap-2 pl-12 pr-3 pb-3">
        {HIT_TYPES.map(ht => {
          const isSelected = goal.hit_type === ht.key
          return (
            <button
              key={ht.key}
              onClick={() => { if (!completionLocked) onSetHit(ht.key) }}
              disabled={completionLocked}
              title={planning ? 'Available once the day starts' : ht.title}
              aria-label={ht.title}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-0.5 rounded-lg transition-all ring-1 ring-transparent active:scale-95 ${
                'px-3 py-1.5 min-w-[44px] min-h-[36px] justify-center'
              } ${completionLocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                isSelected
                  ? ht.color
                  : completionLocked
                    ? 'bg-surface text-slate-300 ring-slate-100'
                    : 'bg-surface text-slate-500 hover:bg-slate-50 hover:text-slate-600 ring-slate-100'
              }`}
            >
              <span className="font-black leading-none text-xs">
                {ht.label}
              </span>
              <span className={`leading-none transition-all ${
                ht.isHomer
                  ? 'text-[11px]'
                  : `text-[10px] tracking-tighter ${isSelected ? 'opacity-80' : 'opacity-40'}`
              }`}>
                {ht.sub}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MoreOption({ onClick, icon, title, detail, active = false }: {
  onClick: () => void
  icon:    string
  title:   string
  detail:  string
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left rounded-xl border px-3.5 py-3 transition-colors active:scale-[0.99] ${
        active
          ? 'bg-brand-orange/5 border-brand-orange/20'
          : 'bg-slate-50 border-slate-100 hover:border-brand-orange/40'
      }`}
    >
      <span className="text-lg leading-none flex-shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className={`block text-sm font-bold ${active ? 'text-brand-orange' : 'text-ink'}`}>{title}</span>
        <span className="block text-xs text-slate-500 mt-0.5">{detail}</span>
      </span>
    </button>
  )
}

function CollapsiblePanel({ label, open, onToggle, children }: {
  label:    string
  open:     boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && <div className="px-3.5 pb-3">{children}</div>}
    </div>
  )
}

function QuickAddChip({ text, already, onAdd }: {
  text:    string
  already: boolean
  onAdd:   (text: string) => void
}) {
  return (
    <button
      onClick={() => { if (!already) onAdd(text) }}
      className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
        already
          ? 'bg-green-50 border-green-200 text-green-600 cursor-default'
          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-brand-orange hover:text-brand-orange active:scale-95'
      }`}
    >
      {already ? '✓ ' : '+ '}{text}
    </button>
  )
}

// ── Dark base diamond (for navy scoreboard strip) ─────────────────────────────

function BaseDiamondDark({ goals }: { goals: OffenseGoal[] }) {
  const [b1, b2, b3] = getBaseState(goals)
  const Base = ({ on }: { on: boolean }) => (
    <span className={`text-sm leading-none transition-all ${on ? 'text-brand-orange drop-shadow-sm' : 'text-white/20'}`}>◆</span>
  )
  return (
    <div className="flex flex-col items-center gap-0.5 w-8">
      <div><Base on={b2} /></div>
      <div className="flex gap-2.5">
        <Base on={b3} />
        <Base on={b1} />
      </div>
      <span className="text-[10px] text-white/20">🏠</span>
    </div>
  )
}

// ── Close the Inning confirmation sheet ──────────────────────────────────────

function CloseConfirmSheet({
  outs, runs, onConfirm, onCancel,
}: {
  outs:      number
  runs:      number
  onConfirm: () => void
  onCancel:  () => void
}) {
  const isWin  = outs === 3 && runs > 0
  const isTie  = outs === 3 && runs === 0
  const isLoss = outs < 3

  const result  = isWin ? 'WIN' : isTie ? 'TIE' : 'LOSS'
  const emoji   = isWin ? '🏆' : isTie ? '🤝' : '😤'
  const color   = isWin ? '#2DC653' : isTie ? '#F5A623' : '#E63946'
  const bgLight = isWin ? 'bg-green-50'  : isTie ? 'bg-amber-50'  : 'bg-red-50'
  const message = isWin
    ? `${outs} outs + ${runs} run${runs !== 1 ? 's' : ''} — that's a WIN!`
    : isTie
    ? `3 outs recorded, no runs scored — TIE.`
    : `${outs}/3 outs recorded — LOSS. Close anyway?`
  const btnLabel  = isWin ? '🔒 Lock It In!' : isTie ? '🔒 Lock It In' : '🔒 Close It Out'
  const modal     = useModal(onCancel, 'Close the inning')
  const btnClass  = isWin
    ? 'bg-brand-green hover:bg-green-600 shadow-green-200'
    : 'bg-brand-orange hover:bg-brand-orange-dark shadow-brand-orange/20'

  return (
    <>
      <style>{`
        @keyframes cc-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cc-sheet    { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: 'cc-backdrop 0.2s ease both' }}
        onClick={onCancel}
      />

      {/* Sheet */}
      <div
        {...modal}
        className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
        style={{ animation: 'cc-sheet 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
      >
        <div className="bg-surface rounded-t-3xl shadow-2xl px-6 pt-5 pb-8 safe-area-pb">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

          {/* Result badge */}
          <div className={`${bgLight} rounded-2xl px-5 py-4 flex items-center gap-4 mb-5`}>
            <span className="text-5xl leading-none">{emoji}</span>
            <div>
              <p
                className="text-2xl font-black leading-none mb-1"
                style={{ color }}
              >
                {result}
              </p>
              <p className="text-sm text-slate-600 leading-snug">{message}</p>
            </div>
          </div>

          {/* Outs + Runs summary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl py-3 text-center">
              <div className="flex justify-center gap-1.5 mb-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full ${i < outs ? 'bg-brand-orange' : 'bg-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-xl font-black text-ink tabular-nums">{outs}/3</p>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mt-0.5">Outs</p>
            </div>
            <div className="bg-slate-50 rounded-xl py-3 text-center">
              <p
                className="text-3xl font-black tabular-nums leading-none mb-0.5"
                style={{ color: runs > 0 ? '#FF6B35' : '#94a3b8' }}
              >
                {runs}
              </p>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mt-0.5">
                {runs === 1 ? 'Run' : 'Runs'}
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onConfirm}
            className={`w-full py-4 rounded-2xl text-white font-black text-base tracking-wider uppercase transition-all active:scale-[0.98] shadow-lg ${btnClass}`}
          >
            {btnLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-3 py-3 text-slate-500 font-semibold text-sm hover:text-slate-600 transition-colors"
          >
            Keep Playing
          </button>
        </div>
      </div>
    </>
  )
}
