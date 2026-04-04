'use client'

import type { FullInning, OffenseGoal, HitType } from '@/types'
import { simulateRuns, getBaseState } from '@/lib/game-logic'

interface Props {
  inning:            FullInning
  sportEmoji:        string
  templates:         string[]
  onAddGoal:         () => void
  onSaveGoalText:    (id: string, val: string) => void
  onToggleGoal:      (id: string) => void
  onSetHitType:      (id: string, type: HitType) => void
  onDeleteGoal:      (id: string) => void
  onCloseInning:     () => void
  onLoadTemplates:   () => void
  onSaveTemplates:   () => void
  canRainDelay:      boolean
  onRainDelay:       () => void
}

const HIT_TYPES: { key: HitType; label: string; title: string; color: string }[] = [
  { key: 'single', label: 'S',  title: 'Single — 1 base',  color: 'bg-sky-100 text-sky-700 ring-sky-400' },
  { key: 'double', label: '2B', title: 'Double — 2 bases', color: 'bg-brand-teal/15 text-teal-700 ring-teal-400' },
  { key: 'triple', label: '3B', title: 'Triple — 3 bases', color: 'bg-brand-purple/15 text-purple-700 ring-purple-400' },
  { key: 'homer',  label: 'HR', title: 'Home Run — score!', color: 'bg-brand-orange/15 text-orange-700 ring-brand-orange' },
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
      <span className="text-[9px] text-slate-300">🏠</span>
    </div>
  )
}

export default function OffenseSection({
  inning, sportEmoji, templates,
  onAddGoal, onSaveGoalText, onToggleGoal, onSetHitType, onDeleteGoal, onCloseInning,
  onLoadTemplates, onSaveTemplates, canRainDelay, onRainDelay,
}: Props) {
  const closed      = inning.status === 'CLOSED'
  const goals       = inning.offense_goals
  const runs        = simulateRuns(goals)
  const showAdd     = goals.length === 0 || goals[goals.length - 1].goal.trim() !== ''
  const hasGoals    = goals.some(g => g.goal.trim() !== '')
  const goalTexts   = goals.map(g => g.goal.trim()).filter(Boolean)
  const matchesTmpl = templates.length > 0 &&
    goalTexts.length === templates.length &&
    goalTexts.every((t, i) => t === templates[i])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-brand-navy font-black text-base">🏃 Offense — Score Runs</h2>
            <p className="text-slate-400 text-xs mt-0.5">Set your goals — hits advance runners, runs score!</p>
          </div>
          <div className="flex items-center gap-3">
            <BaseDiamond goals={goals} />
            <div className="text-right">
              <span className="text-2xl font-black text-brand-navy tabular-nums">{runs}</span>
              <span className="text-slate-400 text-xs block">Runs</span>
            </div>
          </div>
        </div>

        {/* Scoring hint */}
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-2">
          <span>🔵 <strong>S</strong>=1 base</span>
          <span>🌊 <strong>2B</strong>=2 bases</span>
          <span>⭐ <strong>3B</strong>=3 bases</span>
          <span>🔥 <strong>HR</strong>=score now!</span>
        </div>
      </div>

      {/* Goals list */}
      <div className="px-5 space-y-2.5 pb-3">
        {goals.map(goal => (
          <GoalRow
            key={goal.id}
            goal={goal}
            sportEmoji={sportEmoji}
            closed={closed}
            onSave={val => onSaveGoalText(goal.id, val)}
            onToggle={() => onToggleGoal(goal.id)}
            onSetHit={type => onSetHitType(goal.id, type)}
            onDelete={() => onDeleteGoal(goal.id)}
          />
        ))}

        {goals.length === 0 && !closed && (
          <div className="text-center py-3 space-y-2">
            <p className="text-slate-300 text-sm">No goals yet — add your first one below!</p>
            {templates.length > 0 && (
              <button
                onClick={onLoadTemplates}
                className="text-xs text-brand-orange font-bold hover:underline"
              >
                📋 Load my templates ({templates.length} goals)
              </button>
            )}
          </div>
        )}
      </div>

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

        {hasGoals && (
          <button
            onClick={onSaveTemplates}
            className={`w-full rounded-xl py-2 text-xs font-bold transition-all border ${
              matchesTmpl
                ? 'bg-brand-orange/5 border-brand-orange/20 text-brand-orange'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-brand-orange hover:border-brand-orange/30'
            }`}
          >
            {matchesTmpl ? '📌 Saved as my templates' : '📌 Save these goals as templates'}
          </button>
        )}

        {canRainDelay && !closed && (
          <button
            onClick={onRainDelay}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 active:scale-[0.98]"
          >
            ☔ Rain Delay — skip today (1 per week)
          </button>
        )}

        <button
          onClick={onCloseInning}
          className={`w-full py-3.5 rounded-xl font-black text-sm transition-all text-white shadow-lg hover:opacity-90 active:scale-[0.98] ${
            closed
              ? 'bg-gradient-to-r from-brand-blue to-[#005fa3]'
              : 'bg-gradient-to-r from-brand-orange to-[#FF4500] animate-pulse'
          }`}
        >
          {closed ? '✏️ Update Inning' : '🔒 Close the Inning'}
        </button>
      </div>
    </div>
  )
}

function GoalRow({
  goal, sportEmoji, closed, onSave, onToggle, onSetHit, onDelete,
}: {
  goal:       OffenseGoal
  sportEmoji: string
  closed:     boolean
  onSave:     (val: string) => void
  onToggle:   () => void
  onSetHit:   (type: HitType) => void
  onDelete:   () => void
}) {
  return (
    <div className={`rounded-xl border transition-all ${goal.completed ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="text-base flex-shrink-0">{sportEmoji}</span>
        <input
          type="text"
          value={goal.goal}
          placeholder="What's your goal?"
          onChange={e => onSave(e.target.value)}
          className={`flex-1 text-sm bg-transparent outline-none placeholder:text-slate-300 ${
            goal.completed ? 'line-through text-slate-400' : 'text-brand-navy'
          }`}
        />
        {/* Complete checkbox */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            goal.completed ? 'bg-brand-green border-brand-green' : 'border-slate-300 hover:border-brand-green'
          }`}
        >
          {goal.completed && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <button onClick={onDelete} className="text-slate-200 hover:text-brand-red text-lg leading-none transition-colors">
          ×
        </button>
      </div>

      {/* Hit type selector */}
      <div className="flex gap-1.5 px-3 pb-2.5">
        {HIT_TYPES.map(ht => (
          <button
            key={ht.key}
            onClick={() => onSetHit(ht.key)}
            title={ht.title}
            className={`px-2 py-0.5 rounded-md text-[11px] font-black transition-all ring-1 ring-transparent cursor-pointer ${
              goal.hit_type === ht.key
                ? ht.color + ' ring-offset-0'
                : 'bg-white text-slate-400 hover:text-slate-600 ring-slate-100'
            }`}
          >
            {ht.label}
          </button>
        ))}
      </div>
    </div>
  )
}
