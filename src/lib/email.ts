import { resend } from './resend';
import { systemLog } from './logger';

export type SendTransactionalEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  from = `${process.env.FROM_NAME ?? 'Support'} <${process.env.FROM_EMAIL ?? 'support@yourdomain.com'}>`,
  replyTo,
}: SendTransactionalEmailInput) {
  if (!subject) {
    throw new Error('sendTransactionalEmail: subject is required');
  }
  if (!html) {
    throw new Error('sendTransactionalEmail: html content is required');
  }

  const recipients = Array.isArray(to) ? to : [to];

  try {
    const result = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
      reply_to: replyTo as any,
    });

    systemLog.info('Transactional email sent via Resend', {
      to: recipients,
      subject,
      messageId: (result as any)?.id,
    });

    return result;
  } catch (error) {
    systemLog.error('Transactional email failed via Resend', {
      error: error instanceof Error ? error.message : String(error),
      to: recipients,
      subject,
    });
    throw error;
  }
}
