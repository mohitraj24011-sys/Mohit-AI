'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Send, RefreshCw, Copy, Check, ExternalLink,
  Trash2, Globe, Eye, Edit3, Zap, Shield, AlertTriangle
} from 'lucide-react'

type PostStatus = 'pending'|'posted'|'failed'|'one_click_opened'
type QueuedPost = {
  id:string; platform:string; trigger_type:string; content:string;
  status:PostStatus; post_url?:string; posted_at?:string;
  metadata:Record<string,unknown>; created_at:string
}
type AppSettings = {
  linkedin_auto_post:boolean; naukri_auto_post:boolean; naukri_username:string;
  post_trigger_offer:boolean; post_trigger_interview:boolean; post_trigger_milestone:boolean;
  post_safe_mode:boolean; post_max_per_week:number; post_edit_before_publish:boolean
}

const TRIGGER_OPTS = [
  { id:'offer',            emoji:'🏆', label:'Job Offer Received',    desc:'Best performing post type — leads with salary, shares lessons' },
  { id:'interview',        emoji:'🎤', label:'Interview Landed',       desc:'Share what worked to get the interview — gets high engagement' },
  { id:'applications_50',  emoji:'⚡', label:'50 Applications Hit',    desc:'Data-driven milestone post — reply rates, what platforms worked' },
  { id:'applications_100', emoji:'💯', label:'100 Applications Hit',   desc:'"100 applications data" format — very high engagement' },
  { id:'streak_milestone', emoji:'🔥', label:'Streak Milestone',       desc:'7/14/21/30-day streak — consistency posts perform well' },
  { id:'weekly_update',    emoji:'📊', label:'Weekly Job Hunt Update', desc:'Friday accountability post — transparent and relatable' },
  { id:'manual',           emoji:'✍️', label:'Manual Post',            desc:'Write anything — AI generates the best version of it' },
]

const STATUS_COLORS:Record<PostStatus,string>  = { pending:'#f59e0b', posted:'#10b981', failed:'#ef4444', one_click_opened:'#3b82f6' }
const STATUS_LABELS:Record<PostStatus,string>  = { pending:'Draft', posted:'Posted ✓', failed:'Failed', one_click_opened:'Ready to Post' }

export default function SocialPost() {
  const [tab, setTab]                   = useState<'queue'|'generate'|'settings'>('generate')
  const [queue, setQueue]               = useState<QueuedPost[]>([])
  const [settings, setSettings]         = useState<AppSettings|null>(null)
  const [stats, setStats]               = useState<Record<string,number>>({})
  const [loading, setLoading]           = useState(true)
  const [generating, setGenerating]     = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [copied, setCopied]             = useState<string|null>(null)

  // Generate form
  const [trigger, setTrigger]           = useState('offer')
  const [ctx, setCtx]                   = useState({ company:'', salaryBefore:'', salaryAfter:'', daysInSearch:'', note:'' })

  // Preview/edit state — core of safe mode
  const [preview, setPreview]           = useState<{linkedin:string;short:string;hashtags:string[];shareUrl:string}|null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [editingHashtags, setEditingHashtags] = useState('')
  const [isEditing, setIsEditing]       = useState(false)

  const authFetch = useCallback(async (url:string, opts:RequestInit={}) => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) return null
    return fetch(url, { ...opts, headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` } })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await authFetch('/api/social-post')
    if (res?.ok) {
      const data = await res.json()
      setQueue(data.queue || [])
      setSettings(data.settings || { linkedin_auto_post:false, naukri_auto_post:false, naukri_username:'', post_trigger_offer:true, post_trigger_interview:true, post_trigger_milestone:true, post_safe_mode:true, post_max_per_week:3, post_edit_before_publish:true })
      setStats(data.stats || {})
    }
    setLoading(false)
  }, [authFetch])

  useEffect(() => { load() }, [load])

  // Generate + show preview
  const generate = async () => {
    setGenerating(true); setPreview(null); setEditedContent(''); setIsEditing(false)
    const context = {
      company:       ctx.company,
      salaryBefore:  parseInt(ctx.salaryBefore)||0,
      salaryAfter:   parseInt(ctx.salaryAfter)||0,
      hikePercent:   ctx.salaryBefore && ctx.salaryAfter ? Math.round(((parseInt(ctx.salaryAfter)-parseInt(ctx.salaryBefore))/parseInt(ctx.salaryBefore))*100) : 0,
      daysInSearch:  parseInt(ctx.daysInSearch)||0,
      note:          ctx.note,
    }
    const res = await authFetch('/api/social-post', { method:'POST', body:JSON.stringify({ action:'generate', triggerType:trigger, context }) })
    if (res?.ok) {
      const data = await res.json()
      const p = data.post
      setPreview(p)
      setEditedContent(p.linkedin)
      setEditingHashtags((p.hashtags||[]).join(' '))
    }
    setGenerating(false)
  }

  // One-click post to LinkedIn (opens pre-filled share box)
  const oneClickPost = (content:string, hashtags:string) => {
    const fullContent = content + (hashtags ? '\n\n' + hashtags : '')
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(fullContent)}`
    window.open(url, '_blank', 'width=800,height=600')
    return url
  }

  // Save to queue + mark as one-click-opened
  const queueAndOpen = async () => {
    if (!preview) return
    const content  = isEditing ? editedContent : preview.linkedin
    const hashtags = isEditing ? editingHashtags : (preview.hashtags||[]).join(' ')
    const shareUrl = oneClickPost(content, hashtags)

    await authFetch('/api/social-post', {
      method:'POST',
      body:JSON.stringify({
        action:      'queue',
        triggerType: trigger,
        content:     content,
        platform:    'linkedin',
        metadata:    { hashtags: hashtags.split(' ').filter(Boolean), shareUrl, headline: preview.short },
      }),
    })
    load()
  }

  // Copy post text
  const copyPost = (key:string) => {
    const content  = isEditing ? editedContent : preview?.linkedin || ''
    const hashtags = isEditing ? editingHashtags : (preview?.hashtags||[]).join(' ')
    navigator.clipboard.writeText(content + (hashtags ? '\n\n' + hashtags : ''))
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const markPosted = async (id:string) => {
    await authFetch('/api/social-post', { method:'POST', body:JSON.stringify({ action:'mark_posted', postId:id }) })
    setQueue(prev => prev.map(p => p.id===id ? {...p, status:'posted' as PostStatus, posted_at:new Date().toISOString()} : p))
  }

  const del = async (id:string) => {
    await authFetch('/api/social-post', { method:'POST', body:JSON.stringify({ action:'delete', postId:id }) })
    setQueue(prev => prev.filter(p => p.id!==id))
  }

  const saveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    await authFetch('/api/social-post', {
      method:'POST',
      body:JSON.stringify({
        action:          'update_settings',
        linkedinAutoPost: settings.linkedin_auto_post,
        naukriAutoPost:   settings.naukri_auto_post,
        naukriUsername:   settings.naukri_username,
        triggers: { offer:settings.post_trigger_offer, interview:settings.post_trigger_interview, milestone:settings.post_trigger_milestone },
        safeMode:         settings.post_safe_mode,
        maxPerWeek:       settings.post_max_per_week,
      }),
    })
    setSavingSettings(false)
    load()
  }

  const postThisWeek = queue.filter(p => p.status==='posted' && new Date(p.posted_at||'').getTime() > Date.now()-7*86400000).length
  const weeklyLimit  = settings?.post_max_per_week || 3

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'white', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
          <Send size={22} color="#0077b5"/> LinkedIn + Naukri Post Engine
        </h1>
        <p style={{ color:'#6b7a99', fontSize:13 }}>
          We help you share your career journey and get noticed by recruiters.
          <span style={{ marginLeft:10, padding:'2px 8px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981', fontSize:11, fontWeight:700 }}>
            ✓ You always see and approve every post
          </span>
        </p>
      </div>

      {/* Weekly limit bar */}
      <div className="card" style={{ marginBottom:20, padding:'14px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:13, color:'white', fontWeight:600 }}>Posts this week</span>
          <span style={{ fontSize:13, color: postThisWeek>=weeklyLimit?'#ef4444':'#10b981', fontWeight:700 }}>
            {postThisWeek}/{weeklyLimit}
            {postThisWeek>=weeklyLimit && ' — limit reached (prevents spam)'}
          </span>
        </div>
        <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${Math.min(100,Math.round(postThisWeek/weeklyLimit*100))}%`, background:postThisWeek>=weeklyLimit?'#ef4444':'linear-gradient(90deg,#3b82f6,#10b981)', borderRadius:3, transition:'width 0.4s' }}/>
        </div>
        <div style={{ fontSize:11, color:'#6b7a99', marginTop:6 }}>Max {weeklyLimit} posts/week keeps your feed authentic and non-spammy</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(99,130,255,0.1)', marginBottom:24 }}>
        {[['generate','✨ Generate Post'],['queue',`📋 History (${queue.length})`],['settings','⚙️ Settings']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t as 'queue'|'generate'|'settings')}
            style={{ padding:'10px 20px', border:'none', borderBottom:`2px solid ${tab===t?'#3b82f6':'transparent'}`, background:'transparent', color:tab===t?'#3b82f6':'#6b7a99', cursor:'pointer', fontSize:13, fontWeight:tab===t?700:400, marginBottom:-1 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ─────────────────────────────────────────────────────── */}
      {tab === 'generate' && (
        <div>
          {/* Trigger picker */}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="label-sm" style={{ marginBottom:12 }}>WHAT HAPPENED? (PICK YOUR TRIGGER)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {TRIGGER_OPTS.map(t => (
                <button key={t.id} onClick={()=>setTrigger(t.id)}
                  style={{ padding:'12px 14px', borderRadius:10, border:`1px solid ${trigger===t.id?'#3b82f6':'rgba(255,255,255,0.07)'}`, background:trigger===t.id?'rgba(59,130,246,0.08)':'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:18 }}>{t.emoji}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:trigger===t.id?'white':'#6b7a99' }}>{t.label}</span>
                    {trigger===t.id && <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6', flexShrink:0, marginLeft:'auto' }}/>}
                  </div>
                  <div style={{ fontSize:11, color:'#6b7a99', paddingLeft:26 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="label-sm" style={{ marginBottom:12 }}>ADD CONTEXT (MAKES POST MORE SPECIFIC)</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10, marginBottom:10 }}>
              {[
                {k:'company',l:'Company',p:'Razorpay, CRED...'},
                {k:'salaryBefore',l:'Old Salary (LPA)',p:'18',t:'number'},
                {k:'salaryAfter',l:'New Salary (LPA)',p:'32',t:'number'},
                {k:'daysInSearch',l:'Days Job Hunting',p:'45',t:'number'},
              ].map(f => (
                <div key={f.k}>
                  <label className="label-sm" style={{ display:'block', marginBottom:4 }}>{f.l}</label>
                  <input type={f.t||'text'} className="input-dark" placeholder={f.p} value={(ctx as Record<string,string>)[f.k]} onChange={e=>setCtx({...ctx,[f.k]:e.target.value})}/>
                </div>
              ))}
            </div>
            <div>
              <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Any specific story or lesson to include?</label>
              <textarea className="input-dark" style={{ height:68 }}
                placeholder="e.g. The referral from a LinkedIn connection I messaged 2 months ago finally came through..."
                value={ctx.note} onChange={e=>setCtx({...ctx,note:e.target.value})}/>
            </div>
          </div>

          <button onClick={generate} disabled={generating || postThisWeek>=weeklyLimit} className="btn-primary"
            style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, background:'linear-gradient(135deg,#3b82f6,#0077b5)', marginBottom:8 }}>
            {generating ? <><RefreshCw size={14}/> Generating...</> : <><Zap size={14}/> Generate My Post</>}
          </button>
          {postThisWeek >= weeklyLimit && (
            <p style={{ textAlign:'center', fontSize:12, color:'#f59e0b' }}>⚠️ Weekly limit reached — come back tomorrow to keep your feed authentic</p>
          )}

          {/* ── PREVIEW + EDIT (THE KEY SAFE MODE UI) ── */}
          {preview && (
            <div className="card" style={{ marginTop:20, borderColor:'rgba(0,119,181,0.3)', borderWidth:2 }}>

              {/* Trust banner */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:9, marginBottom:16 }}>
                <Shield size={14} color="#10b981"/>
                <span style={{ fontSize:12, color:'#34d399', fontWeight:600 }}>Your post — you control it. Review, edit, then post when ready.</span>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'white', display:'flex', alignItems:'center', gap:8 }}>
                  <Eye size={16} color="#0077b5"/> LinkedIn Post Preview
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setIsEditing(!isEditing)} className="btn-ghost" style={{ fontSize:12, padding:'5px 12px' }}>
                    <Edit3 size={12}/> {isEditing ? 'Done Editing' : 'Edit Post'}
                  </button>
                  <button onClick={() => copyPost('preview')} className="btn-ghost" style={{ fontSize:12, padding:'5px 12px' }}>
                    {copied==='preview' ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
                  </button>
                </div>
              </div>

              {/* Post preview / edit area */}
              {isEditing ? (
                <div>
                  <textarea
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    className="input-dark"
                    style={{ height:240, fontSize:14, lineHeight:1.8, fontFamily:'DM Sans,sans-serif', marginBottom:10 }}
                  />
                  <div>
                    <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Hashtags</label>
                    <input className="input-dark" value={editingHashtags} onChange={e=>setEditingHashtags(e.target.value)} placeholder="#JobSearch #IndianTech"/>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background:'#fff', borderRadius:10, padding:'16px 18px', marginBottom:12, border:'1px solid #e0e0e0' }}>
                    {/* Simulate LinkedIn post card */}
                    <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#10b981)', flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#000' }}>You</div>
                        <div style={{ fontSize:11, color:'#666' }}>Software Engineer · Just now</div>
                      </div>
                    </div>
                    <div style={{ fontSize:14, color:'#1a1a1a', lineHeight:1.75, whiteSpace:'pre-wrap', fontFamily:'system-ui, -apple-system, sans-serif' }}>
                      {editedContent || preview.linkedin}
                    </div>
                    {preview.hashtags?.length > 0 && (
                      <div style={{ marginTop:10, fontSize:13, color:'#0077b5', fontFamily:'system-ui' }}>
                        {preview.hashtags.join(' ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Character count */}
              <div style={{ fontSize:11, color:editedContent.length>1300?'#ef4444':'#6b7a99', marginBottom:16, textAlign:'right' }}>
                {editedContent.length}/1300 characters
                {editedContent.length > 1300 && ' — LinkedIn limit exceeded, please shorten'}
              </div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {/* Primary: One-click LinkedIn */}
                <button onClick={queueAndOpen}
                  disabled={editedContent.length > 1300}
                  style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px', borderRadius:11, border:'none', background:'#0077b5', color:'white', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, cursor:'pointer', transition:'all 0.15s' }}>
                  💼 Post on LinkedIn →
                </button>
                {/* Naukri refresh */}
                <button onClick={async()=>{
                  await authFetch('/api/naukri-update', { method:'POST', body:JSON.stringify({ action:'queue_update', headline:ctx.note?ctx.note.slice(0,100):undefined }) })
                  alert('Naukri profile refresh queued — worker will mark you as active')
                }} className="btn-ghost" style={{ fontSize:13 }}>
                  🟠 Refresh Naukri Profile
                </button>
              </div>

              <p style={{ fontSize:11, color:'#6b7a99', marginTop:10, lineHeight:1.6 }}>
                💼 <strong style={{ color:'white' }}>LinkedIn:</strong> Opens LinkedIn in a new tab with your post pre-filled. You click "Post" — done in 2 seconds.<br/>
                🟠 <strong style={{ color:'white' }}>Naukri:</strong> Worker refreshes your profile automatically (marks you as active in recruiter searches).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── QUEUE / HISTORY TAB ─────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#6b7a99' }}>
              <RefreshCw size={18} style={{ animation:'spin 1s linear infinite', margin:'0 auto 10px' }}/>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ padding:60, textAlign:'center' }}>
              <Send size={40} color="#2d3b52" style={{ margin:'0 auto 14px' }}/>
              <h3 style={{ color:'white', marginBottom:8 }}>No posts yet</h3>
              <p style={{ color:'#6b7a99', fontSize:14, marginBottom:20 }}>Generate your first post — takes 20 seconds</p>
              <button onClick={()=>setTab('generate')} className="btn-primary">✨ Generate Post</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {queue.map(post => (
                <div key={post.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, flexWrap:'wrap', gap:10 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:20 }}>{post.platform==='naukri'?'🟠':'💼'}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'white' }}>
                          {post.platform==='naukri'?'Naukri':'LinkedIn'} — {post.trigger_type.replace(/_/g,' ')}
                        </div>
                        <div style={{ fontSize:10, color:'#6b7a99' }}>
                          {new Date(post.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    <span style={{ padding:'3px 10px', borderRadius:12, background:`${STATUS_COLORS[post.status]}12`, border:`1px solid ${STATUS_COLORS[post.status]}30`, fontSize:11, color:STATUS_COLORS[post.status], fontWeight:700 }}>
                      {STATUS_LABELS[post.status]}
                    </span>
                  </div>

                  <div style={{ background:'var(--bg2)', borderRadius:8, padding:'11px 13px', fontSize:13, color:'var(--text)', lineHeight:1.7, marginBottom:10, maxHeight:120, overflow:'hidden', position:'relative' }}>
                    {post.content.slice(0,350)}{post.content.length>350?'...':''}
                    {post.content.length>350 && <div style={{ position:'absolute', bottom:0, left:0, right:0, height:30, background:'linear-gradient(transparent,var(--bg2))' }}/>}
                  </div>

                  {(post.metadata?.hashtags as string[])?.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
                      {(post.metadata.hashtags as string[]).slice(0,5).map(h=>(
                        <span key={h} style={{ fontSize:10, color:'#3b82f6', background:'rgba(59,130,246,0.08)', padding:'2px 7px', borderRadius:5 }}>{h}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {post.status !== 'posted' && (
                      <>
                        <button onClick={()=>{
                          const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post.content)}`
                          window.open(url,'_blank','width=800,height=600')
                          markPosted(post.id)
                        }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'1px solid rgba(0,119,181,0.3)', background:'rgba(0,119,181,0.08)', color:'#0077b5', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                          💼 Open in LinkedIn
                        </button>
                        <button onClick={()=>{navigator.clipboard.writeText(post.content);setCopied(post.id);setTimeout(()=>setCopied(null),2000)}} className="btn-ghost" style={{ fontSize:12 }}>
                          {copied===post.id?<><Check size={12}/> Copied</>:<><Copy size={12}/> Copy</>}
                        </button>
                        <button onClick={()=>markPosted(post.id)} className="btn-ghost" style={{ fontSize:12, color:'#10b981', borderColor:'rgba(16,185,129,0.3)' }}>
                          <Check size={12}/> Mark Posted
                        </button>
                      </>
                    )}
                    {post.post_url && (
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                        <button className="btn-ghost" style={{ fontSize:12 }}><ExternalLink size={11}/> View Post</button>
                      </a>
                    )}
                    <button onClick={()=>del(post.id)} className="btn-danger" style={{ padding:'6px 10px', marginLeft:'auto' }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'settings' && settings && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Safe mode banner — always show */}
          <div style={{ padding:'16px 18px', background:'rgba(16,185,129,0.06)', border:'2px solid rgba(16,185,129,0.2)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <Shield size={18} color="#10b981"/>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#10b981' }}>Safe Mode (Recommended)</div>
              <button onClick={()=>setSettings({...settings, post_safe_mode:!settings.post_safe_mode})}
                style={{ marginLeft:'auto', padding:'5px 14px', borderRadius:16, border:`1px solid ${settings.post_safe_mode?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.3)'}`, background:settings.post_safe_mode?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)', color:settings.post_safe_mode?'#10b981':'#ef4444', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                {settings.post_safe_mode ? '✓ ON (Default)' : 'OFF'}
              </button>
            </div>
            <p style={{ fontSize:13, color:'#6b7a99', lineHeight:1.6 }}>
              In Safe Mode, we <strong style={{ color:'white' }}>never post automatically</strong>. We generate the post, you review and edit it, then you click "Post on LinkedIn". Takes 10 seconds — no surprises.
            </p>
            {!settings.post_safe_mode && (
              <div style={{ marginTop:10, padding:'10px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, display:'flex', gap:8 }}>
                <AlertTriangle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
                <span style={{ fontSize:12, color:'#f87171' }}>Auto-post is OFF. Safe Mode is strongly recommended. Only disable if you have a worker running with a captured session and understand the risks.</span>
              </div>
            )}
          </div>

          {/* Frequency limit */}
          <div className="card">
            <div className="label-sm" style={{ marginBottom:12 }}>WEEKLY POST LIMIT</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[1,2,3,5,7].map(n => (
                <button key={n} onClick={()=>setSettings({...settings, post_max_per_week:n})}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:`1px solid ${settings.post_max_per_week===n?'#3b82f6':'rgba(255,255,255,0.08)'}`, background:settings.post_max_per_week===n?'rgba(59,130,246,0.1)':'transparent', color:settings.post_max_per_week===n?'#60a5fa':'#6b7a99', cursor:'pointer', textAlign:'center' }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18 }}>{n}</div>
                  <div style={{ fontSize:10, marginTop:2 }}>posts/wk</div>
                </button>
              ))}
            </div>
            <p style={{ fontSize:11, color:'#6b7a99', marginTop:10 }}>
              ✓ 2–3/week is the sweet spot — enough to stay visible without looking spammy
            </p>
          </div>

          {/* Platform toggles */}
          <div className="card">
            <div className="label-sm" style={{ marginBottom:14 }}>PLATFORMS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { key:'linkedin_auto_post', platform:'LinkedIn Auto-Post (Advanced)', color:'#0077b5', icon:'💼',
                  desc:'Posts directly using browser automation. Requires worker + linkedin-session.json. Safe Mode overrides this.',
                  warning:'Only enable if worker is running. Safe Mode recommended instead.' },
                { key:'naukri_auto_post', platform:'Naukri Profile Refresh', color:'#ff6b00', icon:'🟠',
                  desc:'Refreshes your Naukri profile to appear at top of recruiter searches. No "posting" — just activity signal.',
                  warning:'Requires worker + naukri-session.json' },
              ].map(p => (
                <div key={p.key} style={{ padding:'14px', background:'var(--bg2)', borderRadius:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:16 }}>{p.icon}</span>
                        <span style={{ fontWeight:700, color:'white', fontSize:14 }}>{p.platform}</span>
                        {(settings as Record<string,unknown>)[p.key] && <span className="badge badge-green" style={{ fontSize:9 }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize:12, color:'#6b7a99', marginBottom:6 }}>{p.desc}</div>
                      <div style={{ fontSize:11, color:'#f59e0b' }}>⚠️ {p.warning}</div>
                    </div>
                    <button onClick={()=>setSettings({...settings, [p.key]:!(settings as Record<string,boolean>)[p.key]})}
                      style={{ padding:'7px 14px', borderRadius:16, border:`1px solid ${(settings as Record<string,boolean>)[p.key]?`${p.color}60`:'rgba(255,255,255,0.1)'}`, background:(settings as Record<string,boolean>)[p.key]?`${p.color}15`:'transparent', color:(settings as Record<string,boolean>)[p.key]?p.color:'#6b7a99', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0, marginLeft:14 }}>
                      {(settings as Record<string,boolean>)[p.key]?'✓ On':'Off'}
                    </button>
                  </div>
                  {p.key==='naukri_auto_post' && settings.naukri_auto_post && (
                    <div style={{ marginTop:10 }}>
                      <label className="label-sm" style={{ display:'block', marginBottom:4 }}>Naukri Username</label>
                      <input className="input-dark" placeholder="your-profile-slug" value={settings.naukri_username||''} onChange={e=>setSettings({...settings,naukri_username:e.target.value})}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Trigger settings */}
          <div className="card">
            <div className="label-sm" style={{ marginBottom:14 }}>AUTO-GENERATE POSTS WHEN...</div>
            <p style={{ fontSize:12, color:'#6b7a99', marginBottom:12 }}>These generate a draft post automatically. In Safe Mode, you still review before posting.</p>
            {[
              { k:'post_trigger_offer',     l:'🏆 Job offer received',   d:'Triggers when you mark a job as "offer" in tracker' },
              { k:'post_trigger_interview', l:'🎤 Interview scheduled',   d:'Triggers when job moves to interview stage' },
              { k:'post_trigger_milestone', l:'⚡ Milestones hit',        d:'50/100 apps, 7/14/30-day streaks, weekly Friday update' },
            ].map(t => (
              <div key={t.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(99,130,255,0.06)' }}>
                <div>
                  <div style={{ fontSize:14, color:'white', fontWeight:500 }}>{t.l}</div>
                  <div style={{ fontSize:12, color:'#6b7a99' }}>{t.d}</div>
                </div>
                <button onClick={()=>setSettings({...settings,[t.k]:!(settings as Record<string,boolean>)[t.k]})}
                  style={{ padding:'6px 14px', borderRadius:16, border:`1px solid ${(settings as Record<string,boolean>)[t.k]?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)'}`, background:(settings as Record<string,boolean>)[t.k]?'rgba(59,130,246,0.1)':'transparent', color:(settings as Record<string,boolean>)[t.k]?'#3b82f6':'#6b7a99', cursor:'pointer', fontSize:12, fontWeight:600, flexShrink:0, marginLeft:14 }}>
                  {(settings as Record<string,boolean>)[t.k]?'✓ On':'Off'}
                </button>
              </div>
            ))}
          </div>

          <button onClick={saveSettings} disabled={savingSettings} className="btn-primary" style={{ justifyContent:'center', padding:'14px', fontSize:15 }}>
            {savingSettings ? <><RefreshCw size={13}/> Saving...</> : <><Check size={13}/> Save Settings</>}
          </button>
        </div>
      )}
    </div>
  )
}
