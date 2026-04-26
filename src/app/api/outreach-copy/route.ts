import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { type, targetAudience, platform, tone } = await req.json()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Expert copywriter for SaaS growth for Indian IT job search platform. Write viral, authentic, non-corporate posts that drive signups. Target: Indian software engineers looking for jobs. Return JSON only.`,
        },
        {
          role: 'user',
          content: `Platform: ${platform || 'LinkedIn'}\nType: ${type}\nAudience: ${targetAudience || 'Indian IT professionals job hunting'}\nTone: ${tone || 'authentic and direct'}\n\nReturn JSON:\n{"post":"full post text with emojis","hook":"first line that stops scroll","hashtags":["#tag"],"cta":"call to action","variants":["shorter version","problem-focused version","story version"],"dmScript":"DM script for reaching out manually","whatsappMessage":"short WhatsApp blast message","bestTimeToPost":"day and time IST","expectedReach":"estimate"}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    return NextResponse.json(JSON.parse(completion.choices[0].message.content || '{}'))
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
