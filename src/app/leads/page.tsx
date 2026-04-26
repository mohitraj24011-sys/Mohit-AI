'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Check, Copy, MessageSquare, Trash2, TrendingUp, RefreshCw } from 'lucide-react'

type Lead = { id:string; name:string; email?:string; company?:string; role?:string; linkedin_url?:string; lead_type:string; source?:string; score:number; status:string; notes?:string; estimated_value?:number; created_at:string }

const TYPE_COLORS: Record<string,string> = { dev_client:'#3b82f6', enterprise_client:'#8b5cf6', it_professional:'#10b981', hr_recruiter:'#f59e0b', bootcamp:'#f97316', college:'#ec4899' }
const STATUS_COLORS: Record<string,string> = { new:'#6b7a99', contacted:'#3b82f6', replied:'#f59e0b', interested:'#f97316', demo_scheduled:'#8b5cf6', proposal_sent:'#f97316', negotiating:'#f59e0b', closed_won:'#10b981', closed_lost:'#ef4444', nurturing:'#6b7a99' }
const LEAD_TYPES = ['dev_client','enterprise_client','it_professional','hr_recruiter','bootcamp','college']
const STATUSES   = ['new','contacted','replied','interested','demo_scheduled','proposal_sent','negotiating','closed_won','closed_lost','nurturing']

export default function Leads() {
  const [leads, setLeads]       = useState<Lead[]>([])
  const [summary, setSummary]   = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [filter, setFilter]     = useState({ type: '', status: '', minScore: '' })
  const [form, setForm]         = useState({ name:'', email:'', company:'', role:'', linkedin_url:'', lead_type:'it_professional', source:'linkedin', notes:'', estimated_value:'' })
  const [generating, setGenerating] = useState<string|null>(null)
  const [generatedMsg, setGeneratedMsg] = useState<{leadId:string;message:string}|null>(null)
  const [copied, setCopied]     = useState(false)

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...((opts.headers as Record<string,string>) || {}) } })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.type) params.set('type', filter.type)
    if (filter.status) params.set('status', filter.status)
    if (filter.minScore) params.set('minScore', filter.minScore)
    const res = await authFetch(`/api/leads?${params}`)
    if (res?.ok) {
      const data = await res.json()
      setLeads(data.leads || [])
      setSummary(data.summary || null)
    }
    setLoading(false)
  }, [filter, authFetch])

  useEffect(() => { load() }, [load])

  const addLead = async () => {
    const res = await authFetch('/api/leads', { method: 'POST', body: JSON.stringify({ ...form, estimated_value: form.estimated_value ? parseInt(form.estimated_value) : 0 }) })
    if (res?.ok) { setAdding(false); setForm({ name:'', email:'', company:'', role:'', linkedin_url:'', lead_type:'it_professional', source:'linkedin', notes:'', estimated_value:'' }); load() }
  }

  const updateStatus = async (id: string, status: string) => {
    await authFetch('/api/leads', { method: 'PUT', body: JSON.stringify({ id, status }) })
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l))
  }

  const deleteLead = async (id: string) => {
    await authFetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    setLeads(leads.filter(l => l.id !== id))
  }

  const generateMsg = async (lead: Lead) => {
    setGenerating(lead.id)
    const res = await authFetch('/api/marketing-agent', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate_message', lead, channel: 'linkedin', step: 0, myProfile: { name: '', company: 'MohitJob AI', offering: 'AI job search platform' } }),
    })
    if (res?.ok) {
      const data = await res.json()
      setGeneratedMsg({ leadId: lead.id, message: data.message })
    }
    setGenerating(null)
  }

  const s = summary as {total?:number;hot?:number;warm?:number;cold?:number}|null

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 }}>Leads CRM</h1>
          <p style={{ color: '#6b7a99', fontSize: 13 }}>{s?.total || 0} leads · {s?.hot || 0} hot · {s?.warm || 0} warm</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn-ghost" style={{ padding: '8px 12px' }}><RefreshCw size={13} /></button>
          <button onClick={() => setAdding(!adding)} className="btn-primary"><Plus size={13} /> Add Lead</button>
        </div>
      </div>

      {/* Stats */}
      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { l:'Total',v:s.total,c:'#6b7a99' },
            { l:'🔥 Hot',v:s.hot,c:'#ef4444' },
            { l:'🌡 Warm',v:s.warm,c:'#f59e0b' },
            { l:'❄️ Cold',v:s.cold,c:'#3b82f6' },
          ].map(({l,v,c}) => (
            <div key={l} className="card" style={{ textAlign:'center', padding:12 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:c }}>{String(v||0)}</div>
              <div style={{ fontSize:11, color:'#6b7a99', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 12 }}>
            {[
              {k:'name',l:'Name *',p:'Priya Sharma'},{k:'email',l:'Email',p:'priya@company.com'},
              {k:'company',l:'Company',p:'Razorpay'},{k:'role',l:'Their Role',p:'CTO'},
              {k:'linkedin_url',l:'LinkedIn URL',p:'linkedin.com/in/...'},{k:'estimated_value',l:'Deal Value (₹)',p:'50000',t:'number'},
            ].map(f => (
              <div key={f.k}>
                <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                <input type={f.t||'text'} className="input-dark" placeholder={f.p} value={(form as Record<string,string>)[f.k]} onChange={e => setForm({...form,[f.k]:e.target.value})} />
              </div>
            ))}
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Lead Type *</label>
              <select className="input-dark" value={form.lead_type} onChange={e => setForm({...form,lead_type:e.target.value})}>
                {LEAD_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Source</label>
              <select className="input-dark" value={form.source} onChange={e => setForm({...form,source:e.target.value})}>
                {['linkedin','twitter','reddit','whatsapp','referral','inbound','google','manual'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Notes</label>
            <textarea className="input-dark" style={{ height:60 }} placeholder="Context, mutual connections, what they said..." value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-primary" onClick={addLead} disabled={!form.name}><Check size={13} /> Save Lead</button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <select className="input-dark" style={{ width:'auto', padding:'7px 12px', fontSize:12 }} value={filter.type} onChange={e => setFilter({...filter,type:e.target.value})}>
          <option value="">All Types</option>
          {LEAD_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
        <select className="input-dark" style={{ width:'auto', padding:'7px 12px', fontSize:12 }} value={filter.status} onChange={e => setFilter({...filter,status:e.target.value})}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <select className="input-dark" style={{ width:'auto', padding:'7px 12px', fontSize:12 }} value={filter.minScore} onChange={e => setFilter({...filter,minScore:e.target.value})}>
          <option value="">Any Score</option>
          <option value="70">Hot (70+)</option>
          <option value="40">Warm (40+)</option>
        </select>
      </div>

      {/* Leads table */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#6b7a99' }}>Loading leads...</div>
      ) : leads.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:'#6b7a99' }}>
          <TrendingUp size={40} color="#2d3b52" style={{ margin:'0 auto 12px' }} />
          <p>No leads yet. Add your first lead or use the <a href="/marketing" style={{ color:'#3b82f6' }}>Marketing Agent</a> to find prospects.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {leads.map(lead => (
            <div key={lead.id} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>
                {/* Score badge */}
                <div style={{ width:44, height:44, borderRadius:10, background:`${lead.score>=70?'#ef4444':lead.score>=40?'#f59e0b':'#6b7a99'}15`, border:`1px solid ${lead.score>=70?'#ef4444':lead.score>=40?'#f59e0b':'#6b7a99'}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:15, color:lead.score>=70?'#ef4444':lead.score>=40?'#f59e0b':'#6b7a99' }}>{lead.score}</div>
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontWeight:700, color:'white', fontSize:14, marginBottom:2 }}>{lead.name}</div>
                  <div style={{ fontSize:12, color:'#6b7a99' }}>{lead.role ? `${lead.role} @ ` : ''}{lead.company || 'Unknown company'}</div>
                  {lead.email && <div style={{ fontSize:11, color:'#6b7a99', marginTop:2 }}>{lead.email}</div>}
                  <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                    <span style={{ padding:'2px 8px', borderRadius:5, background:`${TYPE_COLORS[lead.lead_type]}15`, border:`1px solid ${TYPE_COLORS[lead.lead_type]}30`, fontSize:10, color:TYPE_COLORS[lead.lead_type], fontWeight:600 }}>
                      {lead.lead_type.replace(/_/g,' ')}
                    </span>
                    {lead.source && <span className="badge badge-blue" style={{ fontSize:9 }}>{lead.source}</span>}
                    {lead.estimated_value && lead.estimated_value > 0 && <span className="badge badge-green" style={{ fontSize:9 }}>₹{(lead.estimated_value/1000).toFixed(0)}K</span>}
                  </div>
                  {lead.notes && <div style={{ fontSize:11, color:'#6b7a99', marginTop:6, fontStyle:'italic' }}>{lead.notes.slice(0,100)}{lead.notes.length>100?'...':''}</div>}
                </div>
                {/* Generated message */}
                {generatedMsg?.leadId === lead.id && (
                  <div style={{ flex:2, minWidth:200 }}>
                    <div className="label-sm" style={{ marginBottom:4 }}>GENERATED MESSAGE</div>
                    <div style={{ fontSize:12, color:'#6b7a99', background:'var(--bg2)', padding:'8px 12px', borderRadius:8, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{generatedMsg.message}</div>
                    <button onClick={() => { navigator.clipboard.writeText(generatedMsg.message); setCopied(true); setTimeout(()=>setCopied(false),2000) }} className="btn-ghost" style={{ marginTop:6, padding:'4px 10px', fontSize:11 }}>
                      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
                    </button>
                  </div>
                )}
                {/* Actions */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                  <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                    style={{ padding:'6px 10px', borderRadius:7, border:`1px solid ${STATUS_COLORS[lead.status]}40`, background:`${STATUS_COLORS[lead.status]}12`, color:STATUS_COLORS[lead.status], fontSize:11, cursor:'pointer', fontWeight:600 }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                  <div style={{ display:'flex', gap:4 }}>
                    {lead.linkedin_url && (
                      <a href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`} target="_blank" rel="noopener noreferrer">
                        <button className="btn-ghost" style={{ padding:'5px 8px', fontSize:10 }}>LinkedIn</button>
                      </a>
                    )}
                    <button onClick={() => generateMsg(lead)} disabled={generating === lead.id} className="btn-ghost" style={{ padding:'5px 8px', fontSize:10 }}>
                      {generating === lead.id ? '...' : <><MessageSquare size={10}/></>}
                    </button>
                    <button onClick={() => deleteLead(lead.id)} className="btn-danger" style={{ padding:'5px 8px' }}>
                      <Trash2 size={10}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
