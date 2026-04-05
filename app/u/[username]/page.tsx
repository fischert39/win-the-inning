import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import PublicProfile from '@/components/PublicProfile'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateMetadata({ params }: { params: { username: string } }) {
  const { data } = await supabase.rpc('get_public_profile', { p_username: params.username })
  if (!data) return { title: 'Player Not Found | Win the Inning' }
  const name = data.team_name ?? data.display_name ?? `@${data.username}`
  return {
    title: `${name} | Win the Inning`,
    description: `${name}'s season: ${data.game_wins}W – ${data.game_losses}L · ${data.innings_won}/${data.innings_played} innings won`,
  }
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const { data } = await supabase.rpc('get_public_profile', { p_username: params.username })
  if (!data) notFound()
  return <PublicProfile profile={data} />
}
