# MerchantOS — Production Backend Setup Guide

## Quick Start

### 1. Database Setup (PostgreSQL)

**Option A: Supabase (Recommended)**
1. Create project at https://supabase.com
2. Copy connection string from Settings > Database > Connection string (URI mode)
3. Set `DATABASE_URL` in your environment

**Option B: Neon (Serverless PostgreSQL)**
1. Create project at https://neon.tech
2. Copy connection string
3. Set `DATABASE_URL`

**Option C: Railway**
1. Create PostgreSQL service at https://railway.app
2. Copy `DATABASE_URL` from service variables

### 2. Run Database Migrations

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database (first time)
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

### 3. Stripe Setup

1. Go to https://dashboard.stripe.com
2. Copy Secret Key → `STRIPE_SECRET_KEY`
3. Copy Publishable Key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Create webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `charge.refunded`
     - `customer.updated`
5. Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

**Add store metadata to Stripe checkout:**
When creating checkout sessions, include:
```javascript
metadata: {
  storeId: 'your-store-id',
  affiliateCode: 'ref_code_if_applicable',
}
```

### 4. GoAffPro Setup

1. Login to https://app.goaffpro.com
2. Go to Settings > API Keys
3. Copy Access Token → `GOAFFPRO_ACCESS_TOKEN`
4. Create webhook:
   - URL: `https://your-domain.com/api/webhooks/goaffpro`
   - Events: `affiliate.created`, `affiliate.approved`, `commission.created`, `payout.completed`
5. In MerchantOS Settings, enter your GoAffPro Store ID and API Key
6. Click "Sync Affiliates" to pull all existing affiliates

**SDK Injection:**
The GoAffPro SDK is automatically injected into storefront pages when a store has `sdkInjected: true` and a valid `goaffproApiKey`.

### 5. Brevo Setup

1. Login to https://app.brevo.com
2. Go to Settings > API Keys → Copy key → `BREVO_API_KEY`
3. Create email templates for:
   - Order Confirmation (ID → `BREVO_TEMPLATE_ORDER_CONFIRMATION`)
   - Failed Payment Recovery (ID → `BREVO_TEMPLATE_FAILED_PAYMENT`)
   - Subscription Renewal (ID → `BREVO_TEMPLATE_SUBSCRIPTION_RENEWAL`)
   - Affiliate Welcome (ID → `BREVO_TEMPLATE_AFFILIATE_WELCOME`)
   - Abandoned Cart (ID → `BREVO_TEMPLATE_ABANDONED_CART`)
4. Create webhook:
   - URL: `https://your-domain.com/api/webhooks/brevo`
   - Events: `opened`, `click`, `unsubscribed`, `bounced`

### 6. Queue Processing

The queue system uses the database by default. To process jobs:

**Manual trigger (development):**
```bash
curl -X POST https://your-domain.com/api/jobs
```

**Cron job (production):**
Set up a cron job to call `/api/jobs` every minute:
```
* * * * * curl -X POST https://your-domain.com/api/jobs?batch=20
```

**Vercel Cron (if deploying to Vercel):**
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/jobs",
      "schedule": "* * * * *"
    }
  ]
}
```

### 7. HTML Storefront Upload

Merchants can upload HTML templates via:
1. Go to Storefront in the dashboard
2. Click "Upload Template"
3. Paste raw HTML/CSS
4. The engine will:
   - Sanitize HTML (removes XSS, unsafe scripts)
   - Extract CSS and JS
   - Detect dynamic variable bindings
   - Store sanitized version

**Supported dynamic bindings:**
```html
{{store.name}}
{{product.name}}
{{product.price | currency}}
{{product.images[0]}}
{{#each products}}
  <div>{{name}} — {{price | currency}}</div>
{{/each}}
{{#if customer.name}}Welcome back, {{customer.name}}!{{/if}}
{{checkout_url}}
{{cart.total | currency}}
```

### 8. API Authentication

**Session-based (browser):**
- Login via `/api/auth/login`
- Session cookie `merchantos_session` is set automatically

**API Key (programmatic):**
- Create API key in Settings
- Pass as header: `X-API-Key: your-key`

### 9. Webhook Testing

**Stripe CLI:**
```bash
stripe listen --forward-to localhost:4028/api/webhooks/stripe
stripe trigger checkout.session.completed
```

**GoAffPro:**
Use their dashboard webhook test feature or send a POST to `/api/webhooks/goaffpro` with a test payload.

### 10. Production Deployment

**Vercel:**
```bash
vercel --prod
```
Set all environment variables in Vercel Dashboard > Settings > Environment Variables.

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Environment variables required for production:**
- `DATABASE_URL` ✅ Required
- `STRIPE_SECRET_KEY` ✅ Required
- `STRIPE_WEBHOOK_SECRET` ✅ Required
- `BREVO_API_KEY` ✅ Required (already set)
- `RESEND_API_KEY` ✅ Required (set in .env.local for transactional email)
- `NEXT_PUBLIC_SITE_URL` ✅ Already set
- `GOAFFPRO_ACCESS_TOKEN` ⚠️ Required for affiliate features
- `REDIS_URL` ⚠️ Optional (falls back to DB queue)

## Architecture Overview

```
MerchantOS Backend
├── prisma/schema.prisma          — Full DB schema (50+ models)
├── src/lib/
│   ├── prisma.ts                 — DB client singleton
│   ├── auth.ts                   — Auth, sessions, RBAC
│   ├── brevo.ts                  — Email service layer
│   ├── goaffpro.ts               — Affiliate service layer
│   ├── storefront-engine.ts      — HTML parser + renderer
│   ├── queue.ts                  — Background job system
│   └── api-client.ts             — Typed frontend API client
├── src/middleware.ts             — Route protection
└── src/app/api/
    ├── auth/[...action]/         — Login, register, logout
    ├── orders/                   — Order CRUD + filtering
    ├── products/                 — Product management
    ├── customers/                — Customer CRM
    ├── subscriptions/            — Subscription management
    ├── affiliates/               — Affiliate management + sync
    ├── email/                    — Campaign + automation
    ├── analytics/                — Real-time analytics
    ├── storefront/               — Template upload + render
    ├── jobs/                     — Queue management
    └── webhooks/
        ├── stripe/               — Stripe event processor
        ├── goaffpro/             — GoAffPro event processor
        └── brevo/                — Brevo event processor
```
