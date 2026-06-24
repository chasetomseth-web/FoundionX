import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processUploadedHtml } from '@/lib/storefront-engine';
import { getAuthFromRequest, unauthorizedResponse, hasPermission } from '@/lib/auth';

// GET /api/storefront — list templates
export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'storefront:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
  if (!store) return NextResponse.json({ templates: [] });

  const templates = await prisma.htmlTemplate.findMany({
    where: { storeId: store.id },
    include: { blocks: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json({ templates });
}

// POST /api/storefront — upload and process HTML template
export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session, 'storefront:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, slug, type, rawHtml, cssContent } = body;

    if (!name || !rawHtml) {
      return NextResponse.json({ error: 'name and rawHtml are required' }, { status: 400 });
    }

    const store = await prisma.store.findFirst({ where: { organizationId: session.organizationId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Process the uploaded HTML
    const processed = processUploadedHtml(rawHtml);

    const templateSlug = slug ?? name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

    const template = await prisma.htmlTemplate.create({
      data: {
        storeId: store.id,
        name,
        slug: templateSlug,
        type: type ?? 'page',
        rawHtml,
        sanitizedHtml: processed.sanitizedHtml,
        cssContent: cssContent ?? processed.extractedCss,
        jsContent: processed.extractedJs,
        bindings: processed.bindings,
        status: 'draft',
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        action: 'template.uploaded',
        resource: 'html_template',
        resourceId: template.id,
      },
    });

    return NextResponse.json({
      template,
      warnings: processed.warnings,
    }, { status: 201 });
  } catch (error) {
    console.error('[STOREFRONT] Upload error:', error);
    return NextResponse.json({ error: 'Failed to process template' }, { status: 500 });
  }
}
