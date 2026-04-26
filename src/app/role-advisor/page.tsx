'use client'
import { useState } from 'react'
import { ROLE_TIERS, getTierFromTitle } from '@/lib/role-tiers'
import { ChevronRight, Copy, Check } from 'lucide-react'

export default function RoleAdvisor() {
  const [currentTitle, setCurrentTitle] = useState('')
  const [selected, setSelected] = useState<keyof typeof ROLE_TIERS>('mid')
  const [copied, setCopied] = useState<string|null>(null)

  const tier = ROLE_TIERS[selected]
  const autoTier = currentTitle ? getTierFromTitle(currentTitle) : null

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000) }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8 }}>Role Strategy Advisor</h1>
      <p style={{ color: '#7a8599', marginBottom: 28 }}>Fresher to C-Suite — personalised strategy, salary targets, pitch templates</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Your Current Job Title (auto-detects level)</label>
        <input className="input-dark" placeholder="e.g. Senior Software Engineer, Engineering Manager, Director..." value={currentTitle}
          onChange={e => { setCurrentTitle(e.target.value); const d = getTierFromTitle(e.target.value); if (d) setSelected(d) }} />
        {autoTier && <p style={{ fontSize: 13, color: '#00e5b3', marginTop: 8 }}>Detected: <strong>{ROLE_TIERS[autoTier].label}</strong></p>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {(Object.keys(ROLE_TIERS) as (keyof typeof ROLE_TIERS)[]).map(t => (
          <button key={t} onClick={() => setSelected(t)}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${selected===t?'#4f8eff':'rgba(255,255,255,0.08)'}`, background: selected===t?'rgba(79,142,255,0.15)':'transparent', color: selected===t?'#4f8eff':'#7a8599', cursor: 'pointer', fontSize: 12 }}>
            {ROLE_TIERS[t].label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card" style={{ borderColor: 'rgba(0,229,179,0.2)' }}>
          <div className="label-sm" style={{ color: '#00e5b3', marginBottom: 12 }}>💰 SALARY RANGE</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#7a8599', marginBottom: 2 }}>India</div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: 'white' }}>{tier.salaryRange}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#7a8599', marginBottom: 2 }}>Remote / Global</div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: '#00e5b3' }}>{tier.remoteSalary}</div>
          </div>
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,229,179,0.06)', borderRadius: 8, fontSize: 12, color: '#00e5b3' }}>
            Hike: {tier.hikeMultiplier}
          </div>
        </div>

        <div className="card">
          <div className="label-sm" style={{ color: '#4f8eff', marginBottom: 12 }}>🎯 CORE STRATEGY</div>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>{tier.keyStrategy}</p>
          <div style={{ marginTop: 12 }}>
            <div className="label-sm" style={{ marginBottom: 6 }}>Resume Focus</div>
            <p style={{ fontSize: 13, color: '#7a8599' }}>{tier.resumeFocus}</p>
          </div>
        </div>

        <div className="card">
          <div className="label-sm" style={{ color: '#a78bfa', marginBottom: 12 }}>🌐 BEST PLATFORMS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tier.primaryPlatforms.map(p => <span key={p} className="badge badge-blue" style={{ fontSize: 11 }}>{p}</span>)}
          </div>
        </div>

        <div className="card">
          <div className="label-sm" style={{ color: '#f97316', marginBottom: 12 }}>🎯 WHO TO CONNECT WITH</div>
          <p style={{ fontSize: 13, color: '#7a8599', marginBottom: 10 }}>{tier.outreachTarget}</p>
          <div className="label-sm" style={{ marginBottom: 6 }}>Pitch Style</div>
          <p style={{ fontSize: 13 }}>{tier.pitchStyle}</p>
        </div>

        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="label-sm" style={{ color: '#fbbf24' }}>📨 CONNECTION MESSAGE TEMPLATE</div>
            <button onClick={() => copy(tier.connectionMessage, 'cm')} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>
              {copied==='cm'?<><Check size={11}/> Copied</>:<><Copy size={11}/> Copy</>}
            </button>
          </div>
          <div style={{ background: '#0f1420', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.8, fontFamily: 'JetBrains Mono,monospace', color: '#e8edf5' }}>
            {tier.connectionMessage}
          </div>
          <p style={{ fontSize: 11, color: '#7a8599', marginTop: 8 }}>Replace {'{'}curly braces{'}'} with real values before sending.</p>
        </div>

        {tier.autoConvFlow && (
          <div className="card" style={{ gridColumn: '1/-1' }}>
            <div className="label-sm" style={{ color: '#a78bfa', marginBottom: 14 }}>🤖 AUTO-CONVERSATION FLOW</div>
            {[
              { label: 'Initial request', key: 'step1' as const },
              { label: 'After they accept', key: 'step2' as const },
              { label: 'After warm reply', key: 'step3' as const },
              { label: 'Referral ask', key: 'referralAsk' as const },
            ].map(({ label, key }) => (
              <div key={key} style={{ marginBottom: 12, padding: 14, background: '#0f1420', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#7a8599', fontWeight: 600 }}>{label}</span>
                  <button onClick={() => copy(tier.autoConvFlow[key], key)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }}>
                    {copied===key?<Check size={10}/>:<Copy size={10}/>}
                  </button>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.6 }}>{tier.autoConvFlow[key]}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div className="label-sm" style={{ color: '#34d399', marginBottom: 12 }}>🎤 INTERVIEW TOPICS FOR THIS LEVEL</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {tier.interviewFocus.map(f => (
              <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 8 }}>
                <ChevronRight size={12} color="#34d399" /><span style={{ fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
