'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts'
import { Users, TrendingUp, Zap, Trophy, RefreshCw, Shield, Target, DollarSign, Heart, AlertCircle } from 'lucide-react'

const TT = { background:'#111827', border:'1px solid rgba(99,130,255,0.15)', borderRadius:8, color:'#e2e8f4', fontSize:11 }

type Metrics = {
  coreMetrics: { interviewRate:number; conversionRate:number; avgDaysToInterview:number|null }
  revenue:     { mrr:number; arr:number; proUsers:number; freeUsers:number }
  users:       { total:number; newThisWeek:number; onboarded:number; activatedPct:number; healthScore:number }
  product:     { applied:number; interviews:number; offers:number; offerRate:number; totalWins:number; avgHike:number }
  signupChart: { date:string; count:number; cumulative:number }[]
  topEvents:   { event:string; count:number }[]
}

export default function Admin() {
  const [data, setData]     = useState<Metrics|null>(null)
  const [loading, setLoading]  = useState(true)
  const [error, setError]   = useState('')
  const [tab, setTab]       = useState<'overview'|'users'|'launch'>('overview')

  // WhatsApp scripts state
  const [waScripts, setWaScripts] = useState<Record<string,unknown>|null>(null)
  const [waLoading, setWaLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not signed in'); setLoading(false); return }
    const res = await fetch('/api/launch-metrics', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.status === 403) { setError('Admin only — set ADMIN_EMAIL env var'); setLoading(false); return }
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  const loadWaScripts = async () => {
    setWaLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/whatsapp-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'get_funnel_copy' }),
    })
    if (res.ok) setWaScripts(await res.json())
    setWaLoading(false)
  }

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#6b7a99' }}><RefreshCw size={24} style={{ animation:'spin 1s linear infinite', margin:'0 auto 12px' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  if (error)   return <div style={{ maxWidth:500, margin:'80px auto', padding:'0 20px', textAlign:'center' }}><Shield size={40} color="#ef4444" style={{ margin:'0 auto 16px' }}/><h2 style={{ color:'white', marginBottom:8 }}>{error}</h2></div>
  if (!data) return null

  const { coreMetrics: cm, revenue: rev, users: u, product: prod } = data

  const healthColor = u.healthScore >= 70 ? '#10b981' : u.healthScore >= 40 ? '#f59e0b' : '#ef4444'
  const irColor     = cm.interviewRate >= 10 ? '#10b981' : cm.interviewRate >= 5 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'white', marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
            <Shield size={20} color="#3b82f6"/> Admin · Launch Dashboard
          </h1>
          <p style={{ color:'#6b7a99', fontSize:13 }}>The 3 metrics that matter: interview rate · conversion rate · time to result</p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ padding:'8px 14px' }}><RefreshCw size={13}/> Refresh</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid rgba(99,130,255,0.1)', marginBottom:20 }}>
        {[['overview','📊 Overview'],['users','👥 Users'],['launch','🚀 Launch Plan']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t as 'overview'|'users'|'launch')}
            style={{ padding:'9px 18px', border:'none', borderBottom:`2px solid ${tab===t?'#3b82f6':'transparent'}`, background:'transparent', color:tab===t?'#3b82f6':'#6b7a99', cursor:'pointer', fontSize:13, fontWeight:tab===t?700:400, marginBottom:-1 }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {/* THE 3 CORE METRICS — big and clear */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
            {[
              { label:'Interview Rate', value:`${cm.interviewRate}%`, sublabel:`${prod.interviews} interviews from ${prod.applied} applications`, color:irColor, icon:Target, benchmark:'Good: >10% · Average: 5-10% · Poor: <5%', key:'interviewRate' },
              { label:'Free → Pro Conversion', value:`${cm.conversionRate}%`, sublabel:`${rev.proUsers} pro / ${u.total} total users`, color:cm.conversionRate>=5?'#10b981':cm.conversionRate>=2?'#f59e0b':'#ef4444', icon:TrendingUp, benchmark:'Good: >5% · Average: 2-5% · Poor: <2%', key:'conversion' },
              { label:'Avg Days to Interview', value:cm.avgDaysToInterview ? `${cm.avgDaysToInterview}d` : '—', sublabel:'From first apply to interview call', color:cm.avgDaysToInterview && cm.avgDaysToInterview<=14?'#10b981':'#f59e0b', icon:Zap, benchmark:'Good: <14 days · Average: 14-30 · Poor: >30', key:'speed' },
            ].map(({ label, value, sublabel, color, icon:Icon, benchmark }) => (
              <div key={label} className="card" style={{ padding:'22px', borderColor:`${color}30` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <Icon size={16} color={color}/>
                  <span style={{ fontSize:12, color:'#6b7a99', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
                </div>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:42, fontWeight:800, color, marginBottom:4 }}>{value}</div>
                <div style={{ fontSize:12, color:'#6b7a99', marginBottom:8 }}>{sublabel}</div>
                <div style={{ fontSize:10, color:'#2d3b52', padding:'5px 8px', background:'var(--bg2)', borderRadius:5 }}>{benchmark}</div>
              </div>
            ))}
          </div>

          {/* Revenue + health */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
            {[
              { l:'MRR',           v:`₹${(rev.mrr/1000).toFixed(0)}K`,   c:'#8b5cf6', icon:DollarSign },
              { l:'ARR',           v:`₹${(rev.arr/1000).toFixed(0)}K`,   c:'#8b5cf6', icon:DollarSign },
              { l:'Pro Users',     v:rev.proUsers,                        c:'#10b981', icon:Zap        },
              { l:'Total Users',   v:u.total,                             c:'#3b82f6', icon:Users      },
              { l:'New This Week', v:u.newThisWeek,                       c:'#f59e0b', icon:TrendingUp  },
              { l:'Offers',        v:prod.offers,                         c:'#10b981', icon:Trophy     },
              { l:'Avg Hike',      v:prod.avgHike>0?`+${prod.avgHike}%`:'—', c:'#10b981', icon:TrendingUp },
              { l:'Health Score',  v:`${u.healthScore}/100`,              c:healthColor, icon:Heart    },
            ].map(({l,v,c,icon:Icon})=>(
              <div key={l} className="card" style={{ textAlign:'center', padding:12 }}>
                <Icon size={12} color={c} style={{ margin:'0 auto 5px' }}/>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:c }}>{String(v)}</div>
                <div style={{ fontSize:10, color:'#6b7a99', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <div className="card">
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>Daily Signups (14 days)</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={data.signupChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                  <XAxis dataKey="date" tick={{fill:'#6b7a99',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={d=>d.slice(5)}/>
                  <YAxis tick={{fill:'#6b7a99',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={TT}/>
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="rgba(59,130,246,0.12)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>Top Feature Events (7 days)</div>
              {data.topEvents.length === 0 ? (
                <div style={{ height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7a99', fontSize:13 }}>No events yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={data.topEvents.slice(0,6)} layout="vertical">
                    <XAxis type="number" tick={{fill:'#6b7a99',fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="event" type="category" tick={{fill:'#6b7a99',fontSize:9}} axisLine={false} tickLine={false} width={110}/>
                    <Tooltip contentStyle={TT}/>
                    <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Action alerts */}
          {(cm.interviewRate < 5 || cm.conversionRate < 2 || u.healthScore < 50) && (
            <div className="card" style={{ marginTop:18, borderColor:'rgba(245,158,11,0.3)' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#f59e0b', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                <AlertCircle size={14}/> Action Needed
              </div>
              {cm.interviewRate < 5 && (
                <div style={{ fontSize:13, color:'#6b7a99', padding:'8px 0', borderBottom:'1px solid rgba(99,130,255,0.06)' }}>
                  ⚠️ Interview rate is {cm.interviewRate}% (target: 10%+) — push users to improve resume ATS score and use LinkedIn AI for referrals
                </div>
              )}
              {cm.conversionRate < 2 && (
                <div style={{ fontSize:13, color:'#6b7a99', padding:'8px 0', borderBottom:'1px solid rgba(99,130,255,0.06)' }}>
                  ⚠️ Conversion {cm.conversionRate}% (target: 5%+) — send WhatsApp follow-ups to users who hit 5+ applications
                </div>
              )}
              {u.onboarded < u.total * 0.5 && (
                <div style={{ fontSize:13, color:'#6b7a99', padding:'8px 0' }}>
                  ⚠️ Only {u.activatedPct}% users completed onboarding — simplify quick-start further
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
            {[
              { l:'Onboarded', v:`${u.onboarded}/${u.total}`, sublabel:`${u.activatedPct}% activation rate`, c:u.activatedPct>=60?'#10b981':'#f59e0b' },
              { l:'New This Week', v:u.newThisWeek, sublabel:'signups in last 7 days', c:'#3b82f6' },
              { l:'Pro Users', v:rev.proUsers, sublabel:`${rev.mrr > 0 ? '₹'+rev.mrr.toLocaleString()+'/mo' : 'no revenue yet'}`, c:'#8b5cf6' },
            ].map(({l,v,sublabel,c})=>(
              <div key={l} className="card" style={{ padding:'20px' }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color:c, marginBottom:4 }}>{String(v)}</div>
                <div style={{ fontSize:13, color:'white', fontWeight:600, marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:12, color:'#6b7a99' }}>{sublabel}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>User Journey Funnel</div>
            {[
              { stage:'Signed up',           count:u.total,     pct:100,                                                 color:'#3b82f6' },
              { stage:'Completed onboarding', count:u.onboarded, pct:Math.round(u.onboarded/Math.max(u.total,1)*100),    color:'#8b5cf6' },
              { stage:'Applied to 1+ job',   count:prod.applied>0?Math.min(u.onboarded,prod.applied):0, pct:Math.round(Math.min(prod.applied,u.onboarded)/Math.max(u.total,1)*100), color:'#f59e0b' },
              { stage:'Got an interview',     count:prod.interviews, pct:Math.round(prod.interviews/Math.max(u.total,1)*100), color:'#f97316' },
              { stage:'Got an offer',         count:prod.offers, pct:Math.round(prod.offers/Math.max(u.total,1)*100),     color:'#10b981' },
              { stage:'Became Pro',           count:rev.proUsers, pct:Math.round(rev.proUsers/Math.max(u.total,1)*100),   color:'#10b981' },
            ].map(({ stage, count, pct, color }) => (
              <div key={stage} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(99,130,255,0.06)' }}>
                <div style={{ minWidth:200, fontSize:13, color:'white' }}>{stage}</div>
                <div style={{ flex:1, height:8, background:'var(--bg2)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width 0.5s' }}/>
                </div>
                <div style={{ minWidth:80, textAlign:'right', fontSize:13 }}>
                  <span style={{ fontWeight:700, color }}>{count}</span>
                  <span style={{ color:'#6b7a99', fontSize:11, marginLeft:4 }}>({pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'launch' && (
        <div>
          <div className="card" style={{ marginBottom:18, borderColor:'rgba(16,185,129,0.3)', padding:'20px' }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:16, color:'white', marginBottom:8 }}>🚀 30-Day Launch Plan</div>
            <div style={{ fontSize:13, color:'#6b7a99', lineHeight:1.7 }}>
              Week 1: 50 WhatsApp messages to IT professionals → 5-10 users<br/>
              Week 2: Social proof blast after first wins → 10-20 users<br/>
              Week 3: LinkedIn posts + referral activation → 20-50 users<br/>
              Week 4: Pro conversion push to active free users → 10+ paying
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <div className="card">
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>Revenue Targets</div>
              {[
                { milestone:'10 Pro users', mrr:'₹4,990/mo', note:'Validate product-market fit' },
                { milestone:'50 Pro users', mrr:'₹24,950/mo', note:'₹3L/year — sustainable indie' },
                { milestone:'100 Pro users', mrr:'₹49,900/mo', note:'₹6L/year — quit salary if needed' },
                { milestone:'200 Pro users', mrr:'₹99,800/mo', note:'₹12L/year — real business' },
              ].map((r,i)=>(
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(99,130,255,0.06)' }}>
                  <div style={{ minWidth:20, height:20, borderRadius:'50%', background:`${i < rev.proUsers/25 ? '#10b981' : 'var(--bg2)'}`, border:`2px solid ${i < rev.proUsers/25 ? '#10b981' : '#2d3b52'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white', flexShrink:0, marginTop:1 }}>
                    {i < rev.proUsers/25 ? '✓' : i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'white', fontWeight:600 }}>{r.milestone} → {r.mrr}</div>
                    <div style={{ fontSize:11, color:'#6b7a99' }}>{r.note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>
                WhatsApp Distribution Scripts
              </div>
              {waScripts ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {(Object.entries(waScripts) as [string, {name?:string;text?:string;message?:string}][]).slice(0,3).map(([key, val]) => (
                    <div key={key} style={{ padding:'10px 12px', background:'var(--bg2)', borderRadius:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#10b981', marginBottom:4 }}>{val.name || key.replace(/([A-Z])/g,' $1').trim()}</div>
                      <div style={{ fontSize:12, color:'#6b7a99', lineHeight:1.6 }}>{(val.text || val.message || '').slice(0,200)}{(val.text || val.message || '').length>200?'...':''}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize:13, color:'#6b7a99', marginBottom:14 }}>Generate WhatsApp scripts for all 3 funnel stages: cold → warm → paid conversion</p>
                  <button onClick={loadWaScripts} disabled={waLoading} className="btn-primary" style={{ fontSize:13 }}>
                    {waLoading ? <><RefreshCw size={13}/> Generating...</> : '📱 Generate WhatsApp Scripts'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop:18 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>📱 3-Phase WhatsApp Funnel</div>
            {[
              { phase:'Week 1 — Cold Outreach', target:'20 messages/day to "Open to Work" engineers', message:'Hey! I built a free AI that applies to jobs for you automatically. 2 mins to set up. Want access?', converts:'5-10 users', color:'#3b82f6' },
              { phase:'Week 2 — Social Proof', target:'WhatsApp groups + LinkedIn posts', message:'A friend just got 3 interviews in 10 days using MohitJob AI. Applied while sleeping. Free to try.', converts:'10-20 users', color:'#8b5cf6' },
              { phase:'Week 3-4 — Paid Push', target:'Message free users who applied 5+ jobs', message:'How\'s the job hunt? If you want unlimited auto-apply (30/day) — Pro is ₹499/month. One interview = covers cost 100x.', converts:'5-10 paid', color:'#10b981' },
            ].map(p => (
              <div key={p.phase} style={{ padding:'14px', background:'var(--bg2)', borderRadius:10, marginBottom:10, borderLeft:`3px solid ${p.color}` }}>
                <div style={{ fontWeight:700, color:'white', fontSize:14, marginBottom:4 }}>{p.phase}</div>
                <div style={{ fontSize:12, color:'#6b7a99', marginBottom:8 }}>Target: {p.target}</div>
                <div style={{ padding:'8px 12px', background:'var(--card)', borderRadius:7, fontSize:12, color:'var(--text)', fontStyle:'italic', marginBottom:8 }}>"{p.message}"</div>
                <span style={{ fontSize:11, color:p.color, fontWeight:700 }}>Expected: {p.converts}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
