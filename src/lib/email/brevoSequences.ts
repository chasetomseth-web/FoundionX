/**
 * Brevo Sequence Enrollment Functions
 * All functions use silent failures - log errors but never throw
 */

import { prisma } from '@/lib/prisma';

interface BrevoContact {
  email: string;
  attributes: Record<string, any>;
  listIds?: number[];
}

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';

/**
 * Enroll contact in a Brevo email sequence
 * Silent failure - logs errors but doesn't throw
 */
export async function enrollInSequence(
  email: string,
  sequenceType: string,
  attributes: Record<string, any>,
  storeId: string
): Promise<void> {
  try {
    // Get sequence ID from integration settings
    // Using any to bypass Prisma type checking for now
    const setting = await (prisma as any).integration_settings?.findFirst({
      where: {
        store_id: storeId,
        provider: 'brevo_sequences',
        enabled: true,
      },
    }).catch(() => null);

    if (!setting || !setting.config) {
      console.log(`Brevo sequences not configured for store ${storeId}`);
      return;
    }

    const config = setting.config as any;
    const sequenceId = config[sequenceType];

    if (!sequenceId || !BREVO_API_KEY) {
      console.log(`Brevo sequence ${sequenceType} not configured`);
      return;
    }

    // Create or update contact in Brevo
    const response = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: {
          ...attributes,
          SEQUENCE_TYPE: sequenceType,
          ENROLLED_AT: new Date().toISOString(),
        },
        listIds: [parseInt(sequenceId)],
        updateEnabled: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Brevo enrollment error for ${email}:`, error);
      return;
    }

    console.log(`✓ Enrolled ${email} in Brevo sequence: ${sequenceType}`);
  } catch (error) {
    // Silent failure
    console.error(`Brevo enrollment error:`, error);
  }
}

/**
 * Remove contact from a Brevo sequence
 * Silent failure - logs errors but doesn't throw
 */
export async function removeFromSequence(
  email: string,
  sequenceType: string,
  storeId: string
): Promise<void> {
  try {
    const setting = await (prisma as any).integration_settings?.findFirst({
      where: {
        store_id: storeId,
        provider: 'brevo_sequences',
        enabled: true,
      },
    }).catch(() => null);

    if (!setting || !setting.config) {
      return;
    }

    const config = setting.config as any;
    const sequenceId = config[sequenceType];

    if (!sequenceId || !BREVO_API_KEY) {
      return;
    }

    // Remove from list
    await fetch(`${BREVO_API_URL}/contacts/lists/${sequenceId}/contacts/remove`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        emails: [email],
      }),
    });

    console.log(`✓ Removed ${email} from Brevo sequence: ${sequenceType}`);
  } catch (error) {
    // Silent failure
    console.error(`Brevo removal error:`, error);
  }
}

/**
 * Update Brevo contact attributes
 * Silent failure - logs errors but doesn't throw
 */
export async function updateBrevoContactAttributes(
  email: string,
  attributes: Record<string, any>,
  storeId: string
): Promise<void> {
  try {
    if (!BREVO_API_KEY) {
      return;
    }

    await fetch(`${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        attributes: {
          ...attributes,
          UPDATED_AT: new Date().toISOString(),
        },
      }),
    });

    console.log(`✓ Updated Brevo attributes for ${email}`);
  } catch (error) {
    // Silent failure
    console.error(`Brevo update error:`, error);
  }
}

/**
 * Auto-enrollment helpers for common events
 */

export async function enrollPostPurchaseOnboarding(email: string, orderData: any, storeId: string) {
  await enrollInSequence(
    email,
    'post_purchase_onboarding',
    {
      FIRST_NAME: orderData.customerName?.split(' ')[0] || '',
      PRODUCT_NAME: orderData.productName || '',
      ORDER_DATE: orderData.createdAt || new Date().toISOString(),
    },
    storeId
  );
}

export async function enrollSubscriberEducational(email: string, subscriptionData: any, storeId: string) {
  await enrollInSequence(
    email,
    'subscriber_educational',
    {
      FIRST_NAME: subscriptionData.customerName?.split(' ')[0] || '',
      PLAN_NAME: subscriptionData.planName || '',
      SUBSCRIPTION_START: new Date().toISOString(),
    },
    storeId
  );
}

export async function enrollPostCancelWinback(email: string, subscriptionData: any, storeId: string) {
  await enrollInSequence(
    email,
    'post_cancel_winback',
    {
      FIRST_NAME: subscriptionData.customerName?.split(' ')[0] || '',
      PLAN_NAME: subscriptionData.planName || '',
      CANCEL_DATE: new Date().toISOString(),
      CANCEL_REASON: subscriptionData.cancelReason || '',
    },
    storeId
  );
}
