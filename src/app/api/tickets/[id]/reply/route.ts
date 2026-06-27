import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { sendEmail, EmailType } from '@/lib/email/emailService';

export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  // Support inbox action: require support permission (or customers manage as fallback)
  if (!hasPermission(session, 'support:reply') && !hasPermission(session, 'customers:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { body, agentEmail } = (await req.json()) as { body?: string; agentEmail?: string };
    if (!body || !body.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const ticketId = params.id;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        organizationId: true,
        customerEmail: true,
        subject: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Ensure tenant isolation
    if (ticket.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1) Persist agent message
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'agent',
        senderEmail: agentEmail ?? 'support@combatcreatine.com',
        body: body.trim(),
      },
    });

    // 2) Update status → pending
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'pending',
      },
    });

    // 3) Send support reply email via Resend (routing enforced by emailService)
    await sendEmail(EmailType.SUPPORT, {
      to: [{ email: ticket.customerEmail }],
      subject: `Re: ${ticket.subject}`,
      html: `<p>${body.trim().replace(/\n/g, '<br/>')}</p>`,
      text: body.trim(),
      replyTo: agentEmail,
      meta: { ticketId: ticket.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TICKETS REPLY]', error);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}

