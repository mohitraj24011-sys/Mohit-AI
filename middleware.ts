import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public routes — no auth needed
const PUBLIC_PATHS = ['/', '/auth', '/pricing', '/api/health', '/api/stripe/webhook']

// Job seeker only routes
const JOB_SEEKER_PATHS = [
  '/resume', '/cover-letter', '/tracker', '/network', '/linkedin-extender',
  '/agents', '/gap-analysis', '/learning', '/interview-prep', '/role-advisor',
  '/profile-optimizer', '/auto-apply', '/background', '/opportunities',
  '/war-room', '/dashboard', '/salary', '/funnel', '/company', '/offer',
  '/achievements', '/social',
]

// Client seeker only routes
const CLIENT_SEEKER_PATHS = ['/marketing', '/leads', '/campaigns', '/b2b']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Allow API routes to handle their own auth (except guarded ones below)
  if (pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/marketing-agent') &&
    !pathname.startsWith('/api/leads') &&
    !pathname.startsWith('/api/campaign')) {
    return NextResponse.next()
  }

  // Get auth token from cookie
  const token = req.cookies.get('sb-access-token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    // For page routes, redirect to auth
    if (!pathname.startsWith('/api/')) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await db.auth.getUser(token)
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    }

    // Get user type
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    const userType = profile?.user_type || 'job_seeker'

    // Guard client-seeker routes from job seekers
    if (userType === 'job_seeker' &&
      CLIENT_SEEKER_PATHS.some(p => pathname.startsWith(p))) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Add user-type header for pages to use
    const res = NextResponse.next()
    res.headers.set('x-user-type', userType)
    return res
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}
