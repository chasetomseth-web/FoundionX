/**
 * Resend Email Templates Part 2 (Templates 6-14)
 */

import { EmailTemplate } from './resendEmailService';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
  .content { padding: 40px 30px; }
  .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
  .button:hover { background: #5568d3; }
  .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
  .highlight { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
  @media only screen and (max-width: 600px) {
    .content { padding: 20px 15px; }
    .button { display: block; margin: 10px 0; }
  }
`;

// 6. SUBSCRIPTION RENEWAL RECEIPT
export function renewalReceiptEmail(data: {
  customerName: string;
  planName: string;
  amount: string;
  currency: string;
  renewalDate: string;
  nextBillingDate: string;
  invoiceUrl?: string;
  delayUrl: string;
}): EmailTemplate {
  return {
    subject: `Receipt for your ${data.planName} renewal`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">✓ Payment Successful</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Your <strong>${data.planName}</strong> subscription has been renewed.</p>
              
              <div class="highlight">
                <p style="margin: 0 0 10px 0;"><strong>Amount Charged:</strong> ${data.currency} ${data.amount}</p>
                <p style="margin: 0 0 10px 0;"><strong>Renewal Date:</strong> ${data.renewalDate}</p>
                <p style="margin: 0;"><strong>Next Billing Date:</strong> ${data.nextBillingDate}</p>
              </div>
              
              ${data.invoiceUrl ? `
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${data.invoiceUrl}" class="button">View Invoice</a>
                </div>
              ` : ''}
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.delayUrl}" style="color: #667eea; font-weight: 600;">Want to delay your next order? Click here →</a>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Thank you for your continued subscription!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 7. FAILED PAYMENT
export function failedPaymentEmail(data: {
  customerName: string;
  planName: string;
  amount: string;
  currency: string;
  retryDate: string;
  updatePaymentUrl: string;
}): EmailTemplate {
  return {
    subject: `Action Required: Payment failed for ${data.planName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
              <h1 style="margin: 0; font-size: 32px;">⚠️ Payment Issue</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>We weren't able to process your payment for <strong>${data.planName}</strong>.</p>
              
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #991b1b;">Payment Details</p>
                <p style="margin: 0 0 5px 0; color: #7f1d1d;">Amount: ${data.currency} ${data.amount}</p>
                <p style="margin: 0; color: #7f1d1d;">We'll retry on: ${data.retryDate}</p>
              </div>
              
              <p>Don't worry — this happens sometimes. Please update your payment method to keep your subscription active.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.updatePaymentUrl}" class="button" style="background: #ef4444; font-size: 16px; padding: 16px 40px;">Update Payment Method</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">If you don't update your payment method, your subscription may be cancelled after multiple failed attempts.</p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Need help? Contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 8. REFUND CONFIRMATION
export function refundConfirmationEmail(data: {
  customerName: string;
  orderNumber: string;
  refundAmount: string;
  currency: string;
  processingTime: string;
  reason?: string;
}): EmailTemplate {
  return {
    subject: `Refund processed for order #${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <h1 style="margin: 0; font-size: 32px;">✓ Refund Processed</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Your refund for order #${data.orderNumber} has been processed.</p>
              
              <div class="highlight">
                <p style="margin: 0 0 10px 0;"><strong>Refund Amount:</strong> ${data.currency} ${data.refundAmount}</p>
                <p style="margin: 0 0 10px 0;"><strong>Processing Time:</strong> ${data.processingTime}</p>
                <p style="margin: 0;"><strong>Order Reference:</strong> #${data.orderNumber}</p>
              </div>
              
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              
              <p>The refund will appear in your original payment method within the processing time shown above.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/portal/orders" class="button">View Orders</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">We're sorry things didn't work out. We'd love to have you back!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 9. AFFILIATE WELCOME
export function affiliateWelcomeEmail(data: {
  affiliateName: string;
  referralLink: string;
  commissionRate: string;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: 'Welcome to our Affiliate Program!',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🎉 Welcome, Affiliate!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.affiliateName},</p>
              <p>Welcome to our affiliate program! We're excited to have you on board.</p>
              
              <div style="background: #eff6ff; border: 2px solid #3b82f6; padding: 25px; border-radius: 12px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af;">Your Referral Link</h3>
                <div style="background: white; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; color: #1f2937;">
                  ${data.referralLink}
                </div>
                <p style="margin: 15px 0 0 0; color: #1e40af;"><strong>Commission Rate:</strong> ${data.commissionRate}%</p>
              </div>
              
              <h3>How It Works:</h3>
              <ol style="line-height: 1.8;">
                <li>Share your unique referral link with your audience</li>
                <li>Earn ${data.commissionRate}% commission on every sale</li>
                <li>Track your earnings in real-time</li>
                <li>Get paid monthly via your preferred method</li>
              </ol>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">Questions? Check out our affiliate resources or contact support.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 10. AFFILIATE COMMISSION EARNED
export function commissionEarnedEmail(data: {
  affiliateName: string;
  earningsAmount: string;
  currency: string;
  orderCount: number;
  pendingBalance: string;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: `You earned ${data.currency}${data.earningsAmount} in commissions!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <h1 style="margin: 0; font-size: 32px;">💰 Commission Earned!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.affiliateName},</p>
              <p>Great news! You've earned new commissions.</p>
              
              <div class="highlight" style="text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">This Period's Earnings</p>
                <p style="margin: 0; font-size: 48px; font-weight: bold; color: #10b981;">${data.currency}${data.earningsAmount}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">From {data.orderCount} order{data.orderCount !== 1 ? 's' : ''}</p>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Pending Balance:</strong> ${data.currency}${data.pendingBalance}</p>
              </div>
              
              <p>Keep up the great work! Your commissions will be paid out on the next payment cycle.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">Thank you for being an awesome affiliate!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 11. PASSWORD RESET
export function passwordResetEmail(data: {
  resetLink: string;
  expiryHours: number;
}): EmailTemplate {
  return {
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>You requested to reset your password.</p>
              
              <p>Click the button below to create a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetLink}" class="button" style="font-size: 16px; padding: 16px 40px;">Reset Password</a>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Security Notice:</strong> This link expires in ${data.expiryHours} hours.</p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
              
              <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">If the button doesn't work, copy and paste this link: ${data.resetLink}</p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Keep your account secure!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 12. EMAIL VERIFICATION
export function emailVerificationEmail(data: {
  verificationLink: string;
  verificationCode: string;
}): EmailTemplate {
  return {
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">✉️ Verify Email</h1>
            </div>
            <div class="content">
              <p>Thanks for signing up! Please verify your email address to get started.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.verificationLink}" class="button" style="font-size: 16px; padding: 16px 40px;">Verify Email Address</a>
              </div>
              
              <div class="highlight" style="text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Or enter this code manually:</p>
                <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${data.verificationCode}</p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; text-align: center;">This link expires in 24 hours.</p>
              
              <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Welcome aboard!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 13. POST-PURCHASE ONBOARDING DAY 1 (NO UPSELL - usage tips & habits)
export function onboardingDay1Email(data: {
  customerName: string;
  productName: string;
  usageTips: string;
  habitMessage: string;
}): EmailTemplate {
  return {
    subject: `Welcome! Here's how to get the most from ${data.productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🎉 Welcome!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Congratulations on starting your journey with <strong>${data.productName}</strong>!</p>
              
              <h3>Quick Start Guide</h3>
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${data.usageTips}
              </div>
              
              <h3>Building the Habit</h3>
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${data.habitMessage}
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>💡 The 90-Day Commitment:</strong> Most customers see best results when they stick with it for at least 90 days. We're here to support you every step of the way!</p>
              </div>
              
              <p>Have questions? Reply to this email — we read every message!</p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Here's to your success!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 14. POST-PURCHASE ONBOARDING DAY 7 (NO UPSELL - testimonials & timeline)
export function onboardingDay7Email(data: {
  customerName: string;
  productName: string;
  testimonials: string;
  nextBillingDate?: string;
}): EmailTemplate {
  return {
    subject: `One week in with ${data.productName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">📅 Week 1 Complete!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>You've completed one week with <strong>${data.productName}</strong>! How's it going?</p>
              
              <h3>What to Expect</h3>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Week 1-2:</strong> Getting started, building the habit</p>
                <p style="margin: 0 0 10px 0;"><strong>Week 3-4:</strong> Starting to notice subtle changes</p>
                <p style="margin: 0 0 10px 0;"><strong>Week 8-12:</strong> Significant results for most customers</p>
                <p style="margin: 0;"><strong>Month 3+:</strong> Peak benefits and sustained results</p>
              </div>
              
              <h3>Real Customer Stories</h3>
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${data.testimonials}
              </div>
              
              ${data.nextBillingDate ? `
                <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #4b5563;">Your next order ships on ${data.nextBillingDate}. You can delay or manage your subscription anytime in your portal.</p>
                </div>
              ` : ''}
              
              <p>Keep going! Consistency is key. 🌟</p>
            </div>
            <div class="footer">
              <p style="margin: 0;">We're rooting for you!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}
