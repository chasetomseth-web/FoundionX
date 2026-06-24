import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session, 'customers:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const organizationId = session.organizationId;

    const tickets = await prisma.supportTicket.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            senderType: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[TICKETS LIST]', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

