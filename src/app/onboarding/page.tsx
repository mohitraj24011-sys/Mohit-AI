'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowRight, Zap } from 'lucide-react'

const ROLE_TIERS = ['fresher','junior','mid','senior','staff','manager','director','vp','c_suite']
const PRESET_ROLES = ['Software Engineer','Backend Engineer','Frontend Engineer','Full Stack Engineer','Data Engineer','ML Engineer','DevOps Engineer','Product Manager','Business Analyst','Data Analyst','UX Designer','Engineering Manager','Director of Engineering']

import { Suspense } from 'react'

function OnboardingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const refCode = params.get('ref') || ''

  const [step, setStep]           = useState(1)
  const [currentRole, setCurrentRole] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [skills, setSkills]       = useState('')
  const [yearsExp, setYearsExp]   = useState('')
  const [tier, setTier]           = useState('mid')
  const [targetSalary, setTargetSalary] = useState('')
  const [referralCode, setReferralCode] = useState(refCode)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    // Store referral code from URL
    if (refCode) {
      if (typeof window !== 'undefined') localStorage.setItem('referral_code', refCode)
    }
  }, [refCode])

  const complete = async () => {
    setLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const storedRef = typeof window !== 'undefined' ? localStorage.getItem('referral_code') : ''
      const finalRef  = referralCode || storedRef || ''

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          currentRole, targetRole, skills, yearsExp: parseInt(yearsExp) || 0,
          targetSalary: parseInt(targetSalary) || 0, referralCode: finalRef,
        }),
      })
      const data = await res.json()

      if (data.referralApplied) {
        if (typeof window !== 'undefined') localStorage.removeItem('referral_code')
      }

      router.push('/dashboard?welcome=true')
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const steps = [
    { title: 'Where are you now?', desc: 'Tell us about your current situation' },
    { title: 'Where do you want to go?', desc: 'Set your goal so we can personalise everything' },
    { title: 'Almost there!', desc: 'A few final details to complete your profile' },
  ]

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#3b82f6,#10b981)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Zap size={22} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            {steps[step - 1].title}
          </h1>
          <p style={{ color: '#6b7a99', fontSize: 14 }}>{steps[step - 1].desc}</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? '#3b82f6' : 'var(--bg3)', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Current Job Title</label>
                <input className="input-dark" placeholder="Senior Software Engineer" value={currentRole} onChange={e => setCurrentRole(e.target.value)} />
              </div>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Years of Experience</label>
                <input className="input-dark" type="number" min="0" max="40" placeholder="4" value={yearsExp} onChange={e => setYearsExp(e.target.value)} />
              </div>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 8 }}>Your Career Level</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ROLE_TIERS.map(t => (
                    <button key={t} onClick={() => setTier(t)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${tier === t ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, background: tier === t ? 'rgba(59,130,246,0.15)' : 'transparent', color: tier === t ? '#60a5fa' : '#6b7a99', cursor: 'pointer', fontSize: 12 }}>
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 8 }}>Target Role</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {PRESET_ROLES.slice(0, 8).map(r => (
                    <button key={r} onClick={() => setTargetRole(r)}
                      style={{ padding: '4px 10px', borderRadius: 16, border: `1px solid ${targetRole === r ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, background: targetRole === r ? 'rgba(59,130,246,0.12)' : 'transparent', color: targetRole === r ? '#60a5fa' : '#6b7a99', cursor: 'pointer', fontSize: 11 }}>
                      {r}
                    </button>
                  ))}
                </div>
                <input className="input-dark" placeholder="Or type your target role..." value={targetRole} onChange={e => setTargetRole(e.target.value)} />
              </div>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Your Skills (comma separated)</label>
                <textarea className="input-dark" style={{ height: 80 }} placeholder="Go, Kubernetes, React, PostgreSQL, System Design..." value={skills} onChange={e => setSkills(e.target.value)} />
              </div>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Salary Goal (LPA)</label>
                <input className="input-dark" type="number" min="0" placeholder="40" value={targetSalary} onChange={e => setTargetSalary(e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px', background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)' }}>
                <div style={{ fontWeight: 700, color: 'white', fontSize: 14, marginBottom: 8 }}>Your profile:</div>
                {[
                  { l: 'Current role', v: currentRole || 'Not set' },
                  { l: 'Target role', v: targetRole || 'Not set' },
                  { l: 'Skills', v: skills || 'Not set' },
                  { l: 'Experience', v: yearsExp ? `${yearsExp} years` : 'Not set' },
                  { l: 'Salary goal', v: targetSalary ? `₹${targetSalary}L` : 'Not set' },
                ].map(({ l, v }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#6b7a99' }}>{l}</span>
                    <span style={{ color: 'white', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Referral Code (optional)</label>
                <input className="input-dark" placeholder="Enter friend's code for +5 credits each" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} />
                <p style={{ fontSize: 11, color: '#6b7a99', marginTop: 5 }}>Both you and your friend get +5 free AI credits instantly</p>
              </div>
              {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>{error}</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button className="btn-ghost" onClick={() => setStep(step - 1)} style={{ flex: 1, justifyContent: 'center' }}>
                ← Back
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => step < 3 ? setStep(step + 1) : complete()}
              disabled={loading || (step === 1 && !currentRole) || (step === 2 && !targetRole)}
              style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>
              {loading ? 'Saving...' : step < 3 ? <>Continue <ArrowRight size={14} /></> : 'Launch My Job Search 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Onboarding() {
  return (
    <Suspense fallback={<div style={{ color:'white', textAlign:'center', padding:50 }}>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}
