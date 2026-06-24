import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { suggestReply } from '@/lib/ai/suggestReply';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session, 'support:reply') && !hasPermission(session, 'customers:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.organizationId !== session.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Find last customer message
    const lastCustomerMessage = [...ticket.messages].reverse().find((m) => m.senderType === 'customer');
    const input = lastCustomerMessage ? lastCustomerMessage.body : ticket.subject;

    const suggestion = suggestReply(input ?? '');

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('[TICKET SUGGEST]', error);
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 });
  }
}
