import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[push/subscribe] user:', user?.id ?? null, 'authError:', authError?.message ?? null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { subscription } = body
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
  }

  console.log('[push/subscribe] upserting for user:', user.id, 'endpoint:', subscription.endpoint.slice(0, 50))
  const { error, data } = await supabase.from('push_subscriptions').upsert(
    {
      user_id:  user.id,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys.p256dh,
      auth:     subscription.keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  ).select()

  console.log('[push/subscribe] upsert error:', error?.message ?? null, 'data:', JSON.stringify(data))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
