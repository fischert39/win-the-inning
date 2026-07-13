import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Win the Inning season scorecard'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface ProfileData {
  username:       string
  display_name:   string | null
  team_name:      string | null
  sport:          string
  game_wins:      number
  game_losses:    number
  innings_won:    number
  innings_played: number
}

async function getProfile(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_public_profile`, {
      method: 'POST',
      headers: {
        apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_username: username }),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

function Ball({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <circle cx="256" cy="256" r="192" fill="#E8DE54" />
      <circle cx="256" cy="256" r="192" fill="none" stroke="#C9BF3F" strokeWidth="6" />
      <path d="M 168 100 Q 48 256 168 412" fill="none" stroke="#D14B3C" strokeWidth="15" strokeLinecap="round" />
      <path d="M 344 100 Q 464 256 344 412" fill="none" stroke="#D14B3C" strokeWidth="15" strokeLinecap="round" />
    </svg>
  )
}

export default async function Image({ params }: { params: { username: string } }) {
  const p = await getProfile(params.username)
  const name = p ? (p.team_name ?? p.display_name ?? `@${p.username}`) : 'Win the Inning'
  const pct  = p && p.innings_played > 0 ? Math.round((p.innings_won / p.innings_played) * 100) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #16213E 0%, #0F3460 100%)',
          padding: '0 90px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#FF6B35', fontSize: 28, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase' }}>
            Win the Inning
          </div>
          <div style={{ color: '#ffffff', fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 14, maxWidth: 760 }}>
            {name}
          </div>
          {p && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 40, marginTop: 34 }}>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ color: '#2DC653', fontSize: 64, fontWeight: 800 }}>{p.game_wins}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 44, margin: '0 10px' }}>–</span>
                <span style={{ color: '#ffffff', fontSize: 64, fontWeight: 800 }}>{p.game_losses}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 26, marginLeft: 16 }}>season record</span>
              </div>
              {pct !== null && (
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ color: '#ffffff', fontSize: 64, fontWeight: 800 }}>{pct}%</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 26, marginLeft: 16 }}>innings won</span>
                </div>
              )}
            </div>
          )}
          {!p && (
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 32, marginTop: 20 }}>
              Turn your big goals into daily micro-wins.
            </div>
          )}
        </div>
        <Ball size={320} />
      </div>
    ),
    size
  )
}
