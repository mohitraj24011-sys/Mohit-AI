import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Queue a Naukri profile refresh (worker picks it up)
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { action, headline, openToWork } = await req.json()

    if (action === 'queue_update') {
      // Queue a Naukri update in social_post_queue
      const { data } = await db().from('social_post_queue').insert({
        user_id:      userId,
        platform:     'naukri',
        trigger_type: 'manual',
        content:      headline || 'Profile refresh',
        status:       'pending',
        metadata:     { naukriAction: 'mark_active', headline, openToWork },
      }).select().single()

      await trackEvent(userId, 'naukri_update_queued', {})
      return NextResponse.json({ success: true, queued: data })
    }

    if (action === 'get_profile_link') {
      const { data: profile } = await db()
        .from('profiles')
        .select('naukri_username, naukri_url')
        .eq('id', userId)
        .single()

      const link = profile?.naukri_username
        ? `https://www.naukri.com/profile/${profile.naukri_username}`
        : profile?.naukri_url || 'https://www.naukri.com/mnjuser/profile'

      return NextResponse.json({ link, username: profile?.naukri_username })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
