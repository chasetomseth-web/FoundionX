import { NextRequest, NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subject,
      htmlContent,
      senderName,
      senderEmail,
      recipientListIds,
      recipientEmails,
      scheduledAt,
      name,
    } = body as {
      subject: string;
      htmlContent: string;
      senderName: string;
      senderEmail: string;
      recipientListIds: number[];
      recipientEmails?: string[];
      scheduledAt?: string;
      name: string;
    };

    if (!subject || !htmlContent || !senderEmail || !name) {
      return NextResponse.json({ error: 'subject, htmlContent, senderEmail, and name are required' }, { status: 400 });
    }

    const apiKey = await getBrevoApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'Brevo API key not configured. Please connect Brevo in Settings → Integrations.' }, { status: 400 });
    }

    // Build recipients object
    let recipientsPayload: Record<string, unknown> = {};
    if (recipientEmails && recipientEmails.length > 0) {
      recipientsPayload = {
        emails: recipientEmails,
      };
    } else if (recipientListIds && recipientListIds.length > 0) {
      recipientsPayload = { listIds: recipientListIds };
    }

    const payload: Record<string, unknown> = {
      name,
      subject,
      htmlContent,
      sender: { name: senderName || 'wiastro', email: senderEmail },
      recipients: recipientsPayload,
    };

    if (scheduledAt) {
      payload.scheduledAt = scheduledAt;
    }

    // Create campaign in Brevo
    const createRes = await fetch(`${BREVO_API_BASE}/emailCampaigns`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return NextResponse.json({ error: err.message ?? 'Failed to create campaign in Brevo' }, { status: 400 });
    }

    const created = await createRes.json();
    const campaignId = created.id;

    // If no scheduledAt, send immediately
    if (!scheduledAt) {
      const sendRes = await fetch(`${BREVO_API_BASE}/emailCampaigns/${campaignId}/sendNow`, {
        method: 'POST',
        headers: { 'api-key': apiKey, Accept: 'application/json' },
      });

      if (!sendRes.ok) {
        return NextResponse.json({
          campaignId,
          status: 'created_not_sent',
          warning: 'Campaign created but could not be sent immediately. Send from Brevo dashboard.',
        });
      }

      return NextResponse.json({ campaignId, status: 'sent' });
    }

    return NextResponse.json({ campaignId, status: 'scheduled' });
  } catch (error) {
    console.error('[EMAIL] send-campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
