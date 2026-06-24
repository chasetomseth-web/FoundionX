import { NextRequest, NextResponse } from 'next/server';
import { getErrors, getErrorStats, resolveError } from '@/lib/error-tracker';
import type { ErrorSeverity, ErrorCategory } from '@/lib/error-tracker';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const severity = searchParams.get('severity') as ErrorSeverity | null;
  const category = searchParams.get('category') as ErrorCategory | null;
  const tenantId = searchParams.get('tenantId') ?? undefined;
  const resolved = searchParams.has('resolved') ? searchParams.get('resolved') === 'true' : undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50');

  const errors = getErrors({ severity: severity ?? undefined, category: category ?? undefined, tenantId, resolved, limit });
  const stats = getErrorStats();

  return NextResponse.json({ errors, stats, total: errors.length });
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = resolveError(id);
  return NextResponse.json({ resolved: ok });
}
