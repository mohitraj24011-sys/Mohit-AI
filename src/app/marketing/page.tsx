'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PROSPECT_SOURCES, WEEKLY_OUTREACH_PLAN, LeadType } from '@/lib/marketingEngine'
import { Megaphone, Target, Users, Building2, GraduationCap, UserCog, Search, MessageSquare, TrendingUp, Copy, Check, RefreshCw, Zap, Globe, ArrowRight } from 'lucide-react'

const LEAD_TYPES: { id: LeadType; label: string; icon: React.ElementType; color: string; desc: string; dealValue: string }[] = [
  { id: 'dev_client',        label: 'Startup Dev Clients',    icon: Zap,          color: '#3b82f6', desc: 'Startups that need to hire or outsource developers', dealValue: '₹5L+/mo' },
  { id: 'enterprise_client', label: 'Enterprise Clients',     icon: Building2,    color: '#8b5cf6', desc: 'Large companies outsourcing tech projects', dealValue: '₹20L+/mo' },
  { id: 'it_professional',   label: 'IT Professionals',       icon: Users,        color: '#10b981', desc: 'Job seekers for MohitJob AI (users)', dealValue: '₹499/mo' },
  { id: 'hr_recruiter',      label: 'HR / Recruiters',        icon: UserCog,      color: '#f59e0b', desc: 'Staffing firms and recruitment companies', dealValue: '₹10K/mo' },
  { id: 'bootcamp',          label: 'Coding Bootcamps',       icon: Target,       color: '#f97316', desc: 'Bootcamps wanting placement tools for students', dealValue: '₹50K/mo' },
  { id: 'college',           label: 'Colleges / TPOs',        icon: GraduationCap,color: '#ec4899', desc: 'College placement cells (free → paid upgrade)', dealValue: '₹30K/mo' },
]

const TABS = ['Strategy', 'Find Prospects', 'Generate Messages', 'Weekly Plan']

export default function Marketing() {
  const [tab, setTab]             = useState(0)
  const [selectedType, setSelectedType] = useState<LeadType>('it_professional')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<Record<string,unknown>|null>(null)
  const [copied, setCopied]       = useState<string|null>(null)
  const [myProfile, setMyProfile] = useState({ name: '', company: '', offering: 'AI job search platform + dev services', linkedinUrl: '' })

  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/auth'; return null }
    return fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...((opts.headers as Record<string,string>) || {}) } })
  }

  const findProspects = async () => {
    setLoading(true); setResult(null)
    const res = await authFetch('/api/prospect-finder', { method: 'POST', body: JSON.stringify({ leadType: selectedType }) })
    if (res?.ok) setResult(await res.json())
    setLoading(false)
  }

  const getStrategy = async () => {
    setLoading(true); setResult(null)
    const res = await authFetch('/api/marketing-agent', {
      method: 'POST',
      body: JSON.stringify({ action: 'get_strategy', myCompany: myProfile, goals: { devClients: 3, mohitjobUsers: 100 }, currentStage: 'pre-revenue' }),
    })
    if (res?.ok) setResult(await res.json())
    setLoading(false)
  }

  const generateMessages = async () => {
    setLoading(true); setResult(null)
    const res = await authFetch('/api/message-sequence', {
      method: 'POST',
      body: JSON.stringify({ leadType: selectedType, myProfile, targetCount: 3 }),
    })
    if (res?.ok) setResult(await res.json())
    setLoading(false)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const sources = PROSPECT_SOURCES[selectedType]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Megaphone size={24} color="#3b82f6" /> AI Marketing Agent
        </h1>
        <p style={{ color: '#6b7a99' }}>Finds clients for your dev org + users for MohitJob AI. All 4 customer types. Automated outreach copy.</p>
      </div>

      {/* Customer type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, marginBottom: 24 }}>
        {LEAD_TYPES.map(t => (
          <button key={t.id} onClick={() => setSelectedType(t.id)}
            style={{ padding: '14px', borderRadius: 12, border: `2px solid ${selectedType === t.id ? t.color : 'rgba(255,255,255,0.06)'}`, background: selectedType === t.id ? `${t.color}12` : 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <t.icon size={16} color={t.color} />
              <span style={{ fontSize: 13, fontWeight: 700, color: selectedType === t.id ? 'white' : '#6b7a99' }}>{t.label}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>{t.desc}</div>
            <div style={{ fontSize: 12, color: t.color, fontWeight: 700 }}>{t.dealValue}</div>
          </button>
        ))}
      </div>

      {/* My profile setup */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="label-sm" style={{ marginBottom: 10 }}>YOUR PROFILE (personalises all messages)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {[
            { k: 'name',        l: 'Your Name',          p: 'Mohit Sharma' },
            { k: 'company',     l: 'Company Name',       p: 'MohitJob AI / DevAgency' },
            { k: 'offering',    l: 'What you offer',     p: 'AI job search + dev services' },
            { k: 'linkedinUrl', l: 'Your LinkedIn URL',  p: 'linkedin.com/in/...' },
          ].map(f => (
            <div key={f.k}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 4 }}>{f.l}</label>
              <input className="input-dark" placeholder={f.p} value={(myProfile as Record<string,string>)[f.k]}
                onChange={e => setMyProfile({ ...myProfile, [f.k]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(99,130,255,0.1)', paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: '10px 18px', border: 'none', borderBottom: `2px solid ${tab === i ? '#3b82f6' : 'transparent'}`, background: 'transparent', color: tab === i ? '#3b82f6' : '#6b7a99', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 700 : 400, marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Strategy */}
      {tab === 0 && (
        <div>
          <button onClick={getStrategy} disabled={loading} className="btn-primary" style={{ marginBottom: 20 }}>
            {loading ? <><RefreshCw size={13} /> Building strategy...</> : <><TrendingUp size={13} /> Generate Full Strategy</>}
          </button>

          {result && (result as {executiveSummary?:string}).executiveSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                <div className="label-sm" style={{ color: '#3b82f6', marginBottom: 8 }}>EXECUTIVE SUMMARY</div>
                <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.7 }}>{(result as {executiveSummary:string}).executiveSummary}</p>
              </div>

              {(result as {priorityOrder?: {rank:number;target:string;why:string;expectedROI:string;timeToFirstRevenue:string}[]}).priorityOrder && (
                <div className="card">
                  <div className="label-sm" style={{ marginBottom: 12 }}>PRIORITY ORDER</div>
                  {(result as {priorityOrder:{rank:number;target:string;why:string;expectedROI:string;timeToFirstRevenue:string}[]}).priorityOrder.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f620', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Syne,sans-serif', fontWeight: 800, color: '#3b82f6', fontSize: 13 }}>{p.rank}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: 14, marginBottom: 2 }}>{p.target}</div>
                        <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 4 }}>{p.why}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span className="badge badge-green" style={{ fontSize: 10 }}>{p.expectedROI}</span>
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.timeToFirstRevenue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {['week1Actions','week2Actions','week3Actions','week4Actions'].map((wk, wi) => {
                const actions = (result as Record<string,{action:string;channel:string;target:number;expectedResult:string}[]>)[wk]
                if (!actions?.length) return null
                return (
                  <div key={wk} className="card">
                    <div className="label-sm" style={{ marginBottom: 12 }}>WEEK {wi + 1} ACTIONS</div>
                    {actions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(99,130,255,0.06)', fontSize: 13 }}>
                        <span className={`badge badge-${['blue','green','amber','purple'][wi]}`} style={{ fontSize: 10, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{a.channel}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'white', marginBottom: 2 }}>{a.action}</div>
                          <div style={{ color: '#6b7a99', fontSize: 11 }}>Target: {a.target} · {a.expectedResult}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}

              {(result as {quickWins?:string[]}).quickWins?.length && (
                <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
                  <div className="label-sm" style={{ color: '#10b981', marginBottom: 10 }}>⚡ QUICK WINS — DO THESE TODAY</div>
                  {(result as {quickWins:string[]}).quickWins.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', fontSize: 13, borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                      <span style={{ color: '#10b981' }}>→</span>
                      <span style={{ color: 'var(--text)' }}>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Find Prospects */}
      {tab === 1 && (
        <div>
          <div className="card" style={{ marginBottom: 16, borderColor: `${LEAD_TYPES.find(t => t.id === selectedType)?.color}30` }}>
            <div className="label-sm" style={{ marginBottom: 10 }}>WHERE TO FIND {selectedType.toUpperCase().replace('_',' ')} (STATIC SOURCES)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.directSources.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8, textDecoration: 'none', color: '#3b82f6', fontSize: 12 }}>
                  <Globe size={12} />{url}
                </a>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="label-sm" style={{ marginBottom: 6 }}>SIGNAL KEYWORDS (monitor these)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {sources.signalKeywords.map(kw => (
                  <span key={kw} style={{ padding: '3px 8px', background: 'var(--bg3)', borderRadius: 5, fontSize: 11, color: '#6b7a99', border: '1px solid rgba(255,255,255,0.06)' }}>{kw}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#6b7a99' }}>
              <span>💰 Avg deal: ₹{(sources.avgDealValue / 1000).toFixed(0)}K</span>
              <span>⏱ Close time: {sources.conversionTimeDays} days</span>
            </div>
          </div>

          <button onClick={findProspects} disabled={loading} className="btn-primary" style={{ marginBottom: 16 }}>
            {loading ? <><RefreshCw size={13} /> Finding prospects...</> : <><Search size={13} /> Generate AI Prospect-Finding Guide</>}
          </button>

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* LinkedIn searches */}
              {(result as {linkedinSearches?:{query:string;estimatedResults:string;why:string}[]}).linkedinSearches?.length && (
                <div className="card">
                  <div className="label-sm" style={{ color: '#0077b5', marginBottom: 12 }}>LINKEDIN BOOLEAN SEARCHES</div>
                  {(result as {linkedinSearches:{query:string;estimatedResults:string;why:string}[]}).linkedinSearches.map((s, i) => (
                    <div key={i} style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{s.estimatedResults}</span>
                        <button onClick={() => copy(s.query, `li-${i}`)} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 11 }}>
                          {copied === `li-${i}` ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                        </button>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#60a5fa', marginBottom: 6, wordBreak: 'break-all' }}>{s.query}</div>
                      <div style={{ fontSize: 11, color: '#6b7a99' }}>{s.why}</div>
                      <a href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(s.query)}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#0077b5', textDecoration: 'none' }}>
                        <ArrowRight size={10} /> Search on LinkedIn
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Google X-Ray */}
              {(result as {googleSearches?:{query:string;url:string;expectedResults:string;tip:string}[]}).googleSearches?.length && (
                <div className="card">
                  <div className="label-sm" style={{ color: '#34d399', marginBottom: 12 }}>GOOGLE X-RAY SEARCHES</div>
                  {(result as {googleSearches:{query:string;url:string;expectedResults:string;tip:string}[]}).googleSearches.map((s, i) => (
                    <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 9 }}>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#34d399', marginBottom: 4 }}>{s.query}</div>
                      <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 6 }}>{s.tip}</div>
                      <a href={s.url || `https://google.com/search?q=${encodeURIComponent(s.query)}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: '#34d399', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ArrowRight size={10} /> Search Google
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Reddit */}
              {(result as {redditPosts?:{subreddit:string;searchQuery:string;url:string;postApproach:string}[]}).redditPosts?.length && (
                <div className="card">
                  <div className="label-sm" style={{ color: '#ff4500', marginBottom: 12 }}>REDDIT COMMUNITIES</div>
                  {(result as {redditPosts:{subreddit:string;searchQuery:string;url:string;postApproach:string}[]}).redditPosts.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(99,130,255,0.06)', fontSize: 13 }}>
                      <a href={`https://reddit.com/${r.subreddit}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontWeight: 700, color: '#ff4500', textDecoration: 'none', minWidth: 140 }}>{r.subreddit}</a>
                      <span style={{ color: '#6b7a99' }}>{r.postApproach}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Weekly routine */}
              {(result as {weeklyRoutine?:{day:string;task:string;platform:string;timeMinutes:number;expectedLeads:number}[]}).weeklyRoutine?.length && (
                <div className="card">
                  <div className="label-sm" style={{ marginBottom: 12 }}>WEEKLY PROSPECTING ROUTINE</div>
                  {(result as {weeklyRoutine:{day:string;task:string;platform:string;timeMinutes:number;expectedLeads:number}[]}).weeklyRoutine.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(99,130,255,0.06)', fontSize: 13 }}>
                      <span style={{ minWidth: 80, fontWeight: 700, color: 'white' }}>{d.day}</span>
                      <span style={{ flex: 1, color: '#6b7a99' }}>{d.task}</span>
                      <span style={{ fontSize: 11, color: '#3b82f6' }}>{d.timeMinutes}min</span>
                      <span style={{ fontSize: 11, color: '#10b981' }}>~{d.expectedLeads} leads</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Generate Messages */}
      {tab === 2 && (
        <div>
          <button onClick={generateMessages} disabled={loading} className="btn-primary" style={{ marginBottom: 16 }}>
            {loading ? <><RefreshCw size={13} /> Generating sequence...</> : <><MessageSquare size={13} /> Generate Full Outreach Sequence</>}
          </button>

          {result && (result as {steps?:unknown[]}).steps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13 }}><span style={{ color: '#6b7a99' }}>Name: </span><span style={{ color: 'white', fontWeight: 600 }}>{(result as {sequenceName?:string}).sequenceName}</span></div>
                  <div style={{ fontSize: 13 }}><span style={{ color: '#6b7a99' }}>Steps: </span><span style={{ color: 'white', fontWeight: 600 }}>{(result as {totalSteps?:number}).totalSteps}</span></div>
                  <div style={{ fontSize: 13 }}><span style={{ color: '#6b7a99' }}>Conv rate: </span><span style={{ color: '#10b981', fontWeight: 700 }}>{(result as {estimatedConversionRate?:string}).estimatedConversionRate}</span></div>
                </div>
              </div>

              {(result as {steps:{stepNumber:number;dayOffset:number;channel:string;messageType:string;template:string;goal:string;toneGuide:string}[]}).steps.map((step, i) => (
                <div key={i} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne,sans-serif', fontWeight: 800, color: '#3b82f6', fontSize: 13 }}>
                        {step.stepNumber}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>Day {step.dayOffset} — {step.messageType.replace('_', ' ')}</div>
                        <div style={{ fontSize: 11, color: '#6b7a99' }}>{step.channel} · {step.goal}</div>
                      </div>
                    </div>
                    <button onClick={() => copy(step.template, `step-${i}`)} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }}>
                      {copied === `step-${i}` ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                    </button>
                  </div>
                  <div style={{ background: 'var(--bg2)', padding: '12px 14px', borderRadius: 9, fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'DM Sans,sans-serif' }}>
                    {step.template}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#6b7a99', fontStyle: 'italic' }}>Tone: {step.toneGuide}</div>
                </div>
              ))}

              {(result as {doNotDo?:string[]}).doNotDo?.length && (
                <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                  <div className="label-sm" style={{ color: '#ef4444', marginBottom: 8 }}>❌ NEVER DO THIS</div>
                  {(result as {doNotDo:string[]}).doNotDo.map((d, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#6b7a99', padding: '4px 0' }}>• {d}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Weekly Plan */}
      {tab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {WEEKLY_OUTREACH_PLAN.map((week, i) => (
            <div key={i} className="card" style={{ borderLeft: `3px solid ${['#3b82f6','#10b981','#f59e0b','#8b5cf6'][i]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: 'white', marginBottom: 4 }}>Week {week.week}: {week.goal}</div>
                  <div style={{ fontSize: 12, color: '#6b7a99' }}>{week.why}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: ['#3b82f6','#10b981','#f59e0b','#8b5cf6'][i], fontFamily: 'Syne,sans-serif' }}>{week.expectedConversions}</div>
                  <div style={{ fontSize: 10, color: '#6b7a99' }}>expected converts</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7a99' }}>Focus: </span><span style={{ color: 'white', fontWeight: 600 }}>{week.focus.replace('_',' ')}</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7a99' }}>Channel: </span><span style={{ color: 'white', fontWeight: 600 }}>{week.channel}</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7a99' }}>Daily target: </span><span style={{ color: 'white', fontWeight: 600 }}>{week.dailyTarget} contacts</span>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 8, fontSize: 13 }}>
                <span style={{ color: '#6b7a99' }}>Hook: </span><span style={{ color: '#60a5fa', fontStyle: 'italic' }}>"{week.message}"</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => { setSelectedType(week.focus as LeadType); setTab(2) }} className="btn-ghost" style={{ fontSize: 12 }}>
                  Generate messages for this week →
                </button>
              </div>
            </div>
          ))}
          <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📊 30-Day Projection</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
              {[
                { l: 'Total contacts', v: '200+' },
                { l: 'Expected replies', v: '20–40' },
                { l: 'Demos / Calls', v: '5–10' },
                { l: 'Conversions', v: '2–5' },
                { l: 'Est MRR (dev)', v: '₹10L+' },
                { l: 'Est users (MohitJob)', v: '50–100' },
              ].map(({ l, v }) => (
                <div key={l} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 9, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, color: '#10b981' }}>{v}</div>
                  <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
