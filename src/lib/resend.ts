import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY ?? '';
if (!apiKey) {
  throw new Error('RESEND_API_KEY must be configured in .env.local for server-side transactional email delivery');
}

export const resend = new Resend(apiKey);

export function getResendClient(): Resend {
  return resend;
}
