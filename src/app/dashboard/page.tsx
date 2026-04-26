'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts'
import OnboardingFlow from '@/components/OnboardingFlow'
import { Zap, Target, Users, FileText, TrendingUp, Award, ArrowRight } from 'lucide-react'

const TT = { background:'#111827', border:'1px solid rgba(99,130,255,0.15)', borderRadius:8, color:'#e2e8f4', fontSize:11 }
const STATUS_COLORS: Record<string,string> = { wishlist:'#6b7a99', applied:'#3b82f6', screen:'#8b5cf6', interview:'#f59e0b', final:'#f97316', offer:'#10b981', rejected:'#ef4444', ghosted:'#2d3b52' }

export default function Dashboard() {
  const [jobs, setJobs]       = useState<Record<string,unknown>[]>([])
  const [network, setNetwork] = useState<Record<string,unknown>[]>([])
  const [resumes, setResumes] = useState<{ats_score:number;created_at:string}[]>([])
  const [onboardStep, setOnboardStep] = useState(1)
  const [plan, setPlan]       = useState('free')
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isWelcome, setIsWelcome] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') setIsWelcome(window.location.search.includes('welcome=true'))
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const tok = session.access_token
      const [j,n,r,p,prof] = await Promise.all([
        supabase.from('jobs').select('*').eq('user_id', session.user.id),
        supabase.from('network').select('*').eq('user_id', session.user.id),
        supabase.from('resumes').select('ats_score,created_at').eq('user_id', session.user.id).order('created_at'),
        fetch('/api/usage', { headers: { Authorization: `Bearer ${tok}` } }).then(r=>r.json()),
        supabase.from('profiles').select('onboarding_step').eq('id', session.user.id).single(),
      ])
      setJobs(j.data||[])
      setNetwork(n.data||[])
      setResumes(r.data||[])
      setPlan(p.plan||'free')
      setCredits(p.credits||0)
      setOnboardStep(prof.data?.onboarding_step||1)
      setLoading(false)
    }
    load()
  }, [])

  const applied    = jobs.filter(j=>j.status!=='wishlist').length
  const interviews = jobs.filter(j=>['interview','final','offer'].includes(String(j.status))).length
  const offers     = jobs.filter(j=>j.status==='offer').length
  const avgAts     = resumes.length>0 ? Math.round(resumes.reduce((a,r)=>a+(r.ats_score||0),0)/resumes.length) : 0
  const convRate   = applied>0 ? Math.round((interviews/applied)*100) : 0

  const statusData = ['applied','screen','interview','final','offer','rejected'].map(s=>({
    name: s, count: jobs.filter(j=>j.status===s).length, fill: STATUS_COLORS[s]
  }))
  const atsData = resumes.map((r,i)=>({ name:`#${i+1}`, score: r.ats_score||0 }))

  const QUICK_ACTIONS = [
    { l:'Build Resume', href:'/resume', c:'#3b82f6', icon:FileText },
    { l:'Scan Opportunities', href:'/opportunities', c:'#f97316', icon:Target },
    { l:'LinkedIn AI', href:'/linkedin-extender', c:'#8b5cf6', icon:Zap },
    { l:'Interview Prep', href:'/interview-prep', c:'#f59e0b', icon:Zap },
    { l:'Learning Engine', href:'/learning', c:'#34d399', icon:TrendingUp },
    { l:'Role Strategy', href:'/role-advisor', c:'#10b981', icon:Target },
    { l:'Funnel Analytics', href:'/funnel', c:'#6b7a99', icon:TrendingUp },
    { l:'Auto-Apply', href:'/auto-apply', c:'#ef4444', icon:Zap },
  ]

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'36px 20px' }}>
      {isWelcome && (
        <div style={{ marginBottom:20, padding:'16px 20px', background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(16,185,129,0.08))', border:'1px solid rgba(59,130,246,0.2)', borderRadius:12, display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:28 }}>🎉</span>
          <div>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:16, color:'white', marginBottom:4 }}>Welcome to MohitJob AI!</div>
            <div style={{ fontSize:13, color:'#6b7a99' }}>Your profile is set. Follow the steps below to get your first offer.</div>
          </div>
        </div>
      )}

      {onboardStep < 5 && <OnboardingFlow currentStep={onboardStep} />}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12, marginBottom:24 }}>
        {[
          {l:'Applications',v:applied,    c:'#3b82f6', icon:FileText},
          {l:'Interviews',  v:interviews, c:'#f59e0b', icon:Target},
          {l:'Offers',      v:offers,     c:'#10b981', icon:Award},
          {l:'Network',     v:network.length,c:'#8b5cf6',icon:Users},
          {l:'Avg ATS',     v:avgAts?`${avgAts}%`:'—',c:avgAts>=70?'#10b981':'#f59e0b',icon:FileText},
          {l:'Conv Rate',   v:`${convRate}%`,c:convRate>=15?'#10b981':'#ef4444',icon:TrendingUp},
        ].map(({l,v,c,icon:Icon})=>(
          <div key={l} className="card" style={{ textAlign:'center', padding:14 }}>
            <Icon size={13} color={c} style={{ margin:'0 auto 6px' }}/>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:c }}>{loading?'—':String(v)}</div>
            <div style={{ fontSize:11, color:'#6b7a99', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>Application Pipeline</div>
          {jobs.length===0?(
            <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
              <div style={{ color:'#6b7a99', fontSize:13 }}>No applications yet.</div>
              <a href="/tracker" style={{ color:'#3b82f6', fontSize:12, textDecoration:'none' }}>Add your first job →</a>
            </div>
          ):(
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={statusData}><XAxis dataKey="name" tick={{fill:'#6b7a99',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#6b7a99',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip contentStyle={TT} cursor={{fill:'rgba(255,255,255,0.03)'}}/><Bar dataKey="count" radius={[4,4,0,0]}>{statusData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>ATS Score Trend</div>
          {atsData.length===0?(
            <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
              <div style={{ color:'#6b7a99', fontSize:13 }}>No resumes scored yet.</div>
              <a href="/resume" style={{ color:'#3b82f6', fontSize:12, textDecoration:'none' }}>Build your resume →</a>
            </div>
          ):(
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={atsData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/><XAxis dataKey="name" tick={{fill:'#6b7a99',fontSize:10}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fill:'#6b7a99',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={TT}/><Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{fill:'#10b981',r:3}}/></LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:12 }}>Quick Actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {QUICK_ACTIONS.map(({l,href,c,icon:Icon})=>(
              <a key={l} href={href} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:9, background:'var(--bg2)', textDecoration:'none', color:'var(--text)', fontSize:12, fontWeight:500, transition:'background 0.15s', border:'1px solid transparent' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${c}12`;(e.currentTarget as HTMLElement).style.borderColor=`${c}30`}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg2)';(e.currentTarget as HTMLElement).style.borderColor='transparent'}}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:c, flexShrink:0 }}/>{l}
              </a>
            ))}
          </div>
          <a href="/funnel" style={{ display:'flex', alignItems:'center', gap:6, marginTop:12, fontSize:12, color:'#3b82f6', textDecoration:'none' }}>
            <TrendingUp size={12}/> View full funnel analytics <ArrowRight size={11}/>
          </a>
        </div>
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:12 }}>Plan & Credits</div>
          <div style={{ display:'flex', gap:14, marginBottom:14 }}>
            <div style={{ textAlign:'center', padding:'12px 18px', background:'var(--bg2)', borderRadius:9, flex:1 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:plan==='pro'?'#3b82f6':'#6b7a99' }}>{plan==='pro'?'PRO':'FREE'}</div>
              <div style={{ fontSize:11, color:'#6b7a99' }}>Current plan</div>
            </div>
            <div style={{ textAlign:'center', padding:'12px 18px', background:'var(--bg2)', borderRadius:9, flex:1 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#10b981' }}>{credits}</div>
              <div style={{ fontSize:11, color:'#6b7a99' }}>Credits</div>
            </div>
          </div>
          {plan!=='pro'&&<a href="/pricing"><button className="btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:13, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}><Zap size={13}/> Upgrade to Pro</button></a>}
          <div style={{ marginTop:10 }}>
            <a href="/billing" style={{ fontSize:12, color:'#6b7a99', textDecoration:'none' }}>Refer a friend → earn credits →</a>
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, marginBottom:10 }}>Recent Activity</div>
            {jobs.filter(j=>j.status!=='wishlist').slice(0,5).map(j=>(
              <div key={String(j.id)} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(99,130,255,0.06)', fontSize:12 }}>
                <span style={{ color:'var(--text)' }}>{String(j.company||'')} — {String(j.title||'')}</span>
                <span style={{ color:STATUS_COLORS[String(j.status)]||'#6b7a99', fontWeight:600 }}>{String(j.status||'')}</span>
              </div>
            ))}
            {jobs.length===0&&<div style={{ fontSize:12, color:'#6b7a99' }}>No applications yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
