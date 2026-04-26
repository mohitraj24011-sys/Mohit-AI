'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Play, Pause, Check, RefreshCw, Target, TrendingUp, MessageSquare } from 'lucide-react'

type Campaign = { id:string; name:string; goal:string; target_type:string; channel:string; status:string; daily_limit:number; total_sent:number; total_replied:number; total_converted:number; replyRate:number; leadCount:number; created_at:string }

const STATUS_COLORS: Record<string,string> = { draft:'#6b7a99', active:'#10b981', paused:'#f59e0b', completed:'#3b82f6' }

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [buildLoading, setBuildLoading] = useState(false)
  const [form, setForm] = useState({ name:'', goal:'get_mohitjob_users', target_type:'it_professional', channel:'linkedin', daily_limit:'20' })
  const [aiBuilt, setAiBuilt] = useState<Record<string,unknown>|null>(null)

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await authFetch('/api/campaign')
    if (res?.ok) setCampaigns((await res.json()).campaigns || [])
    setLoading(false)
  }, [authFetch])

  useEffect(() => { load() }, [load])

  const buildWithAI = async () => {
    setBuildLoading(true)
    const res = await authFetch('/api/marketing-agent', {
      method: 'POST',
      body: JSON.stringify({ action: 'build_campaign', targetType: form.target_type, goal: form.goal, dailyLimit: parseInt(form.daily_limit) || 20, myProfile: { offering: 'AI job search platform + dev services' } }),
    })
    if (res?.ok) {
      const data = await res.json()
      setAiBuilt(data)
      setForm(f => ({ ...f, name: (data.campaignName as string) || f.name }))
    }
    setBuildLoading(false)
  }

  const saveCampaign = async () => {
    const res = await authFetch('/api/campaign', {
      method: 'POST',
      body: JSON.stringify({ ...form, daily_limit: parseInt(form.daily_limit) || 20, sequence: (aiBuilt as {sequence?:unknown[]})?.sequence || [] }),
    })
    if (res?.ok) { setCreating(false); setAiBuilt(null); load() }
  }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'paused' : 'active'
    await authFetch('/api/campaign', { method: 'PUT', body: JSON.stringify({ id, status: next }) })
    setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: next } : c))
  }

  const GOAL_OPTIONS = [
    { v:'get_mohitjob_users',   l:'Get MohitJob AI users (job seekers)' },
    { v:'get_dev_clients',      l:'Get dev clients (startups)' },
    { v:'get_enterprise',       l:'Get enterprise clients' },
    { v:'get_hr_partners',      l:'Get HR / recruitment partners' },
    { v:'get_bootcamp_partners',l:'Get bootcamp partners' },
    { v:'both',                 l:'Both — clients + users' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:4 }}>Campaigns</h1>
          <p style={{ color:'#6b7a99', fontSize:13 }}>{campaigns.length} campaigns · {campaigns.filter(c=>c.status==='active').length} active</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(!creating)}><Plus size={13}/> New Campaign</button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:16 }}>New Campaign</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:14 }}>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Campaign Name</label>
              <input className="input-dark" placeholder="Week 1 — IT Professionals" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Goal</label>
              <select className="input-dark" value={form.goal} onChange={e => setForm({...form, goal:e.target.value})}>
                {GOAL_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Target Type</label>
              <select className="input-dark" value={form.target_type} onChange={e => setForm({...form, target_type:e.target.value})}>
                {['it_professional','dev_client','enterprise_client','hr_recruiter','bootcamp','college'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Channel</label>
              <select className="input-dark" value={form.channel} onChange={e => setForm({...form, channel:e.target.value})}>
                {['linkedin','email','whatsapp','twitter','reddit','multi'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Daily Limit</label>
              <input type="number" className="input-dark" min="1" max="50" value={form.daily_limit} onChange={e => setForm({...form, daily_limit:e.target.value})} />
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginBottom: aiBuilt ? 16 : 0 }}>
            <button onClick={buildWithAI} disabled={buildLoading} className="btn-primary" style={{ background:'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>
              {buildLoading ? <><RefreshCw size={13}/> Building...</> : '🤖 Build with AI'}
            </button>
            <button onClick={saveCampaign} disabled={!form.name} className="btn-ghost">
              <Check size={13}/> Save Campaign
            </button>
            <button onClick={() => { setCreating(false); setAiBuilt(null) }} className="btn-ghost">Cancel</button>
          </div>

          {/* AI built result preview */}
          {aiBuilt && (
            <div style={{ marginTop:16, padding:'14px', background:'var(--bg2)', borderRadius:10, border:'1px solid rgba(139,92,246,0.2)' }}>
              <div className="label-sm" style={{ color:'#8b5cf6', marginBottom:10 }}>AI CAMPAIGN PREVIEW</div>
              {(aiBuilt as {targetPersona?:{title:string;company:string;painPoint:string}}).targetPersona && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:12, color:'#6b7a99', marginBottom:4 }}>Target Persona</div>
                  <div style={{ fontSize:13, color:'white' }}>{(aiBuilt as {targetPersona:{title:string}}).targetPersona.title} · {(aiBuilt as {targetPersona:{company:string}}).targetPersona.company}</div>
                  <div style={{ fontSize:12, color:'#6b7a99', fontStyle:'italic' }}>Pain: {(aiBuilt as {targetPersona:{painPoint:string}}).targetPersona.painPoint}</div>
                </div>
              )}
              {(aiBuilt as {sequence?:{step:number;channel:string;template:string}[]}).sequence?.slice(0,2).map((s, i) => (
                <div key={i} style={{ marginBottom:8, padding:'10px 12px', background:'var(--card)', borderRadius:8 }}>
                  <div className="label-sm" style={{ marginBottom:4 }}>STEP {s.step} — {s.channel.toUpperCase()}</div>
                  <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.6 }}>{s.template}</div>
                </div>
              ))}
              {(aiBuilt as {kpis?:{weeklyTarget:number;expectedReplyRate:string;projectedMonthlyRevenue:number}}).kpis && (
                <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
                  <span className="badge badge-blue" style={{ fontSize:10 }}>Weekly target: {(aiBuilt as {kpis:{weeklyTarget:number}}).kpis.weeklyTarget}</span>
                  <span className="badge badge-green" style={{ fontSize:10 }}>Reply rate: {(aiBuilt as {kpis:{expectedReplyRate:string}}).kpis.expectedReplyRate}</span>
                  <span className="badge badge-amber" style={{ fontSize:10 }}>Proj revenue: ₹{((aiBuilt as {kpis:{projectedMonthlyRevenue:number}}).kpis.projectedMonthlyRevenue/1000).toFixed(0)}K/mo</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#6b7a99' }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:'#6b7a99' }}>
          <Target size={40} color="#2d3b52" style={{ margin:'0 auto 12px' }}/>
          <p>No campaigns yet. Create your first one above or visit the <a href="/marketing" style={{ color:'#3b82f6' }}>Marketing Agent</a> for strategy.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {campaigns.map(c => (
            <div key={c.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_COLORS[c.status] }}/>
                    <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'white' }}>{c.name}</div>
                    <span style={{ fontSize:10, color:STATUS_COLORS[c.status], fontWeight:700, textTransform:'uppercase' }}>{c.status}</span>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span className="badge badge-blue" style={{ fontSize:10 }}>{c.target_type.replace(/_/g,' ')}</span>
                    <span className="badge badge-purple" style={{ fontSize:10 }}>{c.channel}</span>
                    <span style={{ fontSize:11, color:'#6b7a99' }}>Limit: {c.daily_limit}/day</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'flex', gap:16 }}>
                  {[
                    { l:'Leads',     v:c.leadCount||0,      icon:Target },
                    { l:'Sent',      v:c.total_sent||0,     icon:MessageSquare },
                    { l:'Replied',   v:c.total_replied||0,  icon:TrendingUp },
                    { l:'Converted', v:c.total_converted||0,icon:Check },
                  ].map(({l,v,icon:Icon}) => (
                    <div key={l} style={{ textAlign:'center', minWidth:50 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'white' }}>{v}</div>
                      <div style={{ fontSize:10, color:'#6b7a99' }}>{l}</div>
                    </div>
                  ))}
                  {(c.total_replied > 0 || c.replyRate > 0) && (
                    <div style={{ textAlign:'center', minWidth:50 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#10b981' }}>{c.replyRate}%</div>
                      <div style={{ fontSize:10, color:'#6b7a99' }}>Reply rate</div>
                    </div>
                  )}
                </div>

                {/* Toggle */}
                <button onClick={() => toggleStatus(c.id, c.status)}
                  style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${c.status==='active'?'rgba(245,158,11,0.3)':'rgba(16,185,129,0.3)'}`, background:`${c.status==='active'?'rgba(245,158,11,0.08)':'rgba(16,185,129,0.08)'}`, color:c.status==='active'?'#f59e0b':'#10b981', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600 }}>
                  {c.status==='active' ? <><Pause size={12}/> Pause</> : <><Play size={12}/> Activate</>}
                </button>
              </div>

              <div style={{ marginTop:12, display:'flex', gap:8 }}>
                <a href="/leads"><button className="btn-ghost" style={{ fontSize:11, padding:'5px 12px' }}>View Leads</button></a>
                <a href="/marketing"><button className="btn-ghost" style={{ fontSize:11, padding:'5px 12px' }}>Generate Messages</button></a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
