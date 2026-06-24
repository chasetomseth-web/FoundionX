import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { onboardingDay1Email, onboardingDay7Email } from '@/lib/email/resendEmailTemplates2';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let day1Sent = 0;
    let day7Sent = 0;
    const errors: any[] = [];

    // Day 1 Window: Orders created yesterday ± 1 hour
    const day1Start = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
    const day1End = new Date(now.getTime() - 23 * 60 * 60 * 1000);   // 23 hours ago

    const day1Orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: day1Start,
          lte: day1End,
        },
        // Has active subscription
        customer: {
          subscriptions: {
            some: {
              status: 'active',
            },
          },
        },
      },
      include: {
        customer: {
          include: {
            subscriptions: {
              where: { status: 'active' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Send Day 1 emails
    for (const order of day1Orders) {
      try {
        if (!order.customer) continue;
        
        const metadata = order.metadata as any;
        if (metadata?.onboardingDay1Sent) {
          continue; // Already sent
        }

        // Get onboarding content from settings
        const contentSettings = await (prisma as any).integration_settings?.findFirst({
          where: {
            store_id: order.storeId,
            provider: 'onboarding_content',
          },
        }).catch(() => null);

        const content = contentSettings?.config as any || {};
        const usageTips = content.usageTips || '<p>Take one serving daily with water for best results.</p>';
        const habitMessage = content.habitFormation || '<p>Set a daily reminder to build this into your routine. Consistency is key!</p>';

        const productName = order.items[0]?.product?.name || 'your purchase';

        const emailTemplate = onboardingDay1Email({
          customerName: order.customer.name || order.customer.email,
          productName,
          usageTips,
          habitMessage,
        });

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@merchantos.com',
          to: order.customer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        // Update metadata
        await prisma.order.update({
          where: { id: order.id },
          data: {
            metadata: {
              ...metadata,
              onboardingDay1Sent: true,
              onboardingDay1SentAt: now.toISOString(),
            },
          },
        });

        day1Sent++;
        console.log(`Sent Day 1 onboarding to ${order.customer.email}`);
      } catch (error: any) {
        console.error(`Error sending Day 1 email for order ${order.id}:`, error);
        errors.push({
          orderId: order.id,
          type: 'day1',
          error: error.message,
        });
      }
    }

    // Day 7 Window: Orders created 7 days ago ± 1 hour
    const day7Start = new Date(now.getTime() - (7 * 24 + 1) * 60 * 60 * 1000); // 7 days 1 hour ago
    const day7End = new Date(now.getTime() - (7 * 24 - 1) * 60 * 60 * 1000);   // 7 days minus 1 hour ago

    const day7Orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: day7Start,
          lte: day7End,
        },
      },
      include: {
        customer: {
          include: {
            subscriptions: {
              where: { status: 'active' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Send Day 7 emails
    for (const order of day7Orders) {
      try {
        if (!order.customer) continue;
        
        const metadata = order.metadata as any;
        if (metadata?.onboardingDay7Sent) {
          continue; // Already sent
        }

        // Get onboarding content from settings
        const contentSettings = await (prisma as any).integration_settings?.findFirst({
          where: {
            store_id: order.storeId,
            provider: 'onboarding_content',
          },
        }).catch(() => null);

        const content = contentSettings?.config as any || {};
        const testimonials = content.testimonials || `
          <p><em>"I started seeing results after 2 weeks!" - Sarah M.</em></p>
          <p><em>"The best decision I made for my health." - John D.</em></p>
        `;

        const productName = order.items[0]?.product?.name || 'your purchase';
        const nextBillingDate = order.customer.subscriptions[0]?.nextBillingAt 
          ? new Date(order.customer.subscriptions[0].nextBillingAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : undefined;

        const emailTemplate = onboardingDay7Email({
          customerName: order.customer.name || order.customer.email,
          productName,
          testimonials,
          nextBillingDate,
        });

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@merchantos.com',
          to: order.customer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        // Update metadata
        await prisma.order.update({
          where: { id: order.id },
          data: {
            metadata: {
              ...metadata,
              onboardingDay7Sent: true,
              onboardingDay7SentAt: now.toISOString(),
            },
          },
        });

        day7Sent++;
        console.log(`Sent Day 7 onboarding to ${order.customer.email}`);
      } catch (error: any) {
        console.error(`Error sending Day 7 email for order ${order.id}:`, error);
        errors.push({
          orderId: order.id,
          type: 'day7',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      day1Sent,
      day7Sent,
      totalSent: day1Sent + day7Sent,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Onboarding emails cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
