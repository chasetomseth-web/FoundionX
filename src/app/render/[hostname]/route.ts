import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ hostname: string }> }) {
  const { hostname: encodedHostname } = await params;
  const hostname = decodeURIComponent(encodedHostname);

  const domain = await prisma.domain.findUnique({
    where: { hostname },
    include: { site: true },
  });

  if (!domain || !domain.site || !domain.site.isPublished) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(domain.site.htmlContent, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
