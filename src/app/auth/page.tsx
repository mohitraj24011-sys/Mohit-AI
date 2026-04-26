'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, ArrowRight } from 'lucide-react'

import { Suspense } from 'react'

function AuthContent() {
  const router     = useRouter()
  const params     = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  useEffect(() => {
    const ref = params.get('ref')
    if (ref && typeof window !== 'undefined') localStorage.setItem('referral_code', ref)
  }, [params])

  const handle = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (isSignUp) {
        const { data, error: e } = await supabase.auth.signUp({ email, password })
        if (e) throw e
        if (data.session) {
          const ref = typeof window !== 'undefined' ? localStorage.getItem('referral_code') : ''
          router.push('/quick-start' + (ref ? `?ref=${ref}` : ''))
        } else {
          setSuccess('Check your email to confirm your account.')
        }
      } else {
        const { error: e, data: signInData } = await supabase.auth.signInWithPassword({ email, password })
        if (e) throw e
        // Route based on user type and onboarding status
        const { data: profile } = await supabase.from('profiles').select('user_type, onboarding_step').eq('id', signInData.user.id).single()
        const ut = profile?.user_type || 'job_seeker'
        const onboarded = (profile?.onboarding_step || 1) >= 2
        if (!onboarded) {
          router.push('/quick-start')
        } else if (ut === 'client_seeker') {
          router.push('/marketing')
        } else {
          router.push('/war-room')
        }
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Auth failed') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#3b82f6,#10b981)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Zap size={22} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>
            {isSignUp ? 'Start your AI job search' : 'Welcome back'}
          </h1>
          <p style={{ color: '#6b7a99', fontSize: 14 }}>{isSignUp ? '3 free resumes/day, 3 agents/day — always free' : 'Continue where you left off'}</p>
        </div>
        <div className="card">
          {[{l:'Email',t:'email',v:email,s:setEmail,p:'you@company.com'},{l:'Password',t:'password',v:password,s:setPassword,p:'8+ characters'}].map(f=>(
            <div key={f.l} style={{ marginBottom: 14 }}>
              <label className="label-sm" style={{ display: 'block', marginBottom: 6 }}>{f.l}</label>
              <input type={f.t} className="input-dark" placeholder={f.p} value={f.v}
                onChange={e=>f.s(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} />
            </div>
          ))}
          <button className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', marginTop:8 }}
            onClick={handle} disabled={loading||!email||!password}>
            {loading?'Processing...':<>{isSignUp?'Create Account':'Sign In'}<ArrowRight size={14}/></>}
          </button>
          {error   && <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(239,68,68,0.08)', borderRadius:8, color:'#f87171', fontSize:13 }}>{error}</div>}
          {success && <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(16,185,129,0.08)', borderRadius:8, color:'#34d399', fontSize:13 }}>{success}</div>}
        </div>
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button onClick={()=>{setIsSignUp(!isSignUp);setError('')}}
            style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:14 }}>
            {isSignUp?'Already have an account? Sign In':"Don't have an account? Sign Up Free"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Auth() {
  return (
    <Suspense fallback={<div style={{ color:'white', textAlign:'center', padding:50 }}>Loading...</div>}>
      <AuthContent />
    </Suspense>
  )
}
