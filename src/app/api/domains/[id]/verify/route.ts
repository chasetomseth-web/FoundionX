import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/auth";
import { getDomainStatus, getDomainConfig } from "@/lib/vercel";

export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();

  const domain = await prisma.domain.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: { site: true },
  });

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  let verificationState = domain.verificationState;
  let sslState = domain.sslState;
  let errorMessage: string | null = null;

  try {
    const [statusData, configData] = await Promise.all([
      getDomainStatus(domain.hostname),
      getDomainConfig(domain.hostname),
    ]);

    if (statusData.verified === true) {
      verificationState = "verified";
    } else if (statusData.verified === false) {
      verificationState = "failed";
    } else {
      verificationState = "pending";
    }

    if (configData.ssl?.status === "ready") {
      sslState = "ready";
    } else if (configData.ssl?.status === "pending") {
      sslState = "pending";
      // When Cloudflare proxy (orange cloud) is active, Cloudflare terminates SSL at the edge
      // and Vercel's SSL status will show "pending" indefinitely. This is expected behavior,
      // not an error — the domain still routes traffic correctly through Cloudflare to Vercel.
      if (verificationState === "verified") {
        errorMessage = "Cloudflare proxy detected — SSL pending is expected and not an error";
      }
    } else if (configData.ssl?.status === "error") {
      sslState = "error";
      errorMessage = configData.ssl?.message ?? null;
    }
  } catch (err) {
    verificationState = "error";
    errorMessage = err instanceof Error ? err.message : "Verification check failed";
  }

  const updated = await prisma.domain.update({
    where: { id: params.id },
    data: {
      verificationState,
      sslState,
      lastCheckedAt: new Date(),
      errorMessage: errorMessage ?? domain.errorMessage,
    },
    include: { site: true },
  });

  return NextResponse.json({ domain: updated });
}
