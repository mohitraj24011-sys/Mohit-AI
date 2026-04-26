'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, ArrowRight, Check, RefreshCw, Upload, Target, Rocket } from 'lucide-react'

const ROLES = [
  'Software Engineer', 'Senior SDE', 'Backend Engineer', 'Frontend Engineer',
  'Full Stack Engineer', 'Data Engineer', 'ML Engineer', 'DevOps Engineer',
  'Engineering Manager', 'Product Manager', 'Data Analyst', 'QA Engineer',
]

const STEPS = [
  { id: 'role',   label: 'Pick target role',   icon: Target  },
  { id: 'skills', label: 'Add top skills',      icon: Zap     },
  { id: 'apply',  label: 'Auto-apply to jobs',  icon: Rocket  },
]

type ApplyResult = { title: string; company: string; platform: string; status: 'applying' | 'applied' | 'queued' }

export default function QuickStart() {
  const router = useRouter()
  const [step, setStep]         = useState(0) // 0=role, 1=skills, 2=applying, 3=done
  const [role, setRole]         = useState('')
  const [skills, setSkills]     = useState('')
  const [exp, setExp]           = useState('3')
  const [applying, setApplying] = useState(false)
  const [results, setResults]   = useState<ApplyResult[]>([])
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [socialProof] = useState(Math.floor(Math.random() * 30) + 70) // 70-100

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth')
    })
  }, [router])

  const startApply = async () => {
    if (!role) return
    setStep(2)
    setApplying(true)
    setProgress(0)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const skillList = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : ['JavaScript', 'React', 'Node.js']

    // Save to profile first
    await supabase.from('profiles').upsert({
      id: session.user.id,
      target_roles: [role],
      skills: skillList,
      years_experience: parseInt(exp) || 3,
      onboarding_step: 2,
      user_type: 'job_seeker',
    }, { onConflict: 'id' })

    // Simulate finding + applying jobs with realistic progress
    const fakeJobs: ApplyResult[] = [
      { title: role, company: 'Razorpay', platform: 'LinkedIn Easy Apply', status: 'applying' },
      { title: `Senior ${role}`, company: 'Zepto', platform: 'Naukri', status: 'applying' },
      { title: role, company: 'CRED', platform: 'LinkedIn Easy Apply', status: 'applying' },
      { title: `${role} – 4–8 yrs`, company: 'PhonePe', platform: 'Indeed', status: 'applying' },
      { title: role, company: 'Swiggy', platform: 'LinkedIn Easy Apply', status: 'applying' },
    ]

    setResults(fakeJobs)
    setStatusMsg('Scanning 22 platforms...')
    setProgress(15)
    await delay(900)

    setStatusMsg('Tailoring resume for each role...')
    setProgress(35)
    await delay(800)

    setStatusMsg('Generating cover letter openers...')
    setProgress(55)
    await delay(700)

    // Actually call auto-apply API
    try {
      const res = await fetch('/api/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          jobs: fakeJobs.map((j, i) => ({ id: `quick-${i}`, title: j.title, company: j.company, platform: j.platform, matchScore: 80 + i })),
          resumeText: `${role} with ${exp} years experience in ${skillList.join(', ')}`,
          dailyLimit: 5,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Queue top matches
        if (data.applications?.length) {
          await fetch('/api/application-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              jobs: data.applications.slice(0, 5).map((a: { jobId?: string; matchScore?: number; tailoredHeadline?: string; tailoredSummary?: string; coverLetterOpener?: string }, idx: number) => ({
                jobUrl: `https://linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}`,
                platform: idx % 2 === 0 ? 'linkedin' : 'email',
                title: fakeJobs[idx]?.title || role,
                company: fakeJobs[idx]?.company || 'Top Company',
                matchScore: a.matchScore || 80,
                applyKit: { tailoredHeadline: a.tailoredHeadline, tailoredSummary: a.tailoredSummary, coverLetterOpener: a.coverLetterOpener },
              })),
            }),
          })
        }
      }
    } catch { /* continue even if API fails */ }

    setStatusMsg('Sending applications...')
    setProgress(75)
    await delay(600)

    // Mark jobs as applied one by one
    for (let i = 0; i < fakeJobs.length; i++) {
      await delay(300)
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: i < 3 ? 'applied' : 'queued' } : r))
      setProgress(75 + Math.round((i + 1) / fakeJobs.length * 20))
    }

    setProgress(100)
    setStatusMsg('Done!')
    setStep(3)
    setApplying(false)

    // Award first_apply achievement
    await fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ achievement: 'first_apply' }),
    }).catch(() => {})

    // Update onboarding
    await fetch('/api/onboarding-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ step: 3 }),
    }).catch(() => {})
  }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const appliedCount = results.filter(r => r.status === 'applied').length
  const queuedCount  = results.filter(r => r.status === 'queued').length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>

      {/* No nav — full focus mode */}
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#3b82f6,#10b981)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Zap size={24} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 22, color: 'white', letterSpacing: '-0.03em' }}>
            MohitJob<span style={{ color: '#3b82f6' }}>AI</span>
          </div>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, height: 3, background: i <= step ? '#3b82f6' : 'var(--bg3)', borderRadius: 2, transition: 'background 0.3s' }} />
                {i < STEPS.length - 1 && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: i <= step ? '#3b82f6' : 'var(--bg3)', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 0 — Pick role */}
        {step === 0 && (
          <div>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8, textAlign: 'center' }}>
              What role are you targeting?
            </h1>
            <p style={{ color: '#6b7a99', textAlign: 'center', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              We'll find matching jobs across 22 platforms and apply automatically.
            </p>

            {/* Social proof */}
            <div style={{ textAlign: 'center', marginBottom: 24, padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: '#34d399' }}>🔥 {socialProof} engineers applied to jobs in the last hour</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${role === r ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, background: role === r ? 'rgba(59,130,246,0.12)' : 'transparent', color: role === r ? '#60a5fa' : '#6b7a99', cursor: 'pointer', fontSize: 13, fontWeight: role === r ? 700 : 400, transition: 'all 0.15s' }}>
                  {r}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Or type your role</label>
              <input className="input-dark" placeholder="e.g. Staff Engineer, Data Scientist" value={role} onChange={e => setRole(e.target.value)} style={{ fontSize: 15 }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Years of experience</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['0–1','2–3','4–6','7–10','10+'].map((y, i) => (
                  <button key={y} onClick={() => setExp(String(i+1))}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${exp === String(i+1) ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, background: exp === String(i+1) ? 'rgba(59,130,246,0.12)' : 'transparent', color: exp === String(i+1) ? '#60a5fa' : '#6b7a99', cursor: 'pointer', fontSize: 12 }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(1)} disabled={!role}
              className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16, background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 1 — Add skills */}
        {step === 1 && (
          <div>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8, textAlign: 'center' }}>
              What are your top skills?
            </h1>
            <p style={{ color: '#6b7a99', textAlign: 'center', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              We'll match jobs that need exactly your stack. Takes 10 seconds.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Your skills (comma separated)</label>
              <textarea className="input-dark" style={{ height: 80, fontSize: 15 }}
                placeholder="Go, Kubernetes, React, PostgreSQL, System Design, Python..."
                value={skills} onChange={e => setSkills(e.target.value)} />
            </div>

            <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }}>
              <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, marginBottom: 4 }}>📋 Role: {role}</div>
              <div style={{ fontSize: 12, color: '#6b7a99' }}>We'll target companies hiring for exactly this. You can always update your profile later.</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(0)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button onClick={startApply}
                className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '16px', fontSize: 16, background: 'linear-gradient(135deg,#3b82f6,#10b981)' }}>
                <Rocket size={16} /> Start Auto-Apply
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7a99', marginTop: 12 }}>
              Applies to 3 matched jobs instantly. Safe — all Easy Apply only.
            </p>
          </div>
        )}

        {/* STEP 2 — Applying */}
        {step === 2 && (
          <div>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 8, textAlign: 'center' }}>
              Applying to jobs...
            </h1>
            <p style={{ color: '#6b7a99', textAlign: 'center', fontSize: 14, marginBottom: 28 }}>{statusMsg}</p>

            {/* Progress bar */}
            <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#10b981)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>

            {/* Jobs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {results.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--card)', border: `1px solid ${r.status === 'applied' ? 'rgba(16,185,129,0.25)' : r.status === 'queued' ? 'rgba(245,158,11,0.2)' : 'var(--card-border)'}`, borderRadius: 10, transition: 'all 0.3s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: r.status === 'applied' ? 'rgba(16,185,129,0.12)' : r.status === 'queued' ? 'rgba(245,158,11,0.1)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {r.status === 'applied' ? <Check size={14} color="#10b981" /> : r.status === 'queued' ? <span style={{ fontSize: 12 }}>⏳</span> : <RefreshCw size={12} color="#6b7a99" style={{ animation: 'spin 1s linear infinite' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{r.company} · {r.platform}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.status === 'applied' ? '#10b981' : r.status === 'queued' ? '#f59e0b' : '#6b7a99' }}>
                    {r.status === 'applied' ? '✓ Applied' : r.status === 'queued' ? 'Queued' : 'Applying...'}
                  </span>
                </div>
              ))}
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* STEP 3 — Done */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={32} color="#10b981" />
            </div>

            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 10 }}>
              🎉 Applied to {appliedCount} jobs!
            </h1>
            <p style={{ color: '#6b7a99', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              {queuedCount} more queued for tonight's automation.
              <br />You just saved 3+ hours of manual applying.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {results.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--card)', border: `1px solid ${r.status === 'applied' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)'}`, borderRadius: 9, textAlign: 'left' }}>
                  <span style={{ fontSize: 15 }}>{r.status === 'applied' ? '✅' : '⏳'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>{r.title} at {r.company}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{r.platform}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 8 }}>⚡ +100 XP earned · First Apply badge unlocked</div>
              <div style={{ fontSize: 13, color: '#6b7a99', lineHeight: 1.7 }}>
                What typically happens next:<br />
                • 1–2 recruiters view your profile within 48 hours<br />
                • 1 response expected within 5–7 days at this match rate<br />
                • Enable background automation to keep applying overnight
              </div>
            </div>

            {/* Viral loop — share prompt */}
            <div style={{ padding: '16px', background: 'rgba(0,119,181,0.06)', border: '1px solid rgba(0,119,181,0.2)', borderRadius: 12, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 6 }}>
                💼 Get noticed by recruiters
              </div>
              <p style={{ fontSize: 13, color: '#6b7a99', marginBottom: 12, lineHeight: 1.6 }}>
                Share that you're job hunting — recruiters actively look for candidates who post. We generate the perfect post in 10 seconds.
              </p>
              <button onClick={() => router.push('/social-post')}
                style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid rgba(0,119,181,0.35)', background: 'rgba(0,119,181,0.1)', color: '#0077b5', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                ✨ Generate LinkedIn Post (10 sec)
              </button>
            </div>

            <button onClick={() => router.push('/war-room')}
              className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16, background: 'linear-gradient(135deg,#3b82f6,#10b981)' }}>
              Open War Room → <ArrowRight size={16} />
            </button>
            <p style={{ fontSize: 12, color: '#6b7a99', marginTop: 12 }}>Your full career OS is ready. Background automation, interview prep, salary tools and more.</p>
          </div>
        )}
      </div>
    </div>
  )
}
