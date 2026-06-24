import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find subscriptions due for renewal in 5-6 days
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: {
          gte: fiveDaysFromNow,
          lte: sixDaysFromNow,
        },
      },
      include: {
        customer: true,
      },
    });

    // Filter by reminderSent in code since JSON querying is complex
    const filteredSubscriptions = subscriptions.filter(sub => {
      const metadata = sub.metadata as any;
      if (!metadata?.reminderSent) return true;
      const reminderDate = new Date(metadata.reminderSent);
      return reminderDate < thirtyDaysAgo;
    });

    let sentCount = 0;
    const errors: any[] = [];

    for (const subscription of filteredSubscriptions) {
      try {
        // Generate secure delay tokens for 2, 4, and 6 weeks
        const delayTokens: any = {};
        const tokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        for (const weeks of [2, 4, 6]) {
          const token = crypto.randomBytes(32).toString('hex');
          delayTokens[token] = {
            weeks,
            expiresAt: tokenExpiry.toISOString(),
            used: false,
          };
        }

        // Update subscription metadata
        const currentMetadata = (subscription.metadata as any) || {};
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            metadata: {
              ...currentMetadata,
              delayTokens,
              reminderSent: now.toISOString(),
            },
          },
        });

        // Prepare delay links
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const delay2WeeksToken = Object.keys(delayTokens).find(k => delayTokens[k].weeks === 2);
        const delay4WeeksToken = Object.keys(delayTokens).find(k => delayTokens[k].weeks === 4);
        const delay6WeeksToken = Object.keys(delayTokens).find(k => delayTokens[k].weeks === 6);

        const delay2WeeksUrl = `${baseUrl}/api/subscriptions/${subscription.id}/delay-token?token=${delay2WeeksToken}&weeks=2`;
        const delay4WeeksUrl = `${baseUrl}/api/subscriptions/${subscription.id}/delay-token?token=${delay4WeeksToken}&weeks=4`;
        const delay6WeeksUrl = `${baseUrl}/api/subscriptions/${subscription.id}/delay-token?token=${delay6WeeksToken}&weeks=6`;

        // Send billing reminder email
        const nextBillingDate = new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@merchantos.com',
          to: subscription.customer.email,
          subject: `Your ${subscription.planName} renews in 5 days`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
                  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
                  .content { padding: 40px 30px; }
                  .delay-buttons { margin: 30px 0; }
                  .delay-button { display: inline-block; background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; margin: 8px; font-weight: 600; }
                  .delay-button:hover { background: #5568d3; }
                  .manage-link { display: inline-block; margin: 20px 0; color: #667eea; text-decoration: none; font-weight: 600; }
                  .cancel-link { color: #999; font-size: 12px; margin-top: 30px; }
                  .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">⏰ Your Next Order Ships Soon</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${subscription.customer.name || 'there'},</p>
                    <p>Your <strong>${subscription.planName}</strong> subscription will renew on <strong>${nextBillingDate}</strong>.</p>
                    
                    <p style="font-size: 18px; font-weight: 600; margin-top: 30px;">Have too much product? Just delay your next order:</p>
                    
                    <div class="delay-buttons" style="text-align: center;">
                      <a href="${delay2WeeksUrl}" class="delay-button">Delay 2 Weeks</a>
                      <a href="${delay4WeeksUrl}" class="delay-button">Delay 4 Weeks</a>
                      <a href="${delay6WeeksUrl}" class="delay-button">Delay 6 Weeks</a>
                    </div>
                    
                    <p style="text-align: center;">
                      <a href="${baseUrl}/portal/subscriptions" class="manage-link">Manage Your Subscription →</a>
                    </p>
                    
                    <p style="text-align: center;" class="cancel-link">
                      <a href="${baseUrl}/portal/subscriptions" style="color: #999; text-decoration: none;">Cancel subscription</a>
                    </p>
                  </div>
                  <div class="footer">
                    <p style="margin: 0;">Questions? Contact our support team anytime.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        sentCount++;

        // Audit log (silent - optional feature)
        console.log(`Billing reminder sent for subscription ${subscription.id}`);

      } catch (error: any) {
        console.error(`Failed to send reminder for subscription ${subscription.id}:`, error);
        errors.push({
          subscriptionId: subscription.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Billing reminders cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
