import { NextRequest } from 'next/server';
import {
  createSaleseekerJob,
  discoverBusinesses,
  enqueueScrapeJobs,
  getSaleseekerResults,
  jsonError,
  persistBusinesses,
  requireSaleseekerAuth,
  shouldQueueBusiness,
} from '../lib/saleseeker';
import type { GenerateSaleseekerInput } from '@/app/tools/saleseeker/types';

function parseGenerateInput(body: unknown): GenerateSaleseekerInput | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Partial<GenerateSaleseekerInput>;
  if (typeof value.niche !== 'string' || typeof value.country !== 'string' || typeof value.state !== 'string' || typeof value.city !== 'string') {
    return null;
  }
  return {
    niche: value.niche.trim(),
    country: value.country.trim(),
    state: value.state.trim(),
    city: value.city.trim(),
    filters: {
      hasWebsite: value.filters?.hasWebsite === true,
      hasPhone: value.filters?.hasPhone === true,
    },
  };
}

export async function POST(req: NextRequest) {
  const authError = await requireSaleseekerAuth(req);
  if (authError) return authError;

  const input = parseGenerateInput(await req.json().catch(() => null));
  if (!input || !input.niche || !input.city) {
    return jsonError('Niche and city are required.', 400);
  }

  try {
    const discovered = await discoverBusinesses(input);
    const filtered = discovered.filter((business) => {
      if (!business.name) return false;
      if (input.filters.hasWebsite && !business.website) return false;
      if (input.filters.hasPhone && !business.phone) return false;
      return Boolean(business.website || true);
    });

    const persisted = await persistBusinesses(filtered, input);
    const job = await createSaleseekerJob();
    const queued = await enqueueScrapeJobs(
      persisted.filter((business) => shouldQueueBusiness(business.website, input.filters)),
      job.id
    );

    const { status: resultsStatus, ...resultsWithoutStatus } = await getSaleseekerResults();

    return new Response(JSON.stringify({
      jobId: job.id,
      status: queued > 0 ? 'searching' : 'completed',
      resultsStatus,
      businessesFound: persisted.length,
      queued,
      ...resultsWithoutStatus,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate leads.';
    return jsonError(message, 500);
  }
}
