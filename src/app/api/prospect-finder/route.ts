import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { PROSPECT_SOURCES, LeadType } from '@/lib/marketingEngine'
import { trackEvent } from '@/lib/plans'



export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { leadType, filters } = await req.json()
    const sources = PROSPECT_SOURCES[leadType as LeadType]
    if (!sources) return NextResponse.json({ error: 'Unknown lead type' }, { status: 400 })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Expert sales prospector for Indian market. Generate hyper-specific prospect-finding instructions and ready-to-use search queries. Return JSON only.',
        },
        {
          role: 'user',
          content: `Find prospects for: ${leadType}
Filters: ${JSON.stringify(filters || {})}
Signal keywords: ${sources.signalKeywords.join(', ')}
Avg deal value: ₹${sources.avgDealValue}
LinkedIn searches: ${sources.linkedinSearches.join(' | ')}
Reddit: ${sources.redditCommunities.join(', ')}
Google X-Ray: ${sources.googleSearches.join(' | ')}

Return JSON:
{
  "linkedinSearches": [
    {"query":"exact boolean search string","estimatedResults":"X profiles","why":"what makes these high intent"}
  ],
  "googleSearches": [
    {"query":"exact google search","url":"full google url","expectedResults":"X","tip":"how to use these results"}
  ],
  "twitterSearches": [
    {"query":"exact twitter search","url":"https://twitter.com/search?q=...","intent":"what signal this captures"}
  ],
  "redditPosts": [
    {"subreddit":"...","searchQuery":"...","url":"full reddit search url","postApproach":"how to engage authentically"}
  ],
  "directSources": [
    {"name":"...","url":"...","howToUse":"step by step instructions","expectedLeads":0}
  ],
  "whatsappGroups": [
    {"groupType":"...","howToFind":"...","joinApproach":"..."}
  ],
  "weeklyRoutine": [
    {"day":"Monday","task":"...","platform":"...","timeMinutes":20,"expectedLeads":5}
  ],
  "signalAlerts": [
    {"alertType":"...","setupInstructions":"...","tool":"Google Alerts/LinkedIn/Twitter"}
  ],
  "estimatedWeeklyLeads": 0,
  "qualityVsQuantityAdvice": "..."
}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    await trackEvent(userId, 'prospects_found', { leadType })
    return NextResponse.json({ ...result, leadType, sources: { linkedinSearches: sources.linkedinSearches, directSources: sources.directSources } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
