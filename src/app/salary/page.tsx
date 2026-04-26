'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import PaywallGate from '@/components/PaywallGate'
import { TrendingUp, RefreshCw, ExternalLink } from 'lucide-react'

const PRESET_ROLES = ['Software Engineer','Senior SDE','Staff Engineer','Engineering Manager','Data Engineer','ML Engineer','Product Manager','DevOps Engineer','Backend Engineer','Frontend Engineer']

function SalaryContent() {
  const [role, setRole]           = useState('')
  const [skills, setSkills]       = useState('')
  const [yearsExp, setYearsExp]   = useState('')
  const [location, setLocation]   = useState('Bangalore')
  const [currentSal, setCurrentSal] = useState('')
  const [result, setResult]       = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]     = useState(false)

  const check = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/auth'; return }
    setLoading(true)
    try {
      const res = await fetch('/api/salary-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ role, skills: skills.split(',').map(s => s.trim()).filter(Boolean), yearsExp: parseInt(yearsExp) || 0, location, currentSalary: currentSal ? parseInt(currentSal) : null }),
      })
      setResult(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  type SalRange = { min: number; max: number; median: number; currency?: string; unit?: string; notes?: string; note?: string }
  const r = result as {
    currentMarket?: SalRange; targetable?: SalRange; remote?: SalRange;
    topPaying?: {company:string;range:string;notes:string}[];
    negotiationTips?: string[]; skillsForHike?: {skill:string;impact:string;timeToLearn:string}[];
    marketDemand?: string; verdict?: string; actionPlan?: string;
  } | null

  const demandColor = r?.marketDemand === 'high' ? '#10b981' : r?.marketDemand === 'medium' ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={24} color="#10b981" /> Salary Benchmarker
        </h1>
        <p style={{ color: '#6b7a99' }}>Know exactly what you should be earning — India + Remote/Global</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {PRESET_ROLES.map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ padding: '4px 10px', borderRadius: 16, border: `1px solid ${role === r ? '#10b981' : 'rgba(255,255,255,0.08)'}`, background: role === r ? 'rgba(16,185,129,0.1)' : 'transparent', color: role === r ? '#10b981' : '#6b7a99', cursor: 'pointer', fontSize: 11 }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 14 }}>
          {[
            { l: 'Job Title', v: role, s: setRole, p: 'Senior Backend Engineer' },
            { l: 'Key Skills', v: skills, s: setSkills, p: 'Go, Kubernetes, React' },
            { l: 'Years Exp', v: yearsExp, s: setYearsExp, p: '5', t: 'number' },
            { l: 'Location', v: location, s: setLocation, p: 'Bangalore' },
            { l: 'Current Salary (LPA)', v: currentSal, s: setCurrentSal, p: '18', t: 'number' },
          ].map(f => (
            <div key={f.l}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 5 }}>{f.l}</label>
              <input type={f.t || 'text'} className="input-dark" placeholder={f.p} value={f.v} onChange={e => f.s(e.target.value)} />
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={check} disabled={loading || !role}
          style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)', justifyContent: 'center', padding: '12px 28px' }}>
          {loading ? <><RefreshCw size={14} /> Calculating...</> : <><TrendingUp size={14} /> Check My Market Value</>}
        </button>
      </div>

      {r && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Salary ranges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Current Market (India)', data: r.currentMarket, c: '#6b7a99' },
              { label: '🎯 Targetable Salary', data: r.targetable, c: '#f59e0b' },
              { label: '🌍 Remote / Global', data: r.remote, c: '#10b981' },
            ].map(({ label, data: d, c }) => d && (
              <div key={label} className="card" style={{ borderColor: `${c}30` }}>
                <div style={{ fontSize: 12, color: c, fontWeight: 700, marginBottom: 10 }}>{label}</div>
                <div style={{ display: 'flex', gap: 14, marginBottom: d.notes || d.note ? 8 : 0 }}>
                  {[
                    { l: 'Min', v: d.min },
                    { l: 'Median', v: d.median },
                    { l: 'Max', v: d.max },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: c }}>
                        {d.currency === 'USD' ? '$' : '₹'}{s.v}
                        <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7a99' }}>{d.unit === 'annual' ? 'K/yr' : 'L'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7a99' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {(d.notes || d.note) && <div style={{ fontSize: 12, color: '#6b7a99', background: 'var(--bg2)', padding: '8px 12px', borderRadius: 8 }}>{d.notes || d.note}</div>}
              </div>
            ))}

            {r.verdict && (
              <div className="card" style={{ borderColor: `${demandColor}30` }}>
                <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 6 }}>Market verdict</div>
                <div style={{ fontSize: 14, color: 'white', lineHeight: 1.6, marginBottom: 10 }}>{r.verdict}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ padding: '6px 12px', background: `${demandColor}10`, border: `1px solid ${demandColor}30`, borderRadius: 6, fontSize: 12, color: demandColor, fontWeight: 700 }}>
                    {r.marketDemand?.toUpperCase()} demand
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Skills for hike */}
            {(r.skillsForHike?.length || 0) > 0 && (
              <div className="card">
                <div className="label-sm" style={{ color: '#3b82f6', marginBottom: 12 }}>⚡ SKILLS THAT ADD SALARY</div>
                {r.skillsForHike!.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{s.skill}</div>
                      <div style={{ fontSize: 11, color: '#6b7a99' }}>Learn in {s.timeToLearn}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#10b981', fontSize: 14 }}>{s.impact}</span>
                  </div>
                ))}
                <a href="/learning" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>
                  <ExternalLink size={11} /> Start learning these now →
                </a>
              </div>
            )}

            {/* Top paying companies */}
            {(r.topPaying?.length || 0) > 0 && (
              <div className="card">
                <div className="label-sm" style={{ color: '#f59e0b', marginBottom: 12 }}>💰 TOP PAYING COMPANIES</div>
                {r.topPaying!.map((c, i) => (
                  <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{c.company}</span>
                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>{c.range}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{c.notes}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Negotiation tips */}
            {(r.negotiationTips?.length || 0) > 0 && (
              <div className="card">
                <div className="label-sm" style={{ color: '#8b5cf6', marginBottom: 10 }}>🎯 NEGOTIATION TIPS</div>
                {r.negotiationTips!.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#8b5cf6', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#6b7a99' }}>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 90-day action plan */}
            {r.actionPlan && (
              <div className="card" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                <div className="label-sm" style={{ color: '#10b981', marginBottom: 8 }}>90-DAY ACTION PLAN</div>
                <p style={{ fontSize: 13, color: '#6b7a99', lineHeight: 1.7 }}>{r.actionPlan}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Salary() {
  return (
    <PaywallGate feature="market_trends">
      <SalaryContent />
    </PaywallGate>
  )
}
