'use client'

import { useState } from 'react'
import { ShieldIcon, TargetIcon, TrophyIcon, XIcon } from '@/components/icons'
import type { Sport } from '@/types'

interface Props {
  sport:      Sport
  firstTime:  boolean
  onClose:    () => void
}

// Explains the game in three cards. Shown automatically on first sign-in
// (firstTime), and reachable anytime from the header menu.
export default function HowToPlay({ sport, firstTime, onClose }: Props) {
  const [step, setStep] = useState(0)
  const ball = sport === 'baseball' ? '⚾' : '🥎'

  const cards = [
    {
      icon: <span className="text-4xl leading-none">{ball}</span>,
      title: 'One day = one inning',
      body: (
        <>
          Every day you play <strong>one inning</strong>. Seven innings make a game
          (Monday–Sunday), and a string of games makes your <strong>season</strong>.
          Win the inning, win the day.
        </>
      ),
    },
    {
      icon: <ShieldIcon className="w-9 h-9 text-brand-orange" />,
      title: 'Defense: get 3 outs',
      body: (
        <>
          Your three daily non-negotiables — <strong>Mind</strong>, <strong>Spirit</strong>,
          and <strong>Body</strong>. Complete all three to retire the side. No outs, no win —
          defense comes first.
        </>
      ),
    },
    {
      icon: <TargetIcon className="w-9 h-9 text-brand-orange" />,
      title: 'Offense: score runs',
      body: (
        <>
          Set goals for the day. Each one you finish is a <strong>hit</strong> — singles,
          doubles, triples, homers — and hits drive in <strong>runs</strong>. Close your
          inning at day&apos;s end: 3 outs + at least 1 run = a <strong>WIN</strong>.
        </>
      ),
    },
  ]

  const last = step === cards.length - 1
  const card = cards[step]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-xl p-7 animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {firstTime ? 'Welcome to the ballpark' : 'How to play'}
          </p>
          {!firstTime && (
            <button onClick={onClose} aria-label="Close" className="text-slate-300 hover:text-slate-500 transition-colors -mt-1">
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center text-center min-h-[190px]">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-4">
            {card.icon}
          </div>
          <h2 className="text-brand-navy dark:text-white font-black text-xl mb-2">{card.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed [&_strong]:text-brand-navy dark:[&_strong]:text-white">
            {card.body}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 my-5">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-brand-orange' : 'w-2 bg-slate-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setStep(s => s + 1))}
            className="flex-1 py-3.5 rounded-xl bg-brand-orange text-white font-black text-sm hover:bg-brand-orange-dark transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {last ? (
              <>
                <TrophyIcon className="w-4 h-4" /> Play ball
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
