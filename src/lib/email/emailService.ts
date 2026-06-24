import { sendTransactionalEmail } from './resendEmailService';
import { sendSupportEmail } from './resendEmailService';
import { sendAuthEmail } from './resendEmailService';
import { sendMarketingEmail, sendCampaignEmail, sendLifecycleEmail } from './brevoEmailService';

export enum EmailType {
  TRANSACTIONAL = 'transactional',
  SUPPORT = 'support',
  AUTH = 'auth',
  MARKETING = 'marketing',
  CRM = 'crm',
  CAMPAIGN = 'campaign',
}

export type EmailRecipient = { email: string; name?: string };

export type BaseEmailMeta = {
  organizationId?: string;
  storeId?: string;
  tenantId?: string;
  [key: string]: unknown;
};

export type TransactionalEmailInput = {
  to: EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  meta?: BaseEmailMeta;
};

export type SupportEmailInput = {
  to: EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  meta?: BaseEmailMeta;
};

export type AuthEmailInput = {
  to: EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  meta?: BaseEmailMeta;
};

export type MarketingEmailInput = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  senderEmail?: string;
  meta?: BaseEmailMeta;
  segmentId?: string;
  listId?: number;
};

export type CampaignEmailInput = {
  recipientEmails?: string[];
  recipientListIds?: number[];
  subject: string;
  htmlContent: string;
  senderName: string;
  senderEmail: string;
  scheduledAt?: string;
  name: string;
  meta?: BaseEmailMeta;
};

export type LifecycleEmailInput = {
  to: string[];
  subject: string;
  html: string;
  meta?: BaseEmailMeta;
  customerId?: string;
  eventName?: string;
};

export async function sendTransactionalEmailByType(input: TransactionalEmailInput): Promise<void> {
  await sendTransactionalEmail(input);
}

export async function sendSupportEmailByType(input: SupportEmailInput): Promise<void> {
  await sendSupportEmail(input);
}

export async function sendAuthEmailByType(input: AuthEmailInput): Promise<void> {
  await sendAuthEmail(input);
}

export async function sendMarketingEmailByType(input: MarketingEmailInput): Promise<void> {
  await sendMarketingEmail(input);
}

export async function sendCampaignEmailByType(input: CampaignEmailInput): Promise<{ campaignId?: string; status: string }> {
  return sendCampaignEmail(input);
}

export async function sendLifecycleEmailByType(input: LifecycleEmailInput): Promise<void> {
  await sendLifecycleEmail(input);
}

// Unified router
export async function sendEmail(type: EmailType, input: unknown): Promise<void | { campaignId?: string; status: string }> {
  switch (type) {
    case EmailType.TRANSACTIONAL:
      return sendTransactionalEmailByType(input as TransactionalEmailInput);
    case EmailType.SUPPORT:
      return sendSupportEmailByType(input as SupportEmailInput);
    case EmailType.AUTH:
      return sendAuthEmailByType(input as AuthEmailInput);
    case EmailType.MARKETING:
      return sendMarketingEmailByType(input as MarketingEmailInput);
    case EmailType.CRM:
      return sendLifecycleEmailByType(input as LifecycleEmailInput);
    case EmailType.CAMPAIGN:
      return sendCampaignEmailByType(input as CampaignEmailInput);
    default:
      throw new Error(`Unsupported EmailType: ${String(type)}`);
  }
}

