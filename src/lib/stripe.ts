import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PLANS = {
  free: { name: 'Free', price: 0, interval: null as null },
  pro_monthly: {
    name: 'Pro Monthly',
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    price: 499,
    interval: 'month' as const,
  },
  pro_annual: {
    name: 'Pro Annual',
    priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
    price: 2999,
    interval: 'year' as const,
  },
}

export async function createCheckoutSession(userId: string, email: string, priceId: string, referralCode?: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: { trial_period_days: 7 },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId, referralCode: referralCode || '' },
    allow_promotion_codes: true,
  })
  return session
}

export async function createPortalSession(customerId: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })
}
