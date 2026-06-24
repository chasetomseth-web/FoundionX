import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';

async function getStripe() {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const weeksParam = searchParams.get('weeks');

    if (!token || !weeksParam) {
      return new NextResponse(getErrorHTML('Invalid link'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const weeks = parseInt(weeksParam);
    if (![2, 4, 6].includes(weeks)) {
      return new NextResponse(getErrorHTML('Invalid delay period'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: { customer: true },
    });

    if (!subscription) {
      return new NextResponse(getErrorHTML('Subscription not found'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Verify token exists in metadata
    const metadata = subscription.metadata as any;
    const delayTokens = metadata?.delayTokens || {};
    const tokenData = delayTokens[token];

    if (!tokenData) {
      return new NextResponse(getExpiredHTML(), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Check if token is expired (24 hours)
    const tokenExpiry = new Date(tokenData.expiresAt);
    if (new Date() > tokenExpiry) {
      return new NextResponse(getExpiredHTML(), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Check if token was already used
    if (tokenData.used) {
      return new NextResponse(getErrorHTML('This delay link has already been used'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Verify weeks matches
    if (tokenData.weeks !== weeks) {
      return new NextResponse(getErrorHTML('Invalid delay period'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Calculate new billing date
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const newBillingDate = new Date(currentPeriodEnd.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

    // Update Stripe subscription
    if (subscription.stripeSubscriptionId) {
      const stripe = await getStripe();
      if (!stripe) {
        return new NextResponse(
          getErrorHTML('Stripe is not configured. Please contact support.'),
          {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }

      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          trial_end: Math.floor(newBillingDate.getTime() / 1000),
        });
      } catch (stripeError: any) {
        console.error('Stripe update error:', stripeError);
        return new NextResponse(
          getErrorHTML('Failed to update subscription. Please contact support.'),
          {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }
    }

    // Update local subscription
    const updatedDelayTokens = { ...delayTokens };
    updatedDelayTokens[token] = { ...tokenData, used: true };

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodEnd: newBillingDate,
        nextBillingAt: newBillingDate,
        delayCount: subscription.delayCount + 1,
        lastDelayedAt: new Date(),
        metadata: {
          ...metadata,
          delayTokens: updatedDelayTokens,
        },
      },
    });

    // Return success HTML page
    const formattedDate = newBillingDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return new NextResponse(getSuccessHTML(formattedDate, weeks), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Delay token error:', error);
    return new NextResponse(getErrorHTML('An error occurred. Please try again or contact support.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function getSuccessHTML(newBillingDate: string, weeks: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Delayed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .container {
            max-width: 500px;
            background: white;
            border-radius: 12px;
            padding: 48px 32px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
          }
          h1 {
            color: #10b981;
            font-size: 28px;
            margin: 0 0 16px 0;
          }
          p {
            color: #374151;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .highlight {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            font-weight: 600;
            color: #1f2937;
            margin: 24px 0;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 16px;
          }
          .button:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h1>Subscription Delayed!</h1>
          <p>Your next order has been successfully delayed by ${weeks} weeks.</p>
          <div class="highlight">
            New Billing Date: ${newBillingDate}
          </div>
          <p>You can manage your subscription anytime from your customer portal.</p>
          <a href="${baseUrl}/portal/subscriptions" class="button">Go to Portal</a>
        </div>
      </body>
    </html>
  `;
}

function getExpiredHTML(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .container {
            max-width: 500px;
            background: white;
            border-radius: 12px;
            padding: 48px 32px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
          }
          h1 {
            color: #ef4444;
            font-size: 28px;
            margin: 0 0 16px 0;
          }
          p {
            color: #374151;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 16px;
          }
          .button:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⏰</div>
          <h1>Link Expired</h1>
          <p>This delay link has expired or has already been used. Delay links are valid for 24 hours.</p>
          <p>You can still delay your subscription by logging into your customer portal.</p>
          <a href="${baseUrl}/portal/subscriptions" class="button">Login to Portal</a>
        </div>
      </body>
    </html>
  `;
}

function getErrorHTML(message: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .container {
            max-width: 500px;
            background: white;
            border-radius: 12px;
            padding: 48px 32px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
          }
          h1 {
            color: #ef4444;
            font-size: 28px;
            margin: 0 0 16px 0;
          }
          p {
            color: #374151;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 16px;
          }
          .button:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Oops!</h1>
          <p>${message}</p>
          <a href="${baseUrl}/portal/subscriptions" class="button">Go to Portal</a>
        </div>
      </body>
    </html>
  `;
}
