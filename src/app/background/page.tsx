'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Cpu, Zap, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'

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

export default function Background() {
  const [profile, setProfile] = useState<Record<string,unknown>|null>(null)
  const [logs, setLogs]       = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const [p, l] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('automation_logs').select('*').eq('user_id', session.user.id).order('created_at',{ascending:false}).limit(20)
    ])
    setProfile(p.data); setLogs(l.data||[]); setLoading(false)
  }

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, [])

  const toggle = async (field: string, value: boolean) => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').upsert({ id: session.user.id, [field]: value })
    setProfile(p => p ? {...p,[field]:value} : null)
  }

  const stats = { conns: logs.filter(l=>l.action==='connection_message_generated').length, follows: logs.filter(l=>l.action==='follow_up_generated').length, scans: logs.filter(l=>l.action==='background_scan').length }

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Background Automation</h1>
      <p style={{ color:'#7a8599', marginBottom:28 }}>AI works 24/7 — building network, scanning jobs, sending follow-ups while you sleep</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {[{l:'Connection Messages',v:stats.conns,icon:Users,c:'#4f8eff'},{l:'Follow-Ups Generated',v:stats.follows,icon:Zap,c:'#00e5b3'},{l:'Platform Scans',v:stats.scans,icon:Cpu,c:'#a78bfa'}].map(({l,v,icon:Icon,c})=>(
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <Icon size={22} color={c} style={{ margin:'0 auto 10px' }}/>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:800, color:c }}>{v}</div>
            <div style={{ fontSize:12, color:'#7a8599', marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
        {[
          {f:'automation_enabled',l:'Background Automation',d:'Auto-generates follow-ups and connection messages every 6 hours.',c:'#00e5b3'},
          {f:'auto_apply_enabled',l:'Auto-Apply',d:'Applies to best-matched jobs up to your daily limit. AI reviews each first.',c:'#4f8eff'},
        ].map(({f,l,d,c})=>(
          <div key={f} className="card" style={{ borderColor:profile?.[f]?`${c}40`:'rgba(99,130,255,0.12)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:profile?.[f]?c:'white' }}>
                {profile?.[f]?'🟢 ':'⚫ '}{l}
              </div>
              <button onClick={()=>toggle(f,!profile?.[f])} disabled={!profile}
                style={{ width:44,height:24,borderRadius:12,border:'none',background:profile?.[f]?c:'#141d2e',cursor:'pointer',position:'relative',transition:'all 0.2s',flexShrink:0 }}>
                <div style={{ width:18,height:18,borderRadius:9,background:'white',position:'absolute',top:3,left:profile?.[f]?23:3,transition:'left 0.2s' }}/>
              </button>
            </div>
            <p style={{ fontSize:13, color:'#7a8599', lineHeight:1.6 }}>{d}</p>
          </div>
        ))}
      </div>

      {profile && (
        <div className="card" style={{ marginBottom:28 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, marginBottom:16 }}>Daily Limits</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {[
              {f:'linkedin_connect_daily_limit',l:'LinkedIn Connections/Day (max 20)',max:20,c:'#4f8eff'},
              {f:'daily_apply_limit',l:'Auto-Apply/Day (max 30)',max:30,c:'#00e5b3'},
            ].map(({f,l,max,c})=>(
              <div key={f}>
                <label className="label-sm" style={{ display:'block', marginBottom:8 }}>{l}</label>
                <input type="range" min={1} max={max} value={Number(profile[f])||10}
                  onChange={async e => {
                    const v=parseInt(e.target.value); setProfile(p=>p?{...p,[f]:v}:null)
                    const { data:{session} } = await supabase.auth.getSession()
                    if(session) await supabase.from('profiles').upsert({id:session.user.id,[f]:v})
                  }} style={{ width:'100%', marginBottom:8 }}/>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:c }}>{Number(profile[f])||10}/day</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, marginBottom:16 }}>Recent Automation Activity</div>
        {logs.length===0?(
          <div style={{ textAlign:'center', padding:'40px', color:'#7a8599' }}>
            <Clock size={32} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
            <p>No automation activity yet. Enable background automation above.</p>
          </div>
        ):(
          logs.map((log,i)=>(
            <div key={String(log.id)} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 0', borderBottom:i<logs.length-1?'1px solid rgba(99,130,255,0.08)':'none' }}>
              <div style={{ width:30,height:30,borderRadius:8,background:'#0f1420',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                {log.result==='success'?<CheckCircle size={13} color="#00e5b3"/>:<AlertCircle size={13} color="#f87171"/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'white', marginBottom:2 }}>{String(log.action||'').replace(/_/g,' ')}</div>
                {log.details && <div style={{ fontSize:11, color:'#7a8599' }}>{Object.entries(log.details as Record<string,unknown>).map(([k,v])=>`${k}: ${v}`).join(' · ')}</div>}
              </div>
              <div style={{ fontSize:11, color:'#7a8599', whiteSpace:'nowrap' }}>{new Date(String(log.created_at)).toLocaleTimeString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
