import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code   = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next   = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    // Create the redirect response first so we can attach cookies to it
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }

    console.error('exchangeCodeForSession error:', JSON.stringify(error))
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(String(error))}`)
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
