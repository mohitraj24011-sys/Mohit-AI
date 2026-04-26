'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { Mic, CheckCircle, RefreshCw, ChevronRight, Star, AlertTriangle, Copy, Check } from 'lucide-react'

const COMPANIES = ['Google','Microsoft','Amazon','Razorpay','CRED','Zepto','Flipkart','Swiggy','Anthropic','Postman','Freshworks','Custom']
const TIERS = ['junior','mid','senior','staff','manager','director','vp']

function InterviewPrepInner() {
  const [company, setCompany] = useState('Razorpay')
  const [customCompany, setCustomCompany] = useState('')
  const [role, setRole]   = useState('Senior Backend Engineer')
  const [tier, setTier]   = useState('senior')
  const [skills, setSkills] = useState('Go, PostgreSQL, Kubernetes')
  const [questions, setQuestions] = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)
  const [activeQ, setActiveQ] = useState<Record<string,unknown>|null>(null)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<Record<string,unknown>|null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [cat, setCat] = useState('dsa')
  const [copied, setCopied] = useState<string|null>(null)

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(null),2000) }

  const generate = async () => {
    setLoading(true); setQuestions(null); setActiveQ(null); setEvaluation(null)
    try {
      const res = await fetch('/api/interview-prep', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'generate_questions', company: customCompany||company, role, tier, skills: skills.split(',').map(s=>s.trim()) }) })
      setQuestions(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const evaluate = async () => {
    if (!activeQ||!answer) return
    setEvaluating(true); setEvaluation(null)
    try {
      const res = await fetch('/api/interview-prep', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'evaluate_answer', question: activeQ.question, answer, role, company: customCompany||company }) })
      setEvaluation(await res.json())
    } catch(e) { console.error(e) }
    setEvaluating(false)
  }

  const verdictColor = (v: string) => v==='Hire'?'#00e5b3':v==='No Hire'?'#f87171':'#fbbf24'
  const q = questions as Record<string,{question:string;difficulty?:string;hint?:string;sampleAnswer?:string;framework?:string;keyPoints?:string[];context?:string}[]>|null
  const ev = evaluation as {score?:number;verdict?:string;strengths?:string[];weaknesses?:string[];missedKeyPoints?:string[];improvedAnswer?:string;followUpQuestions?:string[]}|null
  const sn = (questions as Record<string,{currentOffer?:string;counterScript?:string}>|null)?.salaryNegotiation

  const CATS = [
    {id:'dsa',l:'DSA',data:q?.dsa},
    {id:'systemDesign',l:'System Design',data:q?.systemDesign},
    {id:'behavioural',l:'Behavioural',data:q?.behavioural},
    {id:'technical',l:'Technical',data:q?.technical},
    {id:'companySpecific',l:'Company Specific',data:q?.companySpecific},
  ].filter(c=>c.data?.length)

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Interview Prep</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>Company-specific questions, AI answer evaluation, salary negotiation scripts</p>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:14 }}>
          <div>
            <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Company</label>
            <select className="input-dark" value={company} onChange={e=>setCompany(e.target.value)}>
              {COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {company==='Custom' && <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Custom</label><input className="input-dark" placeholder="Company name" value={customCompany} onChange={e=>setCustomCompany(e.target.value)}/></div>}
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Role</label><input className="input-dark" placeholder="Senior Backend..." value={role} onChange={e=>setRole(e.target.value)}/></div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Level</label><select className="input-dark" value={tier} onChange={e=>setTier(e.target.value)}>{TIERS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Skills</label><input className="input-dark" placeholder="Go, K8s..." value={skills} onChange={e=>setSkills(e.target.value)}/></div>
        </div>
        <button className="btn-primary" onClick={generate} disabled={loading||!role} style={{ justifyContent:'center', padding:'12px 28px' }}>
          {loading?<><RefreshCw size={13}/> Generating...</>:<><Mic size={13}/> Generate Questions</>}
        </button>
      </div>

      {questions && (
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:24 }}>
          <div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
              {CATS.map(c=>(
                <button key={c.id} onClick={()=>setCat(c.id)}
                  style={{ padding:'9px 12px', borderRadius:8, border:`1px solid ${cat===c.id?'#4f8eff':'rgba(255,255,255,0.06)'}`, background:cat===c.id?'rgba(79,142,255,0.15)':'#141d2e', color:cat===c.id?'#4f8eff':'#7a8599', cursor:'pointer', fontSize:12, display:'flex', justifyContent:'space-between' }}>
                  <span>{c.l}</span><span style={{ fontSize:11 }}>{c.data?.length}</span>
                </button>
              ))}
            </div>
            {(CATS.find(c=>c.id===cat)?.data||[]).map((q,i)=>(
              <div key={i} onClick={()=>{setActiveQ(q as unknown as Record<string,unknown>);setAnswer('');setEvaluation(null)}}
                style={{ padding:12, borderRadius:10, marginBottom:8, cursor:'pointer', border:`1px solid ${activeQ===q?'#4f8eff':'rgba(255,255,255,0.06)'}`, background:activeQ===q?'rgba(79,142,255,0.08)':'#141d2e' }}>
                <div style={{ fontSize:12, color:'white', lineHeight:1.5, marginBottom:4 }}>{q.question}</div>
                {q.difficulty && <span style={{ fontSize:10, color:q.difficulty==='Hard'?'#f87171':q.difficulty==='Med'?'#fbbf24':'#00e5b3', fontFamily:'JetBrains Mono,monospace' }}>{q.difficulty}</span>}
              </div>
            ))}
          </div>

          <div>
            {activeQ ? (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="card">
                  <div className="label-sm" style={{ color:'#4f8eff', marginBottom:10 }}>QUESTION</div>
                  <p style={{ fontSize:15, lineHeight:1.7, color:'white', marginBottom:12 }}>{String(activeQ.question||'')}</p>
                  {activeQ.hint && <div style={{ fontSize:13, color:'#fbbf24', background:'rgba(251,191,36,0.08)', padding:'8px 12px', borderRadius:8 }}>💡 {String(activeQ.hint)}</div>}
                  {(activeQ.keyPoints as string[])?.length>0 && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:11, color:'#7a8599', marginBottom:6 }}>Key points:</div>
                      {(activeQ.keyPoints as string[]).map((kp:string,i:number)=>(
                        <div key={i} style={{ display:'flex', gap:6, fontSize:12, color:'#7a8599', marginBottom:4 }}><ChevronRight size={11} style={{ flexShrink:0, marginTop:2 }}/>{kp}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card">
                  <label className="label-sm" style={{ display:'block', marginBottom:8 }}>YOUR ANSWER</label>
                  <textarea className="input-dark" style={{ height:160 }} placeholder="Type your answer... use STAR method for behavioural" value={answer} onChange={e=>setAnswer(e.target.value)}/>
                  <button className="btn-primary" onClick={evaluate} disabled={evaluating||!answer} style={{ marginTop:12, justifyContent:'center', padding:'11px' }}>
                    {evaluating?<><RefreshCw size={13}/> Evaluating...</>:<><Star size={13}/> Evaluate My Answer</>}
                  </button>
                </div>
                {ev && (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div className="card" style={{ textAlign:'center', borderColor:`${verdictColor(ev.verdict||'')}40` }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:56, fontWeight:800, color:verdictColor(ev.verdict||'') }}>{ev.score}<span style={{ fontSize:20 }}>/10</span></div>
                      <div style={{ fontSize:16, fontWeight:700, color:verdictColor(ev.verdict||'') }}>{ev.verdict}</div>
                    </div>
                    {ev.strengths?.length>0 && (
                      <div className="card">
                        <div className="label-sm" style={{ color:'#00e5b3', marginBottom:8 }}>✅ STRENGTHS</div>
                        {ev.strengths.map((s:string,i:number)=><div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13 }}><CheckCircle size={12} color="#00e5b3" style={{ flexShrink:0, marginTop:2 }}/>{s}</div>)}
                      </div>
                    )}
                    {ev.missedKeyPoints?.length>0 && (
                      <div className="card">
                        <div className="label-sm" style={{ color:'#f87171', marginBottom:8 }}>❌ MISSED KEY POINTS</div>
                        {ev.missedKeyPoints.map((m:string,i:number)=><div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13 }}><AlertTriangle size={12} color="#f87171" style={{ flexShrink:0, marginTop:2 }}/>{m}</div>)}
                      </div>
                    )}
                    {ev.improvedAnswer && (
                      <div className="card">
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                          <div className="label-sm" style={{ color:'#4f8eff' }}>💡 IMPROVED ANSWER</div>
                          <button onClick={()=>copy(ev.improvedAnswer||'','ia')} className="btn-ghost" style={{ padding:'3px 8px', fontSize:11 }}>
                            {copied==='ia'?<Check size={10}/>:<Copy size={10}/>}
                          </button>
                        </div>
                        <p style={{ fontSize:13, lineHeight:1.8, fontStyle:'italic' }}>{ev.improvedAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
                {sn && (
                  <div className="card" style={{ borderColor:'rgba(0,229,179,0.2)' }}>
                    <div className="label-sm" style={{ color:'#00e5b3', marginBottom:12 }}>💰 SALARY NEGOTIATION SCRIPT</div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, color:'#7a8599', marginBottom:6 }}>When they give an offer:</div>
                      <div style={{ background:'#0f1420', padding:12, borderRadius:8, fontSize:13, lineHeight:1.7, fontStyle:'italic' }}>"{sn.currentOffer}"</div>
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#7a8599', marginBottom:6 }}>Your counter:</div>
                      <div style={{ background:'rgba(0,229,179,0.06)', padding:12, borderRadius:8, fontSize:13, lineHeight:1.7, fontStyle:'italic' }}>"{sn.counterScript}"</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, minHeight:400 }}>
                <Mic size={32} color="#3d4a5c"/>
                <p style={{ color:'#7a8599', fontSize:14 }}>Select a question from the left to start practising</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InterviewPrep() {
  return (
    <PaywallGate feature="interview_prep">
      <InterviewPrepInner />
    </PaywallGate>
  )
}
