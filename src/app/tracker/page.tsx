'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, ExternalLink, Check } from 'lucide-react'

const COLS = ['wishlist','applied','screen','interview','final','offer','rejected','ghosted']
const COL_COLORS: Record<string,string> = { wishlist:'#6b7a99',applied:'#3b82f6',screen:'#8b5cf6',interview:'#f59e0b',final:'#f97316',offer:'#10b981',rejected:'#ef4444',ghosted:'#2d3b52' }
const COL_LABELS: Record<string,string> = { wishlist:'Wishlist',applied:'Applied',screen:'Screening',interview:'Interview',final:'Final Round',offer:'Offer 🎉',rejected:'Rejected',ghosted:'Ghosted' }

export default function Tracker() {
  const [jobs, setJobs]   = useState<Record<string,unknown>[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm]   = useState({ title:'',company:'',status:'wishlist',salary_range:'',location:'',job_url:'',source:'',notes:'' })

  const load = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const { data } = await supabase.from('jobs').select('*').eq('user_id', session.user.id).order('created_at',{ascending:false})
    setJobs(data||[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('jobs').insert({ ...form, user_id: session.user.id, applied_date: form.status==='applied'?new Date().toISOString().split('T')[0]:null })
    setForm({ title:'',company:'',status:'wishlist',salary_range:'',location:'',job_url:'',source:'',notes:'' })
    setAdding(false); load()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('jobs').update({ status, updated_at: new Date().toISOString(), ...(status==='interview'?{interview_date:new Date().toISOString().split('T')[0]}:{}), ...(status==='offer'?{offer_date:new Date().toISOString().split('T')[0]}:{}) }).eq('id', id)
    setJobs(jobs.map(j => j.id===id ? {...j, status} : j))
  }

  return (
    <div style={{ maxWidth:1800, margin:'0 auto', padding:'36px 16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:4 }}>Job Tracker</h1>
          <p style={{ color:'#6b7a99', fontSize:13 }}>{jobs.length} jobs · {jobs.filter(j=>j.status==='offer').length} offers</p>
        </div>
        <button className="btn-primary" onClick={()=>setAdding(!adding)}><Plus size={13}/> Add Job</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:12 }}>
            {[{k:'title',l:'Job Title',p:'Senior SDE'},{k:'company',l:'Company',p:'Razorpay'},{k:'salary_range',l:'Salary',p:'30-40 LPA'},{k:'location',l:'Location',p:'Bangalore'},{k:'source',l:'Source',p:'LinkedIn'},{k:'job_url',l:'Apply URL',p:'https://...'}].map(f=>(
              <div key={f.k}>
                <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                <input className="input-dark" placeholder={f.p} value={(form as Record<string,string>)[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})}/>
              </div>
            ))}
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Stage</label>
              <select className="input-dark" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {COLS.map(c=><option key={c} value={c}>{COL_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-primary" onClick={add} disabled={!form.title||!form.company}><Check size={13}/> Save</button>
            <button className="btn-ghost" onClick={()=>setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(8,minmax(130px,1fr))', gap:10, overflowX:'auto' }}>
        {COLS.map(col=>{
          const colJobs = jobs.filter(j=>j.status===col)
          return (
            <div key={col}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, padding:'0 2px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:COL_COLORS[col], textTransform:'uppercase', letterSpacing:'0.06em' }}>{COL_LABELS[col]}</div>
                <span style={{ fontSize:10, color:'#2d3b52', background:'var(--card)', padding:'1px 6px', borderRadius:4 }}>{colJobs.length}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, minHeight:80 }}>
                {colJobs.map(j=>(
                  <div key={String(j.id)} style={{ background:'var(--card)', border:`1px solid ${COL_COLORS[col]}20`, borderRadius:10, padding:11 }}>
                    <div style={{ fontWeight:700, color:'white', fontSize:12, marginBottom:2, wordBreak:'break-word' }}>{String(j.company||'')}</div>
                    <div style={{ fontSize:11, color:'#6b7a99', marginBottom:8, wordBreak:'break-word' }}>{String(j.title||'')}</div>
                    {j.salary_range && <div style={{ fontSize:10, color:'#10b981', marginBottom:6 }}>{String(j.salary_range)}</div>}
                    <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                      {j.job_url&&<a href={String(j.job_url)} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, color:'#3b82f6', textDecoration:'none' }}><ExternalLink size={9}/> Apply</a>}
                    </div>
                    <select value={String(j.status)} onChange={e=>updateStatus(String(j.id),e.target.value)}
                      style={{ width:'100%', padding:'3px 6px', borderRadius:5, border:`1px solid ${COL_COLORS[String(j.status)]}30`, background:`${COL_COLORS[String(j.status)]}10`, color:COL_COLORS[String(j.status)], fontSize:10, cursor:'pointer' }}>
                      {COLS.map(c=><option key={c} value={c}>{COL_LABELS[c]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
