import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build' })
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// POST — generate WhatsApp outreach scripts for specific scenarios
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const { action, target, context } = await req.json()

    if (action === 'generate_scripts') {
      // Generate WhatsApp messages for all 3 stages of the funnel
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert growth marketer for Indian SaaS. Write WhatsApp messages that convert — short, casual, specific, no corporate tone. Return JSON only.',
          },
          {
            role: 'user',
            content: `Generate WhatsApp outreach scripts for MohitJob AI — an AI that applies to jobs automatically.

Target: ${target || 'Indian IT professionals job hunting'}
Context: ${context || 'General job seeker outreach'}

Return JSON:
{
  "coldMessage": {
    "text": "first message to someone you don't know (under 200 chars, conversational)",
    "sendWhen": "when to send this",
    "followUp": "if no reply after 2 days (under 150 chars)"
  },
  "warmMessage": {
    "text": "message for someone who showed interest (under 250 chars)",
    "hook": "what gets them to try it"
  },
  "conversionMessage": {
    "text": "message to convert a free user to paid (under 300 chars)",
    "urgency": "what creates urgency without being pushy",
    "offer": "what special offer to include if any"
  },
  "groupMessage": {
    "text": "message to post in a WhatsApp group (alumni, company, college — under 300 chars)",
    "hashtags": ["#tag"],
    "bestGroups": ["type of group that converts best"]
  },
  "templates": {
    "gotInterview": "share when a user gets an interview (social proof message to send to others)",
    "gotOffer": "viral message when user gets an offer"
  }
}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      return NextResponse.json(JSON.parse(completion.choices[0].message.content || '{}'))
    }

    if (action === 'capture_lead') {
      // Save a WhatsApp lead (someone who expressed interest)
      const { name, phone, email, role, source } = req.body as Record<string, string> || {}
      const body = await req.json().catch(() => ({}))

      const { data, error } = await db().from('whatsapp_leads').upsert({
        name:   body.name || name || null,
        phone:  body.phone || phone,
        email:  body.email || email || null,
        role:   body.role || role || null,
        source: body.source || source || 'whatsapp',
        stage:  'new',
      }, { onConflict: 'phone' }).select().single()

      if (error) throw error
      return NextResponse.json({ lead: data })
    }

    if (action === 'get_funnel_copy') {
      // Return the complete WhatsApp distribution plan
      return NextResponse.json({
        phase1: {
          name: 'Week 1 — IT Professionals (Fastest to convert)',
          dailyTarget: 20,
          totalTarget: 100,
          message: `Hey [Name]! 👋 I built a free AI that applies to jobs for you automatically — LinkedIn, Naukri, Indeed + 20 more. Takes 2 mins to set up. 

Used it myself to get 5 interviews in 2 weeks. Sharing with people in my network who might find it useful.

Want access? → ${process.env.NEXT_PUBLIC_APP_URL || 'mohitjob.ai'}`,
          where: ['College alumni WhatsApp groups', 'Company ex-employees groups', 'Tech community groups', 'Direct DM to "Open to Work" profiles on LinkedIn'],
          expectedConversions: '5-10 users',
        },
        phase2: {
          name: 'Week 2 — Social Proof Blast (After first wins)',
          dailyTarget: 15,
          message: `🎉 A friend just got an interview at Razorpay using MohitJob AI — the AI applied while he was sleeping.

He went from 0 to 3 interviews in 10 days without manually applying once.

Free to try: ${process.env.NEXT_PUBLIC_APP_URL || 'mohitjob.ai'}`,
          where: ['All previous groups again', 'LinkedIn post', 'Twitter/X thread'],
          expectedConversions: '10-20 users',
        },
        phase3: {
          name: 'Week 3-4 — Paid Conversion (Pro upgrade push)',
          message: `Hey [Name], checking in — how\'s the job search going?

If you want unlimited auto-apply (30 jobs/day), interview prep, and salary negotiation scripts — Pro is ₹499/month.

One interview from here covers the cost 100x. Let me know if you want a trial extension.`,
          where: ['Direct message to free users who applied 3+ jobs'],
          expectedConversions: '5-10 paying users',
        },
        urgencyTriggers: [
          'Limited free tier (3 resumes/day) — shows scarcity',
          '7-day free trial on Pro — removes risk',
          'Show competitor salary (what others got) — shows stakes',
          'Streak notifications — "Your 5-day streak ends tonight"',
        ],
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
