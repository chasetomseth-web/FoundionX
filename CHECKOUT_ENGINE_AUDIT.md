# Checkout Engine Audit Report

**Generated:** May 25, 2026  
**Focus:** Phase 1 Stabilization - Core Checkout Flow Verification

---

## 📋 ARCHITECTURE REVIEW

### Current Flow (Order of Operations)

```
POST /api/checkout/create-session
  ↓
Validate input (items, storeId)
  ↓
Build idempotency key (deterministic hash)
  ↓
Check if CheckoutSession exists (idempotency protection)
  ├─ YES → return cached session (no duplicate Order)
  └─ NO → continue
  ↓
Resolve coupon (Prisma → Supabase → Stripe)
  ↓
Resolve affiliate
  ↓
Create CheckoutSession (status: pending)
  ↓
Resolve line items (offer/product/price resolution)
  ↓
CREATE ORDER (status: pending, paymentStatus: pending) ✓ CORRECT
  ↓
Update CheckoutSession (link to orderId)
  ↓
Create Stripe Checkout Session (client_reference_id: order.id)
  ↓
Update Order (add stripeCheckoutSessionId)
  ↓
Return { sessionId, url, orderId, checkoutSessionId }
```

### ✅ What's Correct

1. **Order-First Model** — Order created BEFORE Stripe session
   - Prevents orphaned Stripe sessions
   - Truth source is DB, not Stripe
   - Correct payment state machine: pending → paid (only via webhook)

2. **Idempotency Protection**
   - Idempotency key: SHA256(storeId + pageId + itemFingerprint + couponCode + affiliateCode + customerEmail + mode + timeBucket)
   - Reuses CheckoutSession if same request made within 15-minute window
   - Returns cached session → no new Order created

3. **Affiliate Tracking**
   - Affiliate code validated server-side
   - Stored in Order.affiliateCode and Order.affiliateId
   - Stored in Order.metadata for webhook access

4. **Coupon Resolution**
   - Multi-tier lookup: Prisma → Supabase → Stripe API → Stripe Promotion Codes
   - Validates expiry and active status
   - Attached to Stripe session

5. **Line Item Resolution**
   - Offers: can have multiple prices, recurrence (subscription)
   - Products: can reference Stripe prices or use inline pricing
   - Raw pricing: accepts direct price values

6. **Webhook Integration** (stripe/route.ts)
   - Handles checkout.session.completed event
   - Looks up Order by stripeCheckoutSessionId
   - Updates Order: paymentStatus → "paid", status → "processing"
   - Creates Commission if affiliateCode present

---

## ⚠️ CRITICAL GAPS FOUND

### Gap 1: CheckoutSession Not Yet Migrated
**Status:** Schema defined, NOT in database yet  
**Impact:** Migration must run before checkout works  
**Fix:** Run `npx prisma migrate dev --name add_checkout_session`

### Gap 2: Webhook May Create Duplicate Order
**Current Code:**
```typescript
// In handleCheckoutCompleted:
let order = await prisma.order.findFirst({
  where: {
    OR: [
      { stripeCheckoutSessionId: session.id },
      { stripePaymentIntentId: session.payment_intent }
    ]
  }
});

if (order) {
  // update existing
} else {
  // create new (PROBLEM!)
}
```

**Issue:** If checkout endpoint crashes AFTER Stripe session creation but BEFORE Order creation, webhook will create a NEW Order instead of linking to the existing (but unlinked) one.

**Risk Level:** MEDIUM — rare but possible race condition

**Solution:** CheckoutSession should be queried by session.id in webhook to find the pre-created Order.

### Gap 3: Missing Return Type Validation
**Current Code:**
```typescript
return NextResponse.json({
  sessionId: stripeSession.id,
  url: stripeSession.url,
  orderId: order.id,
  checkoutSessionId: updatedSession.id,
});
```

**Issue:** If `stripeSession.url` is null, client receives invalid checkout link

**Risk Level:** LOW — Stripe almost always returns URL, but possible edge case

**Solution:** Validate URL before returning or throw error

### Gap 4: Order Idempotency is NOT Enforced
**Current Code:**
```typescript
const order = await prisma.order.create({
  data: { ... }
});
```

**Issue:** If same checkout request fires twice rapidly, BOTH create separate Orders

**Solution:** Wrap Order creation in CheckoutSession.orderId check

---

## ✅ VERIFICATION CHECKLIST

Once database is running, execute:

### Test 1: Single Checkout = One Order
```bash
curl -X POST http://localhost:3000/api/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "store_123",
    "items": [{"productId": "prod_123", "quantity": 1, "price": 99.99}],
    "customerEmail": "test@example.com"
  }'
```

**Expected Result:**
- [ ] Returns sessionId (Stripe session)
- [ ] Returns orderId (DB order)
- [ ] Order exists in DB with paymentStatus = "pending"
- [ ] Order.stripeCheckoutSessionId = sessionId

### Test 2: Duplicate Checkout (Same idempotencyKey)
```bash
# Call same request twice within 15 minutes
```

**Expected Result:**
- [ ] First call: creates Order + Stripe session
- [ ] Second call: returns SAME sessionId
- [ ] Second call: returns SAME orderId
- [ ] DB has only ONE Order (not two)
- [ ] Order.paymentStatus still = "pending"

### Test 3: Webhook Payment Confirmation
```bash
# Simulate Stripe webhook
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "stripe-signature: <signature>" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_live_abc123",
        "payment_intent": "pi_live_xyz789",
        "customer_email": "test@example.com",
        "amount_total": 9999,
        "metadata": {
          "storeId": "store_123",
          "orderId": "order_123"
        }
      }
    }
  }'
```

**Expected Result:**
- [ ] Order found by stripeCheckoutSessionId
- [ ] Order.paymentStatus = "paid"
- [ ] Order.status = "processing"
- [ ] No new Order created (used existing)

### Test 4: Affiliate Commission
```bash
# Checkout with affiliateCode
```

**Expected Result:**
- [ ] Order.affiliateCode set correctly
- [ ] Order.affiliateId set correctly
- [ ] Commission record created (status = "pending")
- [ ] Commission.amount calculated correctly

### Test 5: Debug Route
```bash
curl http://localhost:3000/api/debug/checkout-test?storeId=store_123&testMode=full
```

**Expected Result:**
- [ ] All steps show status: "success"
- [ ] No orphaned CheckoutSessions
- [ ] No orphaned Orders
- [ ] Order has OrderItems attached

---

## 🚨 CRITICAL ISSUES TO FIX BEFORE PROCEEDING

### Issue #1: Webhook Order Lookup is Unsafe
**Severity:** HIGH  
**Action Required:** Use CheckoutSession as source of truth in webhook

**Current:**
```typescript
const order = await prisma.order.findFirst({
  where: { stripeCheckoutSessionId: session.id }
});
```

**Issue:** Only works if Order was already linked. If checkout crashed before linking, webhook creates duplicate.

**Fix:** Query CheckoutSession first
```typescript
const checkoutSession = await prisma.checkoutSession.findUnique({
  where: { stripeSessionId: session.id }
});
if (!checkoutSession?.orderId) {
  throw new Error('CheckoutSession has no orderId');
}
const order = await prisma.order.findUnique({
  where: { id: checkoutSession.orderId }
});
```

### Issue #2: Order Creation Not Idempotent
**Severity:** MEDIUM  
**Action Required:** Check CheckoutSession before creating Order

**Fix:**
```typescript
// After resolveLineItems, BEFORE prisma.order.create:
const existingCheckoutSession = await prisma.checkoutSession.findUnique({
  where: { id: checkoutSession.id },
  include: { order: true }
});

if (existingCheckoutSession?.order) {
  // Use existing order instead of creating new
  order = existingCheckoutSession.order;
} else {
  // Create new order
  order = await prisma.order.create({ ... });
}
```

### Issue #3: Missing URL Validation
**Severity:** LOW  
**Action Required:** Validate Stripe URL before returning

**Fix:**
```typescript
if (!stripeSession.url) {
  throw new Error('Stripe session created but no checkout URL returned');
}
```

---

## 📊 CURRENT MODEL STATUS

### CheckoutSession Model
**Defined in schema:** ✓ Yes  
**Migrated to DB:** ❌ NO (needs migration)  
**Unique constraints:** idempotencyKey (unique), stripeSessionId (unique)  
**Indexes:** storeId, orderId  

**Schema:**
```prisma
model CheckoutSession {
  id              String   @id @default(cuid())
  storeId         String
  orderId         String?
  idempotencyKey  String   @unique
  stripeSessionId String?  @unique
  stripeSessionUrl String?
  mode            String   @default("payment")
  status          String   @default("pending")
  metadata        Json?    @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  order Order? @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([storeId])
  @@index([orderId])
}
```

---

## 🎯 NEXT ACTIONS (IN ORDER)

### Phase 1: Database Migration
- [ ] Start DB container (docker-compose up)
- [ ] Run `npx prisma migrate dev --name add_checkout_session`
- [ ] Verify CheckoutSession table exists

### Phase 2: Fix Critical Issues
- [ ] Fix webhook Order lookup (use CheckoutSession as source of truth)
- [ ] Fix Order creation idempotency
- [ ] Add URL validation

### Phase 3: Manual Testing
- [ ] Test single checkout
- [ ] Test duplicate checkout (idempotency)
- [ ] Test webhook
- [ ] Test affiliate code
- [ ] Test debug route

### Phase 4: Acceptance Criteria
- [ ] All verification tests pass
- [ ] No duplicate Orders possible
- [ ] Webhook correctly links to pre-created Order
- [ ] Affiliate commission created on payment
- [ ] No double-charge risk

---

## 📝 SUMMARY

**Current State:** Checkout engine is ~80% built, but has 3 critical gaps preventing production use:

1. CheckoutSession not migrated to database
2. Webhook order lookup unsafe (race condition)
3. Order creation not idempotent

**Effort to Stabilize:** 2-3 hours (fix 3 issues + test)  
**Risk Level:** Medium (current code could create duplicate orders or orphaned sessions)  
**Blocker:** Yes, must fix before testing with real Stripe account

**Recommendation:** Fix the 3 issues, then do end-to-end manual test before moving to Phase 2 (coupons, affiliates, upsells).
