'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { calculateATS } from '@/lib/ats'
import { FileText, Target, Zap, Copy, Check } from 'lucide-react'

function ResumeInner() {
  const [experience, setExperience] = useState('')
  const [jd, setJd]                 = useState('')
  const [result, setResult]         = useState<Record<string,unknown>|null>(null)
  const [ats, setAts]               = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]       = useState(false)
  const [tab, setTab]               = useState<'builder'|'ats'>('builder')
  const [resumeText, setResumeText] = useState('')
  const [copied, setCopied]         = useState(false)

  const build = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/resume', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ experience, jobDescription: jd }) })
      setResult(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const checkAts = () => {
    if (!resumeText || !jd) return
    setAts(calculateATS(resumeText, jd) as unknown as Record<string,unknown>)
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const r = result as {bullets?:string[];summary?:string;keySkills?:string[];improvementTips?:string[]}|null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>AI Resume Builder</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>ATS-optimised bullets + 5-dimension scoring. Know exactly why you get screened out.</p>

      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#0f1420', padding:4, borderRadius:10, width:'fit-content' }}>
        {[{k:'builder',l:'📝 Resume Builder'},{k:'ats',l:'🎯 ATS Checker'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as typeof tab)}
            style={{ padding:'7px 16px', borderRadius:7, border:'none', background:tab===t.k?'#141d2e':'transparent', color:tab===t.k?'white':'#7a8599', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==='builder' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:6 }}>Your Experience</label>
              <textarea className="input-dark" style={{ height:200 }} placeholder="Paste your work experience, projects, skills..." value={experience} onChange={e=>setExperience(e.target.value)} />
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:6 }}>Target Job Description</label>
              <textarea className="input-dark" style={{ height:150 }} placeholder="Paste the job description..." value={jd} onChange={e=>setJd(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={build} disabled={loading||!experience||!jd} style={{ justifyContent:'center', padding:'12px' }}>
              {loading?'Building...':'Build ATS-Optimised Resume'}
            </button>
          </div>
          <div>
            {r ? (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {r.bullets?.length && (
                  <div className="card">
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                      <div className="label-sm" style={{ color:'#4f8eff' }}>GENERATED BULLETS</div>
                      <button onClick={()=>copy((r.bullets||[]).join('\n'))} className="btn-ghost" style={{ padding:'3px 8px', fontSize:11 }}>
                        {copied?<><Check size={10}/> Copied</>:<><Copy size={10}/> Copy All</>}
                      </button>
                    </div>
                    {r.bullets.map((b:string,i:number)=>(
                      <div key={i} style={{ fontSize:13, lineHeight:1.7, marginBottom:8, paddingLeft:8, borderLeft:'2px solid rgba(79,142,255,0.3)' }}>{b}</div>
                    ))}
                  </div>
                )}
                {r.summary && (
                  <div className="card">
                    <div className="label-sm" style={{ marginBottom:8 }}>PROFESSIONAL SUMMARY</div>
                    <p style={{ fontSize:13, lineHeight:1.7 }}>{r.summary}</p>
                  </div>
                )}
                {r.keySkills?.length && (
                  <div className="card">
                    <div className="label-sm" style={{ marginBottom:8 }}>KEY SKILLS</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {r.keySkills.map((s:string)=><span key={s} className="badge badge-blue" style={{ fontSize:12 }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, minHeight:300 }}>
                <FileText size={36} color="#3d4a5c"/>
                <p style={{ color:'#7a8599', fontSize:14, textAlign:'center' }}>Fill in your experience and target job to generate ATS-optimised bullets</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='ats' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:6 }}>Your Resume Text</label>
              <textarea className="input-dark" style={{ height:220 }} placeholder="Paste your full resume text..." value={resumeText} onChange={e=>setResumeText(e.target.value)} />
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:6 }}>Job Description</label>
              <textarea className="input-dark" style={{ height:150 }} placeholder="Paste the job description..." value={jd} onChange={e=>setJd(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={checkAts} disabled={!resumeText||!jd} style={{ justifyContent:'center', padding:'12px' }}>
              <Target size={14}/> Check ATS Score
            </button>
          </div>
          <div>
            {ats ? (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="card" style={{ textAlign:'center', borderColor:`rgba(${(ats.score as number)>=70?'0,229,179':'248,113,113'},0.3)` }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:64, fontWeight:800, color:(ats.score as number)>=70?'#00e5b3':(ats.score as number)>=55?'#fbbf24':'#f87171' }}>{String(ats.score)}</div>
                  <div style={{ fontSize:13, color:'#7a8599' }}>ATS Score (target: 70+)</div>
                </div>
                <div className="card">
                  <div className="label-sm" style={{ marginBottom:10 }}>SCORE BREAKDOWN</div>
                  {Object.entries(ats.breakdown as Record<string,number>).map(([k,v])=>(
                    <div key={k} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span style={{ color:'#7a8599', textTransform:'capitalize' }}>{k}</span>
                        <span style={{ fontWeight:700, color:(v as number)/(k==='keywords'?30:k==='length'||k==='verbs'?20:15)*100>=70?'#00e5b3':'#fbbf24' }}>{String(v)}</span>
                      </div>
                      <div style={{ height:5, background:'#0f1420', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${Math.min(100,(v as number)/(k==='keywords'?30:k==='length'||k==='verbs'?20:15)*100)}%`, background:'#4f8eff', borderRadius:3 }}/>
                      </div>
                    </div>
                  ))}
                </div>
                {(ats.missingKeywords as string[])?.length>0 && (
                  <div className="card">
                    <div className="label-sm" style={{ color:'#f87171', marginBottom:8 }}>MISSING KEYWORDS</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {(ats.missingKeywords as string[]).slice(0,12).map((k:string)=><span key={k} className="badge badge-red" style={{ fontSize:11 }}>{k}</span>)}
                    </div>
                  </div>
                )}
                {(ats.suggestions as string[])?.length>0 && (
                  <div className="card">
                    <div className="label-sm" style={{ marginBottom:8 }}>SUGGESTIONS</div>
                    {(ats.suggestions as string[]).map((s:string,i:number)=>(
                      <div key={i} style={{ fontSize:13, color:'#7a8599', marginBottom:6 }}>→ {s}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, minHeight:300 }}>
                <Target size={36} color="#3d4a5c"/>
                <p style={{ color:'#7a8599', fontSize:14, textAlign:'center' }}>Paste your resume and a job description to see your ATS score</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Resume() {
  return (
    <PaywallGate feature="resume">
      <ResumeInner />
    </PaywallGate>
  )
}
