// Affiliate Email Templates
// Centralized HTML generation for all affiliate automations.

export type StoreEmailVars = {
  storeName: string;
  siteUrl: string;
  portalUrl?: string;
};

function layout(content: string, storeName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${storeName}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:20px 32px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">${storeName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                You're receiving this because you're part of the ${storeName} affiliate program.<br/>
                ${storeName} · All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(url: string, label: string): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:#000000;border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

function kv(label: string, value: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;">
  <tr>
    <td style="font-size:13px;color:#6b7280;width:160px;">${label}</td>
    <td style="font-size:13px;color:#111827;font-weight:600;">${value}</td>
  </tr>
</table>`;
}

export function affiliateApplicationReceived(
  vars: StoreEmailVars & { affiliateName: string }
) {
  const subject = `We received your application — ${vars.storeName}`;
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Application Received</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Hi ${vars.affiliateName}, thanks for applying to the ${vars.storeName} affiliate program.
  We'll review your application and get back to you within 1–2 business days.
</p>
<p style="font-size:14px;color:#374151;">
  In the meantime, feel free to familiarise yourself with the program details.
  Once approved, you'll receive your unique referral link and dashboard access.
</p>
`,
    vars.storeName
  );
  return { subject, html };
}

export function affiliateApproved(
  vars: StoreEmailVars & {
    affiliateName: string;
    referralCode: string;
    commissionRate: number;
    referralLink: string;
  }
) {
  const pct = (vars.commissionRate * 100).toFixed(0);
  const subject = `You're approved! Welcome to the ${vars.storeName} affiliate program`;
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">You're In! 🎉</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Hi ${vars.affiliateName}, your application to the <strong>${vars.storeName}</strong>
  affiliate program has been approved.
</p>
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin:0 0 20px;">
  ${kv('Your Referral Code', vars.referralCode)}
  ${kv('Commission Rate', `${pct}% per sale`)}
  ${kv('Your Link', vars.referralLink)}
</div>
<p style="font-size:14px;color:#374151;margin:0 0 4px;">
  Share your link and earn ${pct}% on every sale you refer.
</p>
${btn(
  vars.portalUrl ?? `${vars.siteUrl}/portal/login?storeId=${encodeURIComponent('storeId')}`,
  'Access My Dashboard'
)}
`,
    vars.storeName
  );
  return { subject, html };
}

export function affiliateCommissionEarned(
  vars: StoreEmailVars & {
    affiliateName: string;
    commissionAmount: number;
    orderTotal: number;
    orderNumber: string;
    holdDays: number;
    pendingBalance: number;
  }
) {
  const subject = `You earned $${vars.commissionAmount.toFixed(2)} — ${vars.storeName}`;
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Commission Earned 💰</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Hi ${vars.affiliateName}, a sale was just attributed to your referral link!
</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 20px;">
  ${kv('Commission Earned', `$${vars.commissionAmount.toFixed(2)}`)}
  ${kv('Order Total', `$${vars.orderTotal.toFixed(2)}`)}
  ${kv('Order Reference', `#${vars.orderNumber}`)}
  ${kv('Hold Period', `${vars.holdDays} days (for refund window)`)}
  ${kv('Running Balance', `$${vars.pendingBalance.toFixed(2)}`)}
</div>
<p style="font-size:13px;color:#6b7280;margin:0 0 4px;">
  Commissions are held for ${vars.holdDays} days before becoming eligible for payout.
</p>
${btn(vars.portalUrl ?? `${vars.siteUrl}/portal/login`, 'View My Commissions')}
`,
    vars.storeName
  );
  return { subject, html };
}

export function affiliatePayoutSent(
  vars: StoreEmailVars & {
    affiliateName: string;
    amount: number;
    method: string;
    reference?: string;
  }
) {
  const subject = `Your $${vars.amount.toFixed(2)} payout from ${vars.storeName} is on its way`;
  const methodLabel =
    vars.method === 'paypal'
      ? 'PayPal'
      : vars.method === 'bank'
        ? 'Bank Transfer'
        : vars.method;

  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Payout Sent ✅</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Hi ${vars.affiliateName}, your commission payout has been sent!
</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 20px;">
  ${kv('Amount', `$${vars.amount.toFixed(2)}`)}
  ${kv('Method', methodLabel)}
  ${vars.reference ? kv('Reference', vars.reference) : ''}
</div>
<p style="font-size:13px;color:#6b7280;margin:0 0 4px;">
  ${methodLabel} payments typically arrive within 1–2 business days.
</p>
${btn(vars.portalUrl ?? `${vars.siteUrl}/portal/login`, 'View Payout History')}
`,
    vars.storeName
  );

  return { subject, html };
}

export function affiliatePayoutFailed(
  vars: StoreEmailVars & {
    affiliateName: string;
    amount: number;
    reason: string;
  }
) {
  const subject = `Action required: your payout from ${vars.storeName} could not be sent`;
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Payout Failed ⚠️</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Hi ${vars.affiliateName}, we were unable to send your payout.
</p>
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:0 0 20px;">
  ${kv('Amount', `$${vars.amount.toFixed(2)}`)}
  ${kv('Reason', vars.reason)}
</div>
<p style="font-size:14px;color:#374151;margin:0 0 4px;">
  Please log into your dashboard, update your payment details, and contact us to retry.
</p>
${btn(vars.portalUrl ?? `${vars.siteUrl}/portal/login`, 'Update Payment Details')}
`,
    vars.storeName
  );
  return { subject, html };
}

export function merchantNewAffiliateAlert(
  vars: StoreEmailVars & {
    applicantName: string;
    applicantEmail: string;
    website?: string;
    promoMethod?: string;
    dashboardUrl: string;
  }
) {
  const subject = `New affiliate application — ${vars.applicantName}`;
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">New Affiliate Application</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Someone just applied to your affiliate program and is waiting for review.
</p>
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin:0 0 20px;">
  ${kv('Name', vars.applicantName)}
  ${kv('Email', vars.applicantEmail)}
  ${vars.website ? kv('Website', vars.website) : ''}
  ${vars.promoMethod ? kv('Promo Method', vars.promoMethod) : ''}
</div>
${btn(vars.dashboardUrl, 'Review Application')}
`,
    vars.storeName
  );
  return { subject, html };
}

export function merchantFraudAlert(
  vars: StoreEmailVars & {
    affiliateName: string;
    referralCode: string;
    reasons: string[];
    severity: string;
    dashboardUrl: string;
  }
) {
  const subject = `⚠️ Fraud alert: ${vars.affiliateName} — ${vars.storeName}`;
  const sevColor = vars.severity === 'high' ? '#dc2626' : '#d97706';
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Fraud Detection Alert</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  The fraud detection system flagged affiliate
  <strong>${vars.affiliateName}</strong> (${vars.referralCode})
  with severity:
  <strong style="color:${sevColor};">${vars.severity.toUpperCase()}</strong>.
</p>
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:0 0 20px;">
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Reasons:</p>
  ${vars.reasons.map((r) => `<p style="margin:0 0 4px;font-size:13px;color:#374151;">• ${r}</p>`).join('')}
</div>
${btn(vars.dashboardUrl, 'Review Affiliate')}
`,
    vars.storeName
  );
  return { subject, html };
}

export function affiliateMilestone(
  vars: StoreEmailVars & {
    affiliateName: string;
    milestone: string;
    totalEarned: number;
  }
) {
  const subject = `🏆 Milestone reached: ${vars.milestone} — ${vars.storeName}`;
  const html = layout(
    `
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">You Hit a Milestone! 🏆</h2>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
  Hi ${vars.affiliateName}, congratulations — you just hit <strong>${vars.milestone}</strong>
  in total commissions with ${vars.storeName}!
</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 20px;">
  ${kv('Total Earned', `$${vars.totalEarned.toFixed(2)}`)}
  ${kv('Milestone', vars.milestone)}
</div>
<p style="font-size:14px;color:#374151;margin:0 0 4px;">Keep it up — we appreciate your partnership!</p>
${btn(vars.portalUrl ?? `${vars.siteUrl}/portal/login`, 'View My Dashboard')}
`,
    vars.storeName
  );
  return { subject, html };
}

