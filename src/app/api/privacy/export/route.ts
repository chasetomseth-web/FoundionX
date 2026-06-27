import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Export data - simplified version
    const exportData = {
      exportedAt: new Date().toISOString(),
      store: await prisma.store.findFirst({
        where: { organizationId: auth.organizationId },
      }),
      // TODO: Add orders, customers, products when models are available
      orders: [],
      customers: [],
      products: [],
    };

    const json = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=data-export-${new Date().toISOString().split('T')[0]}.json`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}