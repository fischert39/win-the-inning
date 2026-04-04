'use client'

import { useState } from 'react'
import type { FullGame } from '@/types'
import { inningResult, gameResult, simulateRuns, displayDate } from '@/lib/game-logic'

interface Props {
  games: FullGame[]
}

export default function SeasonTrends({ games }: Props) {
  const [open, setOpen] = useState(false)

  const gamesWithPlay = games.filter(g => g.innings.some(i => i.status === 'CLOSED'))
  const allClosed = games.flatMap(g => g.innings).filter(i => i.status === 'CLOSED')
  const totalWins = allClosed.filter(i => inningResult(i) === 'WIN').length
  const winPct = allClosed.length > 0 ? Math.round((totalWins / allClosed.length) * 100) : 0

  // Build running win% data points for the SVG line
  const dataPoints: number[] = []
  let wins = 0
  const sorted = [...allClosed].sort((a, b) => a.date.localeCompare(b.date))
  for (let idx = 0; idx < sorted.length; idx++) {
    if (inningResult(sorted[idx]) === 'WIN') wins++
    dataPoints.push(wins / (idx + 1))
  }

  const svgW = 400
  const svgH = 80
  const pad  = 8

  function toXY(idx: number, val: number) {
    const x = dataPoints.length < 2
      ? pad + (idx / Math.max(dataPoints.length - 1, 1)) * (svgW - pad * 2)
      : pad + (idx / (dataPoints.length - 1)) * (svgW - pad * 2)
    const y = svgH - pad - val * (svgH - pad * 2)
    return { x, y }
  }

  const polyline = dataPoints.map((v, i) => {
    const { x, y } = toXY(i, v)
    return `${x},${y}`
  }).join(' ')

  const areaPath = dataPoints.length >= 2
    ? `M ${toXY(0, dataPoints[0]).x},${toXY(0, dataPoints[0]).y} ` +
      dataPoints.slice(1).map((v, i) => { const p = toXY(i + 1, v); return `L ${p.x},${p.y}` }).join(' ') +
      ` L ${toXY(dataPoints.length - 1, dataPoints[dataPoints.length - 1]).x},${svgH - pad}` +
      ` L ${toXY(0, dataPoints[0]).x},${svgH - pad} Z`
    : ''

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📈</span>
          <div className="text-left">
            <h2 className="font-black text-base text-brand-navy">Season Trends</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {allClosed.length} innings · {winPct}% win rate
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* Win rate line chart */}
          {dataPoints.length >= 2 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Running Win Rate</p>
              <div className="relative">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-16"
                  preserveAspectRatio="none"
                >
                  {/* 50% reference line */}
                  <line
                    x1={pad} y1={svgH / 2} x2={svgW - pad} y2={svgH / 2}
                    stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3"
                  />
                  {/* Area fill */}
                  <path d={areaPath} fill="#22c55e" fillOpacity="0.08" />
                  {/* Line */}
                  <polyline
                    points={polyline}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* End dot */}
                  {dataPoints.length > 0 && (() => {
                    const last = toXY(dataPoints.length - 1, dataPoints[dataPoints.length - 1])
                    return <circle cx={last.x} cy={last.y} r="4" fill="#22c55e" />
                  })()}
                </svg>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Start</span>
                  <span>50%</span>
                  <span>Now</span>
                </div>
              </div>
            </div>
          )}

          {/* Game-by-game dot grid */}
          {gamesWithPlay.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inning Results by Week</p>
              <div className="space-y-2">
                {gamesWithPlay.map((game, idx) => {
                  const gr = gameResult(game.innings)
                  return (
                    <div key={game.id} className="flex items-center gap-3">
                      {/* Week label */}
                      <div className="w-16 flex-shrink-0">
                        <p className="text-[11px] font-bold text-slate-500">Wk {idx + 1}</p>
                        <p className="text-[10px] text-slate-400">{displayDate(game.week_start)}</p>
                      </div>

                      {/* Inning dots */}
                      <div className="flex gap-1 flex-wrap flex-1">
                        {game.innings
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map(inning => {
                            const r = inningResult(inning)
                            return (
                              <span
                                key={inning.id}
                                title={`${inning.date}: ${r}`}
                                className={`w-5 h-5 rounded-full flex-shrink-0 ${
                                  r === 'WIN'         ? 'bg-green-400' :
                                  r === 'LOSS'        ? 'bg-red-400'   :
                                  r === 'TIE'         ? 'bg-yellow-400':
                                  inning.status === 'CLOSED' ? 'bg-slate-300' :
                                                        'bg-slate-100 border border-slate-200'
                                }`}
                              />
                            )
                          })}
                      </div>

                      {/* Game result badge */}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                        gr === 'WIN'  ? 'bg-green-100 text-green-700' :
                        gr === 'LOSS' ? 'bg-red-100 text-red-700'     :
                                        'bg-slate-100 text-slate-500'
                      }`}>
                        {gr === 'WIN' ? 'W' : gr === 'LOSS' ? 'L' : '…'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary footer */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            {[
              { label: 'Innings Won',  value: `${totalWins}/${allClosed.length}` },
              { label: 'Win Rate',     value: `${winPct}%` },
              { label: 'Games',        value: `${gamesWithPlay.filter(g => gameResult(g.innings) === 'WIN').length}W–${gamesWithPlay.filter(g => gameResult(g.innings) === 'LOSS').length}L` },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-brand-navy font-black text-base">{s.value}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {allClosed.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Play some innings to see your trends!</p>
          )}
        </div>
      )}
    </div>
  )
}
