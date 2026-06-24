import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Soft delete - set deletedAt timestamp
    await prisma.store.updateMany({
      where: { organizationId: auth.organizationId },
      data: { deletedAt: new Date() },
    });

    // TODO: Sign out user via Supabase
    // await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'Account scheduled for deletion' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}