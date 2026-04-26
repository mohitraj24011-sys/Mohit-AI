// worker/posters/post-generator.ts
// Generates the actual post content for each trigger type
// All posts are authentic, non-cringe, human-sounding

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type TriggerType = 'offer' | 'interview' | 'applications_50' | 'applications_100' | 'manual' | 'win' | 'weekly_update' | 'streak_milestone'

export interface PostContext {
  triggerType: TriggerType
  userRole?:     string        // "Senior Backend Engineer"
  company?:      string        // "Razorpay"
  salaryBefore?: number        // 18 (LPA)
  salaryAfter?:  number        // 32 (LPA)
  daysInSearch?: number        // 45
  applicationCount?: number    // 50
  interviewCompany?: string    // "CRED"
  streakDays?:   number        // 30
  skills?:       string[]
  manualNote?:   string        // any extra context user wants
}

export interface GeneratedPost {
  linkedin: string   // full LinkedIn post (up to 1300 chars)
  short:    string   // short version (<280 chars for Twitter/X)
  headline: string   // one-line summary
  hashtags: string[] // relevant hashtags
  shareUrl: string   // pre-filled LinkedIn share URL
  emojiHook: string  // first emoji/hook line for preview
}

// ── Generate post content using AI ────────────────────────────────────────────
export async function generatePostContent(ctx: PostContext): Promise<GeneratedPost> {
  const prompt = buildPrompt(ctx)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a ghostwriter for Indian IT professionals on LinkedIn. 
Write authentic, human-sounding posts that get real engagement.
NEVER use: "I'm thrilled to announce", "Excited to share", "humbled", "journey", "passion".
DO use: specific numbers, honest struggle, real lessons, gratitude without cringe.
Indian IT professionals respond to: real salary numbers, company names, specific tools/skills, relatable struggles.
Always be specific. Never be generic. Return JSON only.`,
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85,
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')

  const linkedin = result.linkedin || result.post || ''
  const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedin)}`

  return {
    linkedin,
    short:    result.short || linkedin.slice(0, 280),
    headline: result.headline || '',
    hashtags: result.hashtags || [],
    shareUrl,
    emojiHook: linkedin.split('\n')[0] || '',
  }
}

function buildPrompt(ctx: PostContext): string {
  const hikePercent = ctx.salaryBefore && ctx.salaryAfter
    ? Math.round(((ctx.salaryAfter - ctx.salaryBefore) / ctx.salaryBefore) * 100)
    : null

  const prompts: Record<TriggerType, string> = {
    offer: `
Write a LinkedIn post for an Indian IT professional who just received a job offer.
Details:
- New company: ${ctx.company || 'a top startup'}
- Role: ${ctx.userRole || 'Software Engineer'}
- Old salary: ₹${ctx.salaryBefore || 0}L
- New salary: ₹${ctx.salaryAfter || 0}L  
- Hike: ${hikePercent || 0}%
- Days searching: ${ctx.daysInSearch || 'a few weeks'}
- Skills: ${(ctx.skills || []).slice(0, 4).join(', ')}
${ctx.manualNote ? `- Extra context: ${ctx.manualNote}` : ''}

Post style: Start with the number (salary or hike %), share 2-3 real lessons from the search, thank 1-2 specific things (not people), end with a tip for others job hunting.
Length: 800-1000 characters. Real, specific, no corporate speak.`,

    interview: `
Write a LinkedIn post for an Indian IT professional who just landed an interview at ${ctx.interviewCompany || 'a dream company'}.
Role: ${ctx.userRole || 'Software Engineer'}
Days in search: ${ctx.daysInSearch || 'a few weeks'}
${ctx.manualNote ? `Extra context: ${ctx.manualNote}` : ''}

Post style: Share what worked to get the interview (specific - DM to someone, referral, specific resume change, etc.), keep it brief and useful.
Length: 400-600 characters. No announcements, just useful insight.`,

    applications_50: `
Write a LinkedIn post for an Indian IT professional who just sent their 50th job application using AI automation.
Role: ${ctx.userRole || 'Software Engineer'}
${ctx.manualNote ? `Extra context: ${ctx.manualNote}` : ''}

Post style: Share what they learned after 50 applications - what worked, what didn't, how AI automation changed the game. Specific numbers. Practical tips.
Length: 600-900 characters. Insightful, data-driven, helpful to other job seekers.`,

    applications_100: `
Write a LinkedIn post for an Indian IT professional who just hit 100 job applications (automated).
Role: ${ctx.userRole || 'Software Engineer'}
Applications: 100
${ctx.manualNote ? `Extra context: ${ctx.manualNote}` : ''}

Post style: "100 applications later, here's what the data shows" format. Include what % replied, what platforms worked, what kind of roles responded. Very data-focused. Practical for others.
Length: 700-1000 characters.`,

    manual: `
Write a LinkedIn post for an Indian IT professional.
Context from user: ${ctx.manualNote || 'sharing their job search update'}
Role: ${ctx.userRole || 'Software Engineer'}
${ctx.company ? `Company: ${ctx.company}` : ''}
${ctx.salaryAfter ? `New salary: ₹${ctx.salaryAfter}L` : ''}

Post style: Natural, conversational, specific to the context they provided. Not promotional.
Length: 500-900 characters.`,

    win: `
Write a LinkedIn post celebrating a career win for an Indian IT professional.
Win: ${ctx.manualNote || 'got a new job'}
${ctx.company ? `Company: ${ctx.company}` : ''}
${ctx.salaryBefore && ctx.salaryAfter ? `Salary: ₹${ctx.salaryBefore}L → ₹${ctx.salaryAfter}L (+${hikePercent}%)` : ''}
Days: ${ctx.daysInSearch || 'recently'}

Post style: Lead with the outcome, explain the process briefly, share 1 insight others can use. Genuine, not performative.
Length: 600-900 characters.`,

    weekly_update: `
Write a weekly job search update post for LinkedIn.
Role searching for: ${ctx.userRole || 'Software Engineer'}
Applications sent this week: ${ctx.applicationCount || 'several'}
Days in search: ${ctx.daysInSearch || 'a few weeks'}
${ctx.manualNote ? `This week's highlights: ${ctx.manualNote}` : ''}

Post style: Weekly accountability post. What was tried, what worked, what's next. Transparent and motivating for others in the same boat.
Length: 500-700 characters.`,

    streak_milestone: `
Write a LinkedIn post about maintaining a ${ctx.streakDays || 30}-day job search streak.
Role: ${ctx.userRole || 'Software Engineer'}
${ctx.manualNote ? `Extra: ${ctx.manualNote}` : ''}

Post style: Reflect on what daily consistency in job hunting looks like. What small actions compound over ${ctx.streakDays || 30} days. Motivating, practical.
Length: 400-600 characters.`,
  }

  return `${prompts[ctx.triggerType]}

Return JSON with:
{
  "linkedin": "full LinkedIn post text (use \\n for line breaks)",
  "short": "version under 280 chars for Twitter/X",
  "headline": "one-line summary of the post",
  "hashtags": ["#JobSearch", "#IndianTech", "#SoftwareEngineer", "3-5 relevant hashtags"],
  "hook": "most compelling sentence to use as preview"
}`
}

// ── Determine if a trigger should fire ────────────────────────────────────────
export function shouldTrigger(triggerType: TriggerType, stats: {
  applicationCount: number
  hasOffer: boolean
  hasInterview: boolean
  streakDays: number
  lastTriggered?: Record<string, string>
}): boolean {
  const today = new Date().toISOString().split('T')[0]
  const lastFired = stats.lastTriggered?.[triggerType]

  // Don't fire same trigger twice in one day
  if (lastFired === today) return false

  switch (triggerType) {
    case 'offer':            return stats.hasOffer
    case 'interview':        return stats.hasInterview
    case 'applications_50':  return stats.applicationCount >= 50 && stats.applicationCount < 55
    case 'applications_100': return stats.applicationCount >= 100 && stats.applicationCount < 105
    case 'streak_milestone': return [7, 14, 21, 30, 60, 100].includes(stats.streakDays)
    case 'manual':           return true  // always allowed
    case 'weekly_update':    return new Date().getDay() === 5  // Fridays
    case 'win':              return true
    default:                 return false
  }
}
