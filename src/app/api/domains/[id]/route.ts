import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/auth";
import { removeDomainFromVercel } from "@/lib/vercel";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const domain = await prisma.domain.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: { site: true },
  });

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  try {
    await removeDomainFromVercel(domain.hostname);
  } catch (err) {
    console.error(`[domains/${params.id}] Vercel removal failed, proceeding with local delete:`, err);
  }

  await prisma.domain.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}
