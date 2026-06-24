# Subscription Management System with Email Automation

## Overview

This comprehensive subscription management system includes automated email tracking, lifecycle management, and a complete UI for managing subscriptions. Built with Next.js, Prisma, and Resend.

## Features

### 📧 Email Automation (8 Templates)
- **Welcome Email** - Sent when subscription starts
- **Renewal Reminder** - Notify before billing date
- **Payment Failed** - Alert on failed payments
- **Payment Success** - Confirm successful payments
- **Trial Ending** - Reminder when trial ends soon
- **Subscription Cancelled** - Confirm cancellation
- **Subscription Paused** - Confirm pause
- **Subscription Resumed** - Confirm resume

### 🎯 Email Tracking
- Track email delivery, opens, clicks, and bounces
- Email event history per subscription
- Email engagement metrics (open rate, click rate)
- Webhook integration with Resend for real-time updates

### 🔧 Subscription Management APIs
- `POST /api/subscriptions/{id}/pause` - Pause subscription
- `POST /api/subscriptions/{id}/resume` - Resume subscription
- `POST /api/subscriptions/{id}/cancel` - Cancel subscription
- `GET /api/subscriptions/{id}` - Get subscription details
- `PATCH /api/subscriptions/{id}` - Update preferences
- `POST /api/webhooks/resend` - Handle email webhooks

### 🎨 UI Components
- **SubscriptionCard** - Display subscription details with expandable view
- **SubscriptionActions** - Pause, resume, cancel with confirmation modals
- **SubscriptionStatusBadge** - Visual status indicators
- **EmailPreferences** - Customer email preference management
- **EmailHistory** - View all sent emails with stats

## Database Schema

### EmailEvent Model
```prisma
model EmailEvent {
  id              String       @id @default(cuid())
  subscriptionId  String?
  customerId      String?
  orderId         String?
  emailType       String
  recipient       String
  subject         String?
  status          String       @default("pending")
  provider        String       @default("resend")
  providerEventId String?
  sentAt          DateTime?
  deliveredAt     DateTime?
  openedAt        DateTime?
  clickedAt       DateTime?
  bouncedAt       DateTime?
  failedAt        DateTime?
  errorMessage    String?
  metadata        Json?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
}
```

### Subscription Email Tracking Fields
```prisma
model Subscription {
  // ... existing fields ...
  
  emailEvents                      EmailEvent[]
  welcomeEmailSentAt              DateTime?
  renewalReminderSentAt           DateTime?
  paymentFailedEmailSentAt        DateTime?
  subscriptionCancelledEmailSentAt DateTime?
  trialEndingEmailSentAt          DateTime?
  subscriptionPausedEmailSentAt   DateTime?
  subscriptionResumedEmailSentAt  DateTime?
  paymentSuccessEmailSentAt       DateTime?
  emailPreferences                Json?
}
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# Resend API Key (for sending emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email sender address
EMAIL_FROM=noreply@yourdomain.com

# App URL for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Resend Webhook Secret (optional, for signature verification)
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 2. Database Migration

**Option 1: Using `prisma db push` (Recommended for existing databases)**
```bash
npx prisma db push
npx prisma generate
```

**Option 2: Using migrations (For new databases)**
```bash
npx prisma migrate dev --name add_subscription_email_system
```

### 3. Configure Resend Webhook

1. Go to [Resend Dashboard](https://resend.com/webhooks)
2. Add webhook endpoint: `https://yourdomain.com/api/webhooks/resend`
3. Subscribe to events:
   - `email.sent`
   - `email.delivered`
   - `email.opened`
   - `email.clicked`
   - `email.bounced`
4. Copy the webhook secret to `RESEND_WEBHOOK_SECRET`

## Usage Examples

### Send a Subscription Email

```typescript
import { sendAndTrackSubscriptionEmail } from '@/lib/email/email-tracking';

// Send welcome email
await sendAndTrackSubscriptionEmail(
  'welcome',
  subscriptionId,
  'customer@example.com',
  {
    customerName: 'John Doe',
    planName: 'Pro Plan',
    amount: '29.99',
    currency: 'USD',
  }
);
```

### Get Subscription with Email Stats

```typescript
const response = await fetch(
  `/api/subscriptions/${subscriptionId}?includeEmailStats=true&includeEmailEvents=true`
);
const data = await response.json();

console.log(data.subscription);
console.log(data.emailStats); // { total, sent, delivered, opened, clicked, openRate, clickRate }
console.log(data.emailEvents); // Array of email events
```

### Pause a Subscription

```typescript
const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
  method: 'POST',
});
const data = await response.json();
```

### Update Email Preferences

```typescript
const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailPreferences: {
      welcome: true,
      renewalReminder: true,
      paymentFailed: true,
      paymentSuccess: false, // Customer opts out
      trialEnding: true,
      cancelled: true,
      paused: true,
      resumed: true,
    },
  }),
});
```

## UI Implementation Example

```tsx
'use client';

import { SubscriptionCard } from '@/app/subscriptions/components/SubscriptionCard';
import { EmailPreferences } from '@/app/subscriptions/components/EmailPreferences';
import { EmailHistory } from '@/app/subscriptions/components/EmailHistory';

export default function SubscriptionPage({ params }: { params: { id: string } }) {
  const [subscription, setSubscription] = useState(null);

  const fetchSubscription = async () => {
    const response = await fetch(`/api/subscriptions/${params.id}`);
    const data = await response.json();
    setSubscription(data.subscription);
  };

  useEffect(() => {
    fetchSubscription();
  }, [params.id]);

  if (!subscription) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Subscription Management</h1>
      
      <SubscriptionCard 
        subscription={subscription} 
        onUpdate={fetchSubscription} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmailPreferences 
          subscriptionId={params.id}
          currentPreferences={subscription.emailPreferences}
        />
        
        <EmailHistory subscriptionId={params.id} />
      </div>
    </div>
  );
}
```

## Email Template Customization

Templates are located in `src/lib/email/subscription-templates.tsx`. Each template is a React component:

```tsx
export const WelcomeEmail: React.FC<EmailTemplateProps> = ({ 
  customerName, 
  planName, 
  amount, 
  currency 
}) => (
  <EmailWrapper>
    <div className="header">
      <h1>🎉 Welcome to {planName}!</h1>
    </div>
    {/* ... customize template ... */}
  </EmailWrapper>
);
```

## Email Event Lifecycle

```
1. Email Created → status: 'pending'
2. Email Sent → status: 'sent', sentAt: timestamp
3. Email Delivered → status: 'delivered', deliveredAt: timestamp
4. Email Opened → openedAt: timestamp (status remains 'delivered')
5. Link Clicked → clickedAt: timestamp
```

**Error States:**
- `bounced` - Email bounced
- `failed` - Failed to send

## Best Practices

### 1. Check Email Preferences Before Sending
```typescript
import { shouldSendEmail } from '@/lib/email/email-tracking';

if (await shouldSendEmail(subscriptionId, 'renewal_reminder')) {
  await sendAndTrackSubscriptionEmail(/* ... */);
}
```

### 2. Handle Errors Gracefully
```typescript
try {
  await sendAndTrackSubscriptionEmail(/* ... */);
} catch (error) {
  // Email is tracked as 'failed' automatically
  console.error('Email send failed:', error);
  // Continue with subscription logic
}
```

### 3. Monitor Email Metrics
```typescript
const stats = await getSubscriptionEmailStats(subscriptionId);

if (stats.bounced > 3) {
  // Alert: Multiple bounces detected
  // Consider verifying customer email
}

if (stats.openRate < 10) {
  // Low engagement - consider email content improvement
}
```

## API Reference

### Email Tracking Functions

#### `sendAndTrackSubscriptionEmail(emailType, subscriptionId, recipientEmail, templateData)`
Send an email and create tracking record.

**Parameters:**
- `emailType` - Type of email (welcome, renewal_reminder, etc.)
- `subscriptionId` - ID of the subscription
- `recipientEmail` - Recipient's email address
- `templateData` - Data for email template

**Returns:** `{ success: boolean, emailEventId: string, result: any }`

#### `getSubscriptionEmailEvents(subscriptionId)`
Get all email events for a subscription.

**Returns:** `EmailEvent[]`

#### `getSubscriptionEmailStats(subscriptionId)`
Get email statistics for a subscription.

**Returns:**
```typescript
{
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
}
```

## Troubleshooting

### Emails not sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify `EMAIL_FROM` domain is verified in Resend
3. Check email event status in database for error messages

### Webhooks not updating
1. Verify webhook endpoint is accessible
2. Check webhook secret matches
3. View webhook logs in Resend dashboard

### TypeScript errors
1. Run `npx prisma generate` to regenerate Prisma client
2. Restart TypeScript server in VS Code

## Next Steps

1. **Integrate with Stripe webhooks** - Automatically send emails on payment events
2. **Add more email templates** - Invoice reminders, upgrade offers, etc.
3. **A/B testing** - Test different email templates and measure engagement
4. **Email sequences** - Build drip campaigns for onboarding
5. **SMS notifications** - Add SMS alongside email notifications

## Support

For issues or questions:
- Check the email event logs in the database
- Review Resend dashboard for delivery issues
- Check application logs for API errors

---

**Built with:**
- Next.js 14
- Prisma ORM
- Resend Email API
- React Email Components
- TailwindCSS
