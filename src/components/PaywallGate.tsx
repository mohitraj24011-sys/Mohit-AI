'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lock, Zap, TrendingUp, ArrowRight } from 'lucide-react'

type Props = {
  feature: string
  children: React.ReactNode
  showUsageBar?: boolean
}

type UsageData = {
  allowed: boolean
  remaining: number
  plan: string
}

const FEATURE_LABELS: Record<string, string> = {
  resume: 'Resume Builder',
  ats: 'ATS Checker',
  cover_letter: 'Cover Letter',
  agents: 'Nova Agents',
  gap_analysis: 'Gap Analysis',
  interview_prep: 'Interview Coach',
  profile_optimizer: 'Profile Optimizer',
  opportunity_scan: 'Opportunity Scan',
  linkedin_extender: 'LinkedIn AI',
  auto_apply: 'Auto-Apply',
  learning: 'Learning Engine',
  market_trends: 'Market Intel',
}

const FREE_LIMITS: Record<string, number> = {
  resume: 3, ats: 5, cover_letter: 2, agents: 3,
  gap_analysis: 2, interview_prep: 2, profile_optimizer: 3,
  opportunity_scan: 5, linkedin_extender: 5, auto_apply: 5,
  learning: 10, market_trends: 5,
}

export default function PaywallGate({ feature, children, showUsageBar = true }: Props) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setUsage({ allowed: false, remaining: 0, plan: 'unauthenticated' }); setLoading(false); return }

      const res = await fetch(`/api/usage?feature=${feature}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      } else {
        setUsage({ allowed: true, remaining: 99, plan: 'free' }) // default allow on error
      }
      setLoading(false)
    }
    check()
  }, [feature])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
        <div style={{ width: 18, height: 18, border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Checking access...</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!usage?.allowed) {
    const isPlanIssue = usage?.plan !== 'unauthenticated'
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px' }}>
        <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(139,92,246,0.3)', padding: '36px 28px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Lock size={24} color="#a78bfa" />
          </div>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>
            {isPlanIssue ? `Daily ${FEATURE_LABELS[feature] || feature} limit reached` : 'Sign in to continue'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            {isPlanIssue
              ? `You've used all ${FREE_LIMITS[feature] || 'your'} free uses today. Upgrade to Pro for unlimited access.`
              : 'Create a free account to start your AI-powered job search.'}
          </p>

          {isPlanIssue && (
            <div style={{ marginBottom: 20, padding: '14px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.15)', textAlign: 'left' }}>
              {['Unlimited Resume Builder + ATS Scoring', 'All 10 Nova AI Agents', 'LinkedIn AI Extender + Auto-Mode', 'Company-specific Interview Coach', 'Auto-Apply Engine (30 jobs/day)'].map(b => (
                <div key={b} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13 }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span style={{ color: 'var(--text)' }}>{b}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={isPlanIssue ? '/pricing' : '/auth'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: 'white', borderRadius: 11, textDecoration: 'none', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15 }}>
              <Zap size={16} /> {isPlanIssue ? 'Upgrade to Pro — ₹499/mo' : 'Sign In / Sign Up'} <ArrowRight size={14} />
            </a>
            {isPlanIssue && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>7-day free trial · Cancel anytime · ₹2,999/year (save 50%)</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const limit = FREE_LIMITS[feature] || 10
  const used = limit - (usage.remaining || 0)
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isPro = usage.plan === 'pro' || usage.plan === 'enterprise'

  return (
    <>
      {showUsageBar && !isPro && (
        <div style={{ padding: '8px 20px', background: 'rgba(8,11,18,0.8)', borderBottom: '1px solid rgba(99,130,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {FEATURE_LABELS[feature]}: <strong style={{ color: usage.remaining <= 1 ? '#ef4444' : usage.remaining <= 2 ? '#f59e0b' : '#10b981' }}>{usage.remaining} left today</strong>
          </span>
          <div style={{ flex: 1, minWidth: 80, maxWidth: 140 }}>
            <div className="usage-bar">
              <div className={`usage-fill ${pct >= 80 ? 'red' : pct >= 60 ? 'amber' : 'green'}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
          {usage.remaining <= 1 && (
            <a href="/pricing" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
              <TrendingUp size={10} /> Upgrade
            </a>
          )}
        </div>
      )}
      {children}
    </>
  )
}
