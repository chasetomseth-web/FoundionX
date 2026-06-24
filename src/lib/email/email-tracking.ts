import { prisma } from '@/lib/prisma';
import { sendSubscriptionEmail } from './subscription-templates';

interface EmailEventData {
  subscriptionId?: string;
  customerId?: string;
  orderId?: string;
  emailType: string;
  recipient: string;
  subject?: string;
  metadata?: Record<string, any>;
}

/**
 * Track email event in database
 */
export async function trackEmailEvent(data: EmailEventData) {
  try {
    const emailEvent = await prisma.emailEvent.create({
      data: {
        subscriptionId: data.subscriptionId,
        customerId: data.customerId,
        orderId: data.orderId,
        emailType: data.emailType,
        recipient: data.recipient,
        subject: data.subject,
        status: 'pending',
        provider: 'resend',
        metadata: data.metadata || {},
      },
    });

    return emailEvent;
  } catch (error) {
    console.error('Failed to track email event:', error);
    throw error;
  }
}

/**
 * Update email event status
 */
export async function updateEmailEventStatus(
  emailEventId: string,
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
  metadata?: {
    providerEventId?: string;
    errorMessage?: string;
  }
) {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (metadata?.providerEventId) {
      updateData.providerEventId = metadata.providerEventId;
    }

    if (metadata?.errorMessage) {
      updateData.errorMessage = metadata.errorMessage;
    }

    // Set timestamp based on status
    const now = new Date();
    switch (status) {
      case 'sent':
        updateData.sentAt = now;
        break;
      case 'delivered':
        updateData.deliveredAt = now;
        break;
      case 'opened':
        updateData.openedAt = now;
        break;
      case 'clicked':
        updateData.clickedAt = now;
        break;
      case 'bounced':
        updateData.bouncedAt = now;
        break;
      case 'failed':
        updateData.failedAt = now;
        break;
    }

    const emailEvent = await prisma.emailEvent.update({
      where: { id: emailEventId },
      data: updateData,
    });

    return emailEvent;
  } catch (error) {
    console.error('Failed to update email event status:', error);
    throw error;
  }
}

/**
 * Send subscription email and track it
 */
export async function sendAndTrackSubscriptionEmail(
  emailType: string,
  subscriptionId: string,
  recipientEmail: string,
  templateData: any
) {
  // Create email event record
  const emailEvent = await trackEmailEvent({
    subscriptionId,
    emailType,
    recipient: recipientEmail,
    subject: getEmailSubject(emailType, templateData),
    metadata: templateData,
  });

  try {
    // Send the email
    const result = await sendSubscriptionEmail(emailType, recipientEmail, templateData);

    // Update status to sent
    await updateEmailEventStatus(emailEvent.id, 'sent', {
      providerEventId: result?.id,
    });

    // Update the subscription's email tracking field
    await updateSubscriptionEmailTracking(subscriptionId, emailType);

    return { success: true, emailEventId: emailEvent.id, result };
  } catch (error: any) {
    // Update status to failed
    await updateEmailEventStatus(emailEvent.id, 'failed', {
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Update subscription email tracking timestamps
 */
async function updateSubscriptionEmailTracking(subscriptionId: string, emailType: string) {
  const now = new Date();
  const updateData: any = {};

  switch (emailType) {
    case 'welcome':
      updateData.welcomeEmailSentAt = now;
      break;
    case 'renewal_reminder':
      updateData.renewalReminderSentAt = now;
      break;
    case 'payment_failed':
      updateData.paymentFailedEmailSentAt = now;
      break;
    case 'payment_success':
      updateData.paymentSuccessEmailSentAt = now;
      break;
    case 'trial_ending':
      updateData.trialEndingEmailSentAt = now;
      break;
    case 'subscription_cancelled':
      updateData.subscriptionCancelledEmailSentAt = now;
      break;
    case 'subscription_paused':
      updateData.subscriptionPausedEmailSentAt = now;
      break;
    case 'subscription_resumed':
      updateData.subscriptionResumedEmailSentAt = now;
      break;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });
  }
}

/**
 * Get email subject for a given email type
 */
function getEmailSubject(emailType: string, templateData: any): string {
  const subjects: Record<string, string> = {
    welcome: `Welcome to ${templateData.planName}!`,
    renewal_reminder: 'Your subscription renews soon',
    payment_failed: 'Action Required: Payment Failed',
    payment_success: 'Payment Received - Thank You!',
    trial_ending: 'Your trial is ending soon',
    subscription_cancelled: 'Subscription Cancelled',
    subscription_paused: 'Subscription Paused',
    subscription_resumed: 'Subscription Resumed',
  };

  return subjects[emailType] || 'Subscription Update';
}

/**
 * Check if email should be sent based on preferences
 */
export async function shouldSendEmail(subscriptionId: string, emailType: string): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { emailPreferences: true },
    });

    if (!subscription) {
      return false;
    }

    const preferences = subscription.emailPreferences as any;
    
    // Default to true if no preferences set
    if (!preferences) {
      return true;
    }

    // Map email type to preference key
    const preferenceKey = emailType.replace('subscription_', '').replace(/_/g, '');
    
    return preferences[preferenceKey] !== false;
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return true; // Default to sending if there's an error
  }
}

/**
 * Get email events for a subscription
 */
export async function getSubscriptionEmailEvents(subscriptionId: string) {
  try {
    const events = await prisma.emailEvent.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    return events;
  } catch (error) {
    console.error('Failed to get subscription email events:', error);
    throw error;
  }
}

/**
 * Get email stats for a subscription
 */
export async function getSubscriptionEmailStats(subscriptionId: string) {
  try {
    const events = await prisma.emailEvent.findMany({
      where: { subscriptionId },
    });

    const stats = {
      total: events.length,
      sent: events.filter((e) => e.status === 'sent' || e.sentAt).length,
      delivered: events.filter((e) => e.status === 'delivered' || e.deliveredAt).length,
      opened: events.filter((e) => e.openedAt).length,
      clicked: events.filter((e) => e.clickedAt).length,
      bounced: events.filter((e) => e.bouncedAt).length,
      failed: events.filter((e) => e.status === 'failed' || e.failedAt).length,
      openRate: 0,
      clickRate: 0,
    };

    if (stats.delivered > 0) {
      stats.openRate = (stats.opened / stats.delivered) * 100;
      stats.clickRate = (stats.clicked / stats.delivered) * 100;
    }

    return stats;
  } catch (error) {
    console.error('Failed to get email stats:', error);
    throw error;
  }
}

/**
 * Handle Resend webhook events
 */
export async function handleResendWebhook(event: any) {
  try {
    const { type, data } = event;

    // Find the email event by provider event ID
    const emailEvent = await prisma.emailEvent.findFirst({
      where: { providerEventId: data.email_id },
    });

    if (!emailEvent) {
      console.warn('Email event not found for webhook:', data.email_id);
      return;
    }

    // Update based on webhook type
    switch (type) {
      case 'email.sent':
        await updateEmailEventStatus(emailEvent.id, 'sent');
        break;
      case 'email.delivered':
        await updateEmailEventStatus(emailEvent.id, 'delivered');
        break;
      case 'email.opened':
        await updateEmailEventStatus(emailEvent.id, 'opened');
        break;
      case 'email.clicked':
        await updateEmailEventStatus(emailEvent.id, 'clicked');
        break;
      case 'email.bounced':
        await updateEmailEventStatus(emailEvent.id, 'bounced', {
          errorMessage: data.bounce_type || 'Email bounced',
        });
        break;
      case 'email.delivery_delayed':
        // Just log, don't change status
        console.log('Email delivery delayed:', data.email_id);
        break;
      default:
        console.log('Unhandled webhook event type:', type);
    }
  } catch (error) {
    console.error('Error handling Resend webhook:', error);
    throw error;
  }
}
