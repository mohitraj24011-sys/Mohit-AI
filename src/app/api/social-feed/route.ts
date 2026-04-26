import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  try {
    const { data } = await db()
      .from('social_posts')
      .select('id, post_type, content, likes, tags, created_at, is_anonymous')
      .eq('is_anonymous', true)
      .order('created_at', { ascending: false })
      .limit(30)
    return NextResponse.json({ posts: data || [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { content, post_type, tags } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const { data, error } = await db().from('social_posts').insert({
      user_id: userId, content: content.trim(), post_type: post_type || 'job_hunt_update',
      tags: Array.isArray(tags) ? tags : [], is_anonymous: true,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ post: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
