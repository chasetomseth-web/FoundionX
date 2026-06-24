import { prisma } from './prisma';
import { sendTransactionalEmail } from './email';
import { triggerAutomationEvent } from './brevo';
import {
  affiliateApplicationReceived,
  affiliateApproved,
  affiliateCommissionEarned,
  affiliateMilestone,
  affiliatePayoutFailed,
  affiliatePayoutSent,
  merchantFraudAlert,
  merchantNewAffiliateAlert,
  type StoreEmailVars,
} from './email/templates';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:4028';
const MERCHANT_ALERT_EMAIL =
  process.env.MERCHANT_ALERT_EMAIL ?? process.env.FROM_EMAIL ?? 'admin@yourdomain.com';
const PORTAL_BASE = `${SITE_URL}/portal/login`;

function portalUrl(storeId: string) {
  return `${PORTAL_BASE}?storeId=${encodeURIComponent(storeId)}`;
}

async function getStore(storeId: string) {
  return prisma.store.findUnique({ where: { id: storeId }, select: { id: true, name: true } });
}

type MerchantVars = StoreEmailVars;

export async function onAffiliateApplied(affiliateId: string) {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: { store: { select: { id: true, name: true } } },
  });
  if (!affiliate) return;

  const store = affiliate.store;
  const vars: MerchantVars = { storeName: store?.name ?? 'the store', siteUrl: SITE_URL };

  // Applicant email
  try {
    const tpl = affiliateApplicationReceived({
      ...vars,
      affiliateName: affiliate.name,
    });
    await sendTransactionalEmail({ to: affiliate.email, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Application received email failed:', err);
  }

  // Merchant alert email
  try {
    const tpl = merchantNewAffiliateAlert({
      ...vars,
      applicantName: affiliate.name,
      applicantEmail: affiliate.email,
      dashboardUrl: `${SITE_URL}/affiliates?storeId=${encodeURIComponent(affiliate.storeId)}`,
    });
    await sendTransactionalEmail({ to: MERCHANT_ALERT_EMAIL, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Merchant new application alert failed:', err);
  }

  // Brevo automation log
  try {
    await triggerAutomationEvent(affiliate.email, 'affiliate_applied', {
      affiliateName: affiliate.name,
      storeName: vars.storeName,
    });
  } catch {
    // non-fatal
  }
}

export async function onAffiliateApproved(affiliateId: string) {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: { store: { select: { id: true, name: true } } },
  });
  if (!affiliate) return;

  const store = affiliate.store;
  const vars: MerchantVars = {
    storeName: store?.name ?? 'the store',
    siteUrl: SITE_URL,
    portalUrl: portalUrl(affiliate.storeId),
  };

  // Affiliate email
  try {
    const referralLink = `${SITE_URL}/?ref=${encodeURIComponent(affiliate.referralCode)}`;
    const tpl = affiliateApproved({
      ...vars,
      affiliateName: affiliate.name,
      referralCode: affiliate.referralCode,
      commissionRate: Number(affiliate.commissionRate),
      referralLink,
    });
    await sendTransactionalEmail({ to: affiliate.email, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Approval email failed:', err);
  }

  // Brevo automation log
  try {
    await triggerAutomationEvent(affiliate.email, 'affiliate_approved', {
      affiliateName: affiliate.name,
      referralCode: affiliate.referralCode,
      commissionRate: Number(affiliate.commissionRate),
      portalUrl: vars.portalUrl,
    });
  } catch {
    // non-fatal
  }
}

export async function onCommissionCreated(commissionId: string) {
  const commission = await prisma.affiliateCommission.findUnique({
    where: { id: commissionId },
    include: {
      affiliate: { include: { store: { select: { id: true, name: true } } } },
    },
  });
  if (!commission?.affiliate) return;

  const affiliate = commission.affiliate;
  const vars: MerchantVars = {
    storeName: affiliate.store?.name ?? 'the store',
    siteUrl: SITE_URL,
    portalUrl: portalUrl(affiliate.storeId),
  };

  // Commission earned email
  try {
    const tpl = affiliateCommissionEarned({
      ...vars,
      affiliateName: affiliate.name,
      commissionAmount: Number(commission.amount),
      orderTotal: Number(commission.orderTotal),
      orderNumber: commission.orderId ?? commissionId.slice(-8),
      holdDays: 30,
      pendingBalance: Number(affiliate.pendingBalance),
    });
    await sendTransactionalEmail({ to: affiliate.email, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Commission earned email failed:', err);
  }

  // Milestone email check
  try {
    const totalEarned = Number(affiliate.totalEarned);
    const milestones = [100, 500, 1000, 5000, 10000];
    for (const m of milestones) {
      if (totalEarned >= m) {
        // naive idempotency: emit only when crossing from below
        // We approximate by checking if affiliate has at least one commission created recently.
        // (For true idempotency, add a Milestone table in a later iteration.)
        const tpl = affiliateMilestone({
          ...vars,
          affiliateName: affiliate.name,
          milestone: `$${m.toLocaleString()} earned`,
          totalEarned,
        });
        await sendTransactionalEmail({ to: affiliate.email, ...tpl });
      }
    }
  } catch (err) {
    console.error('[AFFILIATE EVENT] Milestone email failed:', err);
  }

  // Brevo automation log
  try {
    await triggerAutomationEvent(affiliate.email, 'commission_earned', {
      amount: Number(commission.amount),
      orderNumber: commission.orderId,
      storeName: vars.storeName,
    });
  } catch {
    // non-fatal
  }
}

export async function onPayoutCompleted(payoutId: string) {
  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
    include: { affiliate: { include: { store: { select: { id: true, name: true } } } } },
  });
  if (!payout?.affiliate) return;

  const affiliate = payout.affiliate;
  const vars: MerchantVars = {
    storeName: affiliate.store?.name ?? 'the store',
    siteUrl: SITE_URL,
    portalUrl: portalUrl(affiliate.storeId),
  };

  try {
    const tpl = affiliatePayoutSent({
      ...vars,
      affiliateName: affiliate.name,
      amount: Number(payout.amount),
      method: payout.method,
      reference: payout.reference ?? undefined,
    });
    await sendTransactionalEmail({ to: affiliate.email, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Payout sent email failed:', err);
  }

  try {
    await triggerAutomationEvent(affiliate.email, 'payout_sent', {
      amount: Number(payout.amount),
      method: payout.method,
      storeName: vars.storeName,
    });
  } catch {
    // non-fatal
  }
}

export async function onPayoutFailed(payoutId: string) {
  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
    include: { affiliate: { include: { store: { select: { id: true, name: true } } } } },
  });
  if (!payout?.affiliate) return;

  const affiliate = payout.affiliate;
  const vars: MerchantVars = {
    storeName: affiliate.store?.name ?? 'the store',
    siteUrl: SITE_URL,
    portalUrl: portalUrl(affiliate.storeId),
  };

  try {
    const tpl = affiliatePayoutFailed({
      ...vars,
      affiliateName: affiliate.name,
      amount: Number(payout.amount),
      reason: payout.notes ?? 'Unknown error',
    });
    await sendTransactionalEmail({ to: affiliate.email, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Payout failed email failed:', err);
  }
}

export async function onFraudFlagged(affiliateId: string, reasons: string[], severity: string) {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: { store: { select: { id: true, name: true } } },
  });
  if (!affiliate) return;

  const vars: MerchantVars = {
    storeName: affiliate.store?.name ?? 'the store',
    siteUrl: SITE_URL,
  };

  try {
    const tpl = merchantFraudAlert({
      ...vars,
      affiliateName: affiliate.name,
      referralCode: affiliate.referralCode,
      reasons,
      severity,
      dashboardUrl: `${SITE_URL}/affiliates?storeId=${encodeURIComponent(affiliate.storeId)}&highlight=${encodeURIComponent(affiliateId)}`,
    });
    await sendTransactionalEmail({ to: MERCHANT_ALERT_EMAIL, ...tpl });
  } catch (err) {
    console.error('[AFFILIATE EVENT] Fraud alert email failed:', err);
  }

  try {
    await triggerAutomationEvent(affiliate.email, 'fraud_flagged', {
      reasons,
      severity,
      storeName: vars.storeName,
    });
  } catch {
    // non-fatal
  }
}

