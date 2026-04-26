'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Plus, Trash2, RefreshCw, CheckCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react'

type QueueItem = {
  id: string
  title: string
  company: string
  platform: string
  status: string
  match_score: number
  job_url: string
  attempts: number
  last_error?: string
  applied_at?: string
  created_at: string
}
type QueueStats = { pending: number; applied: number; failed: number; manual_required: number; skipped: number; appliedToday: number }

function AutoApplyInner() {
  const [queue, setQueue]     = useState<QueueItem[]>([])
  const [stats, setStats]     = useState<QueueStats>({ pending: 0, applied: 0, failed: 0, manual_required: 0, skipped: 0, appliedToday: 0 })
  const [resumeText, setResumeText] = useState('')
  const [jobs, setJobs]       = useState<{ title: string; company: string; url: string; description: string }[]>([])
  const [newJob, setNewJob]   = useState({ title: '', company: '', url: '', description: '' })
  const [limit, setLimit]     = useState(10)
  const [result, setResult]   = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState<'queue'|'add'|'how'>('queue')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const loadQueue = useCallback(async () => {
    const tok = await getToken()
    if (!tok) return
    const res = await fetch('/api/application-queue', { headers: { Authorization: `Bearer ${tok}` } })
    const data = await res.json()
    setQueue(data.queue || [])
    setStats(data.counts || {})
  }, [])

  useEffect(() => { loadQueue() }, [loadQueue])

  const analyzeAndQueue = async () => {
    if (!jobs.length) return
    setLoading(true)
    const tok = await getToken()
    if (!tok) { setLoading(false); return }

    // First get AI tailoring
    const aiRes = await fetch('/api/auto-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ jobs, resumeText, dailyLimit: limit }),
    })
    const aiData = await aiRes.json()
    setResult(aiData)

    if (aiData.applications) {
      // Queue the ones AI says to apply
      const toQueue = aiData.applications
        .filter((a: Record<string,unknown>) => a.shouldApply)
        .map((a: Record<string,unknown>, i: number) => ({
          jobUrl:     jobs[i]?.url || '',
          platform:   detectPlatform(jobs[i]?.url || ''),
          title:      jobs[i]?.title || '',
          company:    jobs[i]?.company || '',
          matchScore: a.matchScore || 0,
          applyKit: {
            tailoredHeadline:  a.tailoredHeadline,
            tailoredSummary:   a.tailoredSummary,
            coverLetterOpener: a.coverLetterOpener,
            topBullets:        a.topBullets,
          },
        }))

      if (toQueue.length > 0) {
        await fetch('/api/application-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ jobs: toQueue }),
        })
        await loadQueue()
        setTab('queue')
      }
    }
    setLoading(false)
  }

  const removeFromQueue = async (id: string) => {
    const tok = await getToken()
    if (!tok) return
    await fetch(`/api/application-queue?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } })
    loadQueue()
  }

  const detectPlatform = (url: string): string => {
    if (url.includes('linkedin'))    return 'linkedin'
    if (url.includes('naukri'))      return 'naukri'
    if (url.includes('indeed'))      return 'indeed'
    if (url.includes('wellfound'))   return 'wellfound'
    if (url.includes('internshala')) return 'internshala'
    return 'email'
  }

  const addJob = () => {
    if (!newJob.title || !newJob.company) return
    setJobs([...jobs, newJob])
    setNewJob({ title: '', company: '', url: '', description: '' })
  }

  const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', processing: '#3b82f6', applied: '#10b981', failed: '#ef4444', manual_required: '#8b5cf6', skipped: '#6b7a99' }
  const STATUS_ICON: Record<string, typeof CheckCircle> = { applied: CheckCircle, failed: AlertTriangle, pending: Clock, processing: RefreshCw }

  const r = result as { applications?: {matchScore:number;shouldApply:boolean;reason:string;tailoredHeadline:string;coverLetterOpener:string;applyKit?:{emailBody?:string;linkedinMessage?:string}}[]; totalToApply?:number; skipped?:number; dailyStrategy?:string } | null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={22} color="#3b82f6" /> Auto-Apply Engine
        </h1>
        <p style={{ color: '#6b7a99', fontSize: 13 }}>AI tailors resume + cover letter per job, then queues for auto-submission via the worker</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { l: 'Applied Today', v: stats.appliedToday, c: '#10b981' },
          { l: 'Pending',       v: stats.pending,      c: '#f59e0b' },
          { l: 'Applied Total', v: stats.applied,      c: '#3b82f6' },
          { l: 'Failed',        v: stats.failed,       c: '#ef4444' },
          { l: 'Manual Req',    v: stats.manual_required, c: '#8b5cf6' },
          { l: 'Skipped',       v: stats.skipped,      c: '#6b7a99' },
        ].map(s => (
          <div key={s.l} className="card-sm" style={{ textAlign: 'center', padding: 10 }}>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6b7a99', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#111827', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[{ k: 'queue', l: `📋 Queue (${queue.length})` }, { k: 'add', l: '➕ Add Jobs' }, { k: 'how', l: '⚙️ How It Works' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
            style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: tab === t.k ? '#1f2937' : 'transparent', color: tab === t.k ? 'white' : '#6b7a99', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Queue tab */}
      {tab === 'queue' && (
        <div>
          {queue.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Zap size={36} color="#2d3b52" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'white', marginBottom: 8 }}>Queue is empty</div>
              <p style={{ color: '#6b7a99', fontSize: 13, marginBottom: 16 }}>Add jobs in the "Add Jobs" tab — AI will analyse and queue the best matches</p>
              <button className="btn-primary" onClick={() => setTab('add')} style={{ margin: '0 auto' }}>Add Jobs →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {queue.map(item => {
                const Icon = STATUS_ICON[item.status] || Clock
                const color = STATUS_COLOR[item.status] || '#6b7a99'
                return (
                  <div key={item.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderLeft: `3px solid ${color}` }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{item.company}</div>
                      <div style={{ fontSize: 12, color: '#6b7a99' }}>{item.title} · {item.platform}</div>
                      {item.last_error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{item.last_error}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: item.match_score >= 70 ? '#10b981' : '#f59e0b', fontSize: 16 }}>{item.match_score}%</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: `${color}15`, border: `1px solid ${color}30` }}>
                        <Icon size={11} color={color} />
                        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{item.status.replace('_', ' ')}</span>
                      </div>
                      {item.job_url && (
                        <a href={item.job_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                      {item.status === 'pending' && (
                        <button onClick={() => removeFromQueue(item.id)} className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Jobs tab */}
      {tab === 'add' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="label-sm" style={{ marginBottom: 8 }}>YOUR RESUME</div>
              <textarea className="input-dark" style={{ height: 160 }} placeholder="Paste your resume text here..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
              <div style={{ marginTop: 10 }}>
                <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>Daily Apply Limit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="range" min={1} max={30} value={limit} onChange={e => setLimit(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 18, color: '#3b82f6', minWidth: 50 }}>{limit}/day</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="label-sm" style={{ marginBottom: 10 }}>ADD A JOB</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>Job Title</label>
                  <input className="input-dark" placeholder="Senior SDE" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} />
                </div>
                <div>
                  <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>Company</label>
                  <input className="input-dark" placeholder="Razorpay" value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>Job URL (LinkedIn/Naukri/etc)</label>
                <input className="input-dark" placeholder="https://linkedin.com/jobs/view/..." value={newJob.url} onChange={e => setNewJob({ ...newJob, url: e.target.value })} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>Job Description (paste)</label>
                <textarea className="input-dark" style={{ height: 70 }} placeholder="Paste JD for better AI matching..." value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} />
              </div>
              <button onClick={addJob} disabled={!newJob.title || !newJob.company} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={13} /> Add to List
              </button>
            </div>

            {jobs.length > 0 && (
              <div className="card">
                <div className="label-sm" style={{ marginBottom: 10 }}>JOBS TO ANALYSE ({jobs.length})</div>
                {jobs.map((j, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(99,130,255,0.06)', fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'white', fontWeight: 600 }}>{j.company}</div>
                      <div style={{ color: '#6b7a99' }}>{j.title}</div>
                    </div>
                    <button onClick={() => setJobs(jobs.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                ))}
                <button className="btn-primary" onClick={analyzeAndQueue} disabled={loading || !resumeText} style={{ marginTop: 14, width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? <><RefreshCw size={13} /> Analysing + Queuing...</> : <><Zap size={13} /> Analyse All & Queue Best Matches</>}
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          <div>
            {r?.applications ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 13, color: '#10b981' }}>
                  {r.dailyStrategy}
                </div>
                {r.applications.map((app, i) => (
                  <div key={i} className="card" style={{ borderLeft: `3px solid ${app.shouldApply ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{jobs[i]?.company}</div>
                        <div style={{ fontSize: 12, color: '#6b7a99' }}>{jobs[i]?.title}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 22, color: app.matchScore >= 70 ? '#10b981' : app.matchScore >= 50 ? '#f59e0b' : '#ef4444' }}>{app.matchScore}%</div>
                        {app.shouldApply ? <span className="badge badge-green" style={{ fontSize: 10 }}>✅ Queued</span> : <span className="badge badge-red" style={{ fontSize: 10 }}>⏭ Skipped</span>}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7a99', marginBottom: 8 }}>{app.reason}</p>
                    {app.shouldApply && (
                      <>
                        <div style={{ fontSize: 11, color: '#6b7a99', fontWeight: 600, marginBottom: 3 }}>TAILORED HEADLINE</div>
                        <div style={{ fontSize: 12, background: '#0d1421', padding: '7px 10px', borderRadius: 7, marginBottom: 8 }}>{app.tailoredHeadline}</div>
                        <div style={{ fontSize: 11, color: '#6b7a99', fontWeight: 600, marginBottom: 3 }}>COVER LETTER OPENER</div>
                        <div style={{ fontSize: 12, background: 'rgba(16,185,129,0.06)', padding: '7px 10px', borderRadius: 7, fontStyle: 'italic' }}>{app.coverLetterOpener}</div>
                        {app.applyKit?.emailBody && (
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}>📧 Email Apply Kit</summary>
                            <div style={{ fontSize: 11, background: '#0d1421', padding: '8px 10px', borderRadius: 7, marginTop: 6, whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono,monospace' }}>{app.applyKit.emailBody}</div>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 300 }}>
                <Zap size={36} color="#2d3b52" />
                <p style={{ color: '#6b7a99', fontSize: 14, textAlign: 'center', maxWidth: 260 }}>Add jobs and paste your resume, then click "Analyse All" — AI scores each job and queues the best matches</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* How it works tab */}
      {tab === 'how' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div className="card">
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 14 }}>How Auto-Apply Works</div>
            {[
              { n: '1', title: 'You add jobs', desc: 'Paste URLs from LinkedIn, Naukri, Indeed, Wellfound. Include JD for better AI matching.' },
              { n: '2', title: 'AI analyses each job', desc: 'Scores match %, tailors your resume headline, writes cover letter opener, decides to apply or skip.' },
              { n: '3', title: 'Jobs queued', desc: 'Approved jobs go into the queue table. You can see and manage them in the Queue tab.' },
              { n: '4', title: 'Worker applies', desc: 'The separate Playwright worker picks up queued jobs and applies automatically on LinkedIn.' },
              { n: '5', title: 'Results tracked', desc: 'Every application is logged. Status updates in real-time. Screenshot audit trail saved.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 12, color: '#3b82f6' }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 13, marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7a99', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 14 }}>Worker Setup (Needed for Auto-Submit)</div>
            <div style={{ fontSize: 13, color: '#6b7a99', lineHeight: 1.8, marginBottom: 14 }}>
              The worker runs separately from this web app. It needs to be deployed on Railway, Render, or your own server.
            </div>
            <div style={{ background: '#0d1421', borderRadius: 10, padding: '14px', fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#10b981', marginBottom: 14 }}>
              {`cd worker\nnpm install\nnpx playwright install chromium\n# Capture LinkedIn session once:\nnpx ts-node -e "import('./linkedin').then(m=>m.captureLinkedInSession())"\n# Start worker:\nnode dist/index.js`}
            </div>
            <div style={{ fontSize: 12, color: '#6b7a99' }}>
              <strong style={{ color: '#f59e0b' }}>Safe limits:</strong> Max 15 applies/day hard cap. 30–90s human delay between applies. Session-based auth only (no login automation).
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, fontSize: 12, color: '#a78bfa' }}>
              💡 <strong>Without worker:</strong> Jobs stay queued. You can still use the Email/LinkedIn apply kit generated per job for manual apply.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AutoApplyPage() {
  return (
    <PaywallGate feature="auto_apply">
      <AutoApplyInner />
    </PaywallGate>
  )
}
