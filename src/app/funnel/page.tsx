'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts'
import { TrendingUp, Clock, Target, Users, ArrowRight } from 'lucide-react'

const TT = { background:'#111827', border:'1px solid rgba(99,130,255,0.15)', borderRadius:8, color:'#e2e8f4', fontSize:11 }

type FunnelData = {
  funnel: { wishlist:number;applied:number;screened:number;interviews:number;offers:number;applicationToScreen:number;screenToInterview:number;interviewToOffer:number;overallConversion:number }
  timeMetrics: { avgDaysToOffer:number|null;avgDaysToInterview:number|null }
  network: { total:number;connected:number;messaged:number;replied:number;referrals:number }
  ats: { scores:{label:string;score:number;date:string}[];average:number }
  activityChart: {date:string;count:number}[]
  platformStats: Record<string,{applied:number;interviews:number;offers:number}>
}

export default function FunnelPage() {
  const [data, setData]     = useState<FunnelData|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const load = async ()=>{
      const { data:{ session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const res = await fetch('/api/funnel-analytics', { headers:{ Authorization:`Bearer ${session.access_token}` } })
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  },[])

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#6b7a99' }}>Loading analytics...</div>

  if (!data) return (
    <div style={{ maxWidth:600, margin:'80px auto', padding:'0 20px', textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:22, color:'white', marginBottom:10 }}>No data yet</h2>
      <p style={{ color:'#6b7a99', marginBottom:20 }}>Start applying to jobs to see your conversion funnel</p>
      <a href="/tracker"><button className="btn-primary">Add Your First Job <ArrowRight size={13}/></button></a>
    </div>
  )

  const f = data.funnel
  const funnelStages = [
    { label:'Wishlist',   value:f.wishlist,   color:'#6b7a99' },
    { label:'Applied',    value:f.applied,    color:'#3b82f6' },
    { label:'Screened',   value:f.screened,   color:'#8b5cf6' },
    { label:'Interviews', value:f.interviews, color:'#f59e0b' },
    { label:'Offers',     value:f.offers,     color:'#10b981' },
  ]

  const platformData = Object.entries(data.platformStats).map(([platform,stats])=>({ platform, ...stats }))

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Conversion Funnel</h1>
      <p style={{ color:'#6b7a99', marginBottom:28 }}>Track your application → interview → offer pipeline</p>

      {/* Key metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { l:'Applied',       v:f.applied,            c:'#3b82f6', icon:Target },
          { l:'Interviews',    v:f.interviews,          c:'#f59e0b', icon:Target },
          { l:'Offers',        v:f.offers,              c:'#10b981', icon:Target },
          { l:'Conv Rate',     v:`${f.overallConversion}%`, c:f.overallConversion>=5?'#10b981':'#ef4444', icon:TrendingUp },
          { l:'Days to Interview', v:data.timeMetrics.avgDaysToInterview?`${data.timeMetrics.avgDaysToInterview}d`:'—', c:'#8b5cf6', icon:Clock },
          { l:'Days to Offer', v:data.timeMetrics.avgDaysToOffer?`${data.timeMetrics.avgDaysToOffer}d`:'—', c:'#f59e0b', icon:Clock },
        ].map(({l,v,c,icon:Icon})=>(
          <div key={l} className="card" style={{ textAlign:'center', padding:14 }}>
            <Icon size={13} color={c} style={{ margin:'0 auto 6px' }}/>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:c }}>{String(v)}</div>
            <div style={{ fontSize:11, color:'#6b7a99', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        {/* Funnel chart */}
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:16 }}>Application Funnel</div>
          {funnelStages.every(s=>s.value===0) ? (
            <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7a99', fontSize:13 }}>Start tracking applications to see your funnel</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelStages} layout="vertical"><XAxis type="number" tick={{fill:'#6b7a99',fontSize:10}} axisLine={false} tickLine={false}/><YAxis dataKey="label" type="category" tick={{fill:'#6b7a99',fontSize:11}} axisLine={false} tickLine={false} width={70}/><Tooltip contentStyle={TT}/><Bar dataKey="value" radius={[0,4,4,0]}>{funnelStages.map((e,i)=><rect key={i} fill={e.color}/>)}</Bar></BarChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
                {[
                  { l:`Applied→Screen`, v:`${f.applicationToScreen}%`, good:f.applicationToScreen>=15 },
                  { l:`Screen→Interview`, v:`${f.screenToInterview}%`, good:f.screenToInterview>=30 },
                  { l:`Interview→Offer`, v:`${f.interviewToOffer}%`, good:f.interviewToOffer>=50 },
                ].map(({l,v,good})=>(
                  <div key={l} style={{ fontSize:12, padding:'5px 10px', borderRadius:6, background:good?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${good?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}` }}>
                    <span style={{ color:'#6b7a99' }}>{l}: </span>
                    <strong style={{ color:good?'#10b981':'#ef4444' }}>{v}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Network funnel */}
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:16 }}>Network Funnel</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { l:'Total Contacts',   v:data.network.total,    c:'#6b7a99' },
              { l:'Connected',        v:data.network.connected, c:'#3b82f6' },
              { l:'Messaged',         v:data.network.messaged,  c:'#f59e0b' },
              { l:'Replied',          v:data.network.replied,   c:'#f97316' },
              { l:'Referrals Given',  v:data.network.referrals, c:'#10b981' },
            ].map(({l,v,c})=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'var(--bg2)', borderRadius:8 }}>
                <span style={{ fontSize:13, color:'#6b7a99' }}>{l}</span>
                <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, color:c }}>{v}</span>
              </div>
            ))}
          </div>
          <a href="/network" style={{ display:'flex', alignItems:'center', gap:6, marginTop:12, fontSize:12, color:'#3b82f6', textDecoration:'none' }}>
            <Users size={12}/> Manage network <ArrowRight size={11}/>
          </a>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        {/* Activity chart */}
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>Activity (Last 14 Days)</div>
          {data.activityChart.length===0?(
            <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7a99', fontSize:13 }}>No recent activity</div>
          ):(
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={data.activityChart}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/><XAxis dataKey="date" tick={{fill:'#6b7a99',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#6b7a99',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip contentStyle={TT}/><Area type="monotone" dataKey="count" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2}/></AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Platform effectiveness */}
        <div className="card">
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:14 }}>Platform Effectiveness</div>
          {platformData.length===0?(
            <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7a99', fontSize:13 }}>Add a source to your job applications</div>
          ):(
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {platformData.sort((a,b)=>b.interviews-a.interviews).slice(0,6).map(p=>(
                <div key={p.platform} style={{ display:'flex', gap:10, alignItems:'center', fontSize:12 }}>
                  <span style={{ color:'#6b7a99', minWidth:80 }}>{p.platform}</span>
                  <div style={{ flex:1, display:'flex', gap:6 }}>
                    <span className="badge badge-blue" style={{ fontSize:10 }}>{p.applied} apps</span>
                    {p.interviews>0&&<span className="badge badge-amber" style={{ fontSize:10 }}>{p.interviews} intv</span>}
                    {p.offers>0&&<span className="badge badge-green" style={{ fontSize:10 }}>{p.offers} offers</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
