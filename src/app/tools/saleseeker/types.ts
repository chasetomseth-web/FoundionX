export type SaleseekerJobStatus = 'pending' | 'running' | 'done' | 'failed';
export type SaleseekerUiStatus = 'idle' | 'searching' | 'scraping' | 'completed' | 'failed';

export interface SaleseekerFilters {
  hasWebsite?: boolean;
  hasPhone?: boolean;
}

export interface GenerateSaleseekerInput {
  niche: string;
  country: string;
  state: string;
  city: string;
  filters: SaleseekerFilters;
}

export interface SaleseekerLead {
  id: string;
  business_id: string;
  business_name: string;
  website: string | null;
  emails: string[];
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  owner_name: string | null;
  source_url: string | null;
  tags: string[];
  created_at: string;
}

export interface SaleseekerCampaign {
  id: string;
  name: string;
  niche: string | null;
  tags: string[];
  created_at: string;
  leads: SaleseekerLead[];
}

export interface SaleseekerJob {
  id: string;
  status: SaleseekerJobStatus;
  created_at: string;
}

export interface SaleseekerResultsResponse {
  status: SaleseekerUiStatus;
  job: SaleseekerJob | null;
  leads: SaleseekerLead[];
  campaigns: SaleseekerCampaign[];
}
