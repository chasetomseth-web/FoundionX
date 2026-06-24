import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';
import { getRedis } from '@/lib/redis-lock';
import type {
  GenerateSaleseekerInput,
  SaleseekerCampaign,
  SaleseekerFilters,
  SaleseekerJob,
  SaleseekerLead,
  SaleseekerResultsResponse,
  SaleseekerUiStatus,
} from '@/app/tools/saleseeker/types';

interface GoogleTextResult {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
}

interface GoogleDetailsResponse {
  result?: {
    name?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    place_id?: string;
  };
  status?: string;
  error_message?: string;
}

interface GoogleTextResponse {
  results?: GoogleTextResult[];
  status?: string;
  error_message?: string;
}

interface DiscoveredBusiness {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  place_id: string | null;
}

interface RawLeadRow {
  id: string;
  business_id: string;
  business_name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  emails: string[];
  owner_name: string | null;
  source_url: string | null;
  tags: string[];
  created_at: string;
}

interface RawJobRow {
  id: string;
  status: SaleseekerJob['status'];
  created_at: string;
}

interface RawCampaignRow {
  id: string;
  name: string;
  niche: string | null;
  tags: string[];
  created_at: string;
}

export async function requireSaleseekerAuth(req: NextRequest) {
  const session = await getAuthFromRequest(req);
  if (!session) return unauthorizedResponse();
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function queryMany<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params) as Promise<T[]>;
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await queryMany<T>(sql, params);
  return rows[0] ?? null;
}

export async function executeRaw(sql: string, params: unknown[] = []) {
  return prisma.$executeRawUnsafe(sql, ...params);
}

export async function discoverBusinesses(input: GenerateSaleseekerInput): Promise<DiscoveredBusiness[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured.');
  }

  const location = [input.niche, input.city, input.state, input.country].filter(Boolean).join(' ');
  const textUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  textUrl.searchParams.set('query', location);
  textUrl.searchParams.set('radius', '50000');
  textUrl.searchParams.set('key', apiKey);

  const textResponse = await fetch(textUrl.toString());
  const textData = (await textResponse.json()) as GoogleTextResponse;

  if (!textResponse.ok || (textData.status && !['OK', 'ZERO_RESULTS'].includes(textData.status))) {
    throw new Error(textData.error_message ?? 'Google Places search failed.');
  }

  const results = textData.results ?? [];
  const details = await Promise.all(
    results.slice(0, 20).map(async (result) => {
      if (!result.place_id) return null;
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', result.place_id);
      detailsUrl.searchParams.set(
        'fields',
        'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,place_id'
      );
      detailsUrl.searchParams.set('key', apiKey);

      const response = await fetch(detailsUrl.toString());
      const data = (await response.json()) as GoogleDetailsResponse;
      const place = data.result;
      if (!place?.name) return null;

      return {
        name: place.name,
        address: place.formatted_address ?? result.formatted_address ?? null,
        phone: place.formatted_phone_number ?? null,
        website: normalizeWebsite(place.website),
        rating: place.rating ?? result.rating ?? null,
        reviews: place.user_ratings_total ?? result.user_ratings_total ?? null,
        place_id: place.place_id ?? result.place_id ?? null,
      } satisfies DiscoveredBusiness;
    })
  );

  return details.filter(Boolean).map((business) => business as DiscoveredBusiness);
}

export function normalizeWebsite(website?: string | null) {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function shouldQueueBusiness(website: string | null, filters: SaleseekerFilters) {
  if (filters.hasWebsite && !website) return false;
  return Boolean(website);
}

export async function persistBusinesses(businesses: DiscoveredBusiness[], input: GenerateSaleseekerInput) {
  const unique = new Map<string, DiscoveredBusiness>();
  businesses.forEach((business) => {
    const key = business.place_id ?? `${business.name}:${business.website ?? ''}`.toLowerCase();
    if (!unique.has(key)) unique.set(key, business);
  });

  const rows = [...unique.values()].map((business) => ({
    name: business.name.trim(),
    website: normalizeWebsite(business.website),
    phone: business.phone?.trim() ?? null,
    address: business.address?.trim() ?? null,
    city: input.city || null,
    state: input.state || null,
    country: input.country || null,
    niche: input.niche.trim(),
    place_id: business.place_id,
    rating: business.rating,
    reviews: business.reviews,
  }));

  if (rows.length === 0) return [];

  const inserted: Array<{ id: string; name: string; website: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; country: string | null; niche: string; place_id: string | null; rating: number | null; reviews: number | null; created_at: string }> = [];

  for (const row of rows) {
    const [created] = await queryMany<{
      id: string;
      name: string;
      website: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      niche: string;
      place_id: string | null;
      rating: number | null;
      reviews: number | null;
      created_at: string;
    }>(
      `INSERT INTO saleseeker_businesses (id, name, website, phone, address, city, state, country, niche, place_id, rating, reviews, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       ON CONFLICT (place_id) DO UPDATE SET
         name = EXCLUDED.name,
         website = COALESCE(EXCLUDED.website, saleseeker_businesses.website),
         phone = COALESCE(EXCLUDED.phone, saleseeker_businesses.phone),
         address = COALESCE(EXCLUDED.address, saleseeker_businesses.address),
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         country = EXCLUDED.country,
         niche = EXCLUDED.niche,
         rating = COALESCE(EXCLUDED.rating, saleseeker_businesses.rating),
         reviews = COALESCE(EXCLUDED.reviews, saleseeker_businesses.reviews)
       RETURNING id, name, website, phone, address, city, state, country, niche, place_id, rating, reviews, created_at::text`,
      [
        row.name,
        row.website,
        row.phone,
        row.address,
        row.city,
        row.state,
        row.country,
        row.niche,
        row.place_id,
        row.rating,
        row.reviews,
      ]
    );
    inserted.push(created);
  }

  return inserted;
}

export async function createSaleseekerJob(): Promise<SaleseekerJob> {
  const [job] = await queryMany<RawJobRow>(
    `INSERT INTO saleseeker_jobs (id, status, created_at)
     VALUES (gen_random_uuid(), 'running', now())
     RETURNING id, status, created_at::text`
  );
  return { id: job.id, status: job.status, created_at: job.created_at };
}

export async function enqueueScrapeJobs(businesses: Array<{ id: string; website: string | null }>, jobId: string) {
  const redis = getRedis();
  let queued = 0;

  if (redis?.isOpen) {
    for (const business of businesses) {
      if (!business.website) continue;
      await redis.lPush('saleseeker_scrape_queue', JSON.stringify({ business_id: business.id, website: business.website, job_id: jobId }));
      queued += 1;
    }
  }

  return queued;
}

export async function getSaleseekerResults(): Promise<SaleseekerResultsResponse> {
  const job = await queryOne<RawJobRow>(
    `SELECT id, status, created_at::text
     FROM saleseeker_jobs
     ORDER BY created_at DESC
     LIMIT 1`
  );

  const leadRows = await queryMany<RawLeadRow>(
    `SELECT
       b.id AS business_id,
       b.name AS business_name,
       b.website,
       b.phone,
       b.address,
       b.city,
       b.state,
       l.id AS id,
       array_agg(DISTINCT l.email ORDER BY l.email) AS emails,
       COALESCE((array_agg(l.owner_name ORDER BY l.created_at DESC) FILTER (WHERE l.owner_name IS NOT NULL))[1], NULL) AS owner_name,
       COALESCE((array_agg(l.source_url ORDER BY l.created_at DESC) FILTER (WHERE l.source_url IS NOT NULL))[1], NULL) AS source_url,
       COALESCE(array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL), ARRAY[]::TEXT[]) AS tags,
       MIN(l.created_at)::text AS created_at
     FROM saleseeker_leads l
     JOIN saleseeker_businesses b ON b.id = l.business_id
     LEFT JOIN LATERAL unnest(COALESCE(l.tags, ARRAY[]::TEXT[])) AS tag ON true
     GROUP BY b.id, b.name, b.website, b.phone, b.address, b.city, b.state
     ORDER BY MIN(l.created_at) DESC`
  );

  const campaigns = await getSaleseekerCampaigns();

  return {
    status: mapJobStatus(job?.status ?? null),
    job: job ? { id: job.id, status: job.status, created_at: job.created_at } : null,
    leads: leadRows.map(toSaleseekerLead),
    campaigns,
  };
}

export async function getSaleseekerCampaigns(): Promise<SaleseekerCampaign[]> {
  const campaigns = await queryMany<RawCampaignRow>(
    `SELECT id, name, niche, tags, created_at::text
     FROM saleseeker_campaigns
     ORDER BY created_at DESC`
  );

  const campaignsWithLeads = await Promise.all(
    campaigns.map(async (campaign) => {
      const leads = await queryMany<RawLeadRow>(
        `SELECT
           b.id AS business_id,
           b.name AS business_name,
           b.website,
           b.phone,
           b.address,
           b.city,
           b.state,
           l.id AS id,
           array_agg(DISTINCT l.email ORDER BY l.email) AS emails,
           COALESCE((array_agg(l.owner_name ORDER BY l.created_at DESC) FILTER (WHERE l.owner_name IS NOT NULL))[1], NULL) AS owner_name,
           COALESCE((array_agg(l.source_url ORDER BY l.created_at DESC) FILTER (WHERE l.source_url IS NOT NULL))[1], NULL) AS source_url,
           COALESCE(array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL), ARRAY[]::TEXT[]) AS tags,
           MIN(l.created_at)::text AS created_at
         FROM saleseeker_leads l
         JOIN saleseeker_businesses b ON b.id = l.business_id
         LEFT JOIN LATERAL unnest(COALESCE(l.tags, ARRAY[]::TEXT[])) AS tag ON true
         WHERE l.campaign_id = $1
         GROUP BY b.id, b.name, b.website, b.phone, b.address, b.city, b.state
         ORDER BY MIN(l.created_at) DESC`,
        [campaign.id]
      );

      return {
        id: campaign.id,
        name: campaign.name,
        niche: campaign.niche,
        tags: campaign.tags,
        created_at: campaign.created_at,
        leads: leads.map(toSaleseekerLead),
      };
    })
  );

  return campaignsWithLeads;
}

export function mapJobStatus(status: SaleseekerJob['status'] | null): SaleseekerUiStatus {
  if (status === 'done') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'scraping';
  if (status === 'pending') return 'searching';
  return 'idle';
}

export function toSaleseekerLead(row: RawLeadRow): SaleseekerLead {
  return {
    id: row.id,
    business_id: row.business_id,
    business_name: row.business_name,
    website: row.website,
    emails: row.emails ?? [],
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    owner_name: row.owner_name,
    source_url: row.source_url,
    tags: row.tags ?? [],
    created_at: row.created_at,
  };
}
