import { ROLE_TIERS } from './role-tiers'

export function generateConnectionMessage(
  targetName: string, targetRole: string, targetCompany: string,
  myRole: string, mySkills: string[], tier: string
): string {
  const templates: Record<string, string> = {
    fresher:        `Hi ${targetName}, I'm a passionate CS grad skilled in ${mySkills.slice(0,2).join(' and ')}. Your work at ${targetCompany} on ${targetRole.toLowerCase()} is inspiring. Would love to connect and learn from your journey.`,
    junior:         `Hi ${targetName}, I'm a ${myRole} with hands-on experience in ${mySkills.slice(0,3).join(', ')}. Exploring opportunities at companies like ${targetCompany}. Would love to connect.`,
    mid:            `Hi ${targetName}, I'm a ${myRole} with strong background in ${mySkills.slice(0,3).join(', ')}. Your role at ${targetCompany} aligns with my next step. Happy to connect and explore synergies.`,
    senior:         `Hi ${targetName}, Fellow ${myRole.toLowerCase()} — built ${mySkills.slice(0,2).join(' and ')} systems at scale. Admire the work ${targetCompany} is doing. Would be great to connect.`,
    staff:          `Hi ${targetName}, I'm a Staff/Principal Engineer specialised in ${mySkills.slice(0,2).join(' and ')}. Follow your work around ${targetRole.toLowerCase()} at ${targetCompany}. Would value connecting.`,
    manager:        `Hi ${targetName}, I lead engineering teams focused on ${mySkills.slice(0,2).join(' and ')}. The team structure at ${targetCompany} resonates with my leadership approach. Let's connect.`,
    senior_manager: `Hi ${targetName}, I lead multiple engineering teams and have been following ${targetCompany}'s growth. Would love to connect.`,
    director:       `Hi ${targetName}, I'm a Director of Engineering with a track record of scaling teams. ${targetCompany}'s engineering culture is something I respect. Would appreciate connecting.`,
    vp:             `Hi ${targetName}, VP Engineering leader here. ${targetCompany}'s approach to engineering excellence is something I deeply respect. Would welcome a brief conversation.`,
    c_suite:        `Hi ${targetName}, CTO/engineering executive here. Admire what ${targetCompany} has built. Would welcome a brief conversation.`,
  }
  return templates[tier] || templates.mid
}

export function generateFollowUpMessage(targetName: string, targetCompany: string, connectionContext: string): string {
  return `Hi ${targetName}, hope you're doing well! Following up on our connection. I noticed ${targetCompany} is building in ${connectionContext}. I have relevant experience — would you be open to a 15-minute chat to explore if there could be a mutual fit?`
}

export function quickMatchScore(jobTitle: string, jobDescription: string, userSkills: string[], userTargetRoles: string[]): number {
  let score = 0
  const jd = (jobTitle + ' ' + jobDescription).toLowerCase()
  const skills = userSkills.map(s => s.toLowerCase())
  const targets = userTargetRoles.map(r => r.toLowerCase())
  const skillMatches = skills.filter(s => jd.includes(s))
  score += Math.min(50, (skillMatches.length / Math.max(skills.length, 1)) * 50)
  const titleMatch = targets.some(t => jd.includes(t) || jobTitle.toLowerCase().includes(t))
  score += titleMatch ? 30 : 0
  score += 20
  return Math.min(100, Math.round(score))
}
