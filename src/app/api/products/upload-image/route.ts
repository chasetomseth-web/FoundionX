import { NextRequest, NextResponse } from 'next/server';
import { uploadProductImage, uploadProductImageBuffer } from '@/lib/supabase-storage';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  try {
    let fileName: string | undefined;
    let storeId: string | undefined;
    let productId: string | undefined;
    let base64Data: string | undefined;
    let fileBuffer: Buffer | undefined;
    let contentType: string | undefined;

    const contentTypeHeader = req.headers.get('content-type') || '';
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      fileName = formData.get('fileName')?.toString() ?? (file instanceof File ? file.name : undefined);
      storeId = formData.get('storeId')?.toString() ?? undefined;
      productId = formData.get('productId')?.toString() ?? undefined;

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        contentType = file.type || 'application/octet-stream';
      }
    } else {
      const body = await req.json();
      base64Data = body.base64Data;
      fileName = body.fileName;
      storeId = body.storeId;
      productId = body.productId;
    }

    if (!fileName) {
      return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
    }

    if (!storeId && productId) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { storeId: true } });
      storeId = product?.storeId ?? undefined;
    }

    if (!storeId) {
      const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
      storeId = store?.id ?? undefined;
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Missing storeId' }, { status: 400 });
    }

    let result;
    if (fileBuffer && contentType) {
      result = await uploadProductImageBuffer(storeId, fileName, fileBuffer, contentType);
    } else if (base64Data) {
      result = await uploadProductImage(storeId, base64Data, fileName);
    } else {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    return NextResponse.json({ publicUrl: result.publicUrl, path: result.path });
  } catch (error: unknown) {
    console.error('[UPLOAD IMAGE] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}