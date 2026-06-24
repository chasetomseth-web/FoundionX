/**
 * MerchantOS — Environment Check Admin Endpoint
 * GET /api/admin/env-check
 * Returns environment validation status (no secret values exposed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnvCheckReport } from '@/lib/env-validation';
import { getSecurityChecklist } from '@/lib/security';

export async function GET(request: NextRequest) {
  // Only accessible with internal API key
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) {
    const apiKey =
      request.headers.get('X-API-Key') ??
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (apiKey !== internalSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const envReport = getEnvCheckReport();
  const securityChecklist = getSecurityChecklist();

  const allSecurityPassed = Object.values(securityChecklist).every(Boolean);

  return NextResponse.json({
    environment: envReport,
    security: {
      allPassed: allSecurityPassed,
      checklist: securityChecklist,
    },
    deployment: {
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      uptime: process.uptime(),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    checkedAt: new Date().toISOString(),
  });
}
