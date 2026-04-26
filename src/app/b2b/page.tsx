'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Briefcase, RefreshCw, Copy, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react'

export default function B2B() {
  const [form, setForm] = useState({ clientName:'', clientIndustry:'Technology', requirement:'', myServices:'Node.js, React, Kubernetes, System Design', timeline:'8 weeks', budget:'' })
  const [result, setResult] = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(['deliverables'])

  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/auth'; return null }
    return fetch(url, { ...opts, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` } })
  }

  const generate = async () => {
    if (!form.clientName || !form.requirement) { alert('Client name and requirement are required'); return }
    setLoading(true)
    const res = await authFetch('/api/b2b-proposal', { method:'POST', body: JSON.stringify({ action:'generate', ...form }) })
    if (res?.ok) setResult(await res.json())
    setLoading(false)
  }

  const toggle = (section: string) => setExpanded(prev => prev.includes(section) ? prev.filter(s=>s!==section) : [...prev, section])
  const isOpen = (s: string) => expanded.includes(s)

  const r = result as {
    title?:string; executiveSummary?:string; problemStatement?:string; ourSolution?:string;
    deliverables?:{item:string;description:string;timeline:string}[];
    timeline?:{totalWeeks:number;phases:{phase:string;duration:string;milestones:string[]}[]};
    investment?:{setup:number;monthly:number;paymentTerms:string};
    whyUs?:string[]; negotiationAdvice?:string[]; nextSteps?:string[]; callToAction?:string;
    caseStudy?:{client:string;outcome:string;metric:string};
  }|null

  const fullText = r ? `${r.title}

${r.executiveSummary}

PROBLEM
${r.problemStatement}

OUR SOLUTION
${r.ourSolution}

DELIVERABLES
${(r.deliverables||[]).map(d=>`• ${d.item}: ${d.description} (${d.timeline})`).join('\n')}

INVESTMENT
Setup: ₹${r.investment?.setup?.toLocaleString()}
Monthly: ₹${r.investment?.monthly?.toLocaleString()}
${r.investment?.paymentTerms}

WHY US
${(r.whyUs||[]).map(w=>`• ${w}`).join('\n')}

NEXT STEPS
${(r.nextSteps||[]).join('\n')}

${r.callToAction}` : ''

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 20px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
          <Briefcase size={22} color="#8b5cf6"/> B2B Proposal Generator
        </h1>
        <p style={{ color:'#6b7a99' }}>Generate professional proposals for ₹5L–₹50L deals in 60 seconds</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:20 }}>
        <div>
          <div className="card">
            <div className="label-sm" style={{ marginBottom:14 }}>CLIENT DETAILS</div>
            {[{k:'clientName',l:'Client Name *',p:'Razorpay / Startup Inc'},{k:'clientIndustry',l:'Industry',p:'Fintech'},{k:'budget',l:'Budget Discussed',p:'₹5L/month or not discussed'}].map(f=>(
              <div key={f.k} style={{ marginBottom:12 }}>
                <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                <input className="input-dark" placeholder={f.p} value={(form as Record<string,string>)[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})}/>
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Requirement *</label>
              <textarea className="input-dark" style={{ height:80 }} placeholder="Build a payment integration system with real-time dashboards..." value={form.requirement} onChange={e=>setForm({...form,requirement:e.target.value})}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Our Services</label>
              <input className="input-dark" placeholder="Node.js, React, AWS" value={form.myServices} onChange={e=>setForm({...form,myServices:e.target.value})}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Timeline</label>
              <input className="input-dark" placeholder="8 weeks" value={form.timeline} onChange={e=>setForm({...form,timeline:e.target.value})}/>
            </div>
            <button onClick={generate} disabled={loading} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', background:'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>
              {loading?<><RefreshCw size={13}/> Generating...</>:<><Plus size={13}/> Generate Proposal</>}
            </button>
          </div>
        </div>

        {r ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:17, color:'white' }}>{r.title}</div>
              <button onClick={()=>{navigator.clipboard.writeText(fullText);setCopied(true);setTimeout(()=>setCopied(false),2000)}} className="btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}>
                {copied?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy All</>}
              </button>
            </div>

            {[
              {k:'executiveSummary', title:'Executive Summary', content: r.executiveSummary},
              {k:'investment', title:'Investment', content: r.investment ? `Setup: ₹${r.investment.setup?.toLocaleString()}\nMonthly: ₹${r.investment.monthly?.toLocaleString()}\n${r.investment.paymentTerms}` : ''},
              {k:'deliverables', title:`Deliverables (${r.deliverables?.length||0})`, content: null},
              {k:'whyUs', title:'Why Us', content: null},
              {k:'nextSteps', title:'Next Steps', content: null},
            ].filter(s=>s.content!==undefined||s.k==='deliverables'||s.k==='whyUs'||s.k==='nextSteps').map(s=>(
              <div key={s.k} className="card" style={{ padding:0, overflow:'hidden' }}>
                <button onClick={()=>toggle(s.k)} style={{ width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'white' }}>{s.title}</span>
                  {isOpen(s.k)?<ChevronUp size={14} color="#6b7a99"/>:<ChevronDown size={14} color="#6b7a99"/>}
                </button>
                {isOpen(s.k) && (
                  <div style={{ padding:'0 16px 16px' }}>
                    {s.content && <p style={{ fontSize:13, color:'#6b7a99', lineHeight:1.7, whiteSpace:'pre-line' }}>{s.content}</p>}
                    {s.k==='deliverables' && r.deliverables?.map((d,i)=>(
                      <div key={i} style={{ padding:'8px 12px', background:'var(--bg2)', borderRadius:8, marginBottom:8 }}>
                        <div style={{ fontWeight:700, color:'white', fontSize:13, marginBottom:3 }}>{d.item}</div>
                        <div style={{ fontSize:12, color:'#6b7a99', marginBottom:4 }}>{d.description}</div>
                        <span className="badge badge-blue" style={{ fontSize:10 }}>{d.timeline}</span>
                      </div>
                    ))}
                    {s.k==='whyUs' && r.whyUs?.map((w,i)=>(
                      <div key={i} style={{ fontSize:13, color:'#6b7a99', padding:'4px 0', display:'flex', gap:8 }}>
                        <span style={{ color:'#10b981' }}>→</span>{w}
                      </div>
                    ))}
                    {s.k==='nextSteps' && r.nextSteps?.map((ns,i)=>(
                      <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(99,130,255,0.06)', fontSize:13 }}>
                        <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#3b82f6', flexShrink:0 }}>{i+1}</span>
                        <span style={{ color:'var(--text)' }}>{ns}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {r.callToAction && (
              <div className="card" style={{ borderColor:'rgba(139,92,246,0.3)', textAlign:'center', padding:'20px' }}>
                <div style={{ fontSize:15, color:'white', fontWeight:600, fontStyle:'italic' }}>"{r.callToAction}"</div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400, flexDirection:'column', gap:12 }}>
            <Briefcase size={48} color="#2d3b52"/>
            <p style={{ color:'#6b7a99', textAlign:'center', maxWidth:280 }}>Fill in client details and click Generate. AI creates a professional proposal in 60 seconds.</p>
          </div>
        )}
      </div>
    </div>
  )
}
