import { NextRequest, NextResponse } from 'next/server';
import { getBrevoApiKey } from '@/lib/integration-settings';

const BREVO_API = 'https://api.brevo.com/v3';

async function brevo<T>(path: string, apiKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BREVO_API}${path}`, {
    ...options,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// GET /api/email/templates — list all templates
export async function GET(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const data = await brevo<{ count: number; templates: BrevoTemplate[] }>('/smtp/templates?limit=50&sort=desc', apiKey);
    return NextResponse.json({ templates: data.templates ?? [], count: data.count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/email/templates — create a new template
export async function POST(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const body = await req.json();
    const { templateName, subject, htmlContent, senderName, senderEmail, isActive } = body;

    if (!templateName || !subject || !htmlContent || !senderEmail) {
      return NextResponse.json({ error: 'templateName, subject, htmlContent, senderEmail required' }, { status: 400 });
    }

    const result = await brevo<{ id: number }>('/smtp/templates', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        templateName,
        subject,
        htmlContent,
        sender: { name: senderName ?? 'wiastro', email: senderEmail },
        isActive: isActive ?? true,
      }),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create template' }, { status: 500 });
  }
}

// PATCH /api/email/templates — update a template
export async function PATCH(req: NextRequest) {
  const apiKey = await getBrevoApiKey();
  if (!apiKey) return NextResponse.json({ error: 'Brevo not configured' }, { status: 400 });

  try {
    const { templateId, templateName, subject, htmlContent, senderName, senderEmail, isActive } = await req.json();
    if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

    const body: Record<string, unknown> = {};
    if (templateName) body.templateName = templateName;
    if (subject) body.subject = subject;
    if (htmlContent) body.htmlContent = htmlContent;
    if (senderEmail) body.sender = { name: senderName ?? 'wiastro', email: senderEmail };
    if (isActive !== undefined) body.isActive = isActive;

    await brevo(`/smtp/templates/${templateId}`, apiKey, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update template' }, { status: 500 });
  }
}

interface BrevoTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  testSent: boolean;
  sender: { name: string; email: string };
  replyTo: string;
  toField: string;
  tag: string;
  htmlContent: string;
  createdAt: string;
  modifiedAt: string;
}
