import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getDomainConfig } from "@/lib/vercel";

export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const domain = await prisma.domain.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
  });

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  try {
    const dnsInstructions = await getDomainConfig(domain.hostname);

    return NextResponse.json({
      dnsInstructions,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      dnsInstructions: null,
      error: err instanceof Error ? err.message : "Failed to fetch DNS instructions",
      fetchedAt: new Date().toISOString(),
    });
  }
}
