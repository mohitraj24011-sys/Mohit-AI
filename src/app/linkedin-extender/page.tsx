'use client'
import PaywallGate from '@/components/PaywallGate'
import { useState } from 'react'
import { Bot, Copy, Check, RefreshCw, Users, MessageSquare, ChevronRight } from 'lucide-react'
import { ROLE_TIERS } from '@/lib/role-tiers'
import { supabase } from '@/lib/supabase'

type Action = 'generate_connection_request' | 'continue_conversation' | 'analyze_reply'

function LinkedInExtenderInner() {
  const [action, setAction]           = useState<Action>('generate_connection_request')
  const [target, setTarget]           = useState({ name:'', role:'', company:'', recentPost:'' })
  const [myProfile, setMyProfile]     = useState({ name:'', role:'', skills:'', achievement:'' })
  const [tier, setTier]               = useState('mid')
  const [conversation, setConversation] = useState('')
  const [replyText, setReplyText]     = useState('')
  const [result, setResult]           = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]         = useState(false)
  const [autoMode, setAutoMode]       = useState(false)
  const [copied, setCopied]           = useState<string|null>(null)

  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000) }

  const run = async () => {
    setLoading(true); setResult(null)
    try {
      const convHistory = action === 'continue_conversation' ?
        conversation.split('\n').filter(Boolean).map(line => ({
          sender: line.startsWith('Me:') ? 'me' : 'them',
          text: line.replace(/^(Me:|Them:)\s*/, '')
        })) : []

      const res = await authFetch('/api/linkedin-extender', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetPerson: target, myProfile: { ...myProfile, skills: myProfile.skills.split(',').map(s=>s.trim()) }, conversationHistory: convHistory, replyText: action === 'analyze_reply' ? replyText : undefined, tier })
      })
      setResult(await res.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const saveContact = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { alert('Log in to save'); return }
    await supabase.from('network').insert({ user_id: session.user.id, name: target.name, company: target.company, role: target.role, status: 'to_connect', connection_message: result?.connectionRequest, follow_up_message: result?.followUp7Days, auto_managed: autoMode })
    alert('Saved to Network Tracker!')
  }

  const TIERS = Object.keys(ROLE_TIERS)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>LinkedIn Extender Agent</h1>
      <p style={{ color:'#7a8599', marginBottom:24 }}>AI-powered connection requests, follow-ups, conversation management. Auto-mode runs 24/7.</p>

      {/* Auto Mode */}
      <div className="card" style={{ marginBottom:20, borderColor:autoMode?'rgba(0,229,179,0.3)':'rgba(99,130,255,0.12)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:4 }}>🤖 Auto Mode {autoMode?'— ACTIVE':'— OFF'}</div>
            <p style={{ color:'#7a8599', fontSize:13 }}>When ON: contacts added to Network Tracker get auto-messaged and followed up every 7 days.</p>
          </div>
          <button onClick={()=>setAutoMode(!autoMode)} style={{ width:48,height:26,borderRadius:13,border:'none',background:autoMode?'#00e5b3':'#141d2e',cursor:'pointer',position:'relative',transition:'all 0.2s' }}>
            <div style={{ width:18,height:18,borderRadius:9,background:'white',position:'absolute',top:4,left:autoMode?26:4,transition:'left 0.2s' }}/>
          </button>
        </div>
      </div>

      {/* Action tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#0f1420', padding:4, borderRadius:10, width:'fit-content' }}>
        {[{id:'generate_connection_request',l:'✉️ New Connection'},{id:'continue_conversation',l:'💬 Continue Convo'},{id:'analyze_reply',l:'🤖 Analyse Reply'}].map(a=>(
          <button key={a.id} onClick={()=>setAction(a.id as Action)}
            style={{ padding:'7px 14px', borderRadius:7, border:'none', background:action===a.id?'#141d2e':'transparent', color:action===a.id?'white':'#7a8599', cursor:'pointer', fontSize:12, fontWeight:500 }}>
            {a.l}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* My profile */}
          <div className="card">
            <div className="label-sm" style={{ color:'#4f8eff', marginBottom:12 }}>MY PROFILE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              {[{k:'name',l:'My Name',p:'Mohit'},{k:'role',l:'My Role',p:'Senior Backend Engineer'}].map(f=>(
                <div key={f.k}>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                  <input className="input-dark" placeholder={f.p} value={(myProfile as Record<string,string>)[f.k]} onChange={e=>setMyProfile({...myProfile,[f.k]:e.target.value})}/>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:10 }}>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>My Skills</label>
              <input className="input-dark" placeholder="Go, Kubernetes, PostgreSQL" value={myProfile.skills} onChange={e=>setMyProfile({...myProfile,skills:e.target.value})}/>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Key Achievement</label>
              <input className="input-dark" placeholder="Reduced API latency by 60%..." value={myProfile.achievement} onChange={e=>setMyProfile({...myProfile,achievement:e.target.value})}/>
            </div>
          </div>

          {/* Target */}
          <div className="card">
            <div className="label-sm" style={{ color:'#00e5b3', marginBottom:12 }}>TARGET PERSON</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              {[{k:'name',l:'Name',p:'Priya Sharma'},{k:'company',l:'Company',p:'Zepto'}].map(f=>(
                <div key={f.k}>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                  <input className="input-dark" placeholder={f.p} value={(target as Record<string,string>)[f.k]} onChange={e=>setTarget({...target,[f.k]:e.target.value})}/>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:10 }}>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Their Role</label>
              <input className="input-dark" placeholder="Engineering Manager" value={target.role} onChange={e=>setTarget({...target,role:e.target.value})}/>
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Recent Post / Activity</label>
              <input className="input-dark" placeholder="Posted about scaling Go microservices..." value={target.recentPost} onChange={e=>setTarget({...target,recentPost:e.target.value})}/>
            </div>
          </div>

          {/* Level */}
          <div className="card-sm">
            <label className="label-sm" style={{ display:'block', marginBottom:8 }}>MY LEVEL</label>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {TIERS.map(t=>(
                <button key={t} onClick={()=>setTier(t)} style={{ padding:'4px 9px', borderRadius:6, border:`1px solid ${tier===t?'#4f8eff':'rgba(255,255,255,0.08)'}`, background:tier===t?'rgba(79,142,255,0.15)':'transparent', color:tier===t?'#4f8eff':'#7a8599', cursor:'pointer', fontSize:11 }}>
                  {t.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

          {action==='continue_conversation' && (
            <div className="card">
              <label className="label-sm" style={{ display:'block', marginBottom:8 }}>CONVERSATION HISTORY</label>
              <textarea className="input-dark" style={{ height:120 }} placeholder={'Me: Hi Priya, I saw your post...\nThem: Thanks for connecting...\nMe: I wanted to ask...'} value={conversation} onChange={e=>setConversation(e.target.value)}/>
              <p style={{ fontSize:11, color:'#7a8599', marginTop:6 }}>Format: "Me: ..." and "Them: ..." on separate lines</p>
            </div>
          )}

          {action==='analyze_reply' && (
            <div className="card">
              <label className="label-sm" style={{ display:'block', marginBottom:8 }}>THEIR REPLY</label>
              <textarea className="input-dark" style={{ height:120 }} placeholder="Paste their LinkedIn message here..." value={replyText} onChange={e=>setReplyText(e.target.value)}/>
            </div>
          )}

          <button className="btn-primary" onClick={run} disabled={loading||!target.name} style={{ justifyContent:'center', padding:'12px' }}>
            {loading?<><RefreshCw size={13}/> Generating...</>:<><Bot size={13}/> Generate</>}
          </button>
        </div>

        <div>
          {result ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { key:'connectionRequest', label:'Connection Request', color:'#4f8eff', showChars:true },
                { key:'followUp7Days',     label:'Follow-Up (7 Days)', color:'#a78bfa', showChars:false },
                { key:'followUp14Days',    label:'Follow-Up (14 Days)', color:'#fbbf24', showChars:false },
                { key:'referralAsk',       label:'🎯 Referral Ask', color:'#00e5b3', showChars:false },
                { key:'reply',             label:'Suggested Reply', color:'#00e5b3', showChars:false },
              ].filter(item=>result[item.key]).map(item=>(
                <div key={item.key} className="card" style={{ borderColor:item.color.replace(')',',0.3)') }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:11, color:item.color, fontWeight:700, textTransform:'uppercase' }}>{item.label}</span>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {item.showChars && <span style={{ fontSize:10, color:(String(result[item.key]||'').length<=300?'#00e5b3':'#f87171') }}>{String(result[item.key]||'').length}/300</span>}
                      <button onClick={()=>copy(String(result[item.key]||''),item.key)} className="btn-ghost" style={{ padding:'3px 8px', fontSize:11 }}>
                        {copied===item.key?<><Check size={10}/> Done</>:<><Copy size={10}/> Copy</>}
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize:13, lineHeight:1.7 }}>{String(result[item.key]||'')}</p>
                </div>
              ))}
              {(result.icebreakers as string[])?.length>0 && (
                <div className="card">
                  <div className="label-sm" style={{ color:'#f97316', marginBottom:10 }}>💡 CONVERSATION STARTERS</div>
                  {(result.icebreakers as string[]).map((ice:string,i:number)=>(
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13 }}>
                      <ChevronRight size={12} color="#f97316" style={{ flexShrink:0, marginTop:2 }}/>{ice}
                    </div>
                  ))}
                </div>
              )}
              {result.nextStep && <div style={{ padding:'10px 14px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, fontSize:13, color:'#fbbf24' }}>Next step: {String(result.nextStep)}</div>}
              <button onClick={saveContact} className="btn-accent" style={{ justifyContent:'center' }}>
                <Users size={13}/> Save to Network Tracker{autoMode?' + Enable Auto-Follow-Up':''}
              </button>
            </div>
          ) : (
            <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, minHeight:400 }}>
              <MessageSquare size={36} color="#3d4a5c"/>
              <p style={{ color:'#7a8599', fontSize:14, textAlign:'center', maxWidth:260 }}>Fill in the target person's details to generate personalised outreach</p>
            </div>
          )}
        </div>
      </div>
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

export default function LinkedInExtender() {
  return (
    <PaywallGate feature="linkedin_extender">
      <LinkedInExtenderInner />
    </PaywallGate>
  )
}
