'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { Target, RefreshCw, ChevronRight } from 'lucide-react'

const PRESET_ROLES = ['Senior Backend Engineer','Senior Frontend Engineer','Staff Engineer','Engineering Manager','Data Engineer','ML Engineer','Product Manager','DevOps Engineer']

function GapAnalysisInner() {
  const [skills, setSkills] = useState('')
  const [role, setRole]   = useState('')
  const [years, setYears] = useState('4')
  const [result, setResult] = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)

  const analyse = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gap-analysis', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ currentSkills: skills.split(',').map(s=>s.trim()), targetRole: role, yearsExperience: parseInt(years) }) })
      setResult(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const r = result as {matchScore?:number;verdict?:string;criticalGaps?:string[];highGaps?:string[];niceToHave?:string[];alreadyHave?:string[];estimatedTimeToReady?:string;ninetyDayRoadmap?:{week:string;focus:string;deliverable:string}[];priorityOrder?:string[]}|null

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Skill Gap Analysis</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>AI compares your skills vs market demand. 90-day roadmap to your target role.</p>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {PRESET_ROLES.map(r=>(
            <button key={r} onClick={()=>setRole(r)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${role===r?'#4f8eff':'rgba(255,255,255,0.08)'}`, background:role===r?'rgba(79,142,255,0.15)':'transparent', color:role===r?'#4f8eff':'#7a8599', cursor:'pointer', fontSize:12 }}>{r}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:12, marginBottom:14 }}>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Target Role</label><input className="input-dark" placeholder="Senior Backend Engineer" value={role} onChange={e=>setRole(e.target.value)}/></div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Current Skills</label><input className="input-dark" placeholder="Go, Kubernetes, React..." value={skills} onChange={e=>setSkills(e.target.value)}/></div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Years Exp</label><input className="input-dark" type="number" min="0" max="30" value={years} onChange={e=>setYears(e.target.value)}/></div>
        </div>
        <button className="btn-primary" onClick={analyse} disabled={loading||!role} style={{ justifyContent:'center', padding:'12px 28px' }}>
          {loading?<><RefreshCw size={13}/> Analysing...</>:<><Target size={13}/> Analyse My Gaps</>}
        </button>
      </div>

      {r && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ display:'flex', gap:20, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:52, fontWeight:800, color:(r.matchScore||0)>=70?'#00e5b3':(r.matchScore||0)>=50?'#fbbf24':'#f87171' }}>{r.matchScore}%</div>
              <div style={{ fontSize:12, color:'#7a8599' }}>Match Score</div>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, lineHeight:1.7, marginBottom:8 }}>{r.verdict}</p>
              <div style={{ fontSize:13, color:'#4f8eff', fontWeight:600 }}>⏱ Time to ready: {r.estimatedTimeToReady}</div>
            </div>
          </div>

          {[{l:'🔴 Critical Gaps',key:'criticalGaps',c:'#f87171'},{l:'🟡 High Priority',key:'highGaps',c:'#fbbf24'},{l:'🟢 Nice to Have',key:'niceToHave',c:'#7a8599'},{l:'✅ You Have These',key:'alreadyHave',c:'#00e5b3'}].map(({l,key,c})=>r[key] && (r[key] as string[]).length>0 && (
            <div key={key} className="card">
              <div className="label-sm" style={{ color:c, marginBottom:10 }}>{l}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {(r[key] as string[]).map((s:string)=><span key={s} style={{ padding:'4px 12px', borderRadius:20, background:`${c}15`, border:`1px solid ${c}30`, color:c, fontSize:12 }}>{s}</span>)}
              </div>
            </div>
          ))}

          {r.ninetyDayRoadmap?.length>0 && (
            <div className="card">
              <div className="label-sm" style={{ marginBottom:14 }}>📅 90-DAY ROADMAP</div>
              {r.ninetyDayRoadmap.map((phase,i)=>(
                <div key={i} style={{ paddingLeft:18, borderLeft:'2px solid rgba(79,142,255,0.3)', marginBottom:16, position:'relative' }}>
                  <div style={{ position:'absolute', left:-5, top:4, width:8, height:8, borderRadius:'50%', background:'#4f8eff' }}/>
                  <div style={{ fontSize:12, fontWeight:700, color:'#4f8eff', marginBottom:3 }}>Week {phase.week}</div>
                  <div style={{ fontSize:13, color:'white', marginBottom:3 }}>{phase.focus}</div>
                  <div style={{ fontSize:12, color:'#00e5b3' }}>🎯 {phase.deliverable}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GapAnalysis() {
  return (
    <PaywallGate feature="gap_analysis">
      <GapAnalysisInner />
    </PaywallGate>
  )
}
