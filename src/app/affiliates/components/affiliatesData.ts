export interface Affiliate {
  id: string;
  name: string;
  email: string;
  code: string;
  status: 'active' | 'paused' | 'pending' | 'banned';
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  commissionRate: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  gmv: number;
  commission: number;
  pendingPayout: number;
  totalPaid: number;
  joinedDate: string;
  lastConversionDate: string | null;
  goaffproId: string;
  paypalEmail: string | null;
  recurringCommissions: boolean;
}

export const mockAffiliates: Affiliate[] = [
  {
    id: 'aff-001',
    name: 'Cristian Ruiz',
    email: 'cristian.ruiz@creatorhub.io',
    code: 'ref_cristian_07',
    status: 'active',
    tier: 'gold',
    commissionRate: 10,
    clicks: 4821,
    conversions: 312,
    conversionRate: 6.47,
    gmv: 38420,
    commission: 3842,
    pendingPayout: 1240,
    totalPaid: 2602,
    joinedDate: '2026-01-10T00:00:00Z',
    lastConversionDate: '2026-05-22T08:14:22Z',
    goaffproId: 'gaff_cr07_x9k2',
    paypalEmail: 'cristian.ruiz@paypal.com',
    recurringCommissions: true,
  },
  {
    id: 'aff-002',
    name: 'Amara Osei',
    email: 'amara.osei@influencerco.gh',
    code: 'ref_amara_12',
    status: 'active',
    tier: 'silver',
    commissionRate: 8,
    clicks: 3204,
    conversions: 198,
    conversionRate: 6.18,
    gmv: 24600,
    commission: 1968,
    pendingPayout: 820,
    totalPaid: 1148,
    joinedDate: '2026-01-15T00:00:00Z',
    lastConversionDate: '2026-05-22T07:55:10Z',
    goaffproId: 'gaff_ao12_m4n8',
    paypalEmail: 'amara.osei@paypal.com',
    recurringCommissions: true,
  },
  {
    id: 'aff-003',
    name: 'Leo Martins',
    email: 'leo.martins@digitalcreator.br',
    code: 'ref_leo_03',
    status: 'active',
    tier: 'silver',
    commissionRate: 8,
    clicks: 2877,
    conversions: 145,
    conversionRate: 5.04,
    gmv: 17800,
    commission: 1424,
    pendingPayout: 560,
    totalPaid: 864,
    joinedDate: '2026-02-01T00:00:00Z',
    lastConversionDate: '2026-05-22T12:01:00Z',
    goaffproId: 'gaff_lm03_p7q1',
    paypalEmail: 'leo.martins@paypal.com',
    recurringCommissions: false,
  },
  {
    id: 'aff-004',
    name: 'Nina Vasquez',
    email: 'nina.vasquez@contentlab.mx',
    code: 'ref_nina_21',
    status: 'active',
    tier: 'standard',
    commissionRate: 6,
    clicks: 1932,
    conversions: 89,
    conversionRate: 4.61,
    gmv: 10900,
    commission: 654,
    pendingPayout: 280,
    totalPaid: 374,
    joinedDate: '2026-02-20T00:00:00Z',
    lastConversionDate: '2026-05-20T14:30:00Z',
    goaffproId: 'gaff_nv21_r3s5',
    paypalEmail: null,
    recurringCommissions: false,
  },
  {
    id: 'aff-005',
    name: 'Theo Bergmann',
    email: 'theo.bergmann@mediahaus.de',
    code: 'ref_theo_08',
    status: 'paused',
    tier: 'standard',
    commissionRate: 6,
    clicks: 1420,
    conversions: 54,
    conversionRate: 3.80,
    gmv: 6600,
    commission: 396,
    pendingPayout: 0,
    totalPaid: 396,
    joinedDate: '2026-03-05T00:00:00Z',
    lastConversionDate: '2026-05-10T09:00:00Z',
    goaffproId: 'gaff_tb08_t6u9',
    paypalEmail: 'theo.bergmann@paypal.com',
    recurringCommissions: false,
  },
  {
    id: 'aff-006',
    name: 'Zara Okonkwo',
    email: 'zara.okonkwo@creatorsng.com',
    code: 'ref_zara_15',
    status: 'active',
    tier: 'standard',
    commissionRate: 6,
    clicks: 988,
    conversions: 31,
    conversionRate: 3.14,
    gmv: 3800,
    commission: 228,
    pendingPayout: 120,
    totalPaid: 108,
    joinedDate: '2026-04-01T00:00:00Z',
    lastConversionDate: '2026-05-18T16:00:00Z',
    goaffproId: 'gaff_zo15_v2w4',
    paypalEmail: null,
    recurringCommissions: false,
  },
];
