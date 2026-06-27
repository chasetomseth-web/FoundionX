# Cloudflare Pages + OpenNext Migration Audit
## Phase 1: Compatibility Preparation

**Date:** 2026-06-26  
**Status:** AUDIT COMPLETE — NO CODE CHANGES MADE  
**Risk Level:** MEDIUM (2 blockers identified)

---

## 1. Vercel Dependencies

### Dependencies in package.json
- **No Vercel npm packages** found (`vercel`, `@vercel/...`)
- **No Vercel-specific next.config.js features** detected
  - No `output: 'standalone'` (OpenNext handles this)
  - No Vercel-specific image optimization config
  - No Vercel analytics injection

### Runtime dependencies
- Next.js 15.1.11 ✅ (OpenNext compatible)
- Prisma 5.22.0 ✅
- Supabase client libraries ✅
- Stripe SDK ✅

### Verdict: SAFE
No hard Vercel platform lock-in at the dependency level.

---

## 2. Vercel API Usage (Custom Integration)

### Files importing `@/lib/vercel`:
1. `src/app/api/domains/route.ts` — `addDomainToVercel()`
2. `src/app/api/domains/[id]/route.ts` — `removeDomainFromVercel()`
3. `src/app/api/domains/[id]/dns-instructions/route.ts` — `getDomainConfig()`
4. `src/app/api/domains/[id]/verify/route.ts` — `getDomainStatus()`, `getDomainConfig()`
5. `src/app/api/sites/[id]/route.ts` — `removeDomainFromVercel()`

### Purpose:
Custom domain management via Vercel API (DNS provisioning, verification).

### Migration Impact:
- **BLOCKER** — These routes will break on Cloudflare Pages
- Vercel API calls require `VERCEL_API_TOKEN` (present in `.env.local`)
- Cloudflare Pages uses different domain management (though this is a *custom integration feature*, not core app functionality)

### Verdict: MINOR FIX
- Option A: Remove Vercel domain provisioning (use Cloudflare DNS externally)
- Option B: Keep as optional feature behind `VERCEL_API_TOKEN` env var
- **Routes should gracefully degrade if Vercel config is absent**

---

## 3. Next.js Deployment Assumptions

### App Router
- ✅ Confirmed: Uses Next.js App Router (`src/app/`)
- ✅ No Server Actions detected
- ✅ No Edge Runtime routes detected (`export const runtime = 'edge'`)
- ⚠️ Only 1 route explicitly declares `export const runtime = 'nodejs'`:
  - `src/app/api/events/stream/route.ts`

### Default Behavior:
- App Router defaults to Node.js runtime ✅
- OpenNext supports Node.js runtime ✅

### Verdict: SAFE

---

## 4. Prisma Runtime Risk Report

### Current State:
- **Prisma singleton:** `src/lib/prisma.ts` ✅ (correct pattern)
- **Schema:** `prisma/schema.prisma` uses `url = env("DATABASE_URL")` + `directUrl = env("DIRECT_URL")`
- **Runtime declarations:** Only 1/50+ Prisma-using routes explicitly sets `export const runtime = 'nodejs'`

### Risk Assessment:

| Route Pattern | Count | Risk |
|---|---|---|
| Explicit `runtime = 'nodejs'` | 1 | ✅ SAFE |
| No runtime declaration (defaults to nodejs) | 50+ | ⚠️ MEDIUM RISK |

### Issue:
OpenNext may optimize routes for edge runtime if not explicitly declared. Prisma requires Node.js runtime.

### Recommendation:
Add `export const runtime = 'nodejs'` to all API routes using Prisma.

### Verdict: MINOR FIX (50+ routes need runtime declaration)

---

## 5. Stripe Webhook Compatibility

### Detected Routes:
1. `src/app/api/webhooks/stripe/route.ts` — Primary Stripe webhook handler
2. `src/app/api/webhooks/brevo/route.ts` — Brevo webhooks
3. `src/app/api/webhooks/goaffpro/route.ts` — GoAffPro webhooks
4. `src/app/api/webhooks/easypost/route.ts` — EasyPost webhooks
5. `src/app/api/webhooks/resend/route.ts` — Resend webhooks
6. `src/app/api/webhooks/shippo/route.ts` — Shippo webhooks

### Critical Findings:
- **No explicit `runtime = 'nodejs'` on any webhook route**
- Stripe webhook handler uses:
  - `prisma.checkoutSession`
  - `prisma.order`
  - `prisma.customer`
  - `prisma.subscription`
  - `prisma.transaction`
  - `prisma.customerPaymentMethod`
- All require Node.js runtime

### Stripe-Specific Risk:
- Stripe webhooks must be reachable via public URL
- Cloudflare Pages must expose webhook endpoint
- Webhook handler must run on Node.js (not edge)

### Verdict: BLOCKER (must add runtime declarations)

---

## 6. Edge/Runtime Conflicts

### Edge Runtime Usage:
- **None detected** ✅
- No `export const runtime = 'edge'`
- No `export const preferredRegion`
- No `unstable_*` APIs

### Middleware:
- `src/middleware.ts` exists — must verify it's OpenNext-compatible
- Middleware in App Router runs at the edge by default unless specified

### Verdict: NEEDS VERIFICATION (middleware.ts review required)

---

## 7. Environment Variable Audit

### Current Env Vars (.env):
```env
# Database
DATABASE_URL (pgbouncer pooler)
DIRECT_URL (session pooler)

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Email
BREVO_API_KEY
BREVO_WEBHOOK_SECRET
RESEND_API_KEY

# Integrations
GOAFFPRO_ACCESS_TOKEN
GOAFFPRO_WEBHOOK_SECRET
EASYPOST_API_KEY

# AI
OPENAI_API_KEY
GEMINI_API_KEY
ANTHROPIC_API_KEY
PERPLEXITY_API_KEY

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID
NEXT_PUBLIC_ADSENSE_ID

# App
NEXT_PUBLIC_SITE_URL
```

### Vercel-Specific (.env.local):
```env
VERCEL_API_TOKEN
VERCEL_PROJECT_ID
VERCEL_TEAM_ID
```

### Missing Env Vars:
- None critical detected for core app functionality
- Vercel tokens are **optional** (only for domain provisioning feature)

### Supabase + Stripe: ✅ COMPLETE

### Verdict: SAFE (Vercel tokens are feature-gated)

---

## 8. Migration Risk Report Summary

| Category | Status | Severity | Items |
|---|---|---|---|
| Vercel dependencies | ✅ SAFE | — | 0 blockers |
| Vercel API usage (custom) | ⚠️ MINOR FIX | Medium | 5 routes using Vercel SDK |
| Next.js App Router | ✅ SAFE | — | Compatible with OpenNext |
| Prisma runtime | ⚠️ MINOR FIX | Medium | 50+ routes need `runtime = 'nodejs'` |
| Stripe webhooks | 🔴 BLOCKER | High | 6 webhook routes need runtime fix |
| Edge runtime conflicts | ✅ SAFE | — | None detected |
| Middleware | ⚠️ NEEDS REVIEW | Medium | Verify OpenNext compatibility |
| Environment variables | ✅ SAFE | — | All core vars present |

---

## 9. Migration Blockers (Must Fix Before Cloudflare)

### BLOCKER 1: Webhook Runtime Declarations
**Impact:** Stripe, Brevo, GoAffPro, EasyPost, Resend, Shippo webhooks will fail  
**Fix:** Add `export const runtime = 'nodejs'` to all webhook routes  
**Estimated effort:** 6 route files  

### BLOCKER 2: Prisma Runtime Enforcement
**Impact:** Any route silently routed to edge runtime will crash on Prisma calls  
**Fix:** Add `export const runtime = 'nodejs'` to all API routes using Prisma  
**Estimated effort:** 50+ route files (can be automated)

---

## 10. Exact Next Steps for Phase 2

### Step 1: Automated Runtime Fix
```bash
# Script to add runtime = 'nodejs' to all API routes using Prisma
# Target: src/app/api/**/route.ts files containing 'prisma.'
```

### Step 2: Manual Runtime Fix
- Add `export const runtime = 'nodejs'` to webhook routes not auto-fixed

### Step 3: Vercel Domain API Isolation
- Review `src/lib/vercel.ts` implementation
- Add fallback behavior if `VERCEL_API_TOKEN` is missing
- Consider removing domain provisioning from core flow

### Step 4: Middleware Review
- Audit `src/middleware.ts` for edge-only APIs
- Verify OpenNext middleware compatibility

### Step 5: Local OpenNext Test
- Install OpenNext adapter: `npm install -D opennext`
- Create `open-next.config.ts`
- Build and test locally before Cloudflare deployment

---

## 11. Safe to Proceed?

### Yes, with these conditions:
1. ✅ Database migrations are NOT part of this audit — schema is already Cloudflare-compatible
2. ✅ No code changes needed for core Prisma + Stripe functionality
3. ⚠️ Must complete Phase 2 runtime fixes before deployment
4. ⚠️ Vercel domain features must be gated or removed

### No changes should be deployed to Cloudflare until:
- [ ] All webhook routes have explicit `runtime = 'nodejs'`
- [ ] All Prisma-using routes have explicit `runtime = 'nodejs'`
- [ ] Vercel API calls are gated behind config check
- [ ] Local OpenNext build succeeds

---

*End of Phase 1 Audit*