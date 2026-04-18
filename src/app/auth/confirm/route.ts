import { type EmailOtps } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtps | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      // Important: Use NextResponse.redirect for API routes instead of next/navigation
      return NextResponse.redirect(new URL(`/${next.slice(1)}`, request.url))
    }
  }

  // redirect the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=Invalid%20or%20expired%20verification%20link', request.url))
}
