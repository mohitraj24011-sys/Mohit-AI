'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { Mail, Copy, Check, RefreshCw } from 'lucide-react'

const TONES = [{id:'professional',l:'Professional'},{id:'enthusiastic',l:'Enthusiastic'},{id:'concise',l:'Concise'},{id:'story',l:'Story-Driven'}]

function CoverLetterInner() {
  const [resume, setResume]   = useState('')
  const [jd, setJd]           = useState('')
  const [tone, setTone]       = useState('professional')
  const [company, setCompany] = useState('')
  const [role, setRole]       = useState('')
  const [letter, setLetter]   = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cover-letter', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ resume, jobDesc: jd, tone, company, role }) })
      const d = await res.json()
      setLetter(d.letter||'')
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const copy = () => { navigator.clipboard.writeText(letter); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Cover Letter Generator</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>4 tone modes. Tailored to job + company. No clichés. Never generic.</p>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {TONES.map(t=>(
          <button key={t.id} onClick={()=>setTone(t.id)} style={{ padding:'7px 16px', borderRadius:8, border:`1px solid ${tone===t.id?'#4f8eff':'rgba(255,255,255,0.08)'}`, background:tone===t.id?'rgba(79,142,255,0.15)':'transparent', color:tone===t.id?'#4f8eff':'#7a8599', cursor:'pointer', fontSize:13 }}>{t.l}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Company</label><input className="input-dark" placeholder="Razorpay" value={company} onChange={e=>setCompany(e.target.value)}/></div>
            <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Role</label><input className="input-dark" placeholder="Senior Backend Engineer" value={role} onChange={e=>setRole(e.target.value)}/></div>
          </div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Your Resume</label><textarea className="input-dark" style={{ height:180 }} placeholder="Paste your resume..." value={resume} onChange={e=>setResume(e.target.value)}/></div>
          <div><label className="label-sm" style={{ display:'block', marginBottom:5 }}>Job Description</label><textarea className="input-dark" style={{ height:140 }} placeholder="Paste job description..." value={jd} onChange={e=>setJd(e.target.value)}/></div>
          <button className="btn-primary" onClick={generate} disabled={loading||!resume||!jd} style={{ justifyContent:'center', padding:'12px' }}>
            {loading?<><RefreshCw size={13}/> Generating...</>:<><Mail size={13}/> Generate Cover Letter</>}
          </button>
        </div>
        <div>
          {letter ? (
            <div className="card" style={{ height:'100%' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <div className="label-sm" style={{ color:'#00e5b3' }}>COVER LETTER</div>
                <button onClick={copy} className="btn-ghost" style={{ padding:'4px 10px', fontSize:11 }}>
                  {copied?<><Check size={11}/> Copied</>:<><Copy size={11}/> Copy</>}
                </button>
              </div>
              <div style={{ fontSize:14, lineHeight:1.9, color:'var(--text)', whiteSpace:'pre-wrap' }}>{letter}</div>
            </div>
          ) : (
            <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, minHeight:400 }}>
              <Mail size={36} color="#3d4a5c"/>
              <p style={{ color:'#7a8599', fontSize:14, textAlign:'center' }}>Fill in your details and generate a tailored cover letter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoverLetter() {
  return (
    <PaywallGate feature="cover_letter">
      <CoverLetterInner />
    </PaywallGate>
  )
}
