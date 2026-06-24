/**
 * SalesBlink REST API Wrapper
 *
 * Used exclusively for cold outreach campaigns.
 * Never overlaps with Resend (transactional) or Brevo (marketing).
 */

const SALESBLINK_API_BASE = 'https://api.salesblink.io/v1';
const SALESBLINK_API_KEY = process.env.SALESBLINK_API_KEY ?? '';

async function sbRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${SALESBLINK_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${SALESBLINK_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`SalesBlink API error ${res.status}: ${error}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export interface SalesBlinkCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  total_leads: number;
  sent_count: number;
  open_count: number;
  reply_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
}

export async function createCampaign(params: {
  name: string;
  schedule?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}): Promise<SalesBlinkCampaign> {
  return sbRequest<SalesBlinkCampaign>('POST', '/campaigns', {
    name: params.name,
    schedule: params.schedule ?? {},
    settings: params.settings ?? {},
  });
}

export async function getCampaigns(): Promise<{ campaigns: SalesBlinkCampaign[] }> {
  return sbRequest('GET', '/campaigns');
}

export async function getCampaignStats(campaignId: string): Promise<SalesBlinkCampaign> {
  return sbRequest('GET', `/campaigns/${campaignId}/stats`);
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  await sbRequest('POST', `/campaigns/${campaignId}/pause`);
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  await sbRequest('POST', `/campaigns/${campaignId}/resume`);
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export interface SalesBlinkLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  status?: string;
}

export async function addLeads(
  campaignId: string,
  leads: Array<{
    email: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    custom_fields?: Record<string, string>;
  }>
): Promise<{ leads: SalesBlinkLead[] }> {
  return sbRequest('POST', `/campaigns/${campaignId}/leads`, { leads });
}

export async function getLeads(campaignId: string): Promise<{ leads: SalesBlinkLead[] }> {
  return sbRequest('GET', `/campaigns/${campaignId}/leads`);
}