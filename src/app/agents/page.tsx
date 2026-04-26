'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { Bot, Copy, Check, RefreshCw } from 'lucide-react'

const AGENTS = ['Networking Agent','Conversation Assistant','Job Search Assistant','Resume Diagnosis','Interview Coach','Cold Email Writer','Offer Negotiator','LinkedIn Profile Optimizer','Career Pivot Advisor','Referral Hunter']
const CAT: Record<string,string> = { 'Networking Agent':'network','Conversation Assistant':'network','Job Search Assistant':'search','Resume Diagnosis':'resume','Interview Coach':'interview','Cold Email Writer':'outreach','Offer Negotiator':'negotiate','LinkedIn Profile Optimizer':'profile','Career Pivot Advisor':'career','Referral Hunter':'network' }
const CAT_COLORS: Record<string,string> = { network:'#4f8eff',search:'#00e5b3',resume:'#fbbf24',interview:'#f97316',outreach:'#ec4899',negotiate:'#a78bfa',profile:'#34d399',career:'#6366f1' }

function renderValue(val: unknown, depth=0): React.ReactNode {
  if (!val) return null
  if (typeof val==='string') return <span style={{ fontSize:13, lineHeight:1.7 }}>{val}</span>
  if (Array.isArray(val)) return (
    <ul style={{ paddingLeft:16, margin:'4px 0' }}>
      {val.map((item,i)=><li key={i} style={{ marginBottom:4 }}>{renderValue(item,depth+1)}</li>)}
    </ul>
  )
  if (typeof val==='object') return (
    <div style={{ paddingLeft:depth>0?12:0 }}>
      {Object.entries(val as Record<string,unknown>).map(([k,v])=>(
        <div key={k} style={{ marginBottom:8 }}>
          <div style={{ fontSize:11, color:'#7a8599', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{k.replace(/_/g,' ')}</div>
          <div>{renderValue(v,depth+1)}</div>
        </div>
      ))}
    </div>
  )
  return <span style={{ fontSize:13 }}>{String(val)}</span>
}

function AgentsInner() {
  const [selected, setSelected] = useState(AGENTS[0])
  const [input, setInput]       = useState('')
  const [goal, setGoal]         = useState('')
  const [context, setContext]   = useState('Indian IT professional, Chennai, targeting senior role')
  const [result, setResult]     = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)
  const [filter, setFilter]     = useState('all')

  const run = async () => {
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/agents', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ agentName: selected, input, goal, context }) })
      setResult(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const copy = () => { navigator.clipboard.writeText(JSON.stringify(result,null,2)); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  const cats = ['all', ...new Set(Object.values(CAT))]
  const filtered = AGENTS.filter(a => filter==='all' || CAT[a]===filter)

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Nova Agents</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>10 AI agents for every part of your job search. Each specialised, each expert-level.</p>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filter===c?(CAT_COLORS[c]||'#4f8eff'):'rgba(255,255,255,0.08)'}`, background:filter===c?`${CAT_COLORS[c]||'#4f8eff'}15`:'transparent', color:filter===c?CAT_COLORS[c]||'#4f8eff':'#7a8599', cursor:'pointer', fontSize:12, textTransform:'capitalize' }}>{c}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:24 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {filtered.map(a=>{
            const c = CAT_COLORS[CAT[a]]
            return (
              <button key={a} onClick={()=>{setSelected(a);setResult(null)}}
                style={{ padding:'10px 14px', borderRadius:9, border:`1px solid ${selected===a?c||'#4f8eff':'rgba(255,255,255,0.06)'}`, background:selected===a?`${c||'#4f8eff'}10`:'#141d2e', color:selected===a?c||'#4f8eff':'#7a8599', cursor:'pointer', fontSize:12, fontWeight:500, textAlign:'left' }}>
                {a}
              </button>
            )
          })}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:CAT_COLORS[CAT[selected]]||'#4f8eff', marginBottom:14 }}>{selected}</div>
            {[{l:'Input / Context',v:input,s:setInput,p:'Your role, target company, specific situation...',h:120},{l:'Your Goal',v:goal,s:setGoal,p:'e.g. Get a referral at Razorpay for Senior Backend role',h:0}].map(f=>(
              <div key={f.l} style={{ marginBottom:12 }}>
                <label className="label-sm" style={{ display:'block', marginBottom:5 }}>{f.l}</label>
                {f.h>0 ? <textarea className="input-dark" style={{ height:f.h }} placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)}/> : <input className="input-dark" placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)}/>}
              </div>
            ))}
            <button className="btn-primary" onClick={run} disabled={loading||!input} style={{ justifyContent:'center', padding:'12px' }}>
              {loading?<><RefreshCw size={13}/> Running Agent...</>:<><Bot size={13}/> Run {selected}</>}
            </button>
          </div>

          {result && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div className="label-sm" style={{ color:'#00e5b3' }}>AGENT OUTPUT</div>
                <button onClick={copy} className="btn-ghost" style={{ padding:'4px 10px', fontSize:11 }}>
                  {copied?<><Check size={11}/> Copied</>:<><Copy size={11}/> Copy JSON</>}
                </button>
              </div>
              {renderValue(result)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Agents() {
  return (
    <PaywallGate feature="agents">
      <AgentsInner />
    </PaywallGate>
  )
}
