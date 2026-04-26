import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage } from '@/lib/plans'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data } = await db()
      .from('company_watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ companies: data || [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { action, company, website, skills, targetRole } = await req.json()

    if (action === 'add_watchlist') {
      const { data, error } = await db().from('company_watchlist').insert({
        user_id: userId, company, website: website || null, status: 'watching',
      }).select().single()
      if (error) throw error
      return NextResponse.json({ company: data })
    }

    if (action === 'research') {
      const { allowed } = await checkLimit(userId, 'market_trends')
      if (!allowed) return NextResponse.json({ error: 'Limit reached', upgradeUrl: '/pricing' }, { status: 429 })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Expert company researcher for Indian IT job seekers. Provide deep intel on companies including culture, tech stack, hiring process, salary ranges. Return JSON only.' },
          { role: 'user', content: `Research: ${company}\nMy skills: ${(skills||[]).join(', ')}\nTarget role: ${targetRole || 'Software Engineer'}\n\nReturn JSON:\n{"overview":"2 sentences","techStack":["tech used"],"culture":{"workLifeBalance":"rating+desc","growth":"...","remoteFriendly":true,"interviewDifficulty":"easy/medium/hard"},"salaryRange":{"junior":"X-YL","senior":"A-BL","remote":"C-D USD"},"hiringProcess":["step1","step2"],"insiderTips":["tip from employee reviews"],"recentNews":["notable thing 2024"],"bestRolesFor":"who fits here","applyStrategy":"how to get noticed here","linkedinSearch":"exact search to find employees","glassdoorRating":0.0,"verdict":"should you apply? why"}` },
        ],
        response_format: { type: 'json_object' },
      })

      await incrementUsage(userId, 'market_trends')
      const intel = JSON.parse(completion.choices[0].message.content || '{}')

      // Update watchlist if company exists
      await db().from('company_watchlist').upsert({
        user_id: userId, company, intel, website: website || null,
      }, { onConflict: 'user_id,company' }).catch(() => {})

      return NextResponse.json(intel)
    }

    if (action === 'update_status') {
      const { id, status, notes } = await req.json()
      const { data } = await db().from('company_watchlist').update({ status, notes }).eq('id', id).eq('user_id', userId).select().single()
      return NextResponse.json({ company: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db().from('company_watchlist').delete().eq('id', id).eq('user_id', userId)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
