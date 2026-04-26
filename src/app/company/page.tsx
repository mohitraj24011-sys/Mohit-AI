'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Plus, Search, Eye, Check, RefreshCw, Trash2 } from 'lucide-react'
import PaywallGate from '@/components/PaywallGate'

type Company = { id:string;company:string;website?:string;status:string;notes?:string;intel:Record<string,unknown>;created_at:string }

const STATUS_COLORS: Record<string,string> = { watching:'#6b7a99', targeting:'#3b82f6', applied:'#f59e0b', interviewing:'#f97316', rejected:'#ef4444', offer:'#10b981' }

function CompanyContent() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState({ company:'', website:'', skills:'', targetRole:'' })
  const [researching, setResearching] = useState<string|null>(null)
  const [result, setResult] = useState<{[key:string]:Record<string,unknown>}>({})
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return fetch(url, { ...opts, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` } })
  }

  const load = async () => {
    setLoading(true)
    const res = await authFetch('/api/company-intel')
    if (res?.ok) setCompanies((await res.json()).companies || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const addCompany = async () => {
    const res = await authFetch('/api/company-intel', { method:'POST', body: JSON.stringify({ action:'add_watchlist', company:form.company, website:form.website }) })
    if (res?.ok) { setAdding(false); setForm({company:'',website:'',skills:'',targetRole:''}); load() }
  }

  const research = async (company: string, id: string) => {
    setResearching(id)
    const res = await authFetch('/api/company-intel', { method:'POST', body: JSON.stringify({ action:'research', company, skills:form.skills.split(',').map(s=>s.trim()), targetRole:form.targetRole }) })
    if (res?.ok) setResult(prev => ({...prev, [id]: await res.json()}))
    setResearching(null)
  }

  const updateStatus = async (id: string, status: string) => {
    await authFetch('/api/company-intel', { method:'POST', body: JSON.stringify({ action:'update_status', id, status }) })
    setCompanies(companies.map(c => c.id===id ? {...c, status} : c))
  }

  const del = async (id: string) => {
    await authFetch(`/api/company-intel?id=${id}`, { method:'DELETE' })
    setCompanies(companies.filter(c => c.id!==id))
  }

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'36px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
            <Building2 size={22} color="#3b82f6"/> Company Intel
          </h1>
          <p style={{ color:'#6b7a99', fontSize:13 }}>{companies.length} companies tracked · AI research + hiring signals</p>
        </div>
        <button className="btn-primary" onClick={()=>setAdding(!adding)}><Plus size={13}/> Track Company</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:12 }}>
            {[{k:'company',l:'Company *',p:'Razorpay'},{k:'website',l:'Website',p:'razorpay.com'},{k:'skills',l:'My Skills',p:'Go, React'},{k:'targetRole',l:'Target Role',p:'Backend Engineer'}].map(f=>(
              <div key={f.k}>
                <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                <input className="input-dark" placeholder={f.p} value={(form as Record<string,string>)[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})}/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-primary" onClick={addCompany} disabled={!form.company}><Check size={13}/> Add</button>
            <button className="btn-ghost" onClick={()=>setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ padding:40, textAlign:'center', color:'#6b7a99' }}>Loading...</div> :
       companies.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:'#6b7a99' }}>
          <Building2 size={40} color="#2d3b52" style={{ margin:'0 auto 12px' }}/>
          <p>Track companies you want to work at. AI researches tech stack, culture, salary, and hiring process.</p>
        </div>
       ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {companies.map(c => {
            const intel = result[c.id] || c.intel || {}
            return (
              <div key={c.id} className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:intel&&Object.keys(intel).length?14:0 }}>
                  <div>
                    <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'white', marginBottom:4 }}>{c.company}</div>
                    {c.website && <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#3b82f6', textDecoration:'none' }}>{c.website}</a>}
                    {intel.techStack && <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
                      {(intel.techStack as string[]).map(t=><span key={t} style={{ padding:'2px 8px', borderRadius:5, background:'var(--bg2)', fontSize:11, color:'#6b7a99' }}>{t}</span>)}
                    </div>}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <select value={c.status} onChange={e=>updateStatus(c.id,e.target.value)}
                      style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${STATUS_COLORS[c.status]}40`, background:`${STATUS_COLORS[c.status]}12`, color:STATUS_COLORS[c.status], fontSize:12, cursor:'pointer', fontWeight:600 }}>
                      {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={()=>research(c.company, c.id)} disabled={researching===c.id} className="btn-primary" style={{ padding:'6px 12px', fontSize:12 }}>
                      {researching===c.id?<><RefreshCw size={11}/> Researching...</>:<><Search size={11}/> AI Research</>}
                    </button>
                    <button onClick={()=>del(c.id)} className="btn-danger" style={{ padding:'6px 8px' }}><Trash2 size={12}/></button>
                  </div>
                </div>
                {intel.overview && (
                  <div style={{ padding:'12px 14px', background:'var(--bg2)', borderRadius:9 }}>
                    <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.7, marginBottom:10 }}>{String(intel.overview)}</div>
                    {intel.salaryRange && (
                      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
                        {Object.entries(intel.salaryRange as Record<string,string>).map(([l,v])=>(
                          <div key={l} style={{ padding:'5px 10px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:7, fontSize:12 }}>
                            <span style={{ color:'#6b7a99' }}>{l}: </span><span style={{ color:'#10b981', fontWeight:700 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {intel.applyStrategy && <div style={{ fontSize:12, color:'#f59e0b', fontStyle:'italic' }}>💡 {String(intel.applyStrategy)}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
       )}
    </div>
  )
}

export default function Company() {
  return <PaywallGate feature="market_trends"><CompanyContent /></PaywallGate>
}
