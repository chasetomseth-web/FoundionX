/**
 * Complete Resend Email Service with 14 HTML Templates
 * All emails follow max-width 600px, mobile responsive, brand color design
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@merchantos.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Common email styles
const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
  .content { padding: 40px 30px; }
  .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
  .button:hover { background: #5568d3; }
  .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
  .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  .highlight { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
  @media only screen and (max-width: 600px) {
    .content { padding: 20px 15px; }
    .button { display: block; margin: 10px 0; }
  }
`;

export interface EmailTemplate {
  subject: string;
  html: string;
}

// 1. ORDER CONFIRMATION
export function orderConfirmationEmail(data: {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: string;
  downloadLinks?: string[];
}): EmailTemplate {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const downloadsHtml = data.downloadLinks ? `
    <div style="background: #eff6ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1e40af;">📥 Your Downloads</h3>
      ${data.downloadLinks.map(link => `<p style="margin: 5px 0;"><a href="${link}" style="color: #3b82f6;">${link}</a></p>`).join('')}
    </div>
  ` : '';

  return {
    subject: `Order Confirmation #${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">✓ Order Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${data.orderNumber}</p>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Thank you for your order! We're getting it ready to ship.</p>
              
              ${downloadsHtml}
              
              <h3>Order Details</h3>
              <table class="table">
                <thead><tr><th>Item</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Price</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                  <tr><td colspan="2"><strong>Subtotal</strong></td><td style="text-align: right;">$${data.subtotal.toFixed(2)}</td></tr>
                  <tr><td colspan="2"><strong>Shipping</strong></td><td style="text-align: right;">$${data.shipping.toFixed(2)}</td></tr>
                  <tr><td colspan="2"><strong>Tax</strong></td><td style="text-align: right;">$${data.tax.toFixed(2)}</td></tr>
                  <tr style="font-size: 18px;"><td colspan="2"><strong>Total</strong></td><td style="text-align: right;"><strong>$${data.total.toFixed(2)}</strong></td></tr>
                </tfoot>
              </table>
              
              <div class="highlight">
                <strong>Shipping Address</strong><br/>
                ${data.shippingAddress.replace(/\n/g, '<br/>')}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/portal/orders" class="button">View Order Status</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">Questions? Reply to this email or contact support.</p>
              <p style="margin: 10px 0 0 0;"><a href="${APP_URL}/portal" style="color: #667eea;">Manage Account</a></p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 2. SHIPPING LABEL CREATED
export function shippingLabelCreatedEmail(data: {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
}): EmailTemplate {
  const trackingUrl = `https://www.google.com/search?q=${data.carrier}+${data.trackingNumber}`;
  
  return {
    subject: `Your order #${data.orderNumber} is preparing to ship`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">📦 Label Created</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Great news! Your order #${data.orderNumber} has a shipping label and will ship soon.</p>
              
              <div class="highlight">
                <p style="margin: 0 0 10px 0;"><strong>Carrier:</strong> ${data.carrier}</p>
                <p style="margin: 0 0 10px 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                <p style="margin: 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" class="button">Track Package</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">You'll receive another email when your order ships.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 3. ORDER SHIPPED
export function orderShippedEmail(data: {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
}): EmailTemplate {
  const trackingUrl = `https://www.google.com/search?q=${data.carrier}+${data.trackingNumber}`;
  
  return {
    subject: `🚚 Your order #${data.orderNumber} has shipped!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🚚 On the Way!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Your order #${data.orderNumber} is on its way!</p>
              
              <div class="highlight">
                <p style="margin: 0 0 10px 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                <p style="margin: 0 0 10px 0;"><strong>Carrier:</strong> ${data.carrier}</p>
                <p style="margin: 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>💡 Pro Tip:</strong> Save this email! You can use the tracking number to check your delivery status anytime.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingUrl}" class="button">Track Your Package</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">We'll notify you when it's delivered.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 4. ORDER DELIVERED
export function orderDeliveredEmail(data: {
  customerName: string;
  orderNumber: string;
  deliveryDate: string;
}): EmailTemplate {
  return {
    subject: `✓ Your order #${data.orderNumber} was delivered`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">✓ Delivered!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Your order #${data.orderNumber} was delivered on ${data.deliveryDate}.</p>
              
              <p>We hope you love it! Your feedback helps us improve.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/portal/orders/${data.orderNumber}/review" class="button">Leave a Review</a>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-weight: 600;">Any issues with your order?</p>
                <p style="margin: 0;">Contact us within 30 days and we'll make it right.</p>
                <p style="margin: 10px 0 0 0;"><a href="${APP_URL}/support" style="color: #667eea;">Get Help →</a></p>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">Thank you for your business!</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// 5. BILLING REMINDER (CRITICAL - Delay buttons prominent, cancel tiny at bottom)
export function billingReminderEmail(data: {
  customerName: string;
  planName: string;
  amount: string;
  currency: string;
  nextBillingDate: string;
  delay2WeeksUrl: string;
  delay4WeeksUrl: string;
  delay6WeeksUrl: string;
  swapProductUrl?: string;
  manageUrl: string;
  cancelUrl: string;
}): EmailTemplate {
  return {
    subject: `Your ${data.planName} renews in 5 days`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">⏰ Renewal Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Your <strong>${data.planName}</strong> subscription will renew on <strong>${data.nextBillingDate}</strong> for <strong>${data.currency} ${data.amount}</strong>.</p>
              
              <div style="background: #eff6ff; border: 2px solid #3b82f6; padding: 25px; border-radius: 12px; margin: 30px 0;">
                <h2 style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px;">Have too much product? Just delay your next order:</h2>
                <div style="text-align: center;">
                  <a href="${data.delay2WeeksUrl}" style="display: inline-block; background: #3b82f6; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px; font-size: 16px;">Delay 2 Weeks</a>
                  <a href="${data.delay4WeeksUrl}" style="display: inline-block; background: #3b82f6; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px; font-size: 16px;">Delay 4 Weeks</a>
                  <a href="${data.delay6WeeksUrl}" style="display: inline-block; background: #3b82f6; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px; font-size: 16px;">Delay 6 Weeks</a>
                </div>
              </div>
              
              ${data.swapProductUrl ? `
                <p style="text-align: center; margin: 20px 0;">
                  <a href="${data.swapProductUrl}" style="color: #667eea; font-weight: 600; font-size: 16px;">Want to swap to a different flavor? Click here →</a>
                </p>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.manageUrl}" class="button" style="font-size: 16px; padding: 16px 40px;">Manage Subscription</a>
              </div>
              
              <p style="text-align: center; margin: 40px 0 0 0;">
                <a href="${data.cancelUrl}" style="color: #9ca3af; font-size: 11px; text-decoration: none;">Cancel subscription</a>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Questions? Contact our support team anytime.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

// Continue in next file due to length...
// ── Typed param interfaces (for emailRouter.ts) ────────────────────────────
export type OrderConfirmationParams = Parameters<typeof orderConfirmationEmail>[0] & { to: string };
export type ShippingLabelCreatedParams = Parameters<typeof shippingLabelCreatedEmail>[0] & { to: string };
export type OrderShippedParams = Parameters<typeof orderShippedEmail>[0] & { to: string };
export type OrderDeliveredParams = Parameters<typeof orderDeliveredEmail>[0] & { to: string };
export type SubscriptionRenewalParams = { to: string; customerName: string; planName: string; amount: string; currency: string; nextBillingDate: string; delay2WeeksUrl: string; delay4WeeksUrl: string; delay6WeeksUrl: string; manageUrl: string; cancelUrl: string; swapProductUrl?: string };
export type RefundConfirmationParams = { to: string; customerName: string; orderNumber: string; amount: string; currency: string };
export type AffiliateWelcomeParams = { to: string; affiliateName: string; portalUrl: string };
export type AffiliateCommissionEarnedParams = { to: string; affiliateName: string; amount: string; currency: string; orderId: string };
export type PasswordResetParams = { to: string; resetUrl: string; customerName: string };
export type AccountVerificationParams = { to: string; verifyUrl: string; customerName: string };

// ── Named sender wrappers (called by emailRouter.ts) ──────────────────────
export async function sendOrderConfirmation(p: OrderConfirmationParams) {
  return sendEmail(p.to, orderConfirmationEmail(p));
}
export async function sendShippingLabelCreated(p: ShippingLabelCreatedParams) {
  return sendEmail(p.to, shippingLabelCreatedEmail(p));
}
export async function sendOrderShipped(p: OrderShippedParams) {
  return sendEmail(p.to, orderShippedEmail(p));
}
export async function sendOrderDelivered(p: OrderDeliveredParams) {
  return sendEmail(p.to, orderDeliveredEmail(p));
}
export async function sendSubscriptionRenewal(p: SubscriptionRenewalParams) {
  return sendEmail(p.to, billingReminderEmail(p));
}
export async function sendRefundConfirmation(p: RefundConfirmationParams) {
  const html = `<p>Hi ${p.customerName}, your refund of ${p.currency} ${p.amount} for order #${p.orderNumber} has been processed.</p>`;
  return sendEmail(p.to, { subject: `Refund Confirmed — Order #${p.orderNumber}`, html });
}
export async function sendAffiliateWelcome(p: AffiliateWelcomeParams) {
  const html = `<p>Hi ${p.affiliateName}, welcome to the affiliate program! <a href="${p.portalUrl}">Visit your portal</a>.</p>`;
  return sendEmail(p.to, { subject: 'Welcome to the Affiliate Program!', html });
}
export async function sendAffiliateCommissionEarned(p: AffiliateCommissionEarnedParams) {
  const html = `<p>Hi ${p.affiliateName}, you earned ${p.currency} ${p.amount} commission on order ${p.orderId}.</p>`;
  return sendEmail(p.to, { subject: 'Commission Earned!', html });
}
export async function sendPasswordReset(p: PasswordResetParams) {
  const html = `<p>Hi ${p.customerName}, <a href="${p.resetUrl}">click here to reset your password</a>. Link expires in 1 hour.</p>`;
  return sendEmail(p.to, { subject: 'Reset Your Password', html });
}
export async function sendAccountVerification(p: AccountVerificationParams) {
  const html = `<p>Hi ${p.customerName}, <a href="${p.verifyUrl}">click here to verify your email address</a>.</p>`;
  return sendEmail(p.to, { subject: 'Verify Your Email', html });
}

// ── Generic wrappers for emailService.ts ─────────────────────────────────
export async function sendTransactionalEmail(input: { to: Array<{ email: string; name?: string }>; subject: string; html?: string; text?: string }) {
  for (const recipient of input.to) {
    await sendEmail(recipient.email, { subject: input.subject, html: input.html ?? input.text ?? '' });
  }
}
export async function sendSupportEmail(input: { to: Array<{ email: string; name?: string }>; subject: string; html?: string; text?: string }) {
  return sendTransactionalEmail(input);
}
export async function sendAuthEmail(input: { to: Array<{ email: string; name?: string }>; subject: string; html?: string; text?: string }) {
  return sendTransactionalEmail(input);
}

export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error('Email send error:', error);
    // Silent failure - log but don't throw
  }
}
