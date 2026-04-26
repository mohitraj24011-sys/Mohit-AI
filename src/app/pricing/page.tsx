'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Check, Zap, Users, Building2 } from 'lucide-react'

const FREE_FEATURES = [
  '3 AI resumes/day + ATS scorer',
  '5 opportunity scans (22 platforms)',
  '3 AI agent uses/day (all 10)',
  '2 cover letters/day',
  'Job tracker + network tracker (unlimited)',
  'Daily challenges + XP + streaks',
  'Community feed access',
  'Basic background automation',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited AI resume + ATS (all versions)',
  'Unlimited AI agents — all 10 Nova agents',
  'Unlimited opportunity scans (22 platforms)',
  'Auto-Apply Engine — 30 jobs/day automated',
  'LinkedIn AI Extender — unlimited',
  'Interview coach + salary negotiation scripts',
  'Profile optimizer — all 6 platforms',
  'Salary benchmarker — India + global',
  'Offer comparator + negotiation scripts',
  'Company intelligence — unlimited research',
  'Learning engine — real Udemy/YouTube links',
  'Social post engine — LinkedIn + Naukri',
  'Funnel analytics — conversion tracking',
  'Priority support',
]

const ELITE_FEATURES = [
  'Everything in Pro',
  'White-glove onboarding call (30 min)',
  'Personal career strategy session',
  'Custom resume review by expert',
  'Interview prep 1-on-1 session',
  'Salary negotiation coaching call',
  'Direct access to Mohit for 90 days',
  'Referral to hiring managers in network',
  'B2B client acquisition coaching (if needed)',
  '90-day offer guarantee or refund',
]

export default function Pricing() {
  const [annual, setAnnual]   = useState(false)
  const [loading, setLoading] = useState<string|null>(null)
  const [userType, setUserType] = useState<'job_seeker'|'client_seeker'>('job_seeker')

  const checkout = async (tier: 'pro'|'elite') => {
    setLoading(tier)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth'; return }

      if (tier === 'elite') {
        // Elite: WhatsApp contact (no Stripe — personal)
        window.open('https://wa.me/919999999999?text=Hi%20Mohit%2C%20I%20want%20Elite%20access%20to%20MohitJob%20AI.%20My%20target%20role%20is%20[ROLE]%20and%20I%27m%20looking%20to%20get%20placed%20in%20[TIMEFRAME].', '_blank')
        setLoading(null)
        return
      }

      const priceId = annual
        ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) { console.error(e) }
    setLoading(null)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 36, fontWeight: 800, color: 'white', marginBottom: 10 }}>
          Start free. Upgrade when you need more.
        </h1>
        <p style={{ color: '#6b7a99', fontSize: 16, marginBottom: 24 }}>
          Free forever. Pro unlocks unlimited AI + auto-apply. Elite gets you placed.
        </p>

        {/* User type toggle */}
        <div style={{ display:'inline-flex', gap:4, padding:'4px', background:'var(--card)', borderRadius:10, border:'1px solid var(--card-border)', marginBottom:24 }}>
          <button onClick={()=>setUserType('job_seeker')}
            style={{ padding:'8px 18px', borderRadius:7, border:'none', background:userType==='job_seeker'?'#3b82f6':'transparent', color:userType==='job_seeker'?'white':'#6b7a99', cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
            <Users size={13}/> Job Seeker
          </button>
          <button onClick={()=>setUserType('client_seeker')}
            style={{ padding:'8px 18px', borderRadius:7, border:'none', background:userType==='client_seeker'?'#10b981':'transparent', color:userType==='client_seeker'?'white':'#6b7a99', cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
            <Building2 size={13}/> Dev Agency
          </button>
        </div>

        {/* Annual toggle */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'6px 6px', background:'var(--card)', border:'1px solid var(--card-border)', borderRadius:10 }}>
            <button onClick={()=>setAnnual(false)} style={{ padding:'7px 16px', borderRadius:7, border:'none', background:!annual?'#3b82f6':'transparent', color:!annual?'white':'#6b7a99', cursor:'pointer', fontSize:13, fontWeight:500 }}>Monthly</button>
            <button onClick={()=>setAnnual(true)} style={{ padding:'7px 16px', borderRadius:7, border:'none', background:annual?'#3b82f6':'transparent', color:annual?'white':'#6b7a99', cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
              Annual <span style={{ background:'#10b981', color:'white', fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:700 }}>SAVE 50%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>

        {/* Free */}
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'white', marginBottom:6 }}>Free</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:38, fontWeight:800, color:'white' }}>
              ₹0<span style={{ fontSize:15, color:'#6b7a99', fontWeight:400 }}>/forever</span>
            </div>
            <p style={{ color:'#6b7a99', fontSize:13, marginTop:8 }}>Try the full platform. No credit card. No expiry.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            {FREE_FEATURES.map(f => (
              <div key={f} style={{ display:'flex', gap:8, fontSize:13 }}>
                <Check size={13} color="#6b7a99" style={{ flexShrink:0, marginTop:2 }}/>
                <span style={{ color:'#6b7a99' }}>{f}</span>
              </div>
            ))}
          </div>
          <a href="/auth">
            <button className="btn-ghost" style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
              Start Free — No card needed
            </button>
          </a>
        </div>

        {/* Pro */}
        <div className="card" style={{ borderColor:'rgba(59,130,246,0.4)', background:'linear-gradient(135deg,rgba(59,130,246,0.05),rgba(139,92,246,0.04))', position:'relative' }}>
          <div style={{ position:'absolute', top:-10, right:16, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', color:'white', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>MOST POPULAR</div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'white', marginBottom:6 }}>Pro</div>
            {annual ? (
              <>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:38, fontWeight:800, color:'white' }}>
                  ₹249<span style={{ fontSize:15, color:'#6b7a99', fontWeight:400 }}>/month</span>
                </div>
                <div style={{ fontSize:13, color:'#34d399', marginBottom:2 }}>Billed ₹2,999/year · You save ₹3,000</div>
              </>
            ) : (
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:38, fontWeight:800, color:'white' }}>
                ₹499<span style={{ fontSize:15, color:'#6b7a99', fontWeight:400 }}>/month</span>
              </div>
            )}
            <p style={{ color:'#6b7a99', fontSize:13, marginTop:8 }}>7-day free trial. Cancel anytime. No risk.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            {PRO_FEATURES.map(f => (
              <div key={f} style={{ display:'flex', gap:8, fontSize:13 }}>
                <Check size={13} color="#3b82f6" style={{ flexShrink:0, marginTop:2 }}/>
                <span style={{ color:f === 'Everything in Free' ? '#6b7a99' : 'var(--text)' }}>{f}</span>
              </div>
            ))}
          </div>
          <button onClick={() => checkout('pro')} disabled={loading === 'pro'}
            className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', fontSize:15 }}>
            <Zap size={15}/> {loading==='pro' ? 'Redirecting...' : 'Start 7-Day Free Trial'}
          </button>
          <p style={{ textAlign:'center', fontSize:11, color:'#6b7a99', marginTop:10 }}>No card required for trial · Cancel anytime</p>
        </div>

        {/* Elite */}
        <div className="card" style={{ borderColor:'rgba(16,185,129,0.4)', background:'linear-gradient(135deg,rgba(16,185,129,0.05),rgba(16,185,129,0.02))', position:'relative' }}>
          <div style={{ position:'absolute', top:-10, right:16, background:'linear-gradient(135deg,#10b981,#059669)', color:'white', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6 }}>GUARANTEED</div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'white', marginBottom:6 }}>Elite</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:38, fontWeight:800, color:'#10b981' }}>
              ₹9,999<span style={{ fontSize:15, color:'#6b7a99', fontWeight:400 }}>/once</span>
            </div>
            <p style={{ color:'#6b7a99', fontSize:13, marginTop:8 }}>Done-with-you. Personal coaching. Placed in 90 days or refund.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            {ELITE_FEATURES.map(f => (
              <div key={f} style={{ display:'flex', gap:8, fontSize:13 }}>
                <Check size={13} color="#10b981" style={{ flexShrink:0, marginTop:2 }}/>
                <span style={{ color:f === 'Everything in Pro' ? '#6b7a99' : 'var(--text)' }}>{f}</span>
              </div>
            ))}
          </div>
          <button onClick={() => checkout('elite')} disabled={loading==='elite'}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'white', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, cursor:'pointer' }}>
            {loading==='elite' ? 'Connecting...' : '📱 Contact on WhatsApp →'}
          </button>
          <p style={{ textAlign:'center', fontSize:11, color:'#6b7a99', marginTop:10 }}>Limited spots · WhatsApp response within 2 hours</p>
        </div>
      </div>

      {/* Referral + social proof */}
      <div style={{ marginTop:28, display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <div style={{ padding:'20px 24px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12 }}>
          <div style={{ fontWeight:700, color:'white', fontSize:15, marginBottom:6 }}>🎁 Refer a friend — both get +5 credits free</div>
          <div style={{ fontSize:13, color:'#6b7a99', marginBottom:12 }}>3 referrals = 1 month Pro free. Share your unique link from /billing.</div>
          <a href="/billing"><button className="btn-accent" style={{ fontSize:13 }}>Get Your Referral Link</button></a>
        </div>
        <div style={{ padding:'20px 24px', background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:12 }}>
          <div style={{ fontWeight:700, color:'white', fontSize:15, marginBottom:6 }}>💰 ROI is obvious</div>
          <div style={{ fontSize:13, color:'#6b7a99', lineHeight:1.7 }}>
            One interview → typically 2-4 LPA salary jump.<br/>
            Pro costs ₹499/month.<br/>
            <strong style={{ color:'white' }}>One offer = 400x return on investment.</strong>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop:40 }}>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'white', textAlign:'center', marginBottom:24 }}>Common questions</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { q:'Does auto-apply actually work?', a:'Yes — the Playwright worker applies to LinkedIn Easy Apply roles automatically. Max 15/day with human-like delays. You control it from the Auto-Apply page.' },
            { q:'Is it safe for LinkedIn?', a:'Yes. We use session-based auth (not login automation), human-like delays (30-90s between applies), and a safe limit of 15/day. Same as what a fast human would do.' },
            { q:'What\'s the Elite guarantee?', a:'If you don\'t receive at least 3 interview calls in 90 days of active use, we refund 100%. No questions.' },
            { q:'Can I switch between Job Seeker and Client mode?', a:'Yes — one click in the nav bar switches modes. Same account, same data, different experience.' },
            { q:'Does the free plan expire?', a:'Never. Free is free forever. Daily limits reset at midnight IST.' },
            { q:'What happens when I hit a daily limit?', a:'You see the upgrade screen. Referral credits from inviting friends can extend limits without upgrading.' },
          ].map(({ q, a }) => (
            <div key={q} className="card" style={{ padding:'16px' }}>
              <div style={{ fontWeight:700, color:'white', fontSize:14, marginBottom:6 }}>{q}</div>
              <div style={{ fontSize:13, color:'#6b7a99', lineHeight:1.65 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
