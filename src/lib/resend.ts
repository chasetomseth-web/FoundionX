import { Resend } from 'resend';

let _resend: Resend | null = null;

function _getApiKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  if (key && key.length > 10 && !key.startsWith('your-') && !key.includes('placeholder')) {
    return key;
  }
  return null;
}

export function getResendClient(): Resend | null {
  const apiKey = _getApiKey();
  if (!apiKey) return null;
  if (!_resend) {
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export const resend = getResendClient();
