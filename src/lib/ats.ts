export type ATSResult = {
  score: number
  breakdown: { keywords: number; length: number; verbs: number; structure: number; metrics: number }
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
}

const POWER_VERBS = ['led','built','designed','architected','scaled','reduced','improved','delivered','shipped','drove','owned','launched','optimised','increased','decreased','managed','developed','created','implemented','automated','streamlined','migrated','refactored','mentored','hired','grew','achieved','exceeded','spearheaded']
const SECTION_HEADINGS = ['experience','education','skills','projects','summary','objective','certifications','achievements','awards']

export function calculateATS(resumeText: string, jobDescription: string): ATSResult {
  const resume = resumeText.toLowerCase()
  const jd = jobDescription.toLowerCase()

  // Extract keywords from JD (3+ char words, no stop words)
  const stopWords = new Set(['the','and','for','are','with','this','that','from','have','will','you','not','but','can','all','your','our','their','they','been','has','was','were','able','more','also','when','into'])
  const jdWords = [...new Set(jd.match(/\b[a-z]{3,}\b/g) || [])].filter(w => !stopWords.has(w))

  const matched = jdWords.filter(w => resume.includes(w))
  const missing = jdWords.filter(w => !resume.includes(w)).slice(0, 15)

  // 1. Keyword score (30 pts)
  const keywordScore = Math.min(30, Math.round((matched.length / Math.max(jdWords.length, 1)) * 30))

  // 2. Length score (20 pts) - optimal 600-2500 chars
  const len = resumeText.length
  const lengthScore = len >= 600 && len <= 2500 ? 20 : len >= 400 ? 12 : len >= 2500 ? 14 : 5

  // 3. Power verbs (20 pts)
  const verbCount = POWER_VERBS.filter(v => resume.includes(v)).length
  const verbScore = Math.min(20, verbCount * 3)

  // 4. Structure (15 pts)
  const sectionCount = SECTION_HEADINGS.filter(s => resume.includes(s)).length
  const structureScore = Math.min(15, sectionCount * 3)

  // 5. Metrics (15 pts)
  const metrics = (resumeText.match(/\d+%|\$[\d,]+|\d+x|\d+\s*(million|billion|thousand|k\b)|₹[\d,]+/gi) || []).length
  const metricsScore = Math.min(15, metrics * 4)

  const score = Math.min(98, keywordScore + lengthScore + verbScore + structureScore + metricsScore)

  const suggestions: string[] = []
  if (keywordScore < 20)  suggestions.push('Add more keywords from the job description')
  if (verbScore < 12)     suggestions.push('Start bullet points with strong action verbs (led, built, scaled...)')
  if (metricsScore < 8)   suggestions.push('Add quantified achievements (%, $, x improvement)')
  if (structureScore < 9) suggestions.push('Ensure resume has clear sections: Experience, Skills, Education')
  if (lengthScore < 15)   suggestions.push('Resume should be 600–2500 characters for optimal ATS parsing')

  return { score, breakdown: { keywords: keywordScore, length: lengthScore, verbs: verbScore, structure: structureScore, metrics: metricsScore }, matchedKeywords: matched.slice(0, 20), missingKeywords: missing, suggestions }
}
