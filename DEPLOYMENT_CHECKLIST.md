# MerchantOS Production Deployment Checklist

Complete this checklist before launching MerchantOS to production.

## ✅ Pre-Deployment

### 1. Environment Variables

- [ ] Copy `.env.example` to `.env` and fill in all **REQUIRED** variables
- [ ] Set `STRIPE_SECRET_KEY` to live key (starts with `sk_live_`)
- [ ] Set `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard webhook registration)
- [ ] Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live key (starts with `pk_live_`)
- [ ] Configure `DATABASE_URL` and `DIRECT_URL` for production PostgreSQL
- [ ] Set `RESEND_API_KEY` for transactional emails
- [ ] Set `NEXT_PUBLIC_SITE_URL` to actual production domain (e.g., `https://yourdomain.com`)
- [ ] Configure `BREVO_API_KEY` for marketing emails (if using)
- [ ] Set `SHIPPO_API_KEY` or `EASYPOST_API_KEY` for shipping labels (if using)
- [ ] Verify all environment variables in Vercel/deployment platform dashboard

### 2. Database Setup

- [ ] Run `npx prisma migrate deploy` against production database
- [ ] Verify all migrations applied successfully
- [ ] Create at least one test store/organization record
- [ ] Test database connection: `npx prisma db pull`

### 2.1. Storage Buckets Required

- [ ] Create public bucket: `html-stores` in Supabase Storage
- [ ] Create private bucket: `product-files` in Supabase Storage
- [ ] Verify bucket policies are correctly set
- [ ] Test file upload to both buckets

### 2.2. Cron Jobs Required

Set up the following cron jobs (configured in `vercel.json`):

- [ ] `GET /api/cron/abandoned-carts` — every 15 minutes
- [ ] `GET /api/cron/billing-reminders` — daily at 9am UTC
- [ ] `GET /api/cron/onboarding-emails` — daily at 10am UTC
- [ ] All cron endpoints require `Authorization: Bearer [CRON_SECRET]` header

### 2.3. New Environment Variables

- [ ] `CRON_SECRET` — random string for cron authentication (generate with `openssl rand -base64 32`)

### 3. Webhook Registration

#### Stripe Webhooks

- [ ] Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
- [ ] Click "Add endpoint"
- [ ] Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Select these events:
  - [x] `checkout.session.completed`
  - [x] `payment_intent.succeeded`
  - [x] `payment_intent.payment_failed`
  - [x] `invoice.paid`
  - [x] `invoice.payment_failed`
  - [x] `customer.subscription.deleted`
  - [x] `charge.refunded`
- [ ] Copy the "Signing secret" (starts with `whsec_`)
- [ ] Set `STRIPE_WEBHOOK_SECRET` environment variable to this value

#### Shippo Webhooks (if using)

- [ ] Go to [Shippo Dashboard → API → Webhooks](https://app.goshippo.com)
- [ ] Add webhook URL: `https://yourdomain.com/api/webhooks/shippo`
- [ ] Select tracking events: `track_updated`, `track_delivered`
- [ ] Copy webhook secret and set `SHIPPO_WEBHOOK_SECRET`

#### Brevo Webhooks (optional)

- [ ] Go to [Brevo → Webhooks](https://app.brevo.com/webhooks)
- [ ] Add webhook URL: `https://yourdomain.com/api/webhooks/brevo`
- [ ] Select events: `opened`, `click`, `unsubscribed`, `bounced`

### 4. External Service Configuration

#### Email Setup

- [ ] Verify sender domain in Resend
- [ ] Add SPF and DKIM DNS records for email domain
- [ ] Send test transactional email
- [ ] If using Brevo: verify domain and add to contacts

#### Shipping Setup (if applicable)

- [ ] Verify Shippo or EasyPost API keys are live (not test)
- [ ] Configure ship-from address in Settings
- [ ] Test label creation with a test order

## ✅ Deployment

### 1. Deploy to Vercel (or your platform)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

- [ ] Build completes without errors
- [ ] All environment variables set in Vercel dashboard
- [ ] Custom domain configured and SSL enabled
- [ ] Edge Functions enabled (if using)

### 2. Post-Deployment Verification

- [ ] Visit `https://yourdomain.com/api/health` - should return `{"status":"ok"}`
- [ ] Homepage loads correctly
- [ ] Sign in to merchant dashboard works
- [ ] Settings page loads
- [ ] Create a test product

### 3. Test End-to-End Purchase Flow

**Critical Path Test:**

- [ ] Create a test product with price
- [ ] Add to cart as customer
- [ ] Proceed to checkout
- [ ] Use Stripe test card: `4242 4242 4242 4242`
- [ ] Complete purchase
- [ ] Verify order appears in Orders Dashboard
- [ ] Verify order confirmation email received
- [ ] If affiliate tracking enabled: test with `?ref=TEST` parameter
- [ ] If physical product: verify Shippo shipment auto-created

### 4. Stripe Live Mode Switch

**⚠️ Only after successful test purchase:**

- [ ] In Stripe dashboard, switch to "Live mode"
- [ ] Update environment variables:
  - [ ] `STRIPE_SECRET_KEY` → live key
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → live key
  - [ ] `STRIPE_WEBHOOK_SECRET` → live webhook secret
- [ ] Redeploy application
- [ ] Re-register webhook endpoint with live Stripe account
- [ ] Perform one real test purchase with real card
- [ ] Immediately refund test purchase

## ✅ Post-Launch

### 1. Monitoring

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up `/api/health` endpoint monitoring
- [ ] Monitor Vercel deployment logs
- [ ] Watch for webhook delivery failures in Stripe dashboard

### 2. Performance

- [ ] Run Lighthouse audit (target: 90+ performance score)
- [ ] Test page load times from multiple locations
- [ ] Verify CDN caching is working
- [ ] Check database query performance

### 3. Security

- [ ] Enable HTTPS everywhere (verify no mixed content)
- [ ] Review CSP headers
- [ ] Test rate limiting on affiliate tracking endpoint
- [ ] Audit user permissions and access controls
- [ ] Enable 2FA for admin accounts

### 4. Legal & Compliance

- [ ] Add Terms of Service at `/p/terms`
- [ ] Add Privacy Policy at `/p/privacy`
- [ ] Configure cookie consent banner (if EU traffic)
- [ ] Review PCI compliance for payment handling
- [ ] Add GDPR data export/deletion if applicable

## ✅ Optional Enhancements

- [ ] Configure custom email domain with Resend
- [ ] Set up email warming schedule if high volume
- [ ] Enable Google Analytics via `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- [ ] Configure Facebook Pixel via store settings
- [ ] Set up backup automation for database
- [ ] Document admin procedures for team
- [ ] Create runbook for common issues

## 🚨 Emergency Rollback

If critical issues arise:

```bash
# Revert to previous deployment
vercel rollback

# Or switch Stripe back to test mode
# Update env vars and redeploy
```

## 📞 Support Resources

- **Stripe Support**: https://support.stripe.com
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Documentation**: See `/README.md`, `/WORKER_SETUP.md`

---

**Final Checklist Sign-off:**

- [ ] All critical tests passed
- [ ] All webhooks registered and tested
- [ ] Monitoring enabled
- [ ] Team trained on admin dashboard
- [ ] Emergency contacts documented
- [ ] Backup/restore procedure tested

**Deployed by:** ________________  
**Date:** ________________  
**Production URL:** ________________
