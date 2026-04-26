/**
 * marketingEngine.ts
 * AI Marketing Engine — targeting all 4 customer types:
 * 1. Startups needing developers (dev clients)
 * 2. Enterprises outsourcing tech (enterprise clients)
 * 3. Indian IT professionals (MohitJob users)
 * 4. Recruitment / HR companies (B2B partners)
 */

export type LeadType = 'dev_client' | 'enterprise_client' | 'it_professional' | 'hr_recruiter' | 'bootcamp' | 'college'
export type Channel  = 'linkedin' | 'email' | 'whatsapp' | 'twitter' | 'reddit'

// ── WHERE TO FIND EACH CUSTOMER TYPE ─────────────────────────────────────────
export const PROSPECT_SOURCES: Record<LeadType, {
  linkedinSearches:   string[]
  twitterSearches:    string[]
  redditCommunities:  string[]
  googleSearches:     string[]
  directSources:      string[]
  signalKeywords:     string[]   // what they post/say when they're buying
  avgDealValue:       number     // INR
  conversionTimeDays: number
}> = {

  dev_client: {
    linkedinSearches: [
      '"CTO" OR "Co-founder" OR "VP Engineering" India "hiring developers" OR "we are hiring"',
      '"Founder" India "series A" OR "series B" "engineering team" -job',
      '"Head of Engineering" India startup 2024 "looking for" developer',
    ],
    twitterSearches: [
      'from:India "we are hiring" (developer OR engineer) -retweet',
      '"building with" (React OR Node OR Python) India startup 2024',
      '"need developers" OR "hiring engineers" India founder',
    ],
    redditCommunities: ['r/startups','r/entrepreneur','r/SaaS','r/indiehackers','r/webdev'],
    googleSearches: [
      'site:linkedin.com "CTO" "India" "hiring" "software engineer" 2024',
      'Indian startups hiring developers 2024',
    ],
    directSources: [
      'https://www.ycombinator.com/companies?batch=W24&batch=S24',
      'https://wellfound.com/jobs?job_type=full_time&remote=1',
      'https://www.startupindia.gov.in/content/sih/en/startupindia/startup_india_funding.html',
    ],
    signalKeywords: ['hiring','looking for developer','need engineer','building team','scaling engineering'],
    avgDealValue: 500000,     // ₹5L/month
    conversionTimeDays: 30,
  },

  enterprise_client: {
    linkedinSearches: [
      '"IT Manager" OR "CIO" OR "Head of IT" India enterprise "outsourcing" OR "vendor"',
      '"Digital Transformation" India 2024 "technology partner" -job',
      '"VP Technology" "large enterprise" India "development partner"',
    ],
    twitterSearches: [
      '"digital transformation" India enterprise 2024 "technology partner"',
      '"IT outsourcing" India enterprise "looking for"',
    ],
    redditCommunities: ['r/ITManagers','r/sysadmin','r/cscareerquestions'],
    googleSearches: [
      'enterprise IT outsourcing India 2024 vendor selection',
      'Indian enterprise "software development partner" RFP 2024',
    ],
    directSources: [
      'https://clutch.co/developers/india',
      'https://www.nasscom.in',
      'https://www.goodfirms.co/directory/country/top-software-development-companies/in',
    ],
    signalKeywords: ['digital transformation','modernization','outsource','vendor','RFP','technology partner'],
    avgDealValue: 2000000,    // ₹20L/month
    conversionTimeDays: 90,
  },

  it_professional: {
    linkedinSearches: [
      '"Software Engineer" OR "SDE" India "open to work" -recruiter',
      '"Looking for opportunities" India "backend" OR "frontend" OR "full stack"',
      '"Actively looking" India developer 2024',
    ],
    twitterSearches: [
      'from:India ("looking for job" OR "job search" OR "open to work") developer',
      '#OpenToWork India engineer 2024',
      '"switching jobs" OR "job hunting" India software engineer',
    ],
    redditCommunities: ['r/developersIndia','r/cscareerquestionsIndia','r/indianews','r/jobs'],
    googleSearches: [
      'Indian software engineers looking for jobs 2024',
      'Naukri profile open to work Bangalore',
    ],
    directSources: [
      'https://www.naukri.com/mnjuser/homepage',
      'https://www.linkedin.com/jobs/search/?keywords=software+engineer&location=India&f_TPR=r2592000',
    ],
    signalKeywords: ['open to work','job hunt','switching','new opportunity','actively looking','notice period'],
    avgDealValue: 4788,       // ₹399/month * 12 months
    conversionTimeDays: 7,
  },

  hr_recruiter: {
    linkedinSearches: [
      '"Talent Acquisition" OR "HR Manager" India "placement" staffing',
      '"Recruiting Manager" India "tech hiring" 2024',
      '"Head of HR" India "IT staffing" company',
    ],
    twitterSearches: [
      '"recruiter" India tech hiring 2024 "placement"',
      'India HR "tech talent" "placement agency"',
    ],
    redditCommunities: ['r/recruiting','r/humanresources','r/IndiaJobs'],
    googleSearches: [
      'Indian IT staffing companies 2024 tech recruitment',
      'placement agency India software engineer hiring',
    ],
    directSources: [
      'https://www.naukri.com/recruitment-management-software',
      'https://www.iimjobs.com/recruitment-services',
    ],
    signalKeywords: ['talent acquisition','placing candidates','tech hiring','recruitment','staffing'],
    avgDealValue: 120000,     // ₹10K/month
    conversionTimeDays: 21,
  },

  bootcamp: {
    linkedinSearches: [
      '"Coding bootcamp" OR "online bootcamp" India "placement" "job guarantee"',
      '"EdTech" India "software training" "placement assistance"',
    ],
    twitterSearches: ['India coding bootcamp placement 2024'],
    redditCommunities: ['r/codingbootcamp','r/learnprogramming','r/cscareerquestions'],
    googleSearches: ['Indian coding bootcamp placement guarantee 2024'],
    directSources: ['https://www.classcentral.com/report/best-coding-bootcamps/'],
    signalKeywords: ['placement rate','job guarantee','alumni placed','hiring partners'],
    avgDealValue: 50000,
    conversionTimeDays: 45,
  },

  college: {
    linkedinSearches: [
      '"Placement Officer" OR "TPO" India college "campus hiring" 2024',
      '"Training and Placement" India engineering college',
    ],
    twitterSearches: ['India college placement 2024 "campus hiring"'],
    redditCommunities: ['r/india','r/developersIndia','r/IITJEE'],
    googleSearches: ['Indian engineering college placement cell contact 2024'],
    directSources: ['https://www.nirfindia.org/2023/EngineeringRanking.html'],
    signalKeywords: ['campus recruitment','placement drive','companies visiting','TPO'],
    avgDealValue: 30000,
    conversionTimeDays: 60,
  },
}

// ── MESSAGE TEMPLATES FOR EACH TYPE + CHANNEL ─────────────────────────────────
export const MESSAGE_TEMPLATES: Record<LeadType, Record<string, {
  subject?:   string
  connection: string
  followUp1:  string
  followUp2:  string
  pitch:      string
  hook:       string   // what problem do you solve for them
}>> = {

  dev_client: {
    linkedin: {
      connection: "Hi {name}, saw you're building {company} — impressive work in {industry}. I help funded startups hire and manage top Indian tech talent. Would love to connect.",
      followUp1:  "Thanks for connecting {name}! Quick question — is your engineering team keeping up with your growth? We've helped 10+ startups like {company} scale their dev team 3x faster. Happy to share how.",
      followUp2:  "Hey {name}, following up on my last note. I know you're busy building — we can have a senior developer ready to contribute within 48 hours. Worth a 15-min call?",
      pitch:      "Hi {name}, we're a curated dev agency specialising in {stack}. We've shipped products for {reference_company_type} in {industry}. Our devs are senior (6+ years avg), pre-vetted, and can start within a week. Can I send you 3 profiles that match your stack?",
      hook:       "You're scaling fast but dev hiring is slow, expensive, and risky",
    },
    email: {
      subject:    "Dev team for {company} — 3 vetted engineers ready",
      connection: "Hi {name},\n\nI noticed {company} is growing fast — congrats on {milestone}.\n\nWe help Series A/B startups like yours add senior developers in 48 hours (not 3 months). Our engineers have worked at {reference_companies}.\n\nWould you be open to a quick 15-min call this week?\n\nBest,",
      followUp1:  "Hi {name}, following up on my email from {days} days ago. We just placed a {stack} engineer at a company similar to {company} — they went from zero to production in 2 weeks. Worth a quick chat?",
      followUp2:  "Last follow-up from me {name}. If timing isn't right, no worries — just reply 'later' and I'll check back in Q{next_quarter}. Otherwise, happy to send 3 dev profiles with no commitment.",
      pitch:      "",
      hook:       "Fast-growing startups struggle to hire senior devs quickly",
    },
  },

  enterprise_client: {
    linkedin: {
      connection: "Hi {name}, following your work on digital transformation at {company}. We help enterprise IT teams modernise legacy systems with dedicated dev teams. Would love to connect.",
      followUp1:  "Thanks {name}! We've helped {reference} reduce IT vendor costs by 40% while improving delivery speed. Given {company}'s scale, curious if you face similar challenges. Open to a brief exchange?",
      followUp2:  "Hi {name}, I'll be direct — we specialise in enterprise-grade development for {industry} companies. Our team holds ISO certifications and has delivered 50+ enterprise projects. Could we schedule 20 minutes?",
      pitch:      "Hi {name}, our dedicated enterprise dev team can integrate with your existing processes, sign NDAs/MSAs, and deliver on your timeline. We've done this for {reference_type} organisations. Can I share a case study relevant to {company}?",
      hook:       "Enterprise IT teams need reliable, compliant, scalable dev partners",
    },
    email: {
      subject:    "Technology partnership for {company} — case study attached",
      connection: "Dear {name},\n\nWe work with {industry} enterprises on digital transformation initiatives. I'd like to share a relevant case study from a company similar to {company}.\n\n[Attach case study]\n\nWould you have 20 minutes for a call this week?\n\nRegards,",
      followUp1:  "Dear {name}, following up on my earlier email. We recently completed a {project_type} project for {reference} — on time, on budget. Happy to walk you through the approach.",
      followUp2:  "Hi {name}, I know enterprise decisions take time. I'll be in {location} next week — would it make sense to meet briefly for coffee?",
      pitch:      "",
      hook:       "Costly, slow enterprise IT projects that miss deadlines",
    },
  },

  it_professional: {
    linkedin: {
      connection: "Hey {name}, saw your profile — {X} years in {stack}, that's solid. Built a free AI tool that applies to jobs for you while you sleep. Want early access?",
      followUp1:  "Thanks for connecting! Quick thing — are you job hunting or open to opportunities? I built MohitJob AI for exactly your profile. It found 12 matches for similar engineers this week alone.",
      followUp2:  "Hey {name}, last message from me. MohitJob AI is free to try — 3 resume builds/day, 3 AI agents, auto-apply up to 5 jobs. Takes 2 mins to set up: {app_url}. Thought it might help.",
      pitch:      "Hey {name}! MohitJob AI is built for engineers at your level. It: auto-applies to jobs while you sleep, tailors your resume per job, coaches you for interviews. 500+ Indian IT engineers using it. Free plan available → {app_url}",
      hook:       "Job hunting manually across 20 platforms wastes 10+ hours/week",
    },
    whatsapp: {
      connection: "Hey {name}, I built a free AI tool that finds and applies to jobs for you automatically. It works on LinkedIn, Naukri, Indeed + 20 more platforms. Want access? {app_url}",
      followUp1:  "Did you get a chance to try MohitJob AI? It just helped someone in {city} land interviews at Razorpay and CRED in one week. Takes 2 mins to start — {app_url}",
      followUp2:  "Last nudge! Free plan includes 3 AI-optimised resumes/day and auto-apply. No credit card. → {app_url}",
      pitch:      "",
      hook:       "Stop applying manually. Let AI work while you sleep.",
    },
    reddit: {
      connection: "Built a free AI that applies to jobs for you — would love feedback from this community",
      followUp1:  "Update: 500+ Indian IT engineers now using it. AMA if you want to know how it works",
      followUp2:  "",
      pitch:      "Hey everyone, I built MohitJob AI after spending 3 months job hunting manually. It:\n- Scans 22 platforms\n- Tailors your resume per job\n- Auto-applies to Easy Apply roles\n- Coaches you on interviews\n\nFree plan available. Would love feedback from this community: {app_url}",
      hook:       "Job hunting in India is broken. Here's what I built to fix it.",
    },
  },

  hr_recruiter: {
    linkedin: {
      connection: "Hi {name}, I work with IT staffing firms on candidate quality. Have something that could cut your shortlisting time by 70%. Would love to connect.",
      followUp1:  "Thanks for connecting! We've built an AI that pre-qualifies tech candidates — ATS score, skill match, interview readiness. Your team sends fewer bad profiles to clients. Worth a quick chat?",
      followUp2:  "Hey {name}, following up one more time. 3 recruitment firms in Bangalore are now using our platform. Happy to do a 15-min demo — you can see it live.",
      pitch:      "Hi {name}, our platform helps recruitment firms place candidates 2x faster by: auto-ranking candidates by job fit, AI interview prep, ATS optimisation. White-label option available. Can I share pricing?",
      hook:       "Too many hours spent shortlisting candidates who bomb interviews",
    },
    email: {
      subject:    "Cut candidate shortlisting time by 70% — for {company}",
      connection: "Hi {name},\n\nRecruitment teams waste 60% of their time on candidates who aren't ready for client interviews.\n\nOur AI platform pre-qualifies tech candidates in 10 minutes — ATS score, skill match, mock interview results.\n\nWould you be open to a 20-minute demo?\n\nBest,",
      followUp1:  "Hi {name}, following up. Here's a quick result: one of our partner firms reduced time-to-placement from 45 days to 18 days after using our platform. Happy to share how.",
      followUp2:  "Last follow-up from me. If the timing is off, no problem — just reply 'later' and I'll circle back next quarter.",
      pitch:      "",
      hook:       "Recruiters spend too long on candidates who aren't interview-ready",
    },
  },

  bootcamp: {
    linkedin: {
      connection: "Hi {name}, I noticed {company} has strong placement outcomes. We've built AI tools that help bootcamp graduates get placed faster. Would love to connect.",
      followUp1:  "Thanks for connecting! Our platform helps bootcamp grads land jobs 40% faster through AI resume optimisation and interview coaching. Open to a quick demo for your next cohort?",
      followUp2:  "Hey {name}, one last follow-up. We offer white-label access for bootcamps — your branding, our AI. Helped 200+ grads get placed last quarter.",
      pitch:      "Hi {name}, we'd love to partner with {company}. We offer: white-labeled AI career tools for your graduates, ATS optimisation, 1-click LinkedIn post generation. Revenue share model available. Can we discuss?",
      hook:       "Bootcamp placement rates determine reputation and revenue",
    },
    email: {
      subject:    "Improve {company} placement rates with AI tools",
      connection: "Hi {name},\n\nBootcamp placement rates are everything — they drive referrals and cohort fill rates.\n\nWe've built AI career tools used by 500+ engineers to land jobs at companies like Razorpay, CRED, Zepto.\n\nWould you want to offer this to your next cohort (white-labeled, free trial)?\n\nBest,",
      followUp1:  "Hi {name}, following up. One bootcamp increased their placement rate from 68% to 89% in one cohort using our tools. Happy to share the case study.",
      followUp2:  "Last email from me on this. If placement rates are on your radar for 2025, we'd love to help.",
      pitch:      "",
      hook:       "Placement rates drive bootcamp revenue, reputation and referrals",
    },
  },

  college: {
    linkedin: {
      connection: "Hi {name}, saw your work at {college}'s placement cell. We've built tools that help final-year students land tech jobs faster. Would love to connect.",
      followUp1:  "Thanks for connecting! We can offer your students: AI resume builder, mock interviews, auto-apply to 100+ companies. Free for students, optional paid tier for your placement office. Worth a quick call?",
      followUp2:  "Hey {name}, final follow-up. We're offering free access for your current batch. 10 minutes to set up, immediate value for students.",
      pitch:      "Hi {name}, we'd love to partner with {college} for campus placements. We offer: free AI tools for all students, placement tracking dashboard for TPO, employer-ready profile building. This is free for students — just needs your approval to onboard the batch.",
      hook:       "Students apply to hundreds of companies but lack ATS-optimised resumes",
    },
    email: {
      subject:    "Free AI placement tools for {college} students",
      connection: "Dear {name},\n\nWe've built free AI career tools specifically for engineering students in their final year:\n- ATS-optimised resume builder\n- Company-specific interview prep\n- Auto-apply to 100+ companies\n\nWe'd love to offer this free to your current batch. Would you be open to a brief call?\n\nBest regards,",
      followUp1:  "Dear {name}, following up. Three colleges in Chennai have already onboarded their batches this semester. Happy to share a case study.",
      followUp2:  "Last follow-up. We'll keep the free access open for {college} — just reply to this email when the timing is right.",
      pitch:      "",
      hook:       "Students with optimised resumes get 3x more callbacks",
    },
  },
}

// ── SCORING: how to score a lead ──────────────────────────────────────────────
export function scoreLead(params: {
  hasEmail:      boolean
  hasLinkedIn:   boolean
  companySize?:  string
  replySignals?: string[]
  leadType:      LeadType
}): number {
  let score = 30 // base

  if (params.hasEmail)    score += 20
  if (params.hasLinkedIn) score += 15

  if (params.companySize) {
    const sizeScores: Record<string, number> = { '1-10': 10, '11-50': 20, '51-200': 15, '201-1000': 10, '1000+': 5 }
    score += sizeScores[params.companySize] || 0
  }

  if (params.replySignals?.length) {
    score += Math.min(25, params.replySignals.length * 8)
  }

  // Type adjustments
  if (params.leadType === 'it_professional') score += 5  // easiest to convert
  if (params.leadType === 'enterprise_client') score -= 10 // hardest to convert

  return Math.min(100, Math.max(0, score))
}

// ── CHANNEL PRIORITY per lead type ────────────────────────────────────────────
export const CHANNEL_PRIORITY: Record<LeadType, Channel[]> = {
  dev_client:        ['linkedin', 'email', 'twitter'],
  enterprise_client: ['linkedin', 'email'],
  it_professional:   ['linkedin', 'whatsapp', 'reddit'],
  hr_recruiter:      ['linkedin', 'email'],
  bootcamp:          ['linkedin', 'email'],
  college:           ['email', 'linkedin'],
}

// ── WEEK-BY-WEEK OUTREACH PLAN ────────────────────────────────────────────────
export const WEEKLY_OUTREACH_PLAN = [
  {
    week: 1,
    focus: 'it_professional',
    goal: '50 LinkedIn connections to "Open to Work" engineers',
    channel: 'linkedin',
    dailyTarget: 10,
    message: 'Hook: Free AI that applies to jobs for you',
    expectedConversions: 5,
    why: 'Easiest to convert, validates product, builds social proof',
  },
  {
    week: 2,
    focus: 'it_professional',
    goal: '20 WhatsApp messages to college WhatsApp groups',
    channel: 'whatsapp',
    dailyTarget: 5,
    message: 'Hook: Free tool, takes 2 mins, no credit card',
    expectedConversions: 8,
    why: 'WhatsApp groups convert faster than LinkedIn cold DMs',
  },
  {
    week: 3,
    focus: 'dev_client',
    goal: '30 LinkedIn connections to Indian startup CTOs/founders',
    channel: 'linkedin',
    dailyTarget: 6,
    message: 'Hook: Senior devs ready in 48 hours',
    expectedConversions: 2,
    why: 'B2B revenue unlocks growth capital',
  },
  {
    week: 4,
    focus: 'hr_recruiter',
    goal: '20 LinkedIn connections to IT staffing firms',
    channel: 'linkedin',
    dailyTarget: 4,
    message: 'Hook: Cut shortlisting time by 70%',
    expectedConversions: 1,
    why: 'Multiplier effect: each HR partner brings multiple candidates',
  },
]
