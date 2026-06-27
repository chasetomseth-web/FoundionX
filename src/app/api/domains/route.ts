import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/auth";
import { addDomainToVercel } from "@/lib/vercel";

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    console.log('[api/domains] POST called', {
      headers: Object.fromEntries(req.headers),
      body: rawBody,
    });

    const body = JSON.parse(rawBody) as {
      siteId: string;
      hostname: string;
    };

    const session = await getAuthFromRequest(req);
    if (!session) return unauthorizedResponse();

    const { siteId, hostname: rawHostname } = body;

    if (!siteId || !rawHostname) {
      return NextResponse.json(
        { error: "siteId and hostname are required" },
        { status: 400 }
      );
    }

    const normalized = rawHostname
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .replace(/\.+$/, "");

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: session.organizationId },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const existing = await prisma.domain.findUnique({
      where: { hostname: normalized },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This hostname is already in use" },
        { status: 409 }
      );
    }

    let vercelData: { id?: string; verification?: { txt?: string } } = {};
    try {
      vercelData = (await addDomainToVercel(normalized)) as typeof vercelData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add domain to Vercel";
      const friendly = message.includes("authorized")
        ? "Couldn't connect to Vercel right now. Try again shortly."
        : message.includes("not found")
        ? "Vercel project not found. Check your project configuration."
        : "Domain registration with Vercel failed. Please try again.";
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    const domain = await prisma.domain.create({
      data: {
        organizationId: session.organizationId,
        siteId,
        hostname: normalized,
        vercelDomainId: vercelData?.id,
        verificationTxt: vercelData?.verification?.txt ?? null,
      },
      include: { site: true },
    });

    return NextResponse.json({ domain }, { status: 201 });
  } catch (error) {
    console.error('[api/domains] FATAL ERROR:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
