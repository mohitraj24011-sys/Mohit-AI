'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { TrendingUp, RefreshCw, ChevronRight } from 'lucide-react'

const PLATFORMS = [
  {id:'linkedin',name:'LinkedIn',logo:'💼',why:"#1 platform — 90% of recruiters search here first"},
  {id:'naukri',name:'Naukri',logo:'🎯',why:"India's largest job board — recruiters download profiles daily"},
  {id:'github',name:'GitHub',logo:'🐙',why:"Technical proof — engineers get hired based on GitHub alone"},
  {id:'portfolio',name:'Portfolio',logo:'🌐',why:"Senior engineers are expected to have one"},
  {id:'indeed',name:'Indeed',logo:'🔵',why:"High volume — recruiters use for bulk screening"},
  {id:'glassdoor',name:'Glassdoor',logo:'🪟',why:"Reviews + salary data influence recruiter decisions"},
]

function ProfileOptimizerInner() {
  const [platform, setPlatform] = useState('linkedin')
  const [currentTitle, setCurrentTitle] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [tier, setTier] = useState('mid')
  const [skills, setSkills] = useState('')
  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [result, setResult] = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)

  const optimize = async () => {
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/profile-optimizer', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ platform, profileData: { headline, about, currentTitle }, targetRole, tier, skills: skills.split(',').map(s=>s.trim()) })
      })
      setResult(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const r = result as {overallScore?:number;grade?:string;criticalIssues?:{issue:string;fix:string;impact:string;before?:string;after?:string}[];keywordsMissing?:string[];headlineSuggestion?:string;aboutSuggestion?:string;quickWins?:string[];estimatedSearchAppearanceIncrease?:string}|null

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Profile Optimizer</h1>
      <p style={{ color:'#7a8599', marginBottom:28 }}>LinkedIn, Naukri, GitHub, Indeed — AI scores every platform and gives exact rewrites</p>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
        {PLATFORMS.map(p=>(
          <button key={p.id} onClick={()=>setPlatform(p.id)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`1px solid ${platform===p.id?'#4f8eff':'rgba(255,255,255,0.08)'}`, background:platform===p.id?'rgba(79,142,255,0.12)':'#141d2e', cursor:'pointer', fontSize:13, color:platform===p.id?'#4f8eff':'#7a8599' }}>
            <span style={{ fontSize:18 }}>{p.logo}</span>{p.name}
          </button>
        ))}
      </div>
      <div style={{ fontSize:13, color:'#7a8599', marginBottom:20, padding:'8px 14px', background:'rgba(79,142,255,0.06)', borderRadius:8 }}>
        💡 {PLATFORMS.find(p=>p.id===platform)?.why}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <div className="label-sm" style={{ marginBottom:12 }}>PROFILE DETAILS</div>
            {[{l:'Current Title',v:currentTitle,s:setCurrentTitle,p:'Senior SDE at Infosys'},{l:'Target Role',v:targetRole,s:setTargetRole,p:'Senior Backend Engineer at Razorpay'},{l:'Skills (comma sep)',v:skills,s:setSkills,p:'Go, Kubernetes, PostgreSQL'}].map(f=>(
              <div key={f.l} style={{ marginBottom:12 }}>
                <label className="label-sm" style={{ display:'block', marginBottom:5 }}>{f.l}</label>
                <input className="input-dark" placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)}/>
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Current {platform.charAt(0).toUpperCase()+platform.slice(1)} Headline</label>
              <input className="input-dark" placeholder="Software Engineer at Company" value={headline} onChange={e=>setHeadline(e.target.value)}/>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Current About Section</label>
              <textarea className="input-dark" style={{ height:100 }} placeholder="Paste your current about section..." value={about} onChange={e=>setAbout(e.target.value)}/>
            </div>
          </div>
          <div className="card-sm">
            <label className="label-sm" style={{ display:'block', marginBottom:8 }}>YOUR LEVEL</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['fresher','junior','mid','senior','staff','manager','director','vp'].map(t=>(
                <button key={t} onClick={()=>setTier(t)} style={{ padding:'4px 9px', borderRadius:6, border:`1px solid ${tier===t?'#4f8eff':'rgba(255,255,255,0.08)'}`, background:tier===t?'rgba(79,142,255,0.15)':'transparent', color:tier===t?'#4f8eff':'#7a8599', cursor:'pointer', fontSize:11 }}>{t}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={optimize} disabled={loading||!targetRole} style={{ justifyContent:'center', padding:'12px' }}>
            {loading?<><RefreshCw size={13}/> Analysing...</>:<><TrendingUp size={13}/> Optimise {platform.charAt(0).toUpperCase()+platform.slice(1)} Profile</>}
          </button>
        </div>

        <div>
          {r ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ display:'flex', gap:20, alignItems:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:52, fontWeight:800, color:(r.overallScore||0)>=80?'#00e5b3':(r.overallScore||0)>=60?'#fbbf24':'#f87171' }}>{r.overallScore}</div>
                  <div style={{ fontSize:12, color:'#7a8599' }}>Score</div>
                </div>
                <div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color:'white' }}>{r.grade}</div>
                  <div style={{ fontSize:12, color:'#7a8599' }}>Grade</div>
                </div>
                {r.estimatedSearchAppearanceIncrease && <div style={{ flex:1, fontSize:13, color:'#00e5b3', background:'rgba(0,229,179,0.08)', padding:'8px 12px', borderRadius:8 }}>📈 {r.estimatedSearchAppearanceIncrease}</div>}
              </div>
              {r.criticalIssues?.length>0 && (
                <div className="card">
                  <div className="label-sm" style={{ color:'#f87171', marginBottom:10 }}>🔧 CRITICAL FIXES</div>
                  {r.criticalIssues.map((issue,i)=>(
                    <div key={i} style={{ marginBottom:12, padding:'10px 14px', background:'#0f1420', borderRadius:10, borderLeft:'3px solid #f87171' }}>
                      <div style={{ fontWeight:600, color:'white', fontSize:13, marginBottom:3 }}>📌 {issue.issue}</div>
                      <div style={{ fontSize:12, color:'#f87171', marginBottom:3 }}>Problem: {issue.issue}</div>
                      <div style={{ fontSize:12, color:'#00e5b3' }}>Fix: {issue.fix}</div>
                      <span className="badge badge-red" style={{ marginTop:6, fontSize:9 }}>{issue.impact} Impact</span>
                    </div>
                  ))}
                </div>
              )}
              {r.keywordsMissing?.length>0 && (
                <div className="card">
                  <div className="label-sm" style={{ marginBottom:8 }}>🔍 MISSING KEYWORDS</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {r.keywordsMissing.map((k:string)=><span key={k} className="badge badge-amber" style={{ fontSize:11 }}>{k}</span>)}
                  </div>
                </div>
              )}
              {r.headlineSuggestion && (
                <div className="card">
                  <div className="label-sm" style={{ marginBottom:8 }}>✏️ HEADLINE SUGGESTION</div>
                  <div style={{ background:'rgba(0,229,179,0.06)', border:'1px solid rgba(0,229,179,0.2)', borderRadius:8, padding:'10px 14px', fontSize:14, color:'white', lineHeight:1.6 }}>{r.headlineSuggestion}</div>
                </div>
              )}
              {r.quickWins?.length>0 && (
                <div className="card">
                  <div className="label-sm" style={{ color:'#4f8eff', marginBottom:10 }}>⚡ QUICK WINS (5 min each)</div>
                  {r.quickWins.map((w:string,i:number)=>(
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13 }}>
                      <ChevronRight size={12} color="#4f8eff" style={{ flexShrink:0, marginTop:2 }}/>{w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, minHeight:400 }}>
              <TrendingUp size={36} color="#3d4a5c"/>
              <p style={{ color:'#7a8599', fontSize:14, textAlign:'center', maxWidth:260 }}>Select a platform, fill in your current profile details, and get specific AI-powered fixes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfileOptimizer() {
  return (
    <PaywallGate feature="profile_optimizer">
      <ProfileOptimizerInner />
    </PaywallGate>
  )
}
