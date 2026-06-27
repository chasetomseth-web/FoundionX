import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = 'nodejs';
const RESERVED_SLUGS = new Set([
  "api",
  "dashboard",
  "_sites",
  "render",
  "sites",
  "affiliate-portal",
  "affiliates",
  "auth",
  "checkout",
  "cold-outreach",
  "components",
  "coupons",
  "customers",
  "email",
  "funnel",
  "html-store",
  "merchant-affiliate",
  "merchant-pages",
  "merchantsell",
  "onboarding",
  "orders-dashboard",
  "p",
  "pagebuilder",
  "portal",
  "products",
  "reporting-dashboard",
  "retention",
  "settings",
  "shipping",
  "sign-up-login-screen",
  "store",
  "storefront",
  "subscriptions",
  "support",
  "tools",
  "track",
  "upsell",
  "upsell-funnels",
]);

export async function GET(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const sites = await prisma.site.findMany({
    where: { organizationId: session.organizationId },
    include: {
      domains: true,
      _count: { select: { domains: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sites });
}

export async function POST(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const body = await req.json();
  const { name, slug, htmlContent } = body as {
    name: string;
    slug?: string;
    htmlContent?: string;
  };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let finalSlug = (slug ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!finalSlug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  if (RESERVED_SLUGS.has(finalSlug)) {
    return NextResponse.json(
      { error: `Slug "${finalSlug}" is reserved` },
      { status: 400 }
    );
  }

  const existing = await prisma.site.findUnique({
    where: {
      organizationId_slug: {
        organizationId: session.organizationId,
        slug: finalSlug,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A site with this slug already exists" },
      { status: 409 }
    );
  }

  const site = await prisma.site.create({
    data: {
      organizationId: session.organizationId,
      name,
      slug: finalSlug,
      htmlContent: htmlContent ?? "",
    },
    include: { domains: true },
  });

  return NextResponse.json({ site }, { status: 201 });
}
