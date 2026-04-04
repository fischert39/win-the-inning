'use client'

import { useEffect, useRef } from 'react'
import type { FullGame } from '@/types'
import { inningResult, gameResult, simulateRuns, displayDate } from '@/lib/game-logic'

interface Props {
  game:    FullGame | null
  record:  { wins: number; losses: number }
  streak:  { type: 'WIN' | 'LOSS' | null; count: number }
  sport:   'softball' | 'baseball'
  onClose: () => void
}

const W = 640
const H = 360
const NAVY   = '#0D1B2A'
const ORANGE = '#FF6B2B'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const YELLOW = '#eab308'
const MUTED  = 'rgba(255,255,255,0.25)'
const WHITE  = '#ffffff'

export default function ShareCard({ game, record, streak, sport, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = NAVY
    ctx.fillRect(0, 0, W, H)

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // Orange accent bar top
    ctx.fillStyle = ORANGE
    ctx.fillRect(0, 0, W, 5)

    // App title
    ctx.fillStyle = WHITE
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.letterSpacing = '3px'
    ctx.fillText((sport === 'baseball' ? '⚾' : '🥎') + '  WIN THE INNING, WIN THE DAY', 36, 42)
    ctx.letterSpacing = '0px'

    // Week label
    if (game) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(`Week of ${displayDate(game.week_start)} – ${displayDate(game.week_end)}`, 36, 64)
    }

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(36, 78); ctx.lineTo(W - 36, 78); ctx.stroke()

    // ── Inning dots ──
    if (game) {
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      const dotR  = 18
      const startX = 60
      const spacingX = (W - startX * 2) / 6
      const dotY  = 130

      const sortedInnings = [...game.innings].sort((a, b) => a.date.localeCompare(b.date))

      for (let i = 0; i < 7; i++) {
        const cx = startX + i * spacingX
        const inning = sortedInnings[i]
        const result = inning ? inningResult(inning) : null

        // Dot fill
        ctx.beginPath()
        ctx.arc(cx, dotY, dotR, 0, Math.PI * 2)
        if      (result === 'WIN')  ctx.fillStyle = GREEN
        else if (result === 'LOSS') ctx.fillStyle = RED
        else if (result === 'TIE')  ctx.fillStyle = YELLOW
        else                        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.fill()

        // Result letter inside dot
        if (result && result !== 'IN_PROGRESS') {
          ctx.fillStyle = result === 'TIE' ? '#78350f' : WHITE
          ctx.font = `bold 13px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(result === 'WIN' ? 'W' : result === 'LOSS' ? 'L' : 'T', cx, dotY + 5)
        }

        // Day label below
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(days[i], cx, dotY + dotR + 16)
      }
    }

    // ── Stats row ──
    ctx.textAlign = 'left'
    const statY = 230
    const stats = game ? [
      { label: 'GAME RECORD', value: `${gameResult(game.innings) === 'WIN' ? '🏆 ' : ''}${record.wins}W – ${record.losses}L` },
      { label: 'INNINGS WON', value: (() => { const c = game.innings.filter(i => i.status === 'CLOSED'); return `${c.filter(i => inningResult(i) === 'WIN').length}/${c.length}` })() },
      { label: 'RUNS SCORED', value: String(game.innings.reduce((s, i) => s + simulateRuns(i.offense_goals), 0)) },
    ] : [
      { label: 'SEASON RECORD', value: `${record.wins}W – ${record.losses}L` },
    ]

    const colW = (W - 72) / stats.length
    stats.forEach((s, i) => {
      const x = 36 + i * colW
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = 'bold 10px system-ui, sans-serif'
      ctx.letterSpacing = '1.5px'
      ctx.fillText(s.label, x, statY)
      ctx.letterSpacing = '0px'
      ctx.fillStyle = WHITE
      ctx.font = 'bold 26px system-ui, sans-serif'
      ctx.fillText(s.value, x, statY + 30)
    })

    // Streak badge
    if (streak.type && streak.count >= 2) {
      const badgeX = W - 36
      ctx.textAlign = 'right'
      ctx.fillStyle = streak.type === 'WIN' ? ORANGE : RED
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillText(`${streak.type === 'WIN' ? '🔥' : '📉'} ${streak.count} in a row`, badgeX, statY + 32)
    }

    // Bottom watermark
    ctx.textAlign = 'center'
    ctx.fillStyle = MUTED
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('wintheinning.app', W / 2, H - 16)

    // Orange accent bar bottom
    ctx.fillStyle = ORANGE
    ctx.fillRect(0, H - 4, W, 4)

  }, [game, record, streak, sport])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'win-the-inning-scorecard.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function handleShare() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async blob => {
      if (!blob) return
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'scorecard.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: 'Win the Inning, Win the Day',
          text: `Season record: ${record.wins}W – ${record.losses}L 🥎`,
          files: [new File([blob], 'scorecard.png', { type: 'image/png' })],
        })
      } else {
        handleDownload()
      }
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-brand-navy rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <p className="text-white font-black text-sm">Your Scorecard</p>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="p-4">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full rounded-xl"
          />
        </div>

        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm py-3 rounded-xl transition-colors"
          >
            ⬇️ Download
          </button>
          <button
            onClick={handleShare}
            className="bg-brand-orange hover:opacity-90 text-white font-bold text-sm py-3 rounded-xl transition-opacity"
          >
            📤 Share
          </button>
        </div>
      </div>
    </div>
  )
}
