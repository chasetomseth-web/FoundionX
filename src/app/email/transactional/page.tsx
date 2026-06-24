'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Edit2, Eye, Send, ToggleLeft, ToggleRight, X, Loader2, AlertCircle, Check, ChevronDown, ChevronUp, RefreshCw, ShoppingBag, Package, Truck, CheckCircle, MessageCircle, Star, ShoppingCart, CreditCard, RotateCcw, Bell, TrendingDown, Calendar, Crown, Zap, UserPlus, Lock, KeyRound, Gift, Heart, Users, AlertTriangle, RefreshCcw, Award, Tag, Clock } from 'lucide-react';



interface BrevoTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  sender: { name: string; email: string };
  htmlContent: string;
  createdAt: string;
  modifiedAt: string;
}

interface Sender {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

type TemplateCategory = 'authentication' | 'orders' | 'shipping' | 'billing' | 'subscriptions' | 'reviews' | 'loyalty' | 'winback' | 'core' | 'pro';

interface PrebuiltTemplate {
  key: string;
  label: string;
  category: TemplateCategory;
  icon: React.ElementType;
  iconColor: string;
  trigger: string;
  goal: string;
  subjectLines: string[];
  defaultSubject: string;
  htmlContent: string;
  vars: string[];
  stripeEvent?: string;
}

// Stripe event → template key mapping (shown as badge on card)
const STRIPE_EVENT_MAP: Record<string, string> = {
  order_confirmation: 'checkout.session.completed',
  refund_confirmation: 'charge.refunded',
  failed_payment: 'payment_intent.payment_failed',
  subscription_renewal: 'invoice.paid',
  subscription_payment_failed: 'invoice.payment_failed',
  subscription_renewed: 'customer.subscription.updated',
};

// ── Standard footer HTML ──────────────────────────────────────────────────────
const footerHtml = `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
  <p style="margin:0;">{{params.STORE_NAME}} · <a href="{{params.SHOP_URL}}" style="color:#999;">{{params.SHOP_URL}}</a></p>
  <p style="margin:4px 0 0;">Questions? <a href="mailto:{{params.SHOP_EMAIL}}" style="color:#999;">{{params.SHOP_EMAIL}}</a></p>
</div>`;

const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  // ── AUTHENTICATION ──────────────────────────────────────────────────────────
  {
    key: 'account_created',
    label: 'Account Created / Welcome',
    category: 'authentication',
    icon: UserPlus,
    iconColor: 'text-emerald-500',
    trigger: 'New customer account created',
    goal: 'Onboard + build trust + drive first login',
    subjectLines: [
      'Welcome to {{params.STORE_NAME}} — your account is ready',
      'Your account has been created',
    ],
    defaultSubject: 'Welcome to {{params.STORE_NAME}} — your account is ready',
    vars: ['{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{contact.EMAIL}}', '{{params.PASSWD}}', '{{params.SHOP_URL}}', '{{params.SHOP_EMAIL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}} {{contact.LASTNAME}},</p>
  <p>Welcome to <strong>{{params.STORE_NAME}}</strong> — we're excited to have you here.</p>
  <p>Your customer account has been successfully created and you can now:</p>
  <ul style="line-height:2;">
    <li>Track orders</li>
    <li>Save shipping details</li>
    <li>Manage subscriptions</li>
    <li>View order history</li>
    <li>Access exclusive offers</li>
  </ul>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 8px;">ACCOUNT DETAILS</p>
    <p style="margin:4px 0;">Email: <strong>{{contact.EMAIL}}</strong></p>
    <p style="margin:4px 0;">Password: <strong>{{params.PASSWD}}</strong></p>
  </div>
  <div style="background:#fef9ec;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 6px;">SECURITY RECOMMENDATIONS</p>
    <p style="margin:2px 0;font-size:13px;">Keep your login credentials private</p>
    <p style="margin:2px 0;font-size:13px;">Use a strong password and update it regularly</p>
    <p style="margin:2px 0;font-size:13px;">Contact us immediately if you notice suspicious activity</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Access Your Account →</a>
  </div>
  <p>Thank you for choosing {{params.STORE_NAME}}.</p>
  <p>— The {{params.STORE_NAME}} Team</p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'otp_verification',
    label: 'OTP / 2FA Verification Code',
    category: 'authentication',
    icon: Lock,
    iconColor: 'text-blue-500',
    trigger: 'Login verification requested',
    goal: 'Secure account access',
    subjectLines: [
      'Your {{params.STORE_NAME}} verification code',
      'Security code: {{params.OTP_VALUE}}',
    ],
    defaultSubject: 'Your {{params.STORE_NAME}} verification code',
    vars: ['{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{params.OTP_VALUE}}', '{{params.SHOP_URL}}', '{{params.SHOP_EMAIL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}} {{contact.LASTNAME}},</p>
  <p>Use the verification code below to complete your login.</p>
  <div style="background:#f0f4ff;border-radius:12px;padding:28px;margin:24px 0;text-align:center;">
    <p style="font-size:13px;color:#666;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">VERIFICATION CODE</p>
    <p style="font-size:42px;font-weight:800;letter-spacing:8px;margin:0;color:#1a1a1a;">{{params.OTP_VALUE}}</p>
    <p style="font-size:13px;color:#999;margin:12px 0 0;">This code expires in 10 minutes.</p>
  </div>
  <p style="color:#666;font-size:14px;">If you did not request this login, please secure your account immediately by resetting your password.</p>
  <p>— The {{params.STORE_NAME}} Security Team</p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'password_reset',
    label: 'Password Reset',
    category: 'authentication',
    icon: KeyRound,
    iconColor: 'text-orange-500',
    trigger: 'Password reset requested',
    goal: 'Secure password recovery',
    subjectLines: [
      'Reset your {{params.STORE_NAME}} password',
      'Password reset request',
    ],
    defaultSubject: 'Reset your {{params.STORE_NAME}} password',
    vars: ['{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{params.RESET_URL}}', '{{params.SHOP_EMAIL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}} {{contact.LASTNAME}},</p>
  <p>We received a request to reset your password for your <strong>{{params.STORE_NAME}}</strong> account.</p>
  <p>To continue, click the secure link below:</p>
  <div style="text-align:center;margin:28px 0;">
    <a href="{{params.RESET_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Reset My Password →</a>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:14px 16px;margin:16px 0;">
    <p style="margin:2px 0;font-size:13px;color:#666;">This link may expire after a limited time</p>
    <p style="margin:2px 0;font-size:13px;color:#666;">Your current password remains active until reset is completed</p>
  </div>
  <p style="color:#999;font-size:13px;">If you did not request a password reset, you can safely ignore this email.</p>
  <p>— {{params.STORE_NAME}}</p>
  ${footerHtml}
</div>`,
  },

  // ── ORDERS ──────────────────────────────────────────────────────────────────
  {
    key: 'order_confirmation',
    label: 'Order Confirmation',
    category: 'orders',
    icon: ShoppingBag,
    iconColor: 'text-success',
    trigger: 'Immediately after purchase',
    goal: 'Reassure + set expectations + reduce refunds',
    stripeEvent: 'checkout.session.completed',
    subjectLines: [
      'Order confirmed #{{params.ORDER_NAME}}',
      'We got your order — here\'s what happens next',
    ],
    defaultSubject: 'Order confirmed #{{params.ORDER_NAME}}',
    vars: ['{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{params.ORDER_NAME}}', '{{params.DATE}}', '{{params.PAYMENT}}', '{{params.PRODUCTS}}', '{{params.TOTAL_PRODUCTS}}', '{{params.TOTAL_DISCOUNTS}}', '{{params.TOTAL_SHIPPING}}', '{{params.TOTAL_TAX_PAID}}', '{{params.TOTAL_PAID}}', '{{params.CARRIER}}', '{{params.DELIVERY_BLOCK_HTML}}', '{{params.INVOICE_BLOCK_HTML}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}} {{contact.LASTNAME}},</p>
  <p>Thank you for your order from <strong>{{params.STORE_NAME}}</strong>. Your order has been received and is now being prepared.</p>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 10px;">ORDER SUMMARY</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#666;font-size:14px;">Order Number:</td><td style="padding:4px 0;font-weight:600;">{{params.ORDER_NAME}}</td></tr>
      <tr><td style="padding:4px 0;color:#666;font-size:14px;">Order Date:</td><td style="padding:4px 0;">{{params.DATE}}</td></tr>
      <tr><td style="padding:4px 0;color:#666;font-size:14px;">Payment Method:</td><td style="padding:4px 0;">{{params.PAYMENT}}</td></tr>
    </table>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 10px;">ITEMS ORDERED</p>
    <p style="margin:0;">{{params.PRODUCTS}}</p>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 10px;">ORDER TOTALS</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:3px 0;color:#666;font-size:14px;">Products:</td><td style="padding:3px 0;text-align:right;">{{params.TOTAL_PRODUCTS}}</td></tr>
      <tr><td style="padding:3px 0;color:#666;font-size:14px;">Discounts:</td><td style="padding:3px 0;text-align:right;">{{params.TOTAL_DISCOUNTS}}</td></tr>
      <tr><td style="padding:3px 0;color:#666;font-size:14px;">Shipping:</td><td style="padding:3px 0;text-align:right;">{{params.TOTAL_SHIPPING}}</td></tr>
      <tr><td style="padding:3px 0;color:#666;font-size:14px;">Taxes:</td><td style="padding:3px 0;text-align:right;">{{params.TOTAL_TAX_PAID}}</td></tr>
      <tr style="border-top:2px solid #ddd;"><td style="padding:6px 0;font-weight:700;">Total Paid:</td><td style="padding:6px 0;text-align:right;font-weight:700;font-size:16px;">{{params.TOTAL_PAID}}</td></tr>
    </table>
  </div>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 10px;">SHIPPING INFORMATION</p>
    <p style="margin:4px 0;font-size:14px;">Carrier: <strong>{{params.CARRIER}}</strong></p>
    <p style="margin:8px 0 4px;font-size:13px;color:#666;">Delivery Address:</p>
    <p style="margin:0;font-size:14px;">{{params.DELIVERY_BLOCK_HTML}}</p>
    <p style="margin:8px 0 4px;font-size:13px;color:#666;">Billing Address:</p>
    <p style="margin:0;font-size:14px;">{{params.INVOICE_BLOCK_HTML}}</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;">View Your Order →</a>
  </div>
  <p>Thank you again for shopping with {{params.STORE_NAME}}.</p>
  <p>— The {{params.STORE_NAME}} Team</p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'fulfillment_started',
    label: 'Order Processing / Fulfillment Started',
    category: 'orders',
    icon: Package,
    iconColor: 'text-primary',
    trigger: 'When order enters fulfillment',
    goal: 'Reduce anxiety + increase perceived speed',
    subjectLines: [
      'Good news — your order is being packed',
      'We\'re preparing your shipment',
    ],
    defaultSubject: 'Good news — your order is being packed',
    vars: ['{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{params.ORDER_NAME}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}} {{contact.LASTNAME}},</p>
  <p>Good news — your order <strong>{{params.ORDER_NAME}}</strong> is now being packed and prepared for shipment.</p>
  <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;padding:16px;margin:16px 0;">
    <p style="margin:4px 0;">✔ Picking your items</p>
    <p style="margin:4px 0;">✔ Quality checking everything</p>
    <p style="margin:4px 0;">✔ Getting it ready for dispatch</p>
  </div>
  <p>You'll receive tracking details once your package ships.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Track Your Order →</a>
  </div>
  <p>— The {{params.STORE_NAME}} Fulfillment Team</p>
  ${footerHtml}
</div>`,
  },

  // ── SHIPPING ─────────────────────────────────────────────────────────────────
  {
    key: 'shipping_confirmation',
    label: 'Shipping Confirmation',
    category: 'shipping',
    icon: Truck,
    iconColor: 'text-blue-500',
    trigger: 'Order shipped',
    goal: 'Excitement + tracking clarity',
    subjectLines: [
      'Your order is on the way 🚚',
      'It\'s shipped — track it here',
    ],
    defaultSubject: 'Your order is on the way 🚚',
    vars: ['{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{params.ORDER_NAME}}', '{{params.FOLLOWUP}}', '{{params.CARRIER}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}} {{contact.LASTNAME}},</p>
  <p>Your order <strong>{{params.ORDER_NAME}}</strong> has shipped 🚚</p>
  <div style="background:#eff6ff;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-weight:700;font-size:16px;margin:0 0 12px;">TRACK YOUR PACKAGE:</p>
    <a href="{{params.FOLLOWUP}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Track My Order →</a>
  </div>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#666;font-size:14px;">Carrier:</td><td style="padding:6px 0;font-weight:600;">{{params.CARRIER}}</td></tr>
  </table>
  <p>You can also review your order status anytime through your account.</p>
  <p>— The {{params.STORE_NAME}} Shipping Team</p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'delivery_confirmation',
    label: 'Order Delivered',
    category: 'shipping',
    icon: CheckCircle,
    iconColor: 'text-success',
    trigger: 'Delivered status confirmed',
    goal: 'Upsell + satisfaction + UGC',
    subjectLines: [
      'Delivered 🎉 How did we do?',
      'Your order has arrived',
    ],
    defaultSubject: 'Delivered 🎉 How did we do?',
    vars: ['{{contact.FIRSTNAME}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Your order has been delivered 🎉</p>
  <p>We hope everything arrived safely and exactly as expected.</p>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 8px;">If you have 30 seconds, we'd love your feedback:</p>
    <p style="margin:4px 0;">→ How was your experience?</p>
    <p style="margin:4px 0;">→ Is everything working as expected?</p>
  </div>
  <p>If something isn't right, just reply here — we'll fix it.</p>
  <p style="color:#666;font-size:14px;">P.S. If you're happy with your order, sharing it or tagging us helps a lot 🙏</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'delivery_delayed',
    label: 'Delivery Delayed',
    category: 'shipping',
    icon: Clock,
    iconColor: 'text-yellow-500',
    trigger: 'Carrier delay detected',
    goal: 'Proactive communication + trust',
    subjectLines: [
      'Update on your order — slight delay',
      'Your delivery is running a bit late',
    ],
    defaultSubject: 'Update on your order — slight delay',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORDER_NAME}}', '{{params.NEW_DELIVERY_DATE}}', '{{params.SHOP_EMAIL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>We wanted to give you a heads up — your order <strong>{{params.ORDER_NAME}}</strong> is experiencing a slight delay in transit.</p>
  <div style="background:#fef9ec;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 6px;">Updated Estimated Delivery:</p>
    <p style="font-size:18px;font-weight:700;margin:0;">{{params.NEW_DELIVERY_DATE}}</p>
  </div>
  <p>This is outside our control, but we're monitoring your shipment closely.</p>
  <p>If you have any concerns, please reply to this email or contact us at {{params.SHOP_EMAIL}}.</p>
  <p>We appreciate your patience.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── BILLING ──────────────────────────────────────────────────────────────────
  {
    key: 'refund_confirmation',
    label: 'Refund Issued',
    category: 'billing',
    icon: RotateCcw,
    iconColor: 'text-teal-500',
    trigger: 'Refund issued',
    goal: 'Trust + reduce chargebacks',
    stripeEvent: 'charge.refunded',
    subjectLines: [
      'Your refund has been processed',
      'Refund confirmed ✓',
    ],
    defaultSubject: 'Your refund has been processed',
    vars: ['{{contact.FIRSTNAME}}', '{{params.REFUND_AMOUNT}}', '{{params.ORDER_NAME}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Your refund for order <strong>{{params.ORDER_NAME}}</strong> has been processed.</p>
  <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 8px;">Refund details:</p>
    <p style="margin:4px 0;">Amount: <strong>{{params.REFUND_AMOUNT}}</strong></p>
    <p style="margin:4px 0;">Method: Original payment method</p>
    <p style="margin:4px 0;">Timeline: 3–5 business days (depending on your bank)</p>
  </div>
  <p>If you have any questions, just reply here.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'partial_refund',
    label: 'Partial Refund Issued',
    category: 'billing',
    icon: RotateCcw,
    iconColor: 'text-cyan-500',
    trigger: 'Partial refund processed',
    goal: 'Transparency + trust',
    subjectLines: [
      'Partial refund processed for order {{params.ORDER_NAME}}',
    ],
    defaultSubject: 'Partial refund processed for order {{params.ORDER_NAME}}',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORDER_NAME}}', '{{params.REFUND_AMOUNT}}', '{{params.REASON}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>We've issued a partial refund for your order <strong>{{params.ORDER_NAME}}</strong>.</p>
  <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:4px 0;">Refund Amount: <strong>{{params.REFUND_AMOUNT}}</strong></p>
    <p style="margin:4px 0;">Reason: {{params.REASON}}</p>
    <p style="margin:4px 0;">Timeline: 3–5 business days</p>
  </div>
  <p>If you have questions about this refund, just reply to this email.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'failed_payment',
    label: 'Failed Payment / Declined Card',
    category: 'billing',
    icon: CreditCard,
    iconColor: 'text-danger',
    trigger: 'Payment failure',
    goal: 'Save subscription/order',
    stripeEvent: 'payment_intent.payment_failed',
    subjectLines: [
      'Action required: Payment failed',
      'We couldn\'t process your payment',
    ],
    defaultSubject: 'Action required: Payment failed',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORDER_NAME}}', '{{params.UPDATE_PAYMENT_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>We couldn't process your payment for order <strong>{{params.ORDER_NAME}}</strong>.</p>
  <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 8px;">This usually happens due to:</p>
    <p style="margin:4px 0;">- Bank decline</p>
    <p style="margin:4px 0;">- Expired card</p>
    <p style="margin:4px 0;">- Insufficient funds</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.UPDATE_PAYMENT_URL}}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Update Payment Method →</a>
  </div>
  <p>Once updated, we'll process your order immediately.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── RETURNS ──────────────────────────────────────────────────────────────────
  {
    key: 'return_approved',
    label: 'Return Approved',
    category: 'billing',
    icon: RefreshCcw,
    iconColor: 'text-indigo-500',
    trigger: 'Return request approved',
    goal: 'Clear instructions + trust',
    subjectLines: [
      'Your return has been approved',
      'Return approved — here\'s what to do next',
    ],
    defaultSubject: 'Your return has been approved',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORDER_NAME}}', '{{params.RETURN_INSTRUCTIONS}}', '{{params.SHOP_EMAIL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Great news — your return request for order <strong>{{params.ORDER_NAME}}</strong> has been approved.</p>
  <div style="background:#f0f4ff;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 8px;">RETURN INSTRUCTIONS</p>
    <p style="margin:0;">{{params.RETURN_INSTRUCTIONS}}</p>
  </div>
  <p>Once we receive your return, we'll process your refund within 3–5 business days.</p>
  <p>Questions? Reply here or email {{params.SHOP_EMAIL}}.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'return_received',
    label: 'Return Received',
    category: 'billing',
    icon: Package,
    iconColor: 'text-teal-600',
    trigger: 'Return package received',
    goal: 'Confirm receipt + set refund timeline',
    subjectLines: [
      'We received your return — refund incoming',
    ],
    defaultSubject: 'We received your return — refund incoming',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORDER_NAME}}', '{{params.REFUND_AMOUNT}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>We've received your return for order <strong>{{params.ORDER_NAME}}</strong>.</p>
  <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:4px 0;">✔ Return received and inspected</p>
    <p style="margin:4px 0;">✔ Refund of <strong>{{params.REFUND_AMOUNT}}</strong> being processed</p>
    <p style="margin:4px 0;">✔ Expect funds in 3–5 business days</p>
  </div>
  <p>Thank you for your patience.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'exchange_processed',
    label: 'Exchange Processed',
    category: 'billing',
    icon: RefreshCw,
    iconColor: 'text-purple-500',
    trigger: 'Exchange order created',
    goal: 'Confirm exchange + new order details',
    subjectLines: [
      'Your exchange is confirmed — new order on the way',
    ],
    defaultSubject: 'Your exchange is confirmed — new order on the way',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORIGINAL_ORDER}}', '{{params.NEW_ORDER_NAME}}', '{{params.EXCHANGE_ITEMS}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Your exchange has been processed successfully.</p>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:4px 0;">Original Order: <strong>{{params.ORIGINAL_ORDER}}</strong></p>
    <p style="margin:4px 0;">New Order: <strong>{{params.NEW_ORDER_NAME}}</strong></p>
    <p style="margin:8px 0 4px;font-weight:600;">Items being sent:</p>
    <p style="margin:0;">{{params.EXCHANGE_ITEMS}}</p>
  </div>
  <p>You'll receive a shipping confirmation once your new items are dispatched.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────
  {
    key: 'subscription_renewal',
    label: 'Subscription Renewal Reminder',
    category: 'subscriptions',
    icon: Calendar,
    iconColor: 'text-blue-600',
    trigger: 'Before subscription renewal date',
    goal: 'Reduce churn + set expectations',
    stripeEvent: 'invoice.paid',
    subjectLines: [
      'Your subscription renews in {{params.DAYS_UNTIL_RENEWAL}} days',
      'Heads up — renewal coming up',
    ],
    defaultSubject: 'Your subscription renews in {{params.DAYS_UNTIL_RENEWAL}} days',
    vars: ['{{contact.FIRSTNAME}}', '{{params.PLAN_NAME}}', '{{params.RENEWAL_AMOUNT}}', '{{params.RENEWAL_DATE}}', '{{params.DAYS_UNTIL_RENEWAL}}', '{{params.MANAGE_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Just a heads up — your <strong>{{params.PLAN_NAME}}</strong> subscription is set to renew.</p>
  <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:4px 0;">Plan: <strong>{{params.PLAN_NAME}}</strong></p>
    <p style="margin:4px 0;">Amount: <strong>{{params.RENEWAL_AMOUNT}}</strong></p>
    <p style="margin:4px 0;">Renewal Date: <strong>{{params.RENEWAL_DATE}}</strong></p>
  </div>
  <p>No action needed if everything looks good.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.MANAGE_URL}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Manage Subscription</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'subscription_payment_failed',
    label: 'Subscription Payment Failed',
    category: 'subscriptions',
    icon: AlertTriangle,
    iconColor: 'text-danger',
    trigger: 'Subscription invoice payment failed',
    goal: 'Recover subscription + prevent churn',
    stripeEvent: 'invoice.payment_failed',
    subjectLines: [
      'Action required: Subscription payment failed',
      'Your subscription is at risk — update payment',
    ],
    defaultSubject: 'Action required: Subscription payment failed',
    vars: ['{{contact.FIRSTNAME}}', '{{params.PLAN_NAME}}', '{{params.AMOUNT}}', '{{params.UPDATE_PAYMENT_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>We were unable to process your payment for your <strong>{{params.PLAN_NAME}}</strong> subscription ({{params.AMOUNT}}).</p>
  <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:16px;margin:16px 0;">
    <p style="font-weight:700;margin:0 0 6px;">Your subscription will be paused if payment is not updated.</p>
    <p style="margin:0;font-size:14px;">Please update your payment method to continue your subscription without interruption.</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.UPDATE_PAYMENT_URL}}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Update Payment Method →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'subscription_renewed',
    label: 'Subscription Renewed',
    category: 'subscriptions',
    icon: RefreshCcw,
    iconColor: 'text-success',
    trigger: 'Subscription successfully renewed',
    goal: 'Confirm renewal + reduce cancellations',
    stripeEvent: 'customer.subscription.updated',
    subjectLines: [
      'Your {{params.PLAN_NAME}} subscription has been renewed',
    ],
    defaultSubject: 'Your {{params.PLAN_NAME}} subscription has been renewed',
    vars: ['{{contact.FIRSTNAME}}', '{{params.PLAN_NAME}}', '{{params.AMOUNT}}', '{{params.NEXT_RENEWAL_DATE}}', '{{params.MANAGE_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Your <strong>{{params.PLAN_NAME}}</strong> subscription has been successfully renewed.</p>
  <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:4px 0;">Amount charged: <strong>{{params.AMOUNT}}</strong></p>
    <p style="margin:4px 0;">Next renewal: <strong>{{params.NEXT_RENEWAL_DATE}}</strong></p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.MANAGE_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Manage Subscription</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── REVIEWS ──────────────────────────────────────────────────────────────────
  {
    key: 'review_request',
    label: 'Review Request',
    category: 'reviews',
    icon: Star,
    iconColor: 'text-yellow-500',
    trigger: '7–14 days after delivery',
    goal: 'Social proof',
    subjectLines: [
      'Quick favor?',
      'How would you rate your experience?',
    ],
    defaultSubject: 'Quick favor?',
    vars: ['{{contact.FIRSTNAME}}', '{{params.REVIEW_URL}}', '{{params.PRODUCT_NAME}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Quick favor — could you leave a review for <strong>{{params.PRODUCT_NAME}}</strong>?</p>
  <p>It takes less than 30 seconds and helps other customers make better decisions.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.REVIEW_URL}}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">👉 Leave Your Review Here</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'review_approved',
    label: 'Review Approved',
    category: 'reviews',
    icon: Check,
    iconColor: 'text-success',
    trigger: 'Review approved by admin',
    goal: 'Acknowledge + reward engagement',
    subjectLines: [
      'Your review has been published — thank you!',
    ],
    defaultSubject: 'Your review has been published — thank you!',
    vars: ['{{contact.FIRSTNAME}}', '{{params.PRODUCT_NAME}}', '{{params.REVIEW_CONTENT}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Your review for <strong>{{params.PRODUCT_NAME}}</strong> has been approved and published.</p>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #22c55e;">
    <p style="font-style:italic;margin:0;">"{{params.REVIEW_CONTENT}}"</p>
  </div>
  <p>Thank you for helping our community make better decisions!</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'review_reward',
    label: 'Review Reward Coupon',
    category: 'reviews',
    icon: Tag,
    iconColor: 'text-orange-500',
    trigger: 'After review submitted',
    goal: 'Incentivize reviews + drive repeat purchase',
    subjectLines: [
      'Thank you for your review — here\'s a gift 🎁',
    ],
    defaultSubject: 'Thank you for your review — here\'s a gift 🎁',
    vars: ['{{contact.FIRSTNAME}}', '{{params.COUPON_CODE}}', '{{params.AMOUNT}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Thank you for leaving a review! As a token of our appreciation, here's an exclusive discount just for you:</p>
  <div style="background:#fefce8;border:2px solid #f59e0b;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-size:13px;color:#92400e;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">YOUR REWARD CODE</p>
    <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0;color:#1a1a1a;">{{params.COUPON_CODE}}</p>
    <p style="color:#92400e;margin:8px 0 0;">Save {{params.AMOUNT}} on your next order</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Shop Now →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── LOYALTY & RETENTION ───────────────────────────────────────────────────────
  {
    key: 'first_purchase_thankyou',
    label: 'First Purchase Thank You',
    category: 'loyalty',
    icon: Heart,
    iconColor: 'text-pink-500',
    trigger: 'After first-ever purchase',
    goal: 'Build relationship + encourage second purchase',
    subjectLines: [
      'Thank you for your first order 🙏',
      'Welcome to the family, {{contact.FIRSTNAME}}',
    ],
    defaultSubject: 'Thank you for your first order 🙏',
    vars: ['{{contact.FIRSTNAME}}', '{{params.ORDER_NAME}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Thank you for your first order with <strong>{{params.STORE_NAME}}</strong>!</p>
  <p>We don't take it for granted that you chose us, and we're going to make sure you're glad you did.</p>
  <p>Your order <strong>{{params.ORDER_NAME}}</strong> is already being processed. You'll hear from us again when it ships.</p>
  <p>In the meantime, feel free to browse more of what we offer:</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Explore the Store →</a>
  </div>
  <p>— The {{params.STORE_NAME}} Team</p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'vip_customer',
    label: 'VIP / Repeat Customer',
    category: 'loyalty',
    icon: Crown,
    iconColor: 'text-yellow-600',
    trigger: 'After N purchases or spend threshold',
    goal: 'Early access, discounts, bundles',
    subjectLines: [
      'You\'re a VIP — here\'s something special 👑',
      'Exclusive access just for you',
    ],
    defaultSubject: 'You\'re a VIP — here\'s something special 👑',
    vars: ['{{contact.FIRSTNAME}}', '{{params.DISCOUNT_CODE}}', '{{params.DISCOUNT_AMOUNT}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>You've been with us for a while, and we want to say thank you.</p>
  <p>As one of our best customers, you get early access and an exclusive discount:</p>
  <div style="background:#fefce8;border:2px solid #f59e0b;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-weight:700;font-size:20px;margin:0 0 4px;">{{params.DISCOUNT_CODE}}</p>
    <p style="color:#92400e;margin:0;">Save {{params.DISCOUNT_AMOUNT}} on your next order</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#f59e0b;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Shop Now 👑</a>
  </div>
  <p style="color:#666;font-size:14px;">This offer is exclusive to you and won't be shared publicly.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'loyalty_points_earned',
    label: 'Loyalty Points Earned',
    category: 'loyalty',
    icon: Award,
    iconColor: 'text-amber-500',
    trigger: 'After purchase — points awarded',
    goal: 'Gamify + drive repeat purchase',
    subjectLines: [
      'You earned {{params.POINTS_EARNED}} points on your last order!',
    ],
    defaultSubject: 'You earned {{params.POINTS_EARNED}} points on your last order!',
    vars: ['{{contact.FIRSTNAME}}', '{{params.POINTS_EARNED}}', '{{params.TOTAL_POINTS}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Great news — you just earned <strong>{{params.POINTS_EARNED}} points</strong> on your recent order!</p>
  <div style="background:#fefce8;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-size:13px;color:#92400e;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">YOUR TOTAL POINTS</p>
    <p style="font-size:36px;font-weight:800;margin:0;color:#1a1a1a;">{{params.TOTAL_POINTS}}</p>
  </div>
  <p>Keep shopping to unlock exclusive rewards and discounts.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Shop & Earn More →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'birthday_reward',
    label: 'Birthday Reward',
    category: 'loyalty',
    icon: Gift,
    iconColor: 'text-pink-600',
    trigger: 'Customer birthday',
    goal: 'Delight + drive purchase',
    subjectLines: [
      '🎂 Happy Birthday {{contact.FIRSTNAME}} — a gift from us',
      'It\'s your birthday! Here\'s something special',
    ],
    defaultSubject: '🎂 Happy Birthday {{contact.FIRSTNAME}} — a gift from us',
    vars: ['{{contact.FIRSTNAME}}', '{{params.COUPON_CODE}}', '{{params.DISCOUNT_AMOUNT}}', '{{params.EXPIRY_DATE}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Happy Birthday! 🎂 We hope your day is amazing.</p>
  <p>To celebrate, we've got a special gift just for you:</p>
  <div style="background:#fdf2f8;border:2px solid #ec4899;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-size:13px;color:#9d174d;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">YOUR BIRTHDAY CODE</p>
    <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0;color:#1a1a1a;">{{params.COUPON_CODE}}</p>
    <p style="color:#9d174d;margin:8px 0 0;">{{params.DISCOUNT_AMOUNT}} off — expires {{params.EXPIRY_DATE}}</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#ec4899;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Claim Your Gift 🎁</a>
  </div>
  <p>— The {{params.STORE_NAME}} Team</p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'referral_reward',
    label: 'Referral Reward',
    category: 'loyalty',
    icon: Users,
    iconColor: 'text-violet-500',
    trigger: 'Successful referral completed',
    goal: 'Reward + encourage more referrals',
    subjectLines: [
      'Your referral reward is here 🎉',
      '{{contact.FIRSTNAME}}, someone used your referral link!',
    ],
    defaultSubject: 'Your referral reward is here 🎉',
    vars: ['{{contact.FIRSTNAME}}', '{{params.REFERRED_NAME}}', '{{params.COUPON_CODE}}', '{{params.AMOUNT}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Great news — <strong>{{params.REFERRED_NAME}}</strong> just made their first purchase using your referral link!</p>
  <p>As promised, here's your reward:</p>
  <div style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-size:13px;color:#5b21b6;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">YOUR REFERRAL REWARD</p>
    <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0;color:#1a1a1a;">{{params.COUPON_CODE}}</p>
    <p style="color:#5b21b6;margin:8px 0 0;">{{params.AMOUNT}} off your next order</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Use Your Reward →</a>
  </div>
  <p>Keep sharing — every referral earns you more!</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── WINBACK / RE-ENGAGEMENT ───────────────────────────────────────────────────
  {
    key: 'winback',
    label: 'Winback Campaign',
    category: 'winback',
    icon: RefreshCw,
    iconColor: 'text-rose-500',
    trigger: 'No purchase in 60–90 days',
    goal: 'Re-engage lapsed customers',
    subjectLines: [
      'We miss you, {{contact.FIRSTNAME}} 👋',
      'It\'s been a while — here\'s something to come back',
    ],
    defaultSubject: 'We miss you, {{contact.FIRSTNAME}} 👋',
    vars: ['{{contact.FIRSTNAME}}', '{{params.COUPON_CODE}}', '{{params.DISCOUNT_AMOUNT}}', '{{params.SHOP_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>We noticed it's been a while since your last visit, and we wanted to reach out.</p>
  <p>A lot has changed — new products, better prices, and we'd love to have you back.</p>
  <p>As a welcome back gift:</p>
  <div style="background:#fff1f2;border:2px solid #f43f5e;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-size:13px;color:#9f1239;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">WELCOME BACK CODE</p>
    <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0;color:#1a1a1a;">{{params.COUPON_CODE}}</p>
    <p style="color:#9f1239;margin:8px 0 0;">{{params.DISCOUNT_AMOUNT}} off your next order</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.SHOP_URL}}" style="display:inline-block;background:#f43f5e;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Come Back & Save →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'abandoned_checkout',
    label: 'Checkout Abandonment',
    category: 'winback',
    icon: ShoppingCart,
    iconColor: 'text-orange-500',
    trigger: 'Checkout started, no purchase',
    goal: 'Recover lost revenue',
    subjectLines: [
      'You left something behind',
      'Still thinking it over?',
      'Your cart is waiting',
    ],
    defaultSubject: 'You left something behind',
    vars: ['{{contact.FIRSTNAME}}', '{{params.CHECKOUT_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>You were just one step away from completing your order.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.CHECKOUT_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Complete My Order →</a>
  </div>
  <p>If you had any issues checking out, reply and we'll help instantly.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'abandoned_cart',
    label: 'Cart Abandonment',
    category: 'winback',
    icon: ShoppingCart,
    iconColor: 'text-red-500',
    trigger: 'Added to cart, no checkout',
    goal: 'Reminder + urgency',
    subjectLines: [
      'You left something in your cart',
      'Still interested?',
    ],
    defaultSubject: 'You left something in your cart',
    vars: ['{{contact.FIRSTNAME}}', '{{params.CART_ITEMS}}', '{{params.CART_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>You left something in your cart:</p>
  <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0;">{{params.CART_ITEMS}}</p>
  </div>
  <p>Still available — but we can't guarantee stock forever.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.CART_URL}}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Complete Your Order →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },

  // ── PRO / PRODUCT ALERTS ──────────────────────────────────────────────────────
  {
    key: 'back_in_stock',
    label: 'Back in Stock Alert',
    category: 'pro',
    icon: Bell,
    iconColor: 'text-indigo-500',
    trigger: 'Product restocked',
    goal: 'Scarcity + urgency + link to checkout',
    subjectLines: [
      'It\'s back! {{params.PRODUCT_NAME}} is available again',
      'Good news — {{params.PRODUCT_NAME}} is back in stock',
    ],
    defaultSubject: 'It\'s back! {{params.PRODUCT_NAME}} is available again',
    vars: ['{{contact.FIRSTNAME}}', '{{params.PRODUCT_NAME}}', '{{params.PRODUCT_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Great news — <strong>{{params.PRODUCT_NAME}}</strong> is back in stock!</p>
  <p>You asked us to notify you, and we're delivering. But stock is limited, so don't wait.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.PRODUCT_URL}}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Shop Now Before It Sells Out →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'price_drop',
    label: 'Price Drop Notification',
    category: 'pro',
    icon: TrendingDown,
    iconColor: 'text-green-500',
    trigger: 'Price reduced on wishlisted/viewed product',
    goal: 'You saved X% — finish checkout now',
    subjectLines: [
      'Price drop: {{params.PRODUCT_NAME}} is now cheaper',
      'You saved {{params.SAVINGS}} — finish checkout now',
    ],
    defaultSubject: 'Price drop: {{params.PRODUCT_NAME}} is now cheaper',
    vars: ['{{contact.FIRSTNAME}}', '{{params.PRODUCT_NAME}}', '{{params.OLD_PRICE}}', '{{params.NEW_PRICE}}', '{{params.SAVINGS}}', '{{params.PRODUCT_URL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>The price just dropped on something you were looking at.</p>
  <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="font-weight:700;font-size:18px;margin:0 0 8px;">{{params.PRODUCT_NAME}}</p>
    <p style="margin:0;"><span style="text-decoration:line-through;color:#999;">{{params.OLD_PRICE}}</span> → <span style="color:#16a34a;font-weight:700;font-size:20px;">{{params.NEW_PRICE}}</span></p>
    <p style="color:#16a34a;font-weight:600;margin:8px 0 0;">You save {{params.SAVINGS}}!</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="{{params.PRODUCT_URL}}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Get It Now →</a>
  </div>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
  {
    key: 'post_purchase_checkin',
    label: 'Post-Purchase Check-In',
    category: 'pro',
    icon: MessageCircle,
    iconColor: 'text-purple-500',
    trigger: 'After delivery window (Day 3–7)',
    goal: 'Reduce refunds + increase satisfaction',
    subjectLines: [
      'How\'s everything working out?',
      'Quick check-in',
    ],
    defaultSubject: 'How\'s everything working out?',
    vars: ['{{contact.FIRSTNAME}}', '{{params.SHOP_EMAIL}}', '{{params.STORE_NAME}}'],
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <p>Hi {{contact.FIRSTNAME}},</p>
  <p>Just checking in — how's everything going with your order?</p>
  <p>A few customers reach out around this time if they need help setting things up or have questions.</p>
  <p>If you need anything at all, just hit reply or email {{params.SHOP_EMAIL}}.</p>
  <p>We've got you.</p>
  <p>— <strong>{{params.STORE_NAME}}</strong></p>
  ${footerHtml}
</div>`,
  },
];

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; color: string; bgColor: string }> = {
  authentication: { label: 'Authentication', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  orders: { label: 'Orders', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  shipping: { label: 'Shipping', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  billing: { label: 'Billing & Returns', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  subscriptions: { label: 'Subscriptions', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  reviews: { label: 'Reviews', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  loyalty: { label: 'Loyalty & Rewards', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  winback: { label: 'Winback & Abandonment', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  core: { label: 'Core', color: 'text-success', bgColor: 'bg-success-bg' },
  pro: { label: 'Product Alerts', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
};

const ALL_CATEGORIES: TemplateCategory[] = ['authentication', 'orders', 'shipping', 'billing', 'subscriptions', 'reviews', 'loyalty', 'winback', 'pro'];

const ALL_VARS = [
  '{{contact.FIRSTNAME}}', '{{contact.LASTNAME}}', '{{contact.EMAIL}}',
  '{{params.STORE_NAME}}', '{{params.SHOP_URL}}', '{{params.SHOP_EMAIL}}',
  '{{params.ORDER_NAME}}', '{{params.DATE}}', '{{params.PAYMENT}}', '{{params.PRODUCTS}}',
  '{{params.TOTAL_PRODUCTS}}', '{{params.TOTAL_DISCOUNTS}}', '{{params.TOTAL_SHIPPING}}',
  '{{params.TOTAL_TAX_PAID}}', '{{params.TOTAL_PAID}}', '{{params.CARRIER}}',
  '{{params.DELIVERY_BLOCK_HTML}}', '{{params.INVOICE_BLOCK_HTML}}',
  '{{params.FOLLOWUP}}', '{{params.TRACKING_URL}}', '{{params.TRACKING_NUMBER}}',
  '{{params.CART_URL}}', '{{params.CART_ITEMS}}', '{{params.CHECKOUT_URL}}',
  '{{params.REFUND_AMOUNT}}', '{{params.UPDATE_PAYMENT_URL}}',
  '{{params.REVIEW_URL}}', '{{params.REVIEW_CONTENT}}', '{{params.PRODUCT_NAME}}', '{{params.PRODUCT_URL}}',
  '{{params.OLD_PRICE}}', '{{params.NEW_PRICE}}', '{{params.SAVINGS}}',
  '{{params.PLAN_NAME}}', '{{params.RENEWAL_AMOUNT}}', '{{params.RENEWAL_DATE}}',
  '{{params.DAYS_UNTIL_RENEWAL}}', '{{params.MANAGE_URL}}', '{{params.AMOUNT}}',
  '{{params.DISCOUNT_CODE}}', '{{params.DISCOUNT_AMOUNT}}', '{{params.COUPON_CODE}}',
  '{{params.PASSWD}}', '{{params.OTP_VALUE}}', '{{params.RESET_URL}}',
  '{{params.POINTS_EARNED}}', '{{params.TOTAL_POINTS}}', '{{params.EXPIRY_DATE}}',
  '{{params.REFERRED_NAME}}', '{{params.NEW_DELIVERY_DATE}}',
];

// ── Template Editor Modal ──────────────────────────────────────────────────────
function TemplateEditorModal({ template, senders, onClose, onSaved, prebuilt, defaultSenderEmail, defaultSenderName }: {
  template: Partial<BrevoTemplate> | null;
  senders: Sender[];
  onClose: () => void;
  onSaved: () => void;
  prebuilt?: PrebuiltTemplate;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
}) {
  const isNew = !template?.id;
  const [name, setName] = useState(template?.name ?? prebuilt?.label ?? '');
  const [subject, setSubject] = useState(template?.subject ?? prebuilt?.defaultSubject ?? '');
  const [html, setHtml] = useState(template?.htmlContent ?? prebuilt?.htmlContent ?? '<p>Hello {{contact.FIRSTNAME}},</p>\n<p>Your message here.</p>');
  const [senderEmail, setSenderEmail] = useState(template?.sender?.email ?? defaultSenderEmail ?? senders[0]?.email ?? '');
  const [senderName, setSenderName] = useState(template?.sender?.name ?? defaultSenderName ?? senders[0]?.name ?? '');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [preview, setPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTest, setShowTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);

  const insertVar = (v: string) => setHtml((h) => h + v);

  const save = async () => {
    if (!name || !subject || !html || !senderEmail) { setError('Name, subject, HTML content, and sender email are required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/email/templates', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template?.id, templateName: name, subject, htmlContent: html, senderName, senderEmail, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) { setTestMsg('Enter a test email address'); return; }
    if (!template?.id) { setTestMsg('Save the template first before sending a test'); return; }
    setTestLoading(true);
    setTestMsg('');
    try {
      const res = await fetch('/api/email/templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, email: testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setTestMsg('✓ Test email sent successfully!');
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : 'Failed to send test');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="font-600 text-foreground">{isNew ? (prebuilt ? `Create: ${prebuilt.label}` : 'New Template') : `Edit: ${template?.name}`}</p>
            {prebuilt && <p className="text-xs text-muted-foreground mt-0.5">Trigger: {prebuilt.trigger}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-danger-bg border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {prebuilt && prebuilt.subjectLines.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Subject Line Options</label>
              <div className="flex flex-col gap-1.5">
                {prebuilt.subjectLines.map((s, i) => (
                  <button key={i} onClick={() => { setActiveSubjectIdx(i); setSubject(s); }}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${activeSubjectIdx === i ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Template Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Order Confirmation"
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Subject Line *</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Sender Name</label>
              <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="wiastro"
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 text-foreground">Sender Email *</label>
              {senders.length > 0 ? (
                <select value={senderEmail} onChange={(e) => { setSenderEmail(e.target.value); setSenderName(senders.find(s => s.email === e.target.value)?.name ?? senderName); }}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer">
                  {senders.map((s) => <option key={s.id} value={s.email}>{s.name} &lt;{s.email}&gt;</option>)}
                </select>
              ) : (
                <input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="noreply@yourdomain.com"
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-600 text-foreground">Insert Variable</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {(prebuilt?.vars ?? ALL_VARS).map((v) => (
                <button key={v} onClick={() => insertVar(v)}
                  className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors flex-shrink-0">
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-600 text-foreground">Email Body (HTML) *</label>
              <button onClick={() => setPreview(!preview)} className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80">
                <Eye size={12} /> {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="border border-border rounded-lg p-4 bg-white min-h-48 max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={10}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary font-mono resize-none" />
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div>
              <p className="text-sm font-500 text-foreground">Template Active</p>
              <p className="text-xs text-muted-foreground">Inactive templates won't be used for sending</p>
            </div>
            <button onClick={() => setIsActive(!isActive)} className={`transition-colors ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
              {isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {!isNew && (
            <div className="border border-border rounded-xl p-4 flex flex-col gap-3">
              <button onClick={() => setShowTest(!showTest)} className="flex items-center justify-between text-sm font-500 text-foreground w-full">
                <span className="flex items-center gap-2"><Send size={14} /> Send Test Email</span>
                {showTest ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showTest && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} type="email" placeholder="test@example.com"
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary" />
                    <button onClick={sendTest} disabled={testLoading}
                      className="h-9 px-4 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                      {testLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Send
                    </button>
                  </div>
                  {testMsg && <p className={`text-xs ${testMsg.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{testMsg}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-5 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-9 border border-border rounded-lg text-sm font-500 text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={save} disabled={loading}
            className="flex-1 h-9 bg-foreground text-background rounded-lg text-sm font-500 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isNew ? 'Create in Brevo' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template toggle ────────────────────────────────────────────────────────────
function TemplateToggle({ templateKey, enabled, onChange }: {
  templateKey: string;
  enabled: boolean;
  onChange: (key: string, enabled: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    const next = !enabled;
    try {
      await fetch('/api/email/template-states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: templateKey, enabled: next }),
      });
      onChange(templateKey, next);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <button onClick={toggle} disabled={saving} title={enabled ? 'Click to disable' : 'Click to enable'}
      className={`flex items-center gap-1.5 transition-colors disabled:opacity-60 ${enabled ? 'text-success' : 'text-muted-foreground'}`}>
      {saving ? <Loader2 size={22} className="animate-spin" /> : enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
    </button>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────────
function TemplateCard({ t, enabled, onToggle, onEdit }: {
  t: PrebuiltTemplate;
  enabled: boolean;
  onToggle: (key: string, enabled: boolean) => void;
  onEdit: () => void;
}) {
  const TIcon = t.icon;
  const catCfg = CATEGORY_CONFIG[t.category];
  return (
    <div className={`bg-card border rounded-xl p-4 flex flex-col gap-3 transition-all ${enabled ? 'border-border hover:border-primary/40 hover:shadow-sm' : 'border-border/50 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <TIcon size={16} className={t.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-600 text-foreground text-sm leading-tight truncate">{t.label}</p>
            <TemplateToggle templateKey={t.key} enabled={enabled} onChange={onToggle} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t.trigger}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-500 ${catCfg.bgColor} ${catCfg.color}`}>{catCfg.label}</span>
        {t.stripeEvent && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/15">
            <Zap size={9} className="text-primary flex-shrink-0" />
            <span className="text-xs text-primary font-mono truncate max-w-[140px]">{t.stripeEvent}</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-500 text-foreground">Subject:</p>
        <p className="text-xs text-muted-foreground truncate pl-2 border-l-2 border-muted">"{t.defaultSubject}"</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {t.vars.slice(0, 3).map((v) => (
          <span key={v} className="px-1.5 py-0.5 rounded bg-primary/8 text-primary text-xs font-mono">{v}</span>
        ))}
        {t.vars.length > 3 && <span className="text-xs text-muted-foreground">+{t.vars.length - 3} more</span>}
      </div>
      <button onClick={onEdit}
        className="w-full h-8 bg-foreground text-background rounded-lg text-xs font-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
        <Plus size={11} /> Use This Template
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TransactionalPageContent() {
  const [templates, setTemplates] = useState<BrevoTemplate[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ template: Partial<BrevoTemplate> | null; prebuilt?: PrebuiltTemplate } | false>(false);
  const [activeTab, setActiveTab] = useState<'prebuilt' | 'brevo'>('prebuilt');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TemplateCategory>('all');
  const [templateStates, setTemplateStates] = useState<Record<string, boolean>>({});
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('');
  const [defaultSenderName, setDefaultSenderName] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/email/templates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setTemplates(data.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchSenders = async () => {
    try {
      const res = await fetch('/api/email/sender-domains');
      const data = await res.json();
      setSenders(data.senders ?? []);
    } catch {}
  };

  const fetchTemplateStates = async () => {
    try {
      const res = await fetch('/api/email/template-states');
      const data = await res.json();
      const parsed: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(data.states ?? {})) {
        parsed[k] = v === 'true';
      }
      setTemplateStates(parsed);
    } catch {}
  };

  const fetchSenderPreference = async () => {
    try {
      const res = await fetch('/api/email/sender-preference');
      const data = await res.json();
      setDefaultSenderEmail(data.senderEmail ?? '');
      setDefaultSenderName(data.senderName ?? '');
    } catch {}
  };

  useEffect(() => {
    fetchTemplates();
    fetchSenders();
    fetchTemplateStates();
    fetchSenderPreference();
  }, []);

  const handleToggleChange = useCallback((key: string, enabled: boolean) => {
    setTemplateStates((prev) => ({ ...prev, [key]: enabled }));
  }, []);

  const isEnabled = (key: string) => {
    if (!(key in templateStates)) return true;
    return templateStates[key];
  };

  const filteredTemplates = categoryFilter === 'all'
    ? PREBUILT_TEMPLATES
    : PREBUILT_TEMPLATES.filter(t => t.category === categoryFilter);

  const enabledCount = PREBUILT_TEMPLATES.filter(t => isEnabled(t.key)).length;

  // Group by category for "all" view
  const groupedByCategory = ALL_CATEGORIES.reduce((acc, cat) => {
    const items = PREBUILT_TEMPLATES.filter(t => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<TemplateCategory, PrebuiltTemplate[]>);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Transactional Emails</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{PREBUILT_TEMPLATES.length} production-ready templates · Authentication, Orders, Shipping, Billing, Subscriptions, Reviews, Loyalty & more</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchTemplates(); fetchTemplateStates(); fetchSenderPreference(); }}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setEditing({ template: {} })} className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
            <Plus size={14} />
            New Template
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-success-bg border border-success/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs font-500 text-success">{enabledCount} of {PREBUILT_TEMPLATES.length} templates active</span>
        </div>
        {defaultSenderEmail ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
            <Check size={12} className="text-primary" />
            <span className="text-xs font-500 text-primary">Sender: {defaultSenderName} &lt;{defaultSenderEmail}&gt;</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle size={12} className="text-yellow-600" />
            <span className="text-xs font-500 text-yellow-700">No default sender set — go to <a href="/email/settings" className="underline">Email Settings</a></span>
          </div>
        )}
      </div>

      {/* Strategy banner */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-600 text-foreground">Stripe Integration Active — toggle templates on/off to control which emails fire automatically</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />Order Confirmation → checkout.session.completed</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />Failed Payment → payment_intent.payment_failed</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />Refund → charge.refunded</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />Sub Payment Failed → invoice.payment_failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button onClick={() => setActiveTab('prebuilt')}
          className={`px-4 py-2.5 text-sm font-500 border-b-2 transition-colors ${activeTab === 'prebuilt' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Pre-built Templates ({PREBUILT_TEMPLATES.length})
        </button>
        <button onClick={() => setActiveTab('brevo')}
          className={`px-4 py-2.5 text-sm font-500 border-b-2 transition-colors ${activeTab === 'brevo' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Brevo Templates ({loading ? '…' : templates.length})
        </button>
      </div>

      {/* Pre-built templates tab */}
      {activeTab === 'prebuilt' && (
        <div className="flex flex-col gap-5">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-500 transition-colors ${categoryFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              All ({PREBUILT_TEMPLATES.length})
            </button>
            {ALL_CATEGORIES.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = PREBUILT_TEMPLATES.filter(t => t.category === cat).length;
              return (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-500 transition-colors ${categoryFilter === cat ? `${cfg.bgColor} ${cfg.color} ring-1 ring-current` : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Grouped view (all) or filtered view */}
          {categoryFilter === 'all' ? (
            ALL_CATEGORIES.map(cat => {
              const items = groupedByCategory[cat];
              if (!items) return null;
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-700 text-foreground uppercase tracking-wider">{cfg.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-600 ${cfg.bgColor} ${cfg.color}`}>{items.length} templates</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map(t => (
                      <TemplateCard key={t.key} t={t} enabled={isEnabled(t.key)} onToggle={handleToggleChange}
                        onEdit={() => setEditing({ template: {}, prebuilt: t })} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map(t => (
                <TemplateCard key={t.key} t={t} enabled={isEnabled(t.key)} onToggle={handleToggleChange}
                  onEdit={() => setEditing({ template: {}, prebuilt: t })} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brevo templates tab */}
      {activeTab === 'brevo' && (
        <div className="flex flex-col gap-4">
          {error && (
            <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl p-4 text-sm text-danger">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div><p className="font-600">Brevo Error</p><p className="mt-0.5 text-xs">{error}</p></div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText size={24} className="text-primary" />
              </div>
              <div>
                <p className="font-600 text-foreground">No Brevo templates yet</p>
                <p className="text-sm text-muted-foreground mt-1">Use a pre-built template above to create your first one, or start from scratch</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('prebuilt')} className="px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
                  Browse Pre-built
                </button>
                <button onClick={() => setEditing({ template: {} })} className="px-6 py-2 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
                  Create from Scratch
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-500 text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-500 ${t.isActive ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>From: {t.sender?.name} &lt;{t.sender?.email}&gt;</p>
                    <p className="mt-0.5">Modified: {new Date(t.modifiedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditing({ template: t })} className="flex-1 h-8 border border-border rounded-lg text-xs font-500 text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                      <Edit2 size={11} /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editing !== false && (
        <TemplateEditorModal
          template={editing.template}
          senders={senders}
          prebuilt={editing.prebuilt}
          defaultSenderEmail={defaultSenderEmail}
          defaultSenderName={defaultSenderName}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); fetchTemplates(); setActiveTab('brevo'); }}
        />
      )}
    </div>
  );
}
