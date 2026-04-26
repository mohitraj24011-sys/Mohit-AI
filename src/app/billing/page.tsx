'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, Check, Gift, CreditCard, Zap, Users } from 'lucide-react'

export default function Billing() {
  const [plan, setPlan]             = useState<Record<string,unknown>|null>(null)
  const [usage, setUsage]           = useState<Record<string,{used:number;limit:number;remaining:number;pct:number}>|null>(null)
  const [referral, setReferral]     = useState<{code:string;referralLink:string;totalReferrals:number;credits:number}|null>(null)
  const [loading, setLoading]       = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const tok = session.access_token
      const headers = { Authorization: `Bearer ${tok}` }
      const [uRes, rRes] = await Promise.all([
        fetch('/api/usage', { headers }),
        fetch('/api/referral', { headers }),
      ])
      const [uData, rData] = await Promise.all([uRes.json(), rRes.json()])
      setPlan({ plan: uData.plan, credits: uData.credits })
      setUsage(uData.usage)
      setReferral(rData)
      setLoading(false)
    }
    load()
  }, [])

  const openPortal = async () => {
    setPortalLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    const { url } = await res.json()
    if (url) window.location.href = url
    setPortalLoading(false)
  }

  const copyLink = () => {
    if (referral?.referralLink) {
      navigator.clipboard.writeText(referral.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isPro = plan?.plan === 'pro' || plan?.plan === 'enterprise'

  if (loading) return <div style={{ padding: 40, color: '#6b7a99', textAlign: 'center' }}>Loading...</div>

  const FEAT_LABELS: Record<string,string> = { resume:'Resume Builder', ats:'ATS Checker', cover_letter:'Cover Letter', agents:'AI Agents', gap_analysis:'Gap Analysis', interview_prep:'Interview Coach', profile_optimizer:'Profile Optimizer', opportunity_scan:'Opportunity Scan', linkedin_extender:'LinkedIn AI', auto_apply:'Auto-Apply', learning:'Learning Engine', market_trends:'Market Intel' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:8 }}>Billing & Credits</h1>
      <p style={{ color:'#6b7a99', marginBottom:28 }}>Manage your plan, track usage, and earn credits by referring friends</p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:24 }}>
        {/* Plan card */}
        <div className="card" style={{ borderColor: isPro ? 'rgba(59,130,246,0.4)' : 'var(--card-border)' }}>
          <div className="label-sm" style={{ color: isPro ? '#60a5fa' : '#6b7a99', marginBottom:12 }}>CURRENT PLAN</div>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'white', marginBottom:4 }}>
            {isPro ? '✨ Pro' : 'Free'}
          </div>
          <div style={{ fontSize:13, color:'#6b7a99', marginBottom:16 }}>
            {isPro ? 'Unlimited access to all features' : '3 resumes/day · 3 agents/day'}
          </div>
          {isPro ? (
            <button className="btn-ghost" onClick={openPortal} disabled={portalLoading} style={{ width:'100%', justifyContent:'center' }}>
              <CreditCard size={13}/> {portalLoading?'Redirecting...':'Manage Subscription'}
            </button>
          ) : (
            <a href="/pricing">
              <button className="btn-primary" style={{ width:'100%', justifyContent:'center', background:'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                <Zap size={13}/> Upgrade to Pro — ₹499/mo
              </button>
            </a>
          )}
        </div>

        {/* Credits */}
        <div className="card">
          <div className="label-sm" style={{ color:'#10b981', marginBottom:12 }}>YOUR CREDITS</div>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, color:'#10b981', marginBottom:4 }}>
            {referral?.credits || plan?.credits || 0}
          </div>
          <div style={{ fontSize:13, color:'#6b7a99', marginBottom:12 }}>credits = extra uses on any feature</div>
          <div style={{ fontSize:12, color:'#6b7a99', padding:'8px 12px', background:'rgba(16,185,129,0.06)', borderRadius:8 }}>
            Earn 5 credits per successful referral. Credits never expire.
          </div>
        </div>
      </div>

      {/* Referral section */}
      <div className="card" style={{ marginBottom:24, borderColor:'rgba(16,185,129,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(16,185,129,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Gift size={18} color="#10b981"/>
          </div>
          <div>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'white' }}>Invite & Earn 🎁</div>
            <div style={{ fontSize:13, color:'#6b7a99' }}>Both you and your friend get +5 credits instantly</div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'#10b981' }}>{referral?.totalReferrals || 0}</div>
            <div style={{ fontSize:11, color:'#6b7a99' }}>referrals</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <input readOnly className="input-dark" value={referral?.referralLink || 'Loading...'} style={{ flex:1, fontSize:12, fontFamily:'JetBrains Mono,monospace' }}/>
          <button onClick={copyLink} className="btn-accent" style={{ padding:'10px 14px', flexShrink:0 }}>
            {copied?<><Check size={13}/> Copied!</>:<><Copy size={13}/> Copy</>}
          </button>
        </div>
        <div style={{ fontSize:12, color:'#6b7a99' }}>
          Your code: <strong style={{ color:'white', fontFamily:'JetBrains Mono,monospace' }}>{referral?.code || '...'}</strong>
          {(referral?.totalReferrals || 0) >= 3 && <span style={{ marginLeft:12, color:'#10b981', fontWeight:700 }}>🎉 1 month Pro earned!</span>}
        </div>
        <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
          {[['Twitter/X', 'https://twitter.com/intent/tweet?text=I%27m%20using%20MohitJob%20AI%20for%20my%20job%20search%20—%20it%27s%20incredible.%20Use%20my%20link%3A%20'], ['LinkedIn', '#'], ['WhatsApp', `https://wa.me/?text=Try%20MohitJob%20AI%20—%20the%20best%20AI%20job%20search%20platform%20for%20Indian%20IT.%20`]].map(([name, base]) => (
            <a key={name} href={`${base}${referral?.referralLink || ''}`} target="_blank" rel="noopener noreferrer">
              <button className="btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}><Users size={11}/> Share on {name}</button>
            </a>
          ))}
        </div>
      </div>

      {/* Usage breakdown */}
      {usage && (
        <div className="card">
          <div className="label-sm" style={{ marginBottom:16 }}>TODAY'S USAGE</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {Object.entries(usage).map(([feat, data]) => (
              <div key={feat} style={{ padding:'10px 12px', background:'var(--bg2)', borderRadius:9 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                  <span style={{ color:'#6b7a99' }}>{FEAT_LABELS[feat]||feat}</span>
                  <span style={{ fontWeight:700, color:data.pct>=80?'#ef4444':data.pct>=60?'#f59e0b':'#10b981' }}>{data.used}/{data.limit}</span>
                </div>
                <div className="usage-bar">
                  <div className={`usage-fill ${data.pct>=80?'red':data.pct>=60?'amber':'green'}`} style={{ width:`${data.pct}%` }}/>
                </div>
              </div>
            ))}
          </div>
          {!isPro && (
            <div style={{ marginTop:16, textAlign:'center' }}>
              <a href="/pricing">
                <button className="btn-primary" style={{ fontSize:13 }}><Zap size={13} /> Upgrade for unlimited access</button>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
