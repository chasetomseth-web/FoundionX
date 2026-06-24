import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';
import { appendAuditLog } from '@/lib/audit-log';

// PATCH — adjust inventory
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!hasPermission(auth, 'products:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: productId } = params;
    const body = await request.json();
    const { adjustment, reason } = body;

    if (typeof adjustment !== 'number') {
      return NextResponse.json(
        { error: 'adjustment must be a number' },
        { status: 400 }
      );
    }

    // Verify product belongs to user's organization
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product || product.store.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const previousInventory = product.inventory;
    const newInventory = previousInventory + adjustment;

    // Update inventory
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { inventory: newInventory },
    });

    // Log the inventory change
    await appendAuditLog({
      actorId: auth.userId || 'system',
      tenantId: product.store.organizationId,
      action: 'inventory.updated',
      resourceType: 'product',
      resourceId: productId,
      before: { inventory: previousInventory },
      after: { inventory: newInventory },
      metadata: { adjustment, reason: reason || 'Manual adjustment' },
    });

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        inventory: updatedProduct.inventory,
      },
    });
  } catch (error: unknown) {
    console.error('Inventory adjustment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to adjust inventory';
    return NextResponse.json(
      { error: 'INVENTORY_UPDATE_FAILED', message },
      { status: 500 }
    );
  }
}
