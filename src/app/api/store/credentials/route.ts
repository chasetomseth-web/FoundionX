import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { encryptCredential, decryptCredential, maskCredential } from '@/lib/stripe';

/**
 * GET /api/store/credentials — Fetch store credentials (masked for security)
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await prisma.store.findFirst({
    where: { organizationId: auth.organizationId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  try {
    const credentials = await (prisma as any).store_credentials.findUnique({
      where: { store_id: store.id },
    });

    if (!credentials) {
      return NextResponse.json({
        credentials: {
          stripeSecretKey: '',
          stripePublishableKey: '',
          stripeWebhookSecret: '',
          resendApiKey: '',
        },
        masked: {
          stripeSecretKey: '',
          stripePublishableKey: '',
          stripeWebhookSecret: '',
          resendApiKey: '',
        },
      });
    }

    // Return masked versions for display
    return NextResponse.json({
      credentials: {
        stripeSecretKey: credentials.stripe_secret_key ? decryptCredential(credentials.stripe_secret_key) : '',
        stripePublishableKey: credentials.stripe_publishable_key || '',
        stripeWebhookSecret: credentials.stripe_webhook_secret ? decryptCredential(credentials.stripe_webhook_secret) : '',
        resendApiKey: credentials.resend_api_key ? decryptCredential(credentials.resend_api_key) : '',
      },
      masked: {
        stripeSecretKey: maskCredential(credentials.stripe_secret_key ? decryptCredential(credentials.stripe_secret_key) : ''),
        stripePublishableKey: maskCredential(credentials.stripe_publishable_key),
        stripeWebhookSecret: maskCredential(credentials.stripe_webhook_secret ? decryptCredential(credentials.stripe_webhook_secret) : ''),
        resendApiKey: maskCredential(credentials.resend_api_key ? decryptCredential(credentials.resend_api_key) : ''),
      },
    });
  } catch (error) {
    console.error('[CREDENTIALS] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

/**
 * PUT /api/store/credentials — Update store credentials (encrypted)
 */
export async function PUT(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await prisma.store.findFirst({
    where: { organizationId: auth.organizationId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  try {
    const body = await req.json();

    const data: any = {};

    if (body.stripeSecretKey !== undefined && body.stripeSecretKey !== '') {
      data.stripe_secret_key = encryptCredential(body.stripeSecretKey);
    }
    if (body.stripePublishableKey !== undefined && body.stripePublishableKey !== '') {
      data.stripe_publishable_key = body.stripePublishableKey; // No need to encrypt public key
    }
    if (body.stripeWebhookSecret !== undefined && body.stripeWebhookSecret !== '') {
      data.stripe_webhook_secret = encryptCredential(body.stripeWebhookSecret);
    }
    if (body.resendApiKey !== undefined && body.resendApiKey !== '') {
      data.resend_api_key = encryptCredential(body.resendApiKey);
    }

    // Upsert credentials
    const credentials = await (prisma as any).store_credentials.upsert({
      where: { store_id: store.id },
      create: {
        store_id: store.id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ success: true, credentialsId: credentials.id });
  } catch (error) {
    console.error('[CREDENTIALS] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 });
  }
}
