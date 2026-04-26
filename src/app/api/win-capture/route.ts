import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'



const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const {
      winType, company, role, description,
      salaryBefore, salaryAfter, daysToWin, isPublic = false,
      generateLinkedInPost = true,
    } = await req.json()

    // Generate viral LinkedIn post
    let linkedinPost = ''
    if (generateLinkedInPost) {
      const hikeAmount = salaryBefore && salaryAfter
        ? `₹${salaryBefore}L → ₹${salaryAfter}L (${Math.round(((salaryAfter - salaryBefore) / salaryBefore) * 100)}% hike)`
        : ''

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert LinkedIn post writer for Indian IT professionals. Write authentic, relatable, non-cringe win posts that get engagement. Include a hook, story, lesson, and subtle product mention. Return JSON only.',
          },
          {
            role: 'user',
            content: `Win: ${winType} at ${company || 'a top company'}\nRole: ${role || 'new role'}\nSalary: ${hikeAmount}\nTime: ${daysToWin ? `${daysToWin} days` : 'recently'}\nDetails: ${description || ''}\n\nReturn JSON:\n{"post":"full LinkedIn post under 1200 chars with emojis, line breaks, hook/story/lesson/CTA format","hashtags":["#tag1","#tag2","#tag3"],"firstLine":"first line that hooks (used in preview)","variants":["shorter version under 600 chars","more data-focused version"]}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const postData = JSON.parse(completion.choices[0].message.content || '{}')
      linkedinPost = postData.post || ''
    }

    // Save win to DB
    const { data: win, error } = await db().from('user_wins').insert({
      user_id:      userId,
      win_type:     winType,
      company,
      role,
      description,
      salary_before: salaryBefore || null,
      salary_after:  salaryAfter || null,
      days_to_win:   daysToWin || null,
      is_public:     isPublic,
      linkedin_post: linkedinPost,
    }).select().single()

    if (error) throw error

    await trackEvent(userId, 'win_captured', { winType, company })

    return NextResponse.json({ win, linkedinPost })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data } = await db()
      .from('user_wins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Also fetch public wins for social proof
    const { data: publicWins } = await db()
      .from('user_wins')
      .select('win_type, company, role, salary_before, salary_after, days_to_win, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ wins: data || [], publicWins: publicWins || [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
