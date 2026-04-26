export interface Platform {
  id: string
  name: string
  logo: string
  searchUrl: (query: string, location: string) => string
  type: 'general' | 'startup' | 'remote' | 'tech_specific' | 'executive' | 'community'
  tierFocus: string[]
}

export const JOB_PLATFORMS: Platform[] = [
  { id: 'linkedin',       name: 'LinkedIn',            logo: '💼', type: 'general',      tierFocus: ['all'],        searchUrl: (q, l) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(l)}&f_TPR=r604800` },
  { id: 'naukri',         name: 'Naukri',              logo: '🎯', type: 'general',      tierFocus: ['fresher','junior','mid','senior','manager'], searchUrl: (q, l) => `https://www.naukri.com/${q.replace(/\s+/g,'-').toLowerCase()}-jobs-in-${l.replace(/\s+/g,'-').toLowerCase() || 'india'}` },
  { id: 'wellfound',      name: 'Wellfound (AngelList)',logo: '🚀', type: 'startup',     tierFocus: ['junior','mid','senior','staff','manager','director'], searchUrl: (q, l) => `https://wellfound.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(l)}` },
  { id: 'instahyre',      name: 'Instahyre',           logo: '⚡', type: 'tech_specific',tierFocus: ['mid','senior','staff'], searchUrl: (q) => `https://www.instahyre.com/search-jobs/?job_title=${encodeURIComponent(q)}` },
  { id: 'hirist',         name: 'Hirist',              logo: '🔷', type: 'tech_specific',tierFocus: ['mid','senior','staff','manager'], searchUrl: (q) => `https://www.hirist.tech/search?q=${encodeURIComponent(q)}` },
  { id: 'cutshort',       name: 'CutShort',            logo: '✂️', type: 'startup',     tierFocus: ['junior','mid','senior'], searchUrl: (q) => `https://cutshort.io/jobs#query=${encodeURIComponent(q)}` },
  { id: 'glassdoor',      name: 'Glassdoor',           logo: '🪟', type: 'general',      tierFocus: ['mid','senior','staff','manager','director'], searchUrl: (q) => `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${encodeURIComponent(q)}` },
  { id: 'indeed',         name: 'Indeed',              logo: '🔵', type: 'general',      tierFocus: ['fresher','junior','mid','senior'], searchUrl: (q, l) => `https://in.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(l)}` },
  { id: 'google_jobs',    name: 'Google Jobs',         logo: '🔍', type: 'general',      tierFocus: ['all'],        searchUrl: (q, l) => `https://www.google.com/search?q=${encodeURIComponent(q + ' jobs ' + l)}&ibp=htl;jobs` },
  { id: 'turing',         name: 'Turing',              logo: '🧠', type: 'remote',       tierFocus: ['mid','senior','staff'], searchUrl: () => `https://www.turing.com/jobs` },
  { id: 'toptal',         name: 'Toptal',              logo: '🌟', type: 'remote',       tierFocus: ['senior','staff'], searchUrl: () => `https://www.toptal.com/developers` },
  { id: 'remote_co',      name: 'Remote.co',           logo: '🌍', type: 'remote',       tierFocus: ['mid','senior','staff','manager'], searchUrl: (q) => `https://remote.co/remote-jobs/search/?search_keywords=${encodeURIComponent(q)}` },
  { id: 'weworkremotely', name: 'We Work Remotely',    logo: '🏡', type: 'remote',       tierFocus: ['mid','senior','staff'], searchUrl: (q) => `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(q)}` },
  { id: 'yc_jobs',        name: 'YC Jobs',             logo: '🦅', type: 'startup',     tierFocus: ['mid','senior','staff','manager','director'], searchUrl: (q) => `https://www.ycombinator.com/jobs?q=${encodeURIComponent(q)}` },
  { id: 'hn_who_hiring',  name: 'HN Who Is Hiring',    logo: '🟠', type: 'community',   tierFocus: ['senior','staff','director','vp'], searchUrl: () => `https://news.ycombinator.com/item?id=43358553` },
  { id: 'blind',          name: 'Blind Jobs',          logo: '👁️', type: 'community',   tierFocus: ['senior','staff','director','vp'], searchUrl: () => `https://www.teamblind.com/jobs` },
  { id: 'iimjobs',        name: 'IIM Jobs',            logo: '🎓', type: 'general',      tierFocus: ['manager','senior_manager','director','vp'], searchUrl: (q) => `https://www.iimjobs.com/j/${q.replace(/\s+/g,'-').toLowerCase()}-jobs` },
  { id: 'foundit',        name: 'Foundit (Monster)',   logo: '🔶', type: 'general',      tierFocus: ['junior','mid','senior','manager'], searchUrl: (q) => `https://www.foundit.in/srp/results?query=${encodeURIComponent(q)}` },
  { id: 'shine',          name: 'Shine',               logo: '✨', type: 'general',      tierFocus: ['fresher','junior','mid'], searchUrl: (q) => `https://www.shine.com/job-search/${q.replace(/\s+/g,'-').toLowerCase()}-jobs` },
  { id: 'internshala',    name: 'Internshala',         logo: '🎒', type: 'general',      tierFocus: ['fresher','junior'], searchUrl: (q) => `https://internshala.com/jobs/${q.replace(/\s+/g,'-').toLowerCase()}-jobs` },
  { id: 'twitter_jobs',   name: 'Twitter/X',           logo: '🐦', type: 'community',   tierFocus: ['all'],        searchUrl: (q) => `https://twitter.com/search?q=${encodeURIComponent(q + ' hiring OR jobs')}` },
  { id: 'levels_fyi',     name: 'Levels.fyi',          logo: '📊', type: 'tech_specific',tierFocus: ['senior','staff','director','vp'], searchUrl: (q) => `https://www.levels.fyi/jobs?title=${encodeURIComponent(q)}` },
]

export function getPlatformsForTier(tier: string): Platform[] {
  return JOB_PLATFORMS.filter(p => p.tierFocus.includes('all') || p.tierFocus.includes(tier))
}
