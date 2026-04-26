'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { TrendingUp, RefreshCw } from 'lucide-react'

const QUESTIONS = ['What are the hottest skills in Indian IT right now?','What is the salary range for Go engineers in Bangalore?','Which companies are hiring the most right now?','How do remote salaries compare to in-office for Indian engineers?','What skills should I add to double my salary in 12 months?']

function MarketInner() {
  const [question, setQuestion] = useState('')
  const [skills, setSkills]     = useState('')
  const [role, setRole]         = useState('')
  const [result, setResult]     = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]   = useState(false)

  const ask = async (q?: string) => {
    const qtext = q || question
    if (!qtext) return
    setLoading(true)
    try {
      const res = await fetch('/api/market-trends', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question: qtext, skills: skills.split(',').map(s=>s.trim()), role }) })
      setResult(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const r = result as {answer?:string;salaryInsights?:{current:string;targetable:string;remote:string;topPayingCompanies:string[]};hotSkills?:{skill:string;demandScore:number;salaryImpact:string;why:string}[];marketSignals?:string[];actionableAdvice?:string[]}|null

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Market Intelligence</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>Indian IT salary benchmarks, skill demand, top hiring companies — data-backed answers</p>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Your Skills</label><input className="input-dark" placeholder="Go, Kubernetes, React..." value={skills} onChange={e=>setSkills(e.target.value)}/></div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Your Role</label><input className="input-dark" placeholder="Senior Backend Engineer" value={role} onChange={e=>setRole(e.target.value)}/></div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Ask a Question</label>
          <input className="input-dark" placeholder="What salary can I target with my skills?" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()}/>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {QUESTIONS.map(q=>(
            <button key={q} onClick={()=>{setQuestion(q);ask(q)}} style={{ padding:'5px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#7a8599', cursor:'pointer', fontSize:11, textAlign:'left' }}>{q}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>ask()} disabled={loading||(!question&&!skills&&!role)} style={{ justifyContent:'center', padding:'12px 28px' }}>
          {loading?<><RefreshCw size={13}/> Researching...</>:<><TrendingUp size={13}/> Get Market Intelligence</>}
        </button>
      </div>

      {r && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {r.answer && <div className="card"><div className="label-sm" style={{ color:'#4f8eff', marginBottom:10 }}>MARKET ANALYSIS</div><p style={{ fontSize:14, lineHeight:1.8 }}>{r.answer}</p></div>}
          {r.salaryInsights && (
            <div className="card">
              <div className="label-sm" style={{ marginBottom:12 }}>💰 SALARY INSIGHTS</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                {[{l:'Current Market',v:r.salaryInsights.current,c:'#7a8599'},{l:'Targetable',v:r.salaryInsights.targetable,c:'#fbbf24'},{l:'Remote/Global',v:r.salaryInsights.remote,c:'#00e5b3'}].map(s=>(
                  <div key={s.l} style={{ textAlign:'center', padding:14, background:'#0f1420', borderRadius:10 }}>
                    <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:11, color:'#7a8599', marginTop:3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {r.salaryInsights.topPayingCompanies?.length>0 && (
                <div>
                  <div className="label-sm" style={{ marginBottom:8 }}>Top Paying Companies</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {r.salaryInsights.topPayingCompanies.map((c:string)=><span key={c} className="badge badge-green" style={{ fontSize:11 }}>{c}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {r.hotSkills?.length>0 && (
            <div className="card">
              <div className="label-sm" style={{ marginBottom:12 }}>🔥 HOT SKILLS RIGHT NOW</div>
              {r.hotSkills.map((s,i)=>(
                <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom:i<(r.hotSkills||[]).length-1?'1px solid rgba(99,130,255,0.08)':'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontWeight:700, color:'white', fontSize:14 }}>{s.skill}</span>
                    <div style={{ display:'flex', gap:10 }}>
                      <span style={{ fontWeight:800, color:'#00e5b3', fontSize:13 }}>{s.salaryImpact}</span>
                      <span style={{ fontSize:12, color:'#fbbf24' }}>{s.demandScore}/100</span>
                    </div>
                  </div>
                  <div style={{ height:5, background:'#0f1420', borderRadius:3, marginBottom:6 }}><div style={{ height:'100%', width:`${s.demandScore}%`, background:'#00e5b3', borderRadius:3 }}/></div>
                  <div style={{ fontSize:12, color:'#7a8599' }}>{s.why}</div>
                </div>
              ))}
            </div>
          )}
          {r.actionableAdvice?.length>0 && (
            <div className="card">
              <div className="label-sm" style={{ color:'#fbbf24', marginBottom:10 }}>⚡ DO THIS THIS WEEK</div>
              {r.actionableAdvice.map((a:string,i:number)=><div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13 }}>→ {a}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Market() {
  return (
    <PaywallGate feature="market_trends">
      <MarketInner />
    </PaywallGate>
  )
}
