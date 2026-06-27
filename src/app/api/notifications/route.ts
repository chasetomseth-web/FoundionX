import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

// GET /api/notifications — list notifications for current user
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

  const where: Record<string, unknown> = {
    organizationId: session.organizationId,
    OR: [{ userId: session.userId }, { userId: null }],
  };

  if (unreadOnly) where.isRead = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      organizationId: session.organizationId,
      OR: [{ userId: session.userId }, { userId: null }],
      isRead: false,
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const body = await req.json();
  const { ids, markAll } = body;

  if (markAll) {
    await prisma.notification.updateMany({
      where: {
        organizationId: session.organizationId,
        OR: [{ userId: session.userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true },
    });
  } else if (ids?.length) {
    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        organizationId: session.organizationId,
      },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
