import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getPersonalization } from '@/lib/personalization'


const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    // Check if today's challenges already exist
    const { data: existing } = await db()
      .from('daily_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (existing) {
      return NextResponse.json({
        challenges: existing.challenges,
        completed: existing.completed,
        xpEarned: existing.xp_earned,
        date: today,
        allDone: (existing.completed as string[]).length >= (existing.challenges as unknown[]).length,
      })
    }

    // Generate new challenges for today
    const mem = await getPersonalization(userId)
    const { data: profile } = await db()
      .from('profiles')
      .select('streak_days, xp_points, level, onboarding_step, user_type')
      .eq('id', userId)
      .single()

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a career coach. Generate 3 micro-tasks (daily challenges) for a job seeker. Each task should take 10-20 minutes and create real momentum. Make them specific, actionable, and progressively harder based on user level. Return JSON only.',
        },
        {
          role: 'user',
          content: `User: ${mem.targetRole || 'Software Engineer'}, ${mem.yearsExp || 3} years exp, skills: ${(mem.skills || []).slice(0,5).join(', ')}
Level: ${profile?.level || 1}, Streak: ${profile?.streak_days || 0} days
User type: ${profile?.user_type || 'job_seeker'}

Return 3 challenges as JSON:
{"challenges":[
  {"id":"c1","title":"Quick Win","description":"exact actionable task","xp":25,"category":"networking","estimatedMinutes":10,"platform":"LinkedIn","successCriteria":"how user knows they completed it"},
  {"id":"c2","title":"Growth Task","description":"...","xp":50,"category":"application","estimatedMinutes":20,"platform":"Naukri","successCriteria":"..."},
  {"id":"c3","title":"Skill Builder","description":"...","xp":75,"category":"learning","estimatedMinutes":30,"platform":"any","successCriteria":"..."}
]}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(completion.choices[0].message.content || '{}')
    const challenges = parsed.challenges || []

    await db().from('daily_challenges').insert({
      user_id:    userId,
      date:       today,
      challenges,
      completed:  [],
      xp_earned:  0,
    })

    // Update streak
    await db().rpc('update_streak', { p_user_id: userId })

    return NextResponse.json({ challenges, completed: [], xpEarned: 0, date: today, allDone: false })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { challengeId } = await req.json()
    const today = new Date().toISOString().split('T')[0]

    const { data: dc } = await db()
      .from('daily_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (!dc) return NextResponse.json({ error: 'No challenges for today' }, { status: 404 })

    const completed = dc.completed as string[]
    if (completed.includes(challengeId)) return NextResponse.json({ alreadyDone: true })

    const challenge = (dc.challenges as {id:string;xp:number}[]).find(c => c.id === challengeId)
    const xpGain = challenge?.xp || 25

    const newCompleted = [...completed, challengeId]
    const newXp = (dc.xp_earned || 0) + xpGain

    await db().from('daily_challenges').update({ completed: newCompleted, xp_earned: newXp }).eq('id', dc.id)
    await db().rpc('add_xp', { p_user_id: userId, p_xp: xpGain })

    // Award streak achievement if applicable
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { data: profile } = await db().from('profiles').select('*').eq('id', userId).single()
    const streak = profile?.streak_days || 0
    if (streak === 7)   await db().from('achievements').insert({ user_id: userId, achievement: 'streak_7', category: 'streak', xp_earned: 200, badge_icon: '🔥', description: '7-day streak' }).catch(() => {})
    if (streak === 30)  await db().from('achievements').insert({ user_id: userId, achievement: 'streak_30', category: 'streak', xp_earned: 750, badge_icon: '🌟', description: '30-day streak' }).catch(() => {})

    const allDone = newCompleted.length >= (dc.challenges as unknown[]).length
    return NextResponse.json({ success: true, xpGained: xpGain, allDone, totalXpToday: newXp })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
