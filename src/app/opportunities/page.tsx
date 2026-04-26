'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { JOB_PLATFORMS } from '@/lib/platforms'
import { Search, ExternalLink, Zap, Globe, RefreshCw } from 'lucide-react'

const TYPE_COLORS: Record<string,string> = { general:'#4f8eff', startup:'#00e5b3', remote:'#a78bfa', tech_specific:'#f97316', executive:'#fbbf24', community:'#f87171' }
const TIERS = ['fresher','junior','mid','senior','staff','manager','senior_manager','director','vp','c_suite']

function OpportunitiesInner() {
  const [targetRole, setTargetRole] = useState('')
  const [skills, setSkills]         = useState('')
  const [tier, setTier]             = useState('mid')
  const [location, setLocation]     = useState('India')
  const [data, setData]             = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]       = useState(false)
  const [filter, setFilter]         = useState('all')

  const scan = async () => {
    if (!targetRole) return
    setLoading(true)
    try {
      const res = await fetch('/api/opportunity-scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: skills.split(',').map(s=>s.trim()).filter(Boolean), targetRoles: [targetRole], tier, location, experienceYears: 4 })
      })
      setData(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const urls = (data?.searchUrls as {platform:string;logo:string;type:string;searchUrl:string;relevanceScore:number;alternativeUrls:string[]}[]) || []
  const filtered = urls.filter((p) => filter==='all' || JOB_PLATFORMS.find(pl=>pl.name===p.platform)?.type===filter)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8 }}>Opportunity Radar</h1>
      <p style={{ color: '#7a8599', marginBottom: 28 }}>Search {JOB_PLATFORMS.length}+ platforms simultaneously. Find every hidden opportunity.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 160px', gap: 12, marginBottom: 14 }}>
          {[{l:'Target Role',v:targetRole,s:setTargetRole,p:'Senior Backend Engineer'},{l:'Key Skills',v:skills,s:setSkills,p:'Go, Kubernetes...'},{l:'Location',v:location,s:setLocation,p:'Remote / Bangalore'}].map(({l,v,s,p})=>(
            <div key={l}>
              <label className="label-sm" style={{ display:'block', marginBottom:5 }}>{l}</label>
              <input className="input-dark" placeholder={p} value={v} onChange={e=>s(e.target.value)} />
            </div>
          ))}
          <div>
            <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Your Level</label>
            <select className="input-dark" value={tier} onChange={e=>setTier(e.target.value)}>
              {TIERS.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" onClick={scan} disabled={loading||!targetRole} style={{ justifyContent:'center', padding:'12px 28px' }}>
          {loading?<><RefreshCw size={14}/> Scanning {JOB_PLATFORMS.length} platforms...</>:<><Globe size={14}/> Scan All Platforms</>}
        </button>
      </div>

      {data && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div className="card">
              <div className="label-sm" style={{ color:'#4f8eff', marginBottom:10 }}>🔍 OPTIMISED QUERY</div>
              <code style={{ fontSize:14, color:'#00e5b3', fontFamily:'JetBrains Mono,monospace', display:'block', marginBottom:8 }}>{String(data.primaryQuery||'')} </code>
              {(data.alternativeQueries as string[]||[]).map((q:string,i:number)=>(
                <div key={i} style={{ fontSize:12, color:'#7a8599', marginBottom:4 }}>→ {q}</div>
              ))}
            </div>
            <div className="card">
              <div className="label-sm" style={{ color:'#f97316', marginBottom:10 }}>💎 HIDDEN SOURCES</div>
              {(data.hiddenOpportunities as {type:string;description:string;action:string;url?:string}[]||[]).map((h,i)=>(
                <div key={i} style={{ marginBottom:10, paddingBottom:10, borderBottom:i<((data.hiddenOpportunities as unknown[]).length)-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                  <div style={{ fontSize:12, color:'white', fontWeight:600, marginBottom:3 }}>{h.type}</div>
                  <div style={{ fontSize:12, color:'#7a8599', marginBottom:3 }}>{h.description}</div>
                  <div style={{ fontSize:11, color:'#f97316' }}>→ {h.action}</div>
                  {h.url&&<a href={h.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#4f8eff', display:'block', marginTop:3 }}>Open →</a>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
            {['all','general','startup','remote','tech_specific','community','executive'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${filter===f?TYPE_COLORS[f]||'#4f8eff':'rgba(255,255,255,0.06)'}`, background:filter===f?`${TYPE_COLORS[f]||'#4f8eff'}18`:'transparent', color:filter===f?TYPE_COLORS[f]||'#4f8eff':'#7a8599', cursor:'pointer', fontSize:12, textTransform:'capitalize' }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {filtered.map((p,i)=>{
              const pd = JOB_PLATFORMS.find(pl=>pl.name===p.platform)
              const tc = TYPE_COLORS[pd?.type||'general']
              return (
                <div key={i} className="card" style={{ borderLeft:`3px solid ${tc}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <span style={{ fontSize:20 }}>{p.logo}</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'white' }}>{p.platform}</div>
                        <span style={{ fontSize:10, color:tc, textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace' }}>{pd?.type}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:p.relevanceScore>=90?'#00e5b3':p.relevanceScore>=70?'#fbbf24':'#7a8599' }}>{p.relevanceScore}%</div>
                  </div>
                  <a href={p.searchUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display:'flex', justifyContent:'center', padding:'9px', textDecoration:'none', fontSize:12 }}>
                    <Search size={12}/> Search <ExternalLink size={11}/>
                  </a>
                  {p.alternativeUrls?.slice(0,1).map((url:string,j:number)=>(
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ display:'flex', justifyContent:'center', marginTop:6, padding:'7px', textDecoration:'none', fontSize:11 }}>
                      Alt Search <ExternalLink size={10}/>
                    </a>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {!data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
          {JOB_PLATFORMS.map(p=>(
            <div key={p.id} className="card-sm" style={{ borderLeft:`2px solid ${TYPE_COLORS[p.type]}40` }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                <span>{p.logo}</span><span style={{ fontWeight:600, fontSize:13 }}>{p.name}</span>
              </div>
              <span style={{ fontSize:10, color:TYPE_COLORS[p.type], textTransform:'uppercase' }}>{p.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Opportunities() {
  return (
    <PaywallGate feature="opportunity_scan">
      <OpportunitiesInner />
    </PaywallGate>
  )
}
