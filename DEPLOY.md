# MohitJob AI — Production Deployment Guide

## 5-Minute Deploy

### 1. Supabase Setup
1. Create project at supabase.com
2. SQL Editor → paste `supabase_schema.sql` → Run
3. Copy: Project URL, anon key, service role key

### 2. Stripe Setup
1. Create account at stripe.com
2. Create Product → 2 prices:
   - Monthly: ₹499/month recurring
   - Annual: ₹2999/year recurring
3. Copy price IDs
4. Webhooks → Add endpoint: `https://yourdomain.com/api/stripe/webhook`
5. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 3. Environment Variables
```bash
cp .env.local.example .env.local
# Fill all values
```

### 4. Deploy Next.js (Vercel)
```bash
npm install
vercel --prod
# Add env vars in Vercel dashboard
```

### 5. Deploy Worker (Railway/Render)
```bash
cd worker
npm install
npx playwright install chromium
cp .env.example .env
# Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# First: capture LinkedIn session
npx ts-node -e "import('./linkedin').then(m => m.captureLinkedInSession())"
# Login manually, then:
node dist/index.js
```

## Architecture

```
Next.js App (Vercel)          Worker (Railway/Render)
├── 26 API routes             ├── Auto-apply bot
├── 24 pages                  ├── LinkedIn Playwright
├── PaywallGate (UI)          ├── Queue processor
├── Stripe billing            └── Anti-ban safety
├── Referral system
├── Onboarding flow
├── Funnel analytics
└── War Room dashboard

Supabase                      Cron (Vercel)
├── 20 tables                 └── /api/background-scan
├── RLS policies                  (every 6 hours)
├── Auto user creation
└── Credit functions
```

## Feature Complete Checklist

### Revenue
- [x] Free tier (3 resumes/day, 3 agents/day)
- [x] Pro tier (₹499/mo or ₹2999/yr)
- [x] 7-day free trial
- [x] Stripe Checkout + webhook + portal
- [x] PaywallGate on ALL premium pages
- [x] API-level enforcement (429 on limit hit)
- [x] Credits system via referrals

### Growth
- [x] Referral codes (auto-generated on signup)
- [x] +5 credits for referrer + referee
- [x] Referral link with copy + share buttons
- [x] Win capture with LinkedIn post generator
- [x] Public social proof display

### Activation
- [x] 3-step onboarding wizard
- [x] OnboardingFlow progress tracker
- [x] Guided CTAs per step
- [x] Personalization memory (AI uses your profile in every prompt)

### Analytics
- [x] Funnel: Applied → Screen → Interview → Offer
- [x] Time-to-interview, time-to-offer metrics
- [x] Platform effectiveness breakdown
- [x] Network funnel analytics
- [x] Daily War Room dashboard
- [x] Funnel events tracking

### AI Features
- [x] Resume builder (ATS-optimized bullets)
- [x] 5-dimension ATS scorer (local, no API cost)
- [x] Cover letter (4 tones)
- [x] 10 Nova AI agents
- [x] LinkedIn AI Extender (connection + reply analyzer)
- [x] Skill Gap Analysis + 90-day roadmap
- [x] Learning Engine (Udemy/YouTube links)
- [x] Interview Coach + answer evaluator
- [x] Role Strategy Advisor (Fresher → CTO)
- [x] Profile Optimizer (LinkedIn/Naukri/GitHub/Indeed)
- [x] Market Intelligence Q&A
- [x] Auto-Apply tailoring (resume headline + cover letter per job)
- [x] AI Personalization Memory (user context in every prompt)

### Automation
- [x] Background scan cron (every 6 hours)
- [x] Auto follow-up message generation
- [x] Auto connection message generation
- [x] Application queue management
- [x] Worker auto-apply (LinkedIn Easy Apply)
- [x] War Room daily digest
- [x] Win capture + viral LinkedIn post

### Job Discovery
- [x] 22-platform opportunity scanner
- [x] Google X-Ray searches
- [x] Hidden source finder
- [x] Weekly routine generator
- [x] Job ingestion API

## Safe Limits (Worker)
- Max 15 applies/day (hard limit)
- 30-90 second delay between applies
- Session-based auth (no login automation)
- HEADLESS=false for debugging
- Screenshot audit trail
