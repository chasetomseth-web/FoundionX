import { Resend } from 'resend';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailTemplateProps {
  customerName: string;
  planName: string;
  amount: string;
  currency: string;
  [key: string]: any;
}

// Base email wrapper component
const EmailWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <style>{`
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
        .button { background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
        .button:hover { background: #5568d3; }
        h1 { margin: 0; font-size: 28px; }
        p { line-height: 1.6; color: #374151; }
        .highlight { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
      `}</style>
    </head>
    <body>
      <div className="container">{children}</div>
    </body>
  </html>
);

// 1. Welcome Email
export const WelcomeEmail: React.FC<EmailTemplateProps> = ({ customerName, planName, amount, currency }) => (
  <EmailWrapper>
    <div className="header">
      <h1>🎉 Welcome to {planName}!</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>Thank you for subscribing to <strong>{planName}</strong>! We're thrilled to have you on board.</p>
      <div className="highlight">
        <strong>Your Subscription Details:</strong>
        <br />
        Plan: {planName}
        <br />
        Amount: {currency} {amount}
      </div>
      <p>You now have full access to all premium features. Get started by exploring your dashboard.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal" className="button">
        Access Your Account
      </a>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
        Need help? Reply to this email or visit our support center.
      </p>
    </div>
  </EmailWrapper>
);

// 2. Renewal Reminder Email
export const RenewalReminderEmail: React.FC<EmailTemplateProps & { nextBillingDate: string }> = ({
  customerName,
  planName,
  amount,
  currency,
  nextBillingDate,
}) => (
  <EmailWrapper>
    <div className="header">
      <h1>⏰ Upcoming Renewal</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>This is a friendly reminder that your <strong>{planName}</strong> subscription will renew soon.</p>
      <div className="highlight">
        <strong>Renewal Details:</strong>
        <br />
        Next Billing Date: {nextBillingDate}
        <br />
        Amount: {currency} {amount}
      </div>
      <p>No action is needed - your subscription will automatically renew. If you need to make changes, visit your account settings.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/subscriptions" className="button">
        Manage Subscription
      </a>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
        Questions? Contact our support team anytime.
      </p>
    </div>
  </EmailWrapper>
);

// 3. Payment Failed Email
export const PaymentFailedEmail: React.FC<EmailTemplateProps & { failureReason?: string; retryDate?: string }> = ({
  customerName,
  planName,
  amount,
  currency,
  failureReason,
  retryDate,
}) => (
  <EmailWrapper>
    <div className="header" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
      <h1>⚠️ Payment Failed</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>We were unable to process your payment for <strong>{planName}</strong>.</p>
      <div className="highlight">
        <strong>Payment Details:</strong>
        <br />
        Amount: {currency} {amount}
        <br />
        {failureReason && (
          <>
            Reason: {failureReason}
            <br />
          </>
        )}
        {retryDate && <>Next Retry: {retryDate}</>}
      </div>
      <p>
        Please update your payment method to avoid service interruption. We'll automatically retry the payment{' '}
        {retryDate ? `on ${retryDate}` : 'soon'}.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/billing" className="button">
        Update Payment Method
      </a>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Need assistance? Our support team is here to help.</p>
    </div>
  </EmailWrapper>
);

// 4. Payment Success Email
export const PaymentSuccessEmail: React.FC<EmailTemplateProps & { invoiceUrl?: string; nextBillingDate: string }> = ({
  customerName,
  planName,
  amount,
  currency,
  invoiceUrl,
  nextBillingDate,
}) => (
  <EmailWrapper>
    <div className="header" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
      <h1>✓ Payment Successful</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>Thank you! Your payment for <strong>{planName}</strong> has been processed successfully.</p>
      <div className="highlight">
        <strong>Payment Confirmation:</strong>
        <br />
        Amount Paid: {currency} {amount}
        <br />
        Next Billing: {nextBillingDate}
      </div>
      {invoiceUrl && (
        <p>
          <a href={invoiceUrl} style={{ color: '#667eea' }}>
            Download Invoice →
          </a>
        </p>
      )}
      <p>Your subscription remains active. Thank you for your continued support!</p>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
        View all invoices in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/billing">billing portal</a>.
      </p>
    </div>
  </EmailWrapper>
);

// 5. Trial Ending Email
export const TrialEndingEmail: React.FC<EmailTemplateProps & { daysRemaining: number; trialEndDate: string }> = ({
  customerName,
  planName,
  amount,
  currency,
  daysRemaining,
  trialEndDate,
}) => (
  <EmailWrapper>
    <div className="header" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
      <h1>⏳ Trial Ending Soon</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>
        Your <strong>{planName}</strong> trial will end in <strong>{daysRemaining} days</strong> on {trialEndDate}.
      </p>
      <div className="highlight">
        <strong>After Trial:</strong>
        <br />
        Plan: {planName}
        <br />
        Price: {currency} {amount}/month
      </div>
      <p>
        To continue enjoying all features, make sure your payment method is set up. You won't be charged until your trial
        ends.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/billing" className="button">
        Set Up Payment
      </a>
      <p style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        Not interested? You can cancel anytime before {trialEndDate}.
      </p>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Have questions? We're here to help!</p>
    </div>
  </EmailWrapper>
);

// 6. Subscription Cancelled Email
export const SubscriptionCancelledEmail: React.FC<EmailTemplateProps & { cancelDate: string; reason?: string }> = ({
  customerName,
  planName,
  cancelDate,
  reason,
}) => (
  <EmailWrapper>
    <div className="header" style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}>
      <h1>Subscription Cancelled</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>
        Your <strong>{planName}</strong> subscription has been cancelled.
      </p>
      <div className="highlight">
        <strong>Cancellation Details:</strong>
        <br />
        Access Until: {cancelDate}
        <br />
        {reason && (
          <>
            Reason: {reason}
            <br />
          </>
        )}
      </div>
      <p>You'll continue to have access until {cancelDate}. After that, your account will be downgraded to the free plan.</p>
      <p>Changed your mind? You can reactivate your subscription anytime.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/subscriptions" className="button">
        Reactivate Subscription
      </a>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>We're sad to see you go. Feedback? Let us know!</p>
    </div>
  </EmailWrapper>
);

// 7. Subscription Paused Email
export const SubscriptionPausedEmail: React.FC<EmailTemplateProps & { pausedUntil?: string }> = ({
  customerName,
  planName,
  pausedUntil,
}) => (
  <EmailWrapper>
    <div className="header" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
      <h1>⏸️ Subscription Paused</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>
        Your <strong>{planName}</strong> subscription has been paused.
      </p>
      <div className="highlight">
        <strong>Pause Details:</strong>
        <br />
        Status: Paused
        <br />
        {pausedUntil && (
          <>
            Resume Date: {pausedUntil}
            <br />
          </>
        )}
      </div>
      <p>You won't be charged while your subscription is paused. Resume anytime to regain full access.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/subscriptions" className="button">
        Resume Subscription
      </a>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Questions about pausing? Contact support.</p>
    </div>
  </EmailWrapper>
);

// 8. Subscription Resumed Email
export const SubscriptionResumedEmail: React.FC<EmailTemplateProps & { nextBillingDate: string }> = ({
  customerName,
  planName,
  amount,
  currency,
  nextBillingDate,
}) => (
  <EmailWrapper>
    <div className="header" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
      <h1>▶️ Subscription Resumed</h1>
    </div>
    <div className="content">
      <p>Hi {customerName},</p>
      <p>
        Great news! Your <strong>{planName}</strong> subscription has been resumed.
      </p>
      <div className="highlight">
        <strong>Active Subscription:</strong>
        <br />
        Plan: {planName}
        <br />
        Amount: {currency} {amount}
        <br />
        Next Billing: {nextBillingDate}
      </div>
      <p>You now have full access to all features again. Welcome back!</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal" className="button">
        Access Dashboard
      </a>
    </div>
    <div className="footer">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Glad to have you back!</p>
    </div>
  </EmailWrapper>
);

// Email sending functions
export const sendSubscriptionEmail = async (
  emailType: string,
  recipientEmail: string,
  templateData: EmailTemplateProps
) => {
  const templates: Record<string, { subject: string; component: React.FC<any> }> = {
    welcome: { subject: `Welcome to ${templateData.planName}!`, component: WelcomeEmail },
    renewal_reminder: { subject: 'Your subscription renews soon', component: RenewalReminderEmail },
    payment_failed: { subject: 'Action Required: Payment Failed', component: PaymentFailedEmail },
    payment_success: { subject: 'Payment Received - Thank You!', component: PaymentSuccessEmail },
    trial_ending: { subject: 'Your trial is ending soon', component: TrialEndingEmail },
    subscription_cancelled: { subject: 'Subscription Cancelled', component: SubscriptionCancelledEmail },
    subscription_paused: { subject: 'Subscription Paused', component: SubscriptionPausedEmail },
    subscription_resumed: { subject: 'Subscription Resumed', component: SubscriptionResumedEmail },
  };

  const template = templates[emailType];
  if (!template) {
    throw new Error(`Unknown email template: ${emailType}`);
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@merchantos.com',
      to: recipientEmail,
      subject: template.subject,
      react: React.createElement(template.component, templateData),
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send subscription email:', error);
    throw error;
  }
};
