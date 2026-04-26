import { createClient } from '@supabase/supabase-js'

export type AIMemory = {
  targetRole?: string
  salaryGoal?: number
  skills?: string[]
  yearsExp?: number
  currentCompany?: string
  tier?: string
  location?: string
  openToRemote?: boolean
  topCompanies?: string[]
  lastResumeScore?: number
  applicationsThisWeek?: number
  strongestSkills?: string[]
  weakestSkills?: string[]
  interviewsScheduled?: number
  preferredJobTypes?: string[]
}

export async function getPersonalization(userId: string): Promise<AIMemory> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await db
    .from('profiles')
    .select('ai_memory, current_role, skills, years_experience, role_tier, desired_salary_max, target_companies, target_roles')
    .eq('id', userId)
    .single()

  const base: AIMemory = {
    targetRole: data?.target_roles?.[0] || data?.current_role,
    salaryGoal: data?.desired_salary_max,
    skills: data?.skills || [],
    yearsExp: data?.years_experience,
    tier: data?.role_tier,
    topCompanies: data?.target_companies || [],
    ...(data?.ai_memory || {}),
  }
  return base
}

export async function updatePersonalization(userId: string, updates: Partial<AIMemory>): Promise<void> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: existing } = await db.from('profiles').select('ai_memory').eq('id', userId).single()
  const current = existing?.ai_memory || {}
  await db.from('profiles').update({ ai_memory: { ...current, ...updates }, updated_at: new Date().toISOString() }).eq('id', userId)
}

export function buildPersonalizedSystemPrompt(memory: AIMemory): string {
  const parts = []
  if (memory.targetRole) parts.push(`Target role: ${memory.targetRole}`)
  if (memory.tier) parts.push(`Career level: ${memory.tier}`)
  if (memory.yearsExp) parts.push(`${memory.yearsExp} years of experience`)
  if (memory.skills?.length) parts.push(`Skills: ${memory.skills.slice(0, 8).join(', ')}`)
  if (memory.salaryGoal) parts.push(`Salary goal: ₹${memory.salaryGoal}L`)
  if (memory.location) parts.push(`Location: ${memory.location}`)
  if (memory.topCompanies?.length) parts.push(`Target companies: ${memory.topCompanies.slice(0, 5).join(', ')}`)
  if (memory.lastResumeScore) parts.push(`Last ATS score: ${memory.lastResumeScore}`)
  if (memory.weakestSkills?.length) parts.push(`Skills to improve: ${memory.weakestSkills.join(', ')}`)
  return parts.length > 0 ? `\n\nUser context (use to personalise responses):\n${parts.join('\n')}` : ''
}
