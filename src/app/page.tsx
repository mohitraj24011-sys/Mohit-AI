'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowRight, Zap, Users, Building2, Star, TrendingUp, Shield, Globe } from 'lucide-react'

const JOB_FEATURES = [
  'AI applies to jobs while you sleep',
  'Resume tailored per job automatically',
  'LinkedIn AI messages + referral scripts',
  'Interview coach with real company Q&A',
  'Salary benchmarker — India + Remote',
  'War Room: daily job hunt command center',
  'Skill gap → 90-day learning roadmap',
  '22 platforms scanned simultaneously',
]

const CLIENT_FEATURES = [
  'Find startup CTOs and founders instantly',
  'AI generates personalised outreach copy',
  'Full CRM — leads, status, scoring',
  'Campaign manager with sequence builder',
  'Reply analyser — know when to pitch',
  'B2B proposal generator',
  'HR recruiter targeting engine',
  'College and bootcamp partner finder',
]

const SOCIAL_PROOF = [
  { metric: '500+',  label: 'IT Professionals' },
  { metric: '22',    label: 'Job Platforms' },
  { metric: '4×',    label: 'Faster Hiring' },
  { metric: '₹499',  label: 'Per Month Pro' },
]

export default function Home() {
  const [userType, setUserType] = useState<'job_seeker'|'client_seeker'|null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (u) {
        setLoggedIn(true)
        const { data: p } = await supabase.from('profiles').select('user_type').eq('id', u.id).single()
        if (p?.user_type) setUserType(p.user_type as 'job_seeker'|'client_seeker')
      }
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 20, fontSize: 12, color: '#60a5fa', fontWeight: 600, marginBottom: 24 }}>
          <Zap size={11} /> AI-Powered Career + Business OS · Free to Start
        </div>

        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(36px,6vw,68px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', color: 'white', marginBottom: 20 }}>
          What do you want<br />
          <span style={{ background: 'linear-gradient(135deg,#3b82f6,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            to achieve?
          </span>
        </h1>

        <p style={{ color: '#6b7a99', fontSize: 18, maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.7 }}>
          One platform. Two powerful engines. Pick your path — you can switch anytime.
        </p>

        {/* THE SPLIT — most important UI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 820, margin: '0 auto 56px' }}>

          {/* Job Seeker */}
          <div style={{ padding: '32px 28px', background: 'rgba(59,130,246,0.05)', border: '2px solid rgba(59,130,246,0.25)', borderRadius: 20, textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle,rgba(59,130,246,0.15),transparent)', borderRadius: '0 0 0 100%' }} />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Users size={24} color="#3b82f6" />
            </div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Get a Job</h2>
            <p style={{ color: '#6b7a99', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              AI that applies to jobs for you 24/7. Auto-apply, interview prep, LinkedIn AI, salary negotiation.
            </p>
            <div style={{ marginBottom: 24 }}>
              {JOB_FEATURES.slice(0, 4).map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: '#6b7a99' }}>
                  <span style={{ color: '#3b82f6', flexShrink: 0 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link href={loggedIn && userType === 'job_seeker' ? '/war-room' : '/onboarding?type=job_seeker'}>
              <button style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                {loggedIn && userType === 'job_seeker' ? 'Open War Room' : 'Start Job Search'} <ArrowRight size={16} />
              </button>
            </Link>
            <p style={{ fontSize: 11, color: '#6b7a99', textAlign: 'center', marginTop: 10 }}>Free · 3 resumes/day · No card needed</p>
          </div>

          {/* Client Seeker */}
          <div style={{ padding: '32px 28px', background: 'rgba(16,185,129,0.05)', border: '2px solid rgba(16,185,129,0.25)', borderRadius: 20, textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle,rgba(16,185,129,0.15),transparent)', borderRadius: '0 0 0 100%' }} />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Building2 size={24} color="#10b981" />
            </div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Get Clients</h2>
            <p style={{ color: '#6b7a99', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              AI that finds and converts clients for your dev org. Prospect finder, outreach copy, CRM, proposals.
            </p>
            <div style={{ marginBottom: 24 }}>
              {CLIENT_FEATURES.slice(0, 4).map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: '#6b7a99' }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link href={loggedIn && userType === 'client_seeker' ? '/marketing' : '/onboarding?type=client_seeker'}>
              <button style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loggedIn && userType === 'client_seeker' ? 'Open Marketing Hub' : 'Start Getting Clients'} <ArrowRight size={16} />
              </button>
            </Link>
            <p style={{ fontSize: 11, color: '#6b7a99', textAlign: 'center', marginTop: 10 }}>Free · 20 messages/day · Switch anytime</p>
          </div>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
          {SOCIAL_PROOF.map(({ metric, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white' }}>{metric}</div>
              <div style={{ fontSize: 12, color: '#6b7a99' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {[
            { title: '🧑‍💻 For Job Seekers', features: JOB_FEATURES, color: '#3b82f6', href: '/onboarding?type=job_seeker', cta: 'Start for free' },
            { title: '🏢 For Dev Agencies', features: CLIENT_FEATURES, color: '#10b981', href: '/onboarding?type=client_seeker', cta: 'Get first client' },
          ].map(({ title, features, color, href, cta }) => (
            <div key={title} className="card">
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 16 }}>{title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                    <span style={{ color, flexShrink: 0, fontWeight: 700 }}>→</span>
                    <span style={{ color: '#6b7a99' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href={href}>
                <button style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${color}40`, background: `${color}12`, color, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cta} <ArrowRight size={13} />
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Why addictive section */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(99,130,255,0.08)', borderBottom: '1px solid rgba(99,130,255,0.08)', padding: '60px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 12 }}>Built to become part of your daily routine</h2>
          <p style={{ color: '#6b7a99', fontSize: 16, maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.7 }}>Like LinkedIn for professional networking, MohitJob AI becomes your daily career OS — with streaks, challenges, achievements, and a community feed.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {[
              { icon: '🔥', title: 'Daily Streaks', desc: 'Earn XP every day you take action. Streak = momentum.' },
              { icon: '🏆', title: 'Achievements', desc: 'Unlock badges for milestones — first offer, 100 applications, 3K network.' },
              { icon: '⚡', title: 'Daily Challenges', desc: '3 micro-tasks/day. Takes 15 min. Compounds over time.' },
              { icon: '📊', title: 'Progress Tracking', desc: 'ATS scores, application rates, salary growth — all visualised.' },
              { icon: '🌐', title: 'Community Feed', desc: 'Anonymous wins, tips, questions. See others succeeding.' },
              { icon: '🧠', title: 'AI That Learns You', desc: 'Every interaction improves recommendations. Gets smarter daily.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card" style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#6b7a99', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms section */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 8 }}>
          Every platform. One place.
        </h2>
        <p style={{ color: '#6b7a99', fontSize: 14, marginBottom: 28 }}>22 job platforms + 6 social channels + all major Indian IT ecosystems</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['LinkedIn','Naukri','Indeed','Glassdoor','Wellfound','CutShort','Instahyre','Turing','Toptal','HN Who\'s Hiring','Twitter/X','GitHub Jobs','Y Combinator','Reddit','Blind','IIMJobs','Hirist','Remote.co','WeWorkRemotely','Internshala','Foundit','Shine'].map(p => (
            <span key={p} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: '#6b7a99' }}>{p}</span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(16,185,129,0.06))', border: '1px solid rgba(59,130,246,0.2)' }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 10 }}>Free forever. Upgrade when you need more.</h2>
          <p style={{ color: '#6b7a99', fontSize: 14, marginBottom: 24 }}>Pro is ₹499/month. 7-day free trial. Cancel anytime. No credit card to start.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding?type=job_seeker">
              <button className="btn-primary" style={{ fontSize: 15, padding: '13px 28px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>Get a Job <ArrowRight size={14} /></button>
            </Link>
            <Link href="/onboarding?type=client_seeker">
              <button className="btn-primary" style={{ fontSize: 15, padding: '13px 28px', background: 'linear-gradient(135deg,#10b981,#059669)' }}>Get Clients <ArrowRight size={14} /></button>
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(99,130,255,0.08)', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          {[['Pricing','/pricing'],['Dashboard','/dashboard'],['Marketing','/marketing'],['Blog','#'],['Privacy','#'],['Contact','#']].map(([label,href]) => (
            <Link key={label} href={href} style={{ fontSize: 12, color: '#6b7a99', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#2d3b52' }}>MohitJob AI © 2025 · Indian IT professionals · Fresher to CTO · Zero missed opportunities</p>
      </footer>
    </div>
  )
}
