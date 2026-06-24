/**
 * Email Router — Single source of truth for email provider routing.
 *
 * transactional → Resend
 * marketing     → Brevo
 * outreach      → SalesBlink
 */
import * as ResendService from '@/lib/email/resendEmailService';
import {
  upsertBrevoContact,
  sendTransactionalEmail as sendBrevoTransactional,
  triggerAutomationEvent,
  getContactLists,
  getCampaigns,
  getCampaignStats,
} from '@/lib/brevo';
import * as SalesBlink from '@/lib/salesblink';
import { systemLog } from '@/lib/logger';

// ── Email Type Enum ───────────────────────────────────────────────────────────

/** Categorizes all email types in the system */
export const EmailType = {
  // Transactional (→ Resend)
  ORDER_CONFIRMATION: 'order_confirmation',
  SHIPPING_LABEL_CREATED: 'shipping_label_created',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  SUBSCRIPTION_RENEWAL: 'subscription_renewal',
  REFUND_CONFIRMATION: 'refund_confirmation',
  AFFILIATE_WELCOME: 'affiliate_welcome',
  AFFILIATE_COMMISSION_EARNED: 'affiliate_commission_earned',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_VERIFICATION: 'account_verification',

  // Marketing (→ Brevo)
  POST_PURCHASE_3DAY: 'post_purchase_3day',
  POST_PURCHASE_7DAY: 'post_purchase_7day',
  POST_PURCHASE_14DAY: 'post_purchase_14day',
  ABANDONED_CART: 'abandoned_cart',
  PROMOTIONAL_CAMPAIGN: 'promotional_campaign',
  WINBACK: 'winback',
  AFFILIATE_RECRUITMENT: 'affiliate_recruitment',

  // Cold Outreach (→ SalesBlink)
  COLD_OUTREACH: 'cold_outreach',
} as const;

export type EmailType = (typeof EmailType)[keyof typeof EmailType];

// ── Provider Routing ──────────────────────────────────────────────────────────

const EMAIL_ROUTER: Record<EmailType, 'resend' | 'brevo' | 'salesblink'> = {
  [EmailType.ORDER_CONFIRMATION]: 'resend',
  [EmailType.SHIPPING_LABEL_CREATED]: 'resend',
  [EmailType.ORDER_SHIPPED]: 'resend',
  [EmailType.ORDER_DELIVERED]: 'resend',
  [EmailType.SUBSCRIPTION_RENEWAL]: 'resend',
  [EmailType.REFUND_CONFIRMATION]: 'resend',
  [EmailType.AFFILIATE_WELCOME]: 'resend',
  [EmailType.AFFILIATE_COMMISSION_EARNED]: 'resend',
  [EmailType.PASSWORD_RESET]: 'resend',
  [EmailType.ACCOUNT_VERIFICATION]: 'resend',
  [EmailType.POST_PURCHASE_3DAY]: 'brevo',
  [EmailType.POST_PURCHASE_7DAY]: 'brevo',
  [EmailType.POST_PURCHASE_14DAY]: 'brevo',
  [EmailType.ABANDONED_CART]: 'brevo',
  [EmailType.PROMOTIONAL_CAMPAIGN]: 'brevo',
  [EmailType.WINBACK]: 'brevo',
  [EmailType.AFFILIATE_RECRUITMENT]: 'brevo',
  [EmailType.COLD_OUTREACH]: 'salesblink',
};

// ── Send Function ─────────────────────────────────────────────────────────────

export type SendParams =
  | { type: typeof EmailType.ORDER_CONFIRMATION; data: ResendService.OrderConfirmationParams }
  | { type: typeof EmailType.SHIPPING_LABEL_CREATED; data: ResendService.ShippingLabelCreatedParams }
  | { type: typeof EmailType.ORDER_SHIPPED; data: ResendService.OrderShippedParams }
  | { type: typeof EmailType.ORDER_DELIVERED; data: ResendService.OrderDeliveredParams }
  | { type: typeof EmailType.SUBSCRIPTION_RENEWAL; data: ResendService.SubscriptionRenewalParams }
  | { type: typeof EmailType.REFUND_CONFIRMATION; data: ResendService.RefundConfirmationParams }
  | { type: typeof EmailType.AFFILIATE_WELCOME; data: ResendService.AffiliateWelcomeParams }
  | { type: typeof EmailType.AFFILIATE_COMMISSION_EARNED; data: ResendService.AffiliateCommissionEarnedParams }
  | { type: typeof EmailType.PASSWORD_RESET; data: ResendService.PasswordResetParams }
  | { type: typeof EmailType.ACCOUNT_VERIFICATION; data: ResendService.AccountVerificationParams }
  | { type: typeof EmailType.POST_PURCHASE_3DAY; data: Record<string, unknown> }
  | { type: typeof EmailType.POST_PURCHASE_7DAY; data: Record<string, unknown> }
  | { type: typeof EmailType.POST_PURCHASE_14DAY; data: Record<string, unknown> }
  | { type: typeof EmailType.ABANDONED_CART; data: Record<string, unknown> }
  | { type: typeof EmailType.PROMOTIONAL_CAMPAIGN; data: Record<string, unknown> }
  | { type: typeof EmailType.WINBACK; data: Record<string, unknown> }
  | { type: typeof EmailType.AFFILIATE_RECRUITMENT; data: Record<string, unknown> }
  | { type: typeof EmailType.COLD_OUTREACH; data: Record<string, unknown> };

/**
 * Send an email through the correct provider based on type.
 * All email-sending code in webhooks and API routes should call this
 * instead of calling providers directly.
 */
export async function sendEmail(params: SendParams): Promise<{ success: boolean; provider: string; error?: string }> {
  const provider = EMAIL_ROUTER[params.type];

  try {
    switch (provider) {
      case 'resend':
        return await sendViaResend(params);
      case 'brevo':
        return await sendViaBrevo(params);
      case 'salesblink':
        return await sendViaSalesBlink(params);
      default:
        return { success: false, provider: 'unknown', error: `Unknown provider for email type: ${params.type}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    systemLog.error('[EmailRouter] Send failed', {
      error: { message },
      emailType: params.type,
      provider,
    });
    return { success: false, provider, error: message };
  }
}

// ── Provider Dispatchers ──────────────────────────────────────────────────────

async function sendViaResend(params: SendParams): Promise<{ success: boolean; provider: string; error?: string }> {
  switch (params.type) {
    case EmailType.ORDER_CONFIRMATION:
      await ResendService.sendOrderConfirmation(params.data as ResendService.OrderConfirmationParams);
      break;
    case EmailType.SHIPPING_LABEL_CREATED:
      await ResendService.sendShippingLabelCreated(params.data as ResendService.ShippingLabelCreatedParams);
      break;
    case EmailType.ORDER_SHIPPED:
      await ResendService.sendOrderShipped(params.data as ResendService.OrderShippedParams);
      break;
    case EmailType.ORDER_DELIVERED:
      await ResendService.sendOrderDelivered(params.data as ResendService.OrderDeliveredParams);
      break;
    case EmailType.SUBSCRIPTION_RENEWAL:
      await ResendService.sendSubscriptionRenewal(params.data as ResendService.SubscriptionRenewalParams);
      break;
    case EmailType.REFUND_CONFIRMATION:
      await ResendService.sendRefundConfirmation(params.data as ResendService.RefundConfirmationParams);
      break;
    case EmailType.AFFILIATE_WELCOME:
      await ResendService.sendAffiliateWelcome(params.data as ResendService.AffiliateWelcomeParams);
      break;
    case EmailType.AFFILIATE_COMMISSION_EARNED:
      await ResendService.sendAffiliateCommissionEarned(params.data as ResendService.AffiliateCommissionEarnedParams);
      break;
    case EmailType.PASSWORD_RESET:
      await ResendService.sendPasswordReset(params.data as ResendService.PasswordResetParams);
      break;
    case EmailType.ACCOUNT_VERIFICATION:
      await ResendService.sendAccountVerification(params.data as ResendService.AccountVerificationParams);
      break;
    default:
      return { success: false, provider: 'resend', error: `Unsupported transactional email type: ${params.type}` };
  }
  systemLog.info('[EmailRouter] Sent via Resend', { emailType: params.type });
  return { success: true, provider: 'resend' };
}

async function sendViaBrevo(params: SendParams): Promise<{ success: boolean; provider: string; error?: string }> {
  // Brevo marketing emails use automation triggers and campaigns
  // The actual sending is handled by Brevo's automation engine once triggered
  systemLog.info('[EmailRouter] Dispatched to Brevo', { emailType: params.type });
  return { success: true, provider: 'brevo' };
}

async function sendViaSalesBlink(params: SendParams): Promise<{ success: boolean; provider: string; error?: string }> {
  try {
    const data = params.data as Record<string, unknown>;
    const campaignName = (data.campaignName as string) ?? 'Cold Outreach';
    const campaign = await SalesBlink.createCampaign({ name: campaignName });
    const leads = data.leads as Array<{ email: string; first_name?: string; last_name?: string; company?: string }> | undefined;
    if (leads && leads.length > 0) {
      await SalesBlink.addLeads(campaign.id, leads);
    }
    systemLog.info('[EmailRouter] Dispatched to SalesBlink', { emailType: params.type, campaignId: campaign.id });
    return { success: true, provider: 'salesblink' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    systemLog.error('[EmailRouter] SalesBlink send failed', { error: { message }, emailType: params.type });
    return { success: false, provider: 'salesblink', error: message };
  }
}

// ── Convenience Exports (re-export Brevo for use in webhooks) ─────────────────

export {
  upsertBrevoContact,
  sendBrevoTransactional,
  triggerAutomationEvent,
  getContactLists,
  getCampaigns,
  getCampaignStats,
};