'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Copy, Check, Zap, RefreshCw } from 'lucide-react'

type Win = { id: string; win_type: string; company: string; role: string; salary_before?: number; salary_after?: number; days_to_win?: number; description?: string; linkedin_post?: string; is_public: boolean; created_at: string }

const WIN_TYPES = [
  { id: 'offer',       label: '🎉 Got an Offer',      desc: 'You received a job offer' },
  { id: 'salary_hike', label: '💰 Salary Hike',        desc: 'Got a raise or better offer' },
  { id: 'interview',   label: '🎤 Interview Secured',  desc: 'Landed an interview at a target company' },
  { id: 'referral',    label: '🤝 Got a Referral',     desc: 'Someone referred you to their company' },
  { id: 'promotion',   label: '🚀 Got Promoted',       desc: 'Internal promotion or level up' },
]

export default function Wins() {
  const [wins, setWins]           = useState<Win[]>([])
  const [publicWins, setPublicWins] = useState<Win[]>([])
  const [form, setForm]           = useState({ winType: 'offer', company: '', role: '', description: '', salaryBefore: '', salaryAfter: '', daysToWin: '', isPublic: false })
  const [result, setResult]       = useState<{linkedin_post?: string}|null>(null)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/win-capture', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    setWins(data.wins || [])
    setPublicWins(data.publicWins || [])
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { alert('Sign in first'); return }
    setLoading(true)
    const res = await fetch('/api/win-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        winType: form.winType, company: form.company, role: form.role, description: form.description,
        salaryBefore: form.salaryBefore ? parseInt(form.salaryBefore) : null,
        salaryAfter: form.salaryAfter ? parseInt(form.salaryAfter) : null,
        daysToWin: form.daysToWin ? parseInt(form.daysToWin) : null,
        isPublic: form.isPublic, generateLinkedInPost: true,
      }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
    load()
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const hikeType = form.winType === 'salary_hike' || form.winType === 'offer'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={24} color="#f59e0b" /> Capture Your Win
        </h1>
        <p style={{ color: '#6b7a99' }}>Document your progress + generate a viral LinkedIn post automatically</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="label-sm" style={{ marginBottom: 10 }}>WIN TYPE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WIN_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm({ ...form, winType: t.id })}
                  style={{ padding: '10px 14px', borderRadius: 9, border: `1px solid ${form.winType === t.id ? '#3b82f6' : 'rgba(255,255,255,0.06)'}`, background: form.winType === t.id ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, color: form.winType === t.id ? 'white' : '#6b7a99', fontWeight: 500 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{t.desc}</div>
                  </div>
                  {form.winType === t.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="label-sm" style={{ marginBottom: 12 }}>DETAILS</div>
            {[
              { k: 'company', l: 'Company', p: 'Razorpay, Google, Zepto...' },
              { k: 'role',    l: 'Role',    p: 'Senior Backend Engineer' },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label className="label-sm" style={{ display: 'block', marginBottom: 5 }}>{f.l}</label>
                <input className="input-dark" placeholder={f.p} value={(form as Record<string, string>)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
              </div>
            ))}
            {hikeType && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="label-sm" style={{ display: 'block', marginBottom: 5 }}>Previous Salary (LPA)</label>
                  <input className="input-dark" type="number" placeholder="18" value={form.salaryBefore} onChange={e => setForm({ ...form, salaryBefore: e.target.value })} />
                </div>
                <div>
                  <label className="label-sm" style={{ display: 'block', marginBottom: 5 }}>New Salary (LPA)</label>
                  <input className="input-dark" type="number" placeholder="32" value={form.salaryAfter} onChange={e => setForm({ ...form, salaryAfter: e.target.value })} />
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 5 }}>Days it took (optional)</label>
              <input className="input-dark" type="number" placeholder="45" value={form.daysToWin} onChange={e => setForm({ ...form, daysToWin: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 5 }}>Brief story (optional)</label>
              <textarea className="input-dark" style={{ height: 80 }} placeholder="What helped you get here..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input type="checkbox" id="pub" checked={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.checked })} />
              <label htmlFor="pub" style={{ fontSize: 13, color: '#6b7a99', cursor: 'pointer' }}>
                Share anonymously on MohitJob AI (helps inspire others)
              </label>
            </div>
          </div>

          <button className="btn-primary" onClick={submit} disabled={loading || !form.company || !form.role} style={{ justifyContent: 'center', padding: '13px' }}>
            {loading ? <><RefreshCw size={14} /> Generating post...</> : <><Zap size={14} /> Capture Win + Generate LinkedIn Post</>}
          </button>
        </div>

        {/* Result */}
        <div>
          {result?.linkedin_post ? (
            <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: '#10b981' }}>🎉 Your LinkedIn Post</div>
                <button onClick={() => copy(result.linkedin_post!)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'DM Sans,sans-serif', marginBottom: 14 }}>
                {result.linkedin_post}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`https://linkedin.com/feed/`} target="_blank" rel="noopener noreferrer">
                  <button className="btn-primary" style={{ fontSize: 12, padding: '8px 14px', background: '#0077b5' }}>Post to LinkedIn</button>
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(result.linkedin_post.slice(0, 280))}`} target="_blank" rel="noopener noreferrer">
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>Tweet</button>
                </a>
              </div>
            </div>
          ) : (
            <div className="card" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <Trophy size={40} color="#2d3b52" />
              <p style={{ color: '#6b7a99', fontSize: 14, textAlign: 'center', maxWidth: 240 }}>Fill in your win details and we'll generate a viral LinkedIn post for you automatically</p>
            </div>
          )}

          {/* Past wins */}
          {wins.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Your Wins ({wins.length})</div>
              {wins.slice(0, 5).map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(99,130,255,0.06)', fontSize: 13 }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600 }}>{w.company} {w.role ? `— ${w.role}` : ''}</div>
                    <div style={{ color: '#6b7a99', fontSize: 11 }}>{w.win_type.replace('_', ' ')} {w.days_to_win ? `· ${w.days_to_win} days` : ''}</div>
                  </div>
                  {w.salary_after && <span style={{ color: '#10b981', fontWeight: 700, alignSelf: 'center' }}>₹{w.salary_after}L</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Public social proof */}
      {publicWins.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>🏆 Community Wins (anonymous)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {publicWins.map((w, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: 'white', fontWeight: 600, marginBottom: 3 }}>
                  {w.win_type === 'offer' ? '🎉' : w.win_type === 'salary_hike' ? '💰' : '🚀'} {w.company}
                </div>
                {w.salary_before && w.salary_after && (
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>
                    ₹{w.salary_before}L → ₹{w.salary_after}L (+{Math.round(((w.salary_after - w.salary_before) / w.salary_before) * 100)}%)
                  </div>
                )}
                {w.days_to_win && <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>{w.days_to_win} days</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
