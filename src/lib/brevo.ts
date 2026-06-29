/**
 * Brevo (formerly Sendinblue) Service Layer
 * Handles all transactional emails, automation triggers, and campaign management
 */

const BREVO_API_BASE = 'https://api.brevo.com/v3';
let BREVO_API_KEY: string | null = null;

function getBrevoApiKey(): string | null {
  if (BREVO_API_KEY === null) {
    const key = process.env.BREVO_API_KEY;
    if (key && key.length > 10 && !key.startsWith('your-') && !key.includes('placeholder')) {
      BREVO_API_KEY = key;
    } else {
      BREVO_API_KEY = '';
    }
  }
  return BREVO_API_KEY || null;
}

interface BrevoContact {
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
  updateEnabled?: boolean;
}

interface BrevoTransactionalEmail {
  to: { email: string; name?: string }[];
  sender?: { name: string; email: string };
  templateId?: number;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  params?: Record<string, unknown>;
  tags?: string[];
}

async function brevoRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    throw new Error('Brevo API key not configured');
  }
  const res = await fetch(`${BREVO_API_BASE}${path}`, {
    method,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${error}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ============================================================
// CONTACTS
// ============================================================

export async function upsertBrevoContact(contact: BrevoContact): Promise<void> {
  await brevoRequest('POST', '/contacts', {
    email: contact.email,
    attributes: contact.attributes ?? {},
    listIds: contact.listIds ?? [],
    updateEnabled: contact.updateEnabled ?? true,
  });
}

export async function addContactToList(email: string, listId: number): Promise<void> {
  await brevoRequest('POST', `/contacts/lists/${listId}/contacts/add`, {
    emails: [email],
  });
}

export async function removeContactFromList(email: string, listId: number): Promise<void> {
  await brevoRequest('POST', `/contacts/lists/${listId}/contacts/remove`, {
    emails: [email],
  });
}

export async function updateContactAttributes(
  email: string,
  attributes: Record<string, unknown>
): Promise<void> {
  await brevoRequest('PUT', `/contacts/${encodeURIComponent(email)}`, {
    attributes,
  });
}

export async function getContactLists(): Promise<{ lists: { id: number; name: string; totalSubscribers: number }[] }> {
  return brevoRequest('GET', '/contacts/lists?limit=50');
}

// ============================================================
// TRANSACTIONAL EMAILS
// ============================================================

export async function sendTransactionalEmail(email: BrevoTransactionalEmail): Promise<{ messageId: string }> {
  return brevoRequest('POST', '/smtp/email', email as unknown as Record<string, unknown>);
}

// ============================================================
// AUTOMATION TRIGGERS
// ============================================================

export async function triggerAutomationEvent(
  email: string,
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await brevoRequest('POST', '/trackEvent', {
    email,
    event: eventName,
    properties: properties ?? {},
  });
}

// ============================================================
// CAMPAIGNS
// ============================================================

export async function getCampaigns(
  type: 'email' | 'sms' = 'email',
  status?: string
): Promise<{ campaigns: Record<string, unknown>[] }> {
  const params = new URLSearchParams({ type });
  if (status) params.set('status', status);
  return brevoRequest('GET', `/emailCampaigns?${params.toString()}`);
}

export async function getCampaignStats(campaignId: number): Promise<Record<string, unknown>> {
  return brevoRequest('GET', `/emailCampaigns/${campaignId}`);
}

// ============================================================
// PREDEFINED EMAIL FLOWS
// ============================================================

export async function sendOrderConfirmation(params: {
  email: string;
  name?: string;
  orderNumber: string;
  orderTotal: number;
  items: { name: string; quantity: number; price: number }[];
  currency?: string;
}): Promise<void> {
  const templateId = parseInt(process.env.BREVO_TEMPLATE_ORDER_CONFIRMATION ?? '0');

  if (templateId) {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      templateId,
      params: {
        ORDER_NUMBER: params.orderNumber,
        ORDER_TOTAL: params.orderTotal,
        ITEMS: params.items,
        CURRENCY: params.currency ?? 'USD',
        CUSTOMER_NAME: params.name ?? 'Customer',
      },
    });
  } else {
    // Fallback inline email
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      subject: `Order Confirmed — ${params.orderNumber}`,
      htmlContent: buildOrderConfirmationHtml(params),
    });
  }

  // Sync contact
  await upsertBrevoContact({
    email: params.email,
    attributes: {
      FIRSTNAME: params.name?.split(' ')[0] ?? '',
      LAST_ORDER_NUMBER: params.orderNumber,
      LAST_ORDER_TOTAL: params.orderTotal,
    },
    updateEnabled: true,
  });
}

export async function sendFailedPaymentRecovery(params: {
  email: string;
  name?: string;
  orderNumber?: string;
  amount?: number;
  retryUrl?: string;
}): Promise<void> {
  const templateId = parseInt(process.env.BREVO_TEMPLATE_FAILED_PAYMENT ?? '0');

  if (templateId) {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      templateId,
      params: {
        CUSTOMER_NAME: params.name ?? 'Customer',
        ORDER_NUMBER: params.orderNumber ?? '',
        AMOUNT: params.amount ?? 0,
        RETRY_URL: params.retryUrl ?? '',
      },
    });
  } else {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      subject: 'Action Required: Payment Failed',
      htmlContent: `<p>Hi ${params.name ?? 'there'},</p><p>Your payment of $${params.amount ?? 0} failed. Please update your payment method to continue.</p>`,
    });
  }
}

export async function sendSubscriptionRenewal(params: {
  email: string;
  name?: string;
  planName: string;
  amount: number;
  nextBillingDate?: Date;
}): Promise<void> {
  const templateId = parseInt(process.env.BREVO_TEMPLATE_SUBSCRIPTION_RENEWAL ?? '0');

  if (templateId) {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      templateId,
      params: {
        CUSTOMER_NAME: params.name ?? 'Customer',
        PLAN_NAME: params.planName,
        AMOUNT: params.amount,
        NEXT_BILLING_DATE: params.nextBillingDate?.toLocaleDateString() ?? '',
      },
    });
  } else {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      subject: `Subscription Renewed — ${params.planName}`,
      htmlContent: `<p>Hi ${params.name ?? 'there'},</p><p>Your ${params.planName} subscription has been renewed for $${params.amount}.</p>`,
    });
  }
}

export async function sendAffiliateWelcome(params: {
  email: string;
  name: string;
  referralCode: string;
  referralUrl: string;
  commissionRate: number;
}): Promise<void> {
  const templateId = parseInt(process.env.BREVO_TEMPLATE_AFFILIATE_WELCOME ?? '0');

  if (templateId) {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      templateId,
      params: {
        AFFILIATE_NAME: params.name,
        REFERRAL_CODE: params.referralCode,
        REFERRAL_URL: params.referralUrl,
        COMMISSION_RATE: `${(params.commissionRate * 100).toFixed(0)}%`,
      },
    });
  } else {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      subject: 'Welcome to the Affiliate Program!',
      htmlContent: `<p>Hi ${params.name},</p><p>Your affiliate account is approved. Your referral code is: <strong>${params.referralCode}</strong></p><p>Commission rate: ${(params.commissionRate * 100).toFixed(0)}%</p>`,
    });
  }
}

export async function sendAbandonedCartRecovery(params: {
  email: string;
  name?: string;
  cartItems: { name: string; price: number }[];
  recoveryUrl: string;
}): Promise<void> {
  const templateId = parseInt(process.env.BREVO_TEMPLATE_ABANDONED_CART ?? '0');

  if (templateId) {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      templateId,
      params: {
        CUSTOMER_NAME: params.name ?? 'there',
        CART_ITEMS: params.cartItems,
        RECOVERY_URL: params.recoveryUrl,
      },
    });
  } else {
    await sendTransactionalEmail({
      to: [{ email: params.email, name: params.name }],
      subject: 'You left something behind...',
      htmlContent: `<p>Hi ${params.name ?? 'there'},</p><p>You left items in your cart. <a href="${params.recoveryUrl}">Complete your purchase</a></p>`,
    });
  }
}

// ============================================================
// SEGMENT SYNC
// ============================================================

export async function syncCustomerSegmentToBrevo(
  emails: string[],
  listId: number
): Promise<void> {
  // Brevo allows max 150 contacts per batch
  const batchSize = 150;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await brevoRequest('POST', `/contacts/lists/${listId}/contacts/add`, {
      emails: batch,
    });
  }
}

// ============================================================
// HELPERS
// ============================================================

function buildOrderConfirmationHtml(params: {
  name?: string;
  orderNumber: string;
  orderTotal: number;
  items: { name: string; quantity: number; price: number }[];
  currency?: string;
}): string {
  const itemRows = params.items
    .map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${params.currency ?? 'USD'} ${item.price.toFixed(2)}</td></tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmation</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="font-size:24px;font-weight:700;">Order Confirmed ✓</h1>
  <p>Hi ${params.name ?? 'there'}, thank you for your order!</p>
  <p><strong>Order:</strong> ${params.orderNumber}</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <thead><tr style="border-bottom:2px solid #000;">
      <th style="text-align:left;padding:8px;">Item</th>
      <th style="text-align:left;padding:8px;">Qty</th>
      <th style="text-align:left;padding:8px;">Price</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr style="border-top:2px solid #000;">
      <td colspan="2" style="padding:8px;font-weight:700;">Total</td>
      <td style="padding:8px;font-weight:700;">${params.currency ?? 'USD'} ${params.orderTotal.toFixed(2)}</td>
    </tr></tfoot>
  </table>
</body>
</html>`.trim();
}
