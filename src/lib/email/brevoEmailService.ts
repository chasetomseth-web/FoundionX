import { systemLog } from '../logger';
import { getBrevoApiKey } from '../integration-settings';

export type BrevoMarketingInput = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  senderEmail?: string;
  meta?: Record<string, unknown>;
  segmentId?: string;
  listId?: number;
};

export type BrevoCampaignInput = {
  recipientEmails?: string[];
  recipientListIds?: number[];
  subject: string;
  htmlContent: string;
  senderName: string;
  senderEmail: string;
  scheduledAt?: string;
  name: string;
  meta?: Record<string, unknown>;
};

export type BrevoLifecycleInput = {
  to: string[];
  subject: string;
  html: string;
  meta?: Record<string, unknown>;
  customerId?: string;
  eventName?: string;
};

const BREVO_API_BASE = 'https://api.brevo.com/v3';

async function brevoRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const res = await fetch(`${BREVO_API_BASE}${path}`, {
    method,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${errText}`);
  }

  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

// MVP: use /emailCampaigns as the basic sending primitive.
// Segmenting/scheduling: keep structure minimal; scheduledAt supported.
export async function sendMarketingEmail(input: BrevoMarketingInput): Promise<void> {
  // For MVP, create a campaign and send immediately.
  await sendCampaignEmail({
    recipientEmails: input.to,
    subject: input.subject,
    htmlContent: input.html,
    senderName: input.senderName ?? 'wiastro',
    senderEmail: input.senderEmail ?? (process.env.FROM_EMAIL ?? 'support@yourdomain.com'),
    name: 'marketing_broadcast',
    meta: input.meta,
  });
}

export async function sendCampaignEmail(input: BrevoCampaignInput): Promise<{ campaignId?: string; status: string }> {
  const payload: Record<string, unknown> = {
    name: input.name,
    subject: input.subject,
    htmlContent: input.htmlContent,
    sender: { name: input.senderName, email: input.senderEmail },
    recipients:
      input.recipientEmails && input.recipientEmails.length > 0
        ? { emails: input.recipientEmails }
        : input.recipientListIds && input.recipientListIds.length > 0
          ? { listIds: input.recipientListIds }
          : { emails: [] },
  };

  if (input.scheduledAt) payload.scheduledAt = input.scheduledAt;

  const created = await brevoRequest<{ id: string }>('POST', '/emailCampaigns', payload);
  const campaignId = created?.id;

  if (!input.scheduledAt) {
    await brevoRequest('POST', `/emailCampaigns/${campaignId}/sendNow`);
    systemLog.info('Brevo campaign sent', { campaignId, meta: input.meta });
    return { campaignId, status: 'sent' };
  }

  systemLog.info('Brevo campaign scheduled', { campaignId, meta: input.meta, scheduledAt: input.scheduledAt });
  return { campaignId, status: 'scheduled' };
}

export async function sendLifecycleEmail(input: BrevoLifecycleInput): Promise<void> {
  // MVP: treat lifecycle email as campaign send.
  await sendCampaignEmail({
    recipientEmails: input.to,
    subject: input.subject,
    htmlContent: input.html,
    senderName: 'wiastro',
    senderEmail: process.env.FROM_EMAIL ?? 'support@yourdomain.com',
    name: input.eventName ? `lifecycle_${input.eventName}` : 'lifecycle_email',
    meta: input.meta,
  });
}

