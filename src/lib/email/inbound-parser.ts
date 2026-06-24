function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWhitespace(text: string): string {
  return (text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export interface ParsedInboundEmail {
  senderEmail: string;
  subject: string;
  body: string;
}

// Zoho (or other providers) will usually post either:
// - JSON with fields like from/subject/text/html
// - or an object with nested data.
// This parser is defensive and works with a few common shapes.
export function parseInboundEmail(payload: any): ParsedInboundEmail {
  const from =
    payload?.from?.email ||
    payload?.from_email ||
    payload?.sender?.email ||
    payload?.sender_email ||
    payload?.mail?.from?.address ||
    payload?.data?.from ||
    payload?.data?.sender ||
    '';

  const senderEmail = String(from || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';

  const subject = String(payload?.subject ?? payload?.data?.subject ?? payload?.mail?.subject ?? 'No subject');

  const textBody = payload?.text ?? payload?.body_text ?? payload?.data?.text ?? payload?.data?.body_text ?? '';
  const htmlBody = payload?.html ?? payload?.body_html ?? payload?.data?.html ?? payload?.data?.body_html ?? '';

  const body = normalizeWhitespace(stripHtml(htmlBody) || textBody || '');

  return {
    senderEmail,
    subject,
    body,
  };
}

