'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Zap, Flame, Star, RefreshCw } from 'lucide-react'

type Achievement = { key:string;label:string;desc:string;xp:number;icon:string;category:string;earned:boolean;earnedAt?:string }
type AchData = { achievements:Achievement[];earned:number;total:number;xp:number;level:number;nextLevelXp:number;streak:number }

const CATEGORY_COLORS: Record<string,string> = { applications:'#3b82f6', networking:'#8b5cf6', learning:'#f59e0b', streak:'#ef4444', milestone:'#10b981', social:'#f97316' }

export default function Achievements() {
  const [data, setData]   = useState<AchData|null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const res = await fetch('/api/achievements', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'#6b7a99' }}><RefreshCw size={20} style={{ animation:'spin 1s linear infinite', margin:'0 auto 12px' }} /></div>
  if (!data) return <div style={{ padding:60, textAlign:'center', color:'#6b7a99' }}>Sign in to view achievements</div>

  const xpPct = Math.round((data.xp % 500) / 500 * 100)
  const filtered = data.achievements.filter(a => filter === 'all' ? true : filter === 'earned' ? a.earned : a.category === filter)

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 20px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
          <Trophy size={24} color="#f59e0b" /> Achievements
        </h1>
        <p style={{ color:'#6b7a99' }}>{data.earned}/{data.total} earned · Level {data.level} · {data.xp} XP total</p>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { l:'Level', v:data.level, c:'#f59e0b', icon:Star },
          { l:'Total XP', v:data.xp, c:'#3b82f6', icon:Zap },
          { l:'Streak', v:`${data.streak}🔥`, c:'#ef4444', icon:Flame },
          { l:'Badges', v:`${data.earned}/${data.total}`, c:'#10b981', icon:Trophy },
        ].map(({l,v,c,icon:Icon}) => (
          <div key={l} className="card" style={{ textAlign:'center', padding:14 }}>
            <Icon size={14} color={c} style={{ margin:'0 auto 6px' }}/>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:c }}>{String(v)}</div>
            <div style={{ fontSize:11, color:'#6b7a99', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* XP progress */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
          <span style={{ color:'#6b7a99' }}>Level {data.level} → Level {data.level+1}</span>
          <span style={{ color:'#f59e0b', fontWeight:700 }}>{data.xp % 500}/{500} XP</span>
        </div>
        <div style={{ height:10, background:'var(--bg3)', borderRadius:5, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${xpPct}%`, background:'linear-gradient(90deg,#f59e0b,#f97316)', borderRadius:5, transition:'width 0.5s' }}/>
        </div>
        <div style={{ fontSize:11, color:'#6b7a99', marginTop:6 }}>{500 - (data.xp % 500)} XP to next level</div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        {['all','earned','applications','networking','learning','streak','milestone','social'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'5px 12px', borderRadius:16, border:`1px solid ${filter===f?'#3b82f6':'rgba(255,255,255,0.08)'}`, background:filter===f?'rgba(59,130,246,0.12)':'transparent', color:filter===f?'#60a5fa':'#6b7a99', cursor:'pointer', fontSize:12, fontWeight:filter===f?700:400, textTransform:'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
        {filtered.map(a => (
          <div key={a.key} className="card" style={{ opacity:a.earned?1:0.45, borderColor:a.earned?`${CATEGORY_COLORS[a.category]}40`:'var(--card-border)', position:'relative', overflow:'hidden' }}>
            {a.earned && <div style={{ position:'absolute', top:0, right:0, width:40, height:40, background:`${CATEGORY_COLORS[a.category]}20`, borderRadius:'0 0 0 100%' }}/>}
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ fontSize:32 }}>{a.icon}</div>
              <div>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'white', marginBottom:3 }}>{a.label}</div>
                <div style={{ fontSize:12, color:'#6b7a99' }}>{a.desc}</div>
                <div style={{ display:'flex', gap:8, marginTop:6 }}>
                  <span className="badge badge-amber" style={{ fontSize:9 }}>+{a.xp} XP</span>
                  <span style={{ padding:'1px 7px', borderRadius:5, background:`${CATEGORY_COLORS[a.category]}12`, border:`1px solid ${CATEGORY_COLORS[a.category]}30`, fontSize:9, color:CATEGORY_COLORS[a.category], fontWeight:600, textTransform:'capitalize' }}>{a.category}</span>
                </div>
              </div>
            </div>
            {a.earned && a.earnedAt && <div style={{ fontSize:10, color:'#6b7a99', marginTop:8 }}>Earned {a.earnedAt.split('T')[0]}</div>}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
