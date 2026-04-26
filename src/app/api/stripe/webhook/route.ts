import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Idempotency check
  const { data: existing } = await db.from('stripe_events').select('id').eq('id', event.id).single()
  if (existing) return NextResponse.json({ received: true })
  await db.from('stripe_events').insert({ id: event.id, type: event.type })

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (!userId) return NextResponse.json({ received: true })

      await db.from('user_plans').upsert({
        user_id: userId,
        plan: 'pro',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        stripe_price_id: session.metadata?.priceId,
        status: 'trialing',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Record win event
      await db.from('funnel_events').insert({
        user_id: userId,
        event: 'subscription_started',
        properties: { plan: 'pro' },
      })
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      const { data: plan } = await db
        .from('user_plans')
        .select('user_id')
        .eq('stripe_subscription_id', sub.id)
        .single()

      if (plan) {
        await db.from('user_plans').update({
          status: sub.status,
          plan: sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', plan.user_id)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await db.from('user_plans').update({
        plan: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id)
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      await db.from('user_plans').update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', invoice.customer as string)
    }

    await db.from('stripe_events').update({ processed: true }).eq('id', event.id)
  } catch (e) {
    console.error('Webhook handler error:', e)
  }

  return NextResponse.json({ received: true })
}
