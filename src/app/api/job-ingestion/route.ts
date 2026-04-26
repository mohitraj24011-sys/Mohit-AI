import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { getPlatformsForTier } from '@/lib/platforms'



const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch user-relevant jobs from ingested_jobs
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const query    = searchParams.get('q') || ''
    const platform = searchParams.get('source') || ''
    const remote   = searchParams.get('remote') === 'true'
    const page     = parseInt(searchParams.get('page') || '0')

    let dbQuery = db()
      .from('ingested_jobs')
      .select('*')
      .order('scraped_at', { ascending: false })
      .range(page * 20, page * 20 + 19)

    if (query) dbQuery = dbQuery.ilike('title', `%${query}%`)
    if (platform) dbQuery = dbQuery.eq('source', platform)
    if (remote) dbQuery = dbQuery.eq('is_remote', true)

    const { data, count } = await dbQuery
    return NextResponse.json({ jobs: data || [], total: count || 0, page })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

// POST — generate job discovery strategy + search links
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { skills, targetRole, tier, location, salaryMin, includeRemote } = await req.json()
    const platforms = getPlatformsForTier(tier || 'mid')

    // Generate intelligent search strategy
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Job search intelligence expert for Indian IT professionals. Generate search strategies that surface hidden opportunities. Return JSON only.',
        },
        {
          role: 'user',
          content: `Skills: ${(skills || []).join(', ')}\nRole: ${targetRole}\nTier: ${tier}\nLocation: ${location || 'India'}\nRemote: ${includeRemote}\nMin Salary: ${salaryMin || 15} LPA\n\nReturn JSON:\n{"primaryQuery":"best search phrase","alternativeQueries":["3 variations"],"booleanQuery":"LinkedIn boolean","xraySearches":[{"query":"Google X-Ray search","why":"what it finds uniquely"}],"hiddenSources":[{"name":"source name","url":"exact URL","why":"why it has jobs not on main boards","action":"what to do"}],"weeklyRoutine":[{"day":"Monday","action":"15-min action","platform":"where"}],"hnWhoHiringSearch":"search term for HN Who's Hiring","redditCommunities":["r/subreddit - why"]}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const strategy = JSON.parse(completion.choices[0].message.content || '{}')

    // Build search URLs for all platforms
    const searchLinks = platforms.map(p => ({
      platform: p.name,
      logo: p.logo,
      type: p.type,
      url: p.searchUrl(strategy.primaryQuery || targetRole || 'Software Engineer', location || 'India'),
      relevance: p.tierFocus.includes(tier || 'mid') ? 'high' : p.tierFocus.includes('all') ? 'medium' : 'low',
    })).sort((a, b) => a.relevance === 'high' ? -1 : b.relevance === 'high' ? 1 : 0)

    return NextResponse.json({ strategy, searchLinks, totalPlatforms: platforms.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
