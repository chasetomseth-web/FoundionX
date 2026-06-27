import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadProductFile } from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const formData = await req.formData();
  const file = formData.get('file');
  const productId = formData.get('productId')?.toString();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file upload' }, { status: 400 });
  }

  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  }

  // Bypass-compatible store lookup
  let store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  // Ensure product belongs to this store
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';
    const result = await uploadProductFile(store.id, file.name, buffer, contentType);

    // Persist ProductFile reference
    const created = await prisma.productFile.create({
      data: {
        productId,
        name: file.name,
        url: result.publicUrl,
        path: result.path,
        size: buffer.length,
        contentType,
      },
      select: { id: true },
    });

    // Return response with file metadata
    return NextResponse.json({
      publicUrl: result.publicUrl,
      path: result.path,
      fileName: file.name,
      size: buffer.length,
      type: contentType,
      id: created.id,
    });
  } catch (error: unknown) {
    console.error('[UPLOAD FILE] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
