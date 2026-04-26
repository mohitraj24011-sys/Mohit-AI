'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Briefcase, Plus, Trash2, RefreshCw, Check, TrendingUp } from 'lucide-react'
import PaywallGate from '@/components/PaywallGate'

type Offer = { company:string;role:string;baseSalary:number;equity?:string;bonus?:number;wfh:string;location:string;joiningBonus?:number;otherBenefits?:string;pros:string;cons:string }

function OfferContent() {
  const [offers, setOffers] = useState<Offer[]>([{ company:'', role:'', baseSalary:0, wfh:'hybrid', location:'Bangalore', pros:'', cons:'' }, { company:'', role:'', baseSalary:0, wfh:'office', location:'Bangalore', pros:'', cons:'' }])
  const [currentSalary, setCurrentSalary] = useState('')
  const [priorities, setPriorities] = useState(['salary','growth','wfh'])
  const [result, setResult] = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)

  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return fetch(url, { ...opts, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` } })
  }

  const addOffer = () => setOffers([...offers, { company:'', role:'', baseSalary:0, wfh:'hybrid', location:'Bangalore', pros:'', cons:'' }])
  const removeOffer = (i: number) => setOffers(offers.filter((_,idx)=>idx!==i))
  const updateOffer = (i: number, key: string, value: string|number) => setOffers(offers.map((o,idx)=>idx===i?{...o,[key]:value}:o))
  const togglePriority = (p: string) => setPriorities(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p])

  const compare = async () => {
    if (offers.filter(o=>o.company&&o.baseSalary).length < 2) { alert('Fill at least 2 offers'); return }
    setLoading(true)
    const res = await authFetch('/api/offer-compare', { method:'POST', body: JSON.stringify({ offers, currentSalary: parseInt(currentSalary)||0, priorities }) })
    if (res?.ok) setResult(await res.json())
    setLoading(false)
  }

  const PRIORITY_OPTIONS = ['salary','growth','wfh','culture','equity','learning','location','stability']
  const r = result as {winner?:{offer:string;confidence:string;reason:string};comparison?:{company:string;score:number;pros:string[];cons:string[];hikePercent:number;fiveYearProjection:string;cultureScore:number;growthPotential:string}[];negotiationAdvice?:{company:string;canNegotiate:boolean;amount:string;script:string}[];verdict?:string}|null

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 20px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
          <Briefcase size={22} color="#f59e0b"/> Offer Comparator
        </h1>
        <p style={{ color:'#6b7a99' }}>AI compares multiple offers — salary, growth, WFH, culture, 5-year projection</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
        <div>
          {/* Offers */}
          {offers.map((o, i) => (
            <div key={i} className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'white' }}>Offer {i+1}</div>
                {offers.length > 2 && <button onClick={()=>removeOffer(i)} className="btn-danger" style={{ padding:'3px 8px' }}><Trash2 size={11}/></button>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[{k:'company',l:'Company',p:'Razorpay'},{k:'role',l:'Role',p:'Senior SDE'},{k:'location',l:'Location',p:'Bangalore'}].map(f=>(
                  <div key={f.k}>
                    <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                    <input className="input-dark" placeholder={f.p} value={(o as Record<string,string|number>)[f.k] as string} onChange={e=>updateOffer(i,f.k,e.target.value)}/>
                  </div>
                ))}
                <div>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Base Salary (LPA)</label>
                  <input type="number" className="input-dark" placeholder="32" value={o.baseSalary||''} onChange={e=>updateOffer(i,'baseSalary',parseInt(e.target.value)||0)}/>
                </div>
                <div>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>WFH Policy</label>
                  <select className="input-dark" value={o.wfh} onChange={e=>updateOffer(i,'wfh',e.target.value)}>
                    {['remote','hybrid','office'].map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Equity / ESOPs</label>
                  <input className="input-dark" placeholder="0.1% over 4yr" value={o.equity||''} onChange={e=>updateOffer(i,'equity',e.target.value)}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                <div>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Pros</label>
                  <input className="input-dark" placeholder="Good brand, fast growth" value={o.pros} onChange={e=>updateOffer(i,'pros',e.target.value)}/>
                </div>
                <div>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Cons</label>
                  <input className="input-dark" placeholder="Long hours, unclear role" value={o.cons} onChange={e=>updateOffer(i,'cons',e.target.value)}/>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addOffer} className="btn-ghost" style={{ marginBottom:14 }}><Plus size={13}/> Add another offer</button>
          <button onClick={compare} disabled={loading} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', background:'linear-gradient(135deg,#f59e0b,#f97316)' }}>
            {loading?<><RefreshCw size={13}/> Comparing...</>:<><TrendingUp size={13}/> Compare with AI</>}
          </button>
        </div>

        {/* Right panel */}
        <div>
          <div className="card" style={{ marginBottom:14 }}>
            <label className="label-sm" style={{ display:'block', marginBottom:6 }}>Current Salary (LPA)</label>
            <input type="number" className="input-dark" placeholder="18" value={currentSalary} onChange={e=>setCurrentSalary(e.target.value)}/>
          </div>
          <div className="card">
            <div className="label-sm" style={{ marginBottom:10 }}>WHAT MATTERS TO YOU</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PRIORITY_OPTIONS.map(p=>(
                <button key={p} onClick={()=>togglePriority(p)}
                  style={{ padding:'4px 10px', borderRadius:14, border:`1px solid ${priorities.includes(p)?'#3b82f6':'rgba(255,255,255,0.08)'}`, background:priorities.includes(p)?'rgba(59,130,246,0.12)':'transparent', color:priorities.includes(p)?'#60a5fa':'#6b7a99', cursor:'pointer', fontSize:11, textTransform:'capitalize' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {r && (
        <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:16 }}>
          {r.winner && (
            <div className="card" style={{ borderColor:'rgba(16,185,129,0.4)', background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.05))', textAlign:'center', padding:24 }}>
              <div style={{ fontSize:14, color:'#6b7a99', marginBottom:6 }}>AI Recommendation</div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'#10b981', marginBottom:6 }}>{r.winner.offer}</div>
              <div style={{ fontSize:13, color:'white', marginBottom:8 }}>{r.winner.reason}</div>
              <span className="badge badge-green">{r.winner.confidence} confidence</span>
            </div>
          )}

          {r.comparison && (
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(r.comparison.length,3)},1fr)`, gap:14 }}>
              {r.comparison.map((c,i)=>(
                <div key={i} className="card">
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'white', marginBottom:6 }}>{c.company}</div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color:c.score>=70?'#10b981':c.score>=50?'#f59e0b':'#ef4444', marginBottom:4 }}>{c.score}</div>
                  <div style={{ fontSize:11, color:'#6b7a99', marginBottom:12 }}>overall score</div>
                  {c.hikePercent>0&&<div style={{ fontSize:13, color:'#10b981', fontWeight:700, marginBottom:10 }}>+{c.hikePercent}% hike</div>}
                  {c.pros?.slice(0,3).map((p,j)=><div key={j} style={{ fontSize:12, color:'#6b7a99', marginBottom:4 }}>✓ {p}</div>)}
                  {c.cons?.slice(0,2).map((cn,j)=><div key={j} style={{ fontSize:12, color:'#ef4444', marginBottom:4 }}>✗ {cn}</div>)}
                  <div style={{ marginTop:8, fontSize:11, color:'#6b7a99', fontStyle:'italic' }}>{c.fiveYearProjection}</div>
                </div>
              ))}
            </div>
          )}

          {r.negotiationAdvice?.filter(n=>n.canNegotiate).length > 0 && (
            <div className="card">
              <div className="label-sm" style={{ color:'#f59e0b', marginBottom:10 }}>💰 NEGOTIATION SCRIPTS</div>
              {r.negotiationAdvice.filter(n=>n.canNegotiate).map((n,i)=>(
                <div key={i} style={{ padding:'12px 14px', background:'var(--bg2)', borderRadius:9, marginBottom:10 }}>
                  <div style={{ fontWeight:700, color:'white', fontSize:14, marginBottom:4 }}>{n.company} → ask for {n.amount} more</div>
                  <div style={{ fontSize:13, color:'#6b7a99', fontStyle:'italic', lineHeight:1.7 }}>"{n.script}"</div>
                </div>
              ))}
            </div>
          )}

          {r.verdict && (
            <div className="card" style={{ borderColor:'rgba(59,130,246,0.2)' }}>
              <div className="label-sm" style={{ color:'#3b82f6', marginBottom:8 }}>FINAL VERDICT</div>
              <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.7 }}>{r.verdict}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Offer() {
  return <PaywallGate feature="market_trends"><OfferContent /></PaywallGate>
}
