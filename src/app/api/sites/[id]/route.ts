import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/auth";
import { removeDomainFromVercel } from "@/lib/vercel";

export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  const site = await prisma.site.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { domains: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json({ site });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  const body = await req.json();
  const { name, slug, htmlContent, isPublished } = body as {
    name?: string;
    slug?: string;
    htmlContent?: string;
    isPublished?: boolean;
  };

  const existing = await prisma.site.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { domains: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;

  if (slug !== undefined) {
    const finalSlug = String(slug)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!finalSlug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const dup = await prisma.site.findFirst({
      where: {
        organizationId: session.organizationId,
        slug: finalSlug,
        id: { not: id },
      },
    });

    if (dup) {
      return NextResponse.json(
        { error: "Another site with this slug already exists" },
        { status: 409 }
      );
    }

    updateData.slug = finalSlug;
  }

  if (htmlContent !== undefined) updateData.htmlContent = htmlContent;

  if (isPublished !== undefined) {
    const currentHtml = htmlContent ?? existing.htmlContent;
    if (isPublished && !currentHtml?.trim()) {
      return NextResponse.json(
        { error: "Cannot publish a site with empty HTML content" },
        { status: 400 }
      );
    }
    updateData.isPublished = isPublished;
  }

  const site = await prisma.site.update({
    where: { id },
    data: updateData,
    include: { domains: true },
  });

  return NextResponse.json({ site });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  const site = await prisma.site.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { domains: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  for (const domain of site.domains) {
    try {
      await removeDomainFromVercel(domain.hostname);
    } catch (err) {
      console.error(`[sites/${id}] Failed to remove domain from Vercel:`, err);
    }
  }

  await prisma.domain.deleteMany({
    where: { siteId: id },
  });

  await prisma.site.delete({
    where: { id },
  });

  return new NextResponse(null, { status: 204 });
}
