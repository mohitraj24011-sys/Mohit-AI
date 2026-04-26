'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { LEARNING_RESOURCES, HANDS_ON_PROJECTS } from '@/lib/learning-resources'
import { BookOpen, ExternalLink, Play, RefreshCw, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const SKILLS = Object.keys(LEARNING_RESOURCES)
const PLATFORM_ICONS: Record<string,string> = { udemy:'🟣', youtube:'🔴', coursera:'🔵', freecodecamp:'🟢', github:'⚫', docs:'📘', project:'🛠️' }
const LEVEL_COLORS: Record<string,string> = { beginner:'#00e5b3', intermediate:'#fbbf24', advanced:'#f87171' }

function LearningInner() {
  const [skill, setSkill]     = useState('React')
  const [targetRole, setTargetRole] = useState('')
  const [hours, setHours]     = useState('10')
  const [free, setFree]       = useState(false)
  const [plan, setPlan]       = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState<'courses'|'projects'|'plan'>('courses')
  const [saved, setSaved]     = useState<Set<string>>(new Set())

  const generate = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/learning', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ skill, currentLevel:'beginner', targetRole, weeklyHours: parseInt(hours), preferFree: free }) })
      setPlan(await res.json()); setTab('plan')
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const saveItem = async (r: {title:string;url:string;platform:string}) => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { alert('Log in to track'); return }
    await supabase.from('learning').insert({ user_id: session.user.id, skill, resource_title: r.title, resource_url: r.url, resource_type: r.platform, status: 'not_started' })
    setSaved(new Set([...saved, r.url]))
  }

  const resources = (free ? LEARNING_RESOURCES[skill]?.filter(r=>r.free) : LEARNING_RESOURCES[skill]) || []
  const projects  = Object.values(HANDS_ON_PROJECTS).flat().filter(p => p.skills.some(s=>s.toLowerCase().includes(skill.toLowerCase())))
  const p = plan as {weeklyPlan?:{week:number;focus:string;resources:{title:string;url:string;platform:string;hours:number}[];practiceTask:string;milestone:string}[];totalWeeks?:number;totalHours?:number;primaryResource?:{title:string;url:string;why:string};interviewQuestions?:string[];portfolioTip?:string;linkedinPostIdea?:string}|null

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Learning Engine</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>Curated Udemy, YouTube, hands-on projects for every skill gap</p>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {SKILLS.map(s=>(
          <button key={s} onClick={()=>setSkill(s)}
            style={{ padding:'6px 13px', borderRadius:8, border:`1px solid ${skill===s?'#4f8eff':'rgba(255,255,255,0.08)'}`, background:skill===s?'rgba(79,142,255,0.15)':'transparent', color:skill===s?'#4f8eff':'#7a8599', cursor:'pointer', fontSize:12 }}>
            {s}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 140px auto', gap:12, alignItems:'flex-end' }}>
          <div>
            <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Target Role</label>
            <input className="input-dark" placeholder="Senior Backend Engineer" value={targetRole} onChange={e=>setTargetRole(e.target.value)}/>
          </div>
          <div>
            <label className="label-sm" style={{ display:'block', marginBottom:5 }}>Hrs/Week</label>
            <input className="input-dark" type="number" min="2" max="40" value={hours} onChange={e=>setHours(e.target.value)}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:2 }}>
            <button onClick={()=>setFree(!free)} style={{ width:38,height:22,borderRadius:11,border:'none',background:free?'#00e5b3':'#141d2e',cursor:'pointer',position:'relative',transition:'all 0.2s' }}>
              <div style={{ width:16,height:16,borderRadius:8,background:'white',position:'absolute',top:3,left:free?19:3,transition:'left 0.2s' }}/>
            </button>
            <span style={{ fontSize:12, color:'#7a8599' }}>Free only</span>
          </div>
          <button className="btn-primary" onClick={generate} disabled={loading||!targetRole} style={{ whiteSpace:'nowrap' }}>
            {loading?<RefreshCw size={13}/>:<BookOpen size={13}/>} {loading?'Generating...':'Generate Plan'}
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#0f1420', padding:4, borderRadius:10, width:'fit-content' }}>
        {[{k:'courses',l:`📚 Courses (${resources.length})`},{k:'projects',l:`🛠️ Projects (${projects.length})`},{k:'plan',l:'📋 My Plan'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as typeof tab)}
            style={{ padding:'7px 14px', borderRadius:7, border:'none', background:tab===t.k?'#141d2e':'transparent', color:tab===t.k?'white':'#7a8599', cursor:'pointer', fontSize:12 }}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==='courses' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {resources.map((r,i)=>(
            <div key={i} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:20 }}>{PLATFORM_ICONS[r.platform]||'📘'}</span>
                  <div>
                    <span style={{ fontSize:10, color:'#7a8599', textTransform:'uppercase' }}>{r.platform}</span>
                    {r.free?<span className="badge badge-green" style={{ marginLeft:6, fontSize:9 }}>FREE</span>:<span className="badge badge-amber" style={{ marginLeft:6, fontSize:9 }}>PAID</span>}
                  </div>
                </div>
                <span style={{ fontSize:11, color:LEVEL_COLORS[r.level], fontFamily:'JetBrains Mono,monospace', textTransform:'uppercase' }}>{r.level}</span>
              </div>
              <h3 style={{ fontWeight:700, fontSize:14, color:'white', marginBottom:8, lineHeight:1.4 }}>{r.title}</h3>
              <div style={{ fontSize:12, color:'#7a8599', marginBottom:14 }}>{r.durationHours}h{r.rating?` · ⭐ ${r.rating}`:''}</div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ flex:1, justifyContent:'center', textDecoration:'none', fontSize:12, padding:'9px' }}>
                  <Play size={11}/> Open <ExternalLink size={10}/>
                </a>
                <button onClick={()=>saveItem(r)} className="btn-ghost" style={{ padding:'9px 12px', fontSize:12 }}>
                  {saved.has(r.url)?<CheckCircle size={13} color="#00e5b3"/>:'+ Track'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='projects' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {projects.map((pr,i)=>(
            <div key={i} className="card" style={{ borderLeft:`3px solid ${pr.difficulty==='Hard'?'#f87171':pr.difficulty==='Medium'?'#fbbf24':'#00e5b3'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <h3 style={{ fontWeight:700, fontSize:14, color:'white' }}>{pr.title}</h3>
                <span style={{ fontSize:10, color:pr.difficulty==='Hard'?'#f87171':pr.difficulty==='Medium'?'#fbbf24':'#00e5b3', textTransform:'uppercase' }}>{pr.difficulty}</span>
              </div>
              <p style={{ fontSize:13, color:'#7a8599', marginBottom:12, lineHeight:1.6 }}>{pr.description}</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {pr.skills.map(s=><span key={s} className="badge badge-blue" style={{ fontSize:10 }}>{s}</span>)}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'#7a8599' }}>~{pr.estimatedHours}h</span>
                <a href={pr.link} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ textDecoration:'none', padding:'6px 12px', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                  Start Project <ExternalLink size={11}/>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='plan' && p?.weeklyPlan ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ display:'flex', gap:24 }}>
            <div style={{ textAlign:'center' }}><div style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color:'#4f8eff' }}>{p.totalWeeks}</div><div style={{ fontSize:11, color:'#7a8599' }}>weeks</div></div>
            <div style={{ textAlign:'center' }}><div style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color:'#00e5b3' }}>{p.totalHours}</div><div style={{ fontSize:11, color:'#7a8599' }}>total hours</div></div>
            {p.primaryResource && (
              <div>
                <div style={{ fontSize:11, color:'#7a8599', marginBottom:4 }}>Primary Resource</div>
                <a href={p.primaryResource.url} target="_blank" rel="noopener noreferrer" style={{ color:'#4f8eff', fontSize:14, fontWeight:600, textDecoration:'none' }}>{p.primaryResource.title}</a>
                <p style={{ fontSize:12, color:'#7a8599', marginTop:4 }}>{p.primaryResource.why}</p>
              </div>
            )}
          </div>
          {p.weeklyPlan.map((w,i)=>(
            <div key={i} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#4f8eff' }}>Week {w.week}: {w.focus}</div>
                <span style={{ fontSize:11, color:'#7a8599', background:'#0f1420', padding:'2px 8px', borderRadius:6 }}>🎯 {w.milestone}</span>
              </div>
              {w.resources.map((r,j)=>(
                <div key={j} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8, padding:'8px 12px', background:'#0f1420', borderRadius:8 }}>
                  <span>{PLATFORM_ICONS[r.platform]||'📘'}</span>
                  <div style={{ flex:1 }}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color:'white', fontSize:13, fontWeight:500, textDecoration:'none' }}>{r.title}</a>
                    <div style={{ fontSize:11, color:'#7a8599' }}>{r.hours}h</div>
                  </div>
                  <ExternalLink size={11} color="#3d4a5c"/>
                </div>
              ))}
              <div style={{ fontSize:12, color:'#f97316', marginTop:8 }}>🛠️ Practice: {w.practiceTask}</div>
            </div>
          ))}
        </div>
      ) : tab==='plan' && (
        <div className="card" style={{ textAlign:'center', padding:'60px', color:'#7a8599' }}>
          <BookOpen size={40} color="#3d4a5c" style={{ margin:'0 auto 16px' }}/>
          <p>Enter a target role and click Generate Plan for a personalised week-by-week learning plan</p>
        </div>
      )}
    </div>
  )
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  })
}

export default function Learning() {
  return (
    <PaywallGate feature="learning">
      <LearningInner />
    </PaywallGate>
  )
}
