'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Megaphone, Copy, Check, RefreshCw, Zap } from 'lucide-react'

const POST_TYPES = [
  { id: 'problem_hook',    label: '🎯 Problem Hook',         desc: 'Start with the pain, offer the solution' },
  { id: 'story',           label: '📖 Personal Story',       desc: 'Why you built this product' },
  { id: 'feature_reveal',  label: '⚡ Feature Reveal',       desc: 'Show the auto-apply working' },
  { id: 'social_proof',    label: '🏆 Social Proof',         desc: 'User got an offer using your tool' },
  { id: 'free_offer',      label: '🎁 Free Credits Offer',   desc: 'Give away credits for early users' },
  { id: 'whatsapp_blast',  label: '💬 WhatsApp Blast',       desc: 'Short message for WhatsApp groups' },
  { id: 'dm_outreach',     label: '📨 DM Script',            desc: 'Message for "Open to Work" profiles' },
  { id: 'reddit_post',     label: '🟠 Reddit Post',          desc: 'For r/developersIndia' },
]

const PLATFORMS = ['LinkedIn', 'Twitter/X', 'WhatsApp', 'Reddit', 'Instagram']

export default function OutreachPage() {
  const [postType, setPostType] = useState('problem_hook')
  const [platform, setPlatform] = useState('LinkedIn')
  const [tone, setTone]         = useState('authentic')
  const [result, setResult]     = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState<string|null>(null)

  const generate = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const res = await fetch('/api/outreach-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type: postType, platform, tone, targetAudience: 'Indian software engineers job hunting, 2-8 years exp' }),
    })
    if (res.ok) setResult(await res.json())
    setLoading(false)
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const r = result as {
    post?: string; hook?: string; hashtags?: string[]; cta?: string;
    variants?: string[]; dmScript?: string; whatsappMessage?: string;
    bestTimeToPost?: string; expectedReach?: string
  } | null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Megaphone size={22} color="#f59e0b" /> Growth Copy Generator
        </h1>
        <p style={{ color: '#6b7a99' }}>Generate viral posts, DM scripts and WhatsApp messages to get your first users. Tailored for Indian IT communities.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="label-sm" style={{ marginBottom: 10 }}>POST TYPE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {POST_TYPES.map(t => (
                <button key={t.id} onClick={() => setPostType(t.id)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${postType === t.id ? '#3b82f6' : 'rgba(255,255,255,0.06)'}`, background: postType === t.id ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: postType === t.id ? 'white' : '#6b7a99', fontWeight: 500 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7a99' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="label-sm" style={{ marginBottom: 8 }}>PLATFORM</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${platform === p ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, background: platform === p ? 'rgba(59,130,246,0.12)' : 'transparent', color: platform === p ? '#60a5fa' : '#6b7a99', cursor: 'pointer', fontSize: 12 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="label-sm" style={{ marginBottom: 8 }}>TONE</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['authentic', 'bold', 'humble', 'urgent', 'story-driven'].map(t => (
                <button key={t} onClick={() => setTone(t)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${tone === t ? '#10b981' : 'rgba(255,255,255,0.08)'}`, background: tone === t ? 'rgba(16,185,129,0.1)' : 'transparent', color: tone === t ? '#10b981' : '#6b7a99', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={generate} disabled={loading} style={{ justifyContent: 'center', padding: '13px' }}>
            {loading ? <><RefreshCw size={14} /> Generating...</> : <><Zap size={14} /> Generate Copy</>}
          </button>

          {/* Quick tips */}
          <div className="card" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
            <div className="label-sm" style={{ color: '#f59e0b', marginBottom: 10 }}>🔥 HOW TO GET FIRST USERS</div>
            {[
              '1. Post on LinkedIn (2 posts/week)',
              '2. DM 20 "Open to Work" profiles daily',
              '3. Blast 5 WhatsApp groups',
              '4. Post in r/developersIndia',
              '5. Ask friends to share referral link',
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: '#6b7a99', marginBottom: 5 }}>{tip}</div>
            ))}
          </div>
        </div>

        {/* Output */}
        <div>
          {r ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Main post */}
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="label-sm" style={{ color: '#3b82f6' }}>MAIN {platform.toUpperCase()} POST</div>
                    {r.bestTimeToPost && <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 3 }}>📅 Best time: {r.bestTimeToPost} · Est. reach: {r.expectedReach}</div>}
                  </div>
                  <button onClick={() => copy(r.post || '', 'main')} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }}>
                    {copied === 'main' ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                {r.hook && (
                  <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, fontSize: 13, color: '#60a5fa', fontWeight: 600, marginBottom: 10 }}>
                    🪝 Hook: {r.hook}
                  </div>
                )}
                <div style={{ background: '#0d1421', borderRadius: 10, padding: '14px 16px', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'DM Sans,sans-serif' }}>
                  {r.post}
                </div>
                {r.hashtags && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.hashtags.map((h: string) => <span key={h} className="badge badge-blue" style={{ fontSize: 11 }}>{h}</span>)}
                  </div>
                )}
              </div>

              {/* Variants */}
              {r.variants && r.variants.length > 0 && (
                <div className="card">
                  <div className="label-sm" style={{ marginBottom: 12 }}>✂️ VARIANTS</div>
                  {r.variants.map((v: string, i: number) => (
                    <div key={i} style={{ marginBottom: 12, padding: '12px 14px', background: '#0d1421', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#6b7a99', fontWeight: 600 }}>Variant {i + 1}</span>
                        <button onClick={() => copy(v, `v${i}`)} className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                          {copied === `v${i}` ? <><Check size={10} /> Done</> : <><Copy size={10} /> Copy</>}
                        </button>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#e2e8f4', whiteSpace: 'pre-wrap' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* DM + WhatsApp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {r.dmScript && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className="label-sm" style={{ color: '#8b5cf6' }}>📨 DM SCRIPT</div>
                      <button onClick={() => copy(r.dmScript || '', 'dm')} className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                        {copied === 'dm' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: '#e2e8f4', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{r.dmScript}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 8 }}>Send to LinkedIn profiles with "Open to Work" badge</div>
                  </div>
                )}
                {r.whatsappMessage && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className="label-sm" style={{ color: '#10b981' }}>💬 WHATSAPP BLAST</div>
                      <button onClick={() => copy(r.whatsappMessage || '', 'wa')} className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                        {copied === 'wa' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: '#e2e8f4', whiteSpace: 'pre-wrap' }}>{r.whatsappMessage}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 8 }}>Send to college alumni, tech, and job-hunt groups</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <Megaphone size={40} color="#2d3b52" />
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: 'white', fontSize: 16 }}>Generate growth copy</div>
              <p style={{ color: '#6b7a99', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
                Pick a post type, platform and tone — get a complete copy kit: main post, 3 variants, DM script, WhatsApp blast, hashtags, and best posting time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
