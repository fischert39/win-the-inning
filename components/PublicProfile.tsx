interface PublicProfileData {
  username:       string
  display_name:   string | null
  team_name:      string | null
  mascot:         string | null
  sport:          string
  game_wins:      number
  game_losses:    number
  innings_won:    number
  innings_played: number
  recent_games:   string[] | null  // array of 'WIN' | 'LOSS' | 'TIE'
}

interface Props {
  profile: PublicProfileData
}

export default function PublicProfile({ profile }: Props) {
  const sportEmoji  = profile.sport === 'baseball' ? '⚾' : '🥎'
  const displayIcon = profile.mascot ?? sportEmoji
  const name        = profile.team_name ?? profile.display_name ?? profile.username
  const winPct      = profile.innings_played > 0
    ? Math.round((profile.innings_won / profile.innings_played) * 100)
    : 0
  const recentGames = (profile.recent_games ?? []).slice().reverse()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-navy to-[#0F3460] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Profile card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-6 mb-4">

          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-7xl block mb-3">{displayIcon}</span>
            <h1 className="font-black text-2xl text-white leading-tight">{name}</h1>
            {profile.team_name && profile.display_name && (
              <p className="text-white/50 text-sm mt-0.5">{profile.display_name}</p>
            )}
            <p className="text-white/50 text-xs mt-1">@{profile.username} · Win the Inning</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-white tabular-nums">
                {profile.game_wins}
                <span className="text-white/40 font-normal">–</span>
                {profile.game_losses}
              </p>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-1">Game Record</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-white tabular-nums">
                {winPct}<span className="text-white/40 text-lg font-normal">%</span>
              </p>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-1">
                Innings Won
              </p>
              <p className="text-white/30 text-[10px]">{profile.innings_won}/{profile.innings_played}</p>
            </div>
          </div>

          {/* Recent games */}
          {recentGames.length > 0 && (
            <div className="text-center">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2">Recent Games</p>
              <div className="flex justify-center gap-2">
                {recentGames.map((result, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${
                      result === 'WIN'  ? 'bg-green-500/25 text-green-400 ring-1 ring-green-500/30' :
                      result === 'LOSS' ? 'bg-red-500/25 text-red-400 ring-1 ring-red-500/30' :
                                          'bg-yellow-500/25 text-yellow-400 ring-1 ring-yellow-500/30'
                    }`}
                  >
                    {result === 'WIN' ? 'W' : result === 'LOSS' ? 'L' : 'T'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <a
          href="/login"
          className="block w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white font-black text-center py-4 rounded-2xl shadow-xl hover:opacity-90 transition-opacity"
        >
          {sportEmoji} Play Win the Inning
        </a>
        <p className="text-center text-white/50 text-xs mt-3">
          Track your daily habits like a baseball season
        </p>
      </div>
    </div>
  )
}
