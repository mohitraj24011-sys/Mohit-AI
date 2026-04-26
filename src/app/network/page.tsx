'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Check, Copy } from 'lucide-react'

const STAGES = ['to_connect','request_sent','connected','messaged','replied','call_scheduled','mentor','referral_asked','referral_given']
const STAGE_LABELS: Record<string,string> = { to_connect:'To Connect',request_sent:'Request Sent',connected:'Connected',messaged:'Messaged',replied:'Replied',call_scheduled:'Call Scheduled',mentor:'Mentor',referral_asked:'Referral Asked',referral_given:'Referral Given ✅' }
const STAGE_COLORS: Record<string,string> = { to_connect:'#6b7a99',request_sent:'#3b82f6',connected:'#3b82f6',messaged:'#f59e0b',replied:'#f97316',call_scheduled:'#8b5cf6',mentor:'#10b981',referral_asked:'#10b981',referral_given:'#10b981' }

export default function Network() {
  const [contacts, setContacts] = useState<Record<string,unknown>[]>([])
  const [form, setForm] = useState({ name:'',company:'',role:'',status:'to_connect',linkedin_url:'',notes:'', auto_managed:false })
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string|null>(null)

  const load = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const { data } = await supabase.from('network').select('*').eq('user_id', session.user.id).order('created_at',{ascending:false})
    setContacts(data||[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('network').insert({ ...form, user_id: session.user.id, last_contact: new Date().toISOString().split('T')[0] })
    setForm({ name:'',company:'',role:'',status:'to_connect',linkedin_url:'',notes:'', auto_managed:false })
    setAdding(false); load()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('network').update({ status, last_contact: new Date().toISOString().split('T')[0] }).eq('id', id)
    setContacts(contacts.map(c => c.id===id ? {...c, status} : c))
  }

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(null),2000) }

  const filtered = contacts.filter(c => {
    const mf = filter==='all' || c.status===filter
    const ms = !search || String(c.name||'').toLowerCase().includes(search.toLowerCase()) || String(c.company||'').toLowerCase().includes(search.toLowerCase())
    return mf && ms
  })

  const stageCounts = STAGES.reduce((acc,s)=>({...acc,[s]:contacts.filter(c=>c.status===s).length}),{} as Record<string,number>)

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'36px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:4 }}>Network Tracker</h1>
          <p style={{ color:'#6b7a99' }}>{contacts.length} contacts · {contacts.filter(c=>c.status==='referral_given').length} referrals</p>
        </div>
        <button className="btn-primary" onClick={()=>setAdding(!adding)}><Plus size={13}/> Add Contact</button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:12 }}>
            {[{k:'name',l:'Name',p:'Priya Sharma'},{k:'company',l:'Company',p:'Zepto'},{k:'role',l:'Their Role',p:'EM'},{k:'linkedin_url',l:'LinkedIn URL',p:'linkedin.com/in/...'}].map(f=>(
              <div key={f.k}>
                <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                <input className="input-dark" placeholder={f.p} value={(form as Record<string,string>)[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})}/>
              </div>
            ))}
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Stage</label>
              <select className="input-dark" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {STAGES.map(s=><option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:18 }}>
              <input type="checkbox" checked={form.auto_managed} onChange={e=>setForm({...form,auto_managed:e.target.checked})} id="auto"/>
              <label htmlFor="auto" style={{ fontSize:12, color:'#6b7a99', cursor:'pointer' }}>Auto-manage follow-ups</label>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Notes</label>
            <textarea className="input-dark" style={{ height:60 }} placeholder="Context, mutual connections, last topic discussed..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-primary" onClick={add} disabled={!form.name}><Check size={13}/> Save Contact</button>
            <button className="btn-ghost" onClick={()=>setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <button onClick={()=>setFilter('all')} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filter==='all'?'#3b82f6':'rgba(255,255,255,0.08)'}`, background:filter==='all'?'rgba(59,130,246,0.12)':'transparent', color:filter==='all'?'#60a5fa':'#6b7a99', cursor:'pointer', fontSize:12 }}>All ({contacts.length})</button>
        {STAGES.filter(s=>stageCounts[s]>0).map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filter===s?STAGE_COLORS[s]:'rgba(255,255,255,0.08)'}`, background:filter===s?`${STAGE_COLORS[s]}15`:'transparent', color:filter===s?STAGE_COLORS[s]:'#6b7a99', cursor:'pointer', fontSize:12 }}>
            {STAGE_LABELS[s]} ({stageCounts[s]})
          </button>
        ))}
      </div>

      <input className="input-dark" placeholder="Search by name or company..." value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth:300, marginBottom:16 }}/>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {loading ? <div style={{ color:'#6b7a99', textAlign:'center', padding:'40px' }}>Loading...</div> :
         filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#6b7a99' }}>
            <Users size={40} color="#2d3b52" style={{ margin:'0 auto 12px' }}/>
            <p>No contacts yet. Add people to connect with.</p>
          </div>
         ) : filtered.map(c=>(
          <div key={String(c.id)} className="card" style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontWeight:700, color:'white', fontSize:14, marginBottom:2 }}>{String(c.name||'')}</div>
              <div style={{ fontSize:13, color:'#6b7a99' }}>{String(c.role||'')} {c.company?`at ${String(c.company)}`:''}</div>
              {c.notes && <div style={{ fontSize:12, color:'#6b7a99', marginTop:4, fontStyle:'italic' }}>{String(c.notes)}</div>}
              {c.auto_managed && <span className="badge badge-blue" style={{ marginTop:6, fontSize:9 }}>AUTO</span>}
            </div>
            {c.connection_message && (
              <div style={{ flex:2, minWidth:200 }}>
                <div className="label-sm" style={{ marginBottom:4 }}>PREPARED MESSAGE</div>
                <div style={{ fontSize:12, color:'#6b7a99', background:'var(--bg2)', padding:'8px 12px', borderRadius:8, lineHeight:1.6 }}>{String(c.connection_message||'').slice(0,200)}{String(c.connection_message||'').length>200?'...':''}</div>
                <button onClick={()=>copy(String(c.connection_message||''),String(c.id))} className="btn-ghost" style={{ marginTop:6, padding:'4px 10px', fontSize:11 }}>
                  {copied===String(c.id)?<><Check size={10}/> Copied</>:<><Copy size={10}/> Copy</>}
                </button>
              </div>
            )}
            <div style={{ flexShrink:0 }}>
              <select value={String(c.status)} onChange={e=>updateStatus(String(c.id),e.target.value)}
                style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${STAGE_COLORS[String(c.status)]}40`, background:`${STAGE_COLORS[String(c.status)]}12`, color:STAGE_COLORS[String(c.status)], fontSize:12, cursor:'pointer', fontWeight:600 }}>
                {STAGES.map(s=><option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
              {c.linkedin_url && (
                <a href={String(c.linkedin_url)} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ marginTop:6, display:'flex', padding:'5px 10px', fontSize:11, textDecoration:'none' }}>
                  View Profile
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
