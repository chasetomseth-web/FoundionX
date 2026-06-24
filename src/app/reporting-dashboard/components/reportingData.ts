export const gmvData = [
  { date: '04/23', gmv: 8420, orders: 28 },
  { date: '04/24', gmv: 11200, orders: 35 },
  { date: '04/25', gmv: 7890, orders: 22 },
  { date: '04/26', gmv: 13400, orders: 41 },
  { date: '04/27', gmv: 9100, orders: 30 },
  { date: '04/28', gmv: 6200, orders: 19 },
  { date: '04/29', gmv: 5800, orders: 17 },
  { date: '04/30', gmv: 14200, orders: 44 },
  { date: '05/01', gmv: 12800, orders: 38 },
  { date: '05/02', gmv: 10500, orders: 33 },
  { date: '05/03', gmv: 9800, orders: 31 },
  { date: '05/04', gmv: 7200, orders: 23 },
  { date: '05/05', gmv: 6100, orders: 20 },
  { date: '05/06', gmv: 15600, orders: 49 },
  { date: '05/07', gmv: 18200, orders: 56 },
  { date: '05/08', gmv: 14700, orders: 46 },
  { date: '05/09', gmv: 11300, orders: 36 },
  { date: '05/10', gmv: 9600, orders: 30 },
  { date: '05/11', gmv: 8100, orders: 26 },
  { date: '05/12', gmv: 7400, orders: 24 },
  { date: '05/13', gmv: 16800, orders: 52 },
  { date: '05/14', gmv: 19400, orders: 60 },
  { date: '05/15', gmv: 13200, orders: 41 },
  { date: '05/16', gmv: 11700, orders: 37 },
  { date: '05/17', gmv: 10200, orders: 32 },
  { date: '05/18', gmv: 8900, orders: 28 },
  { date: '05/19', gmv: 7600, orders: 24 },
  { date: '05/20', gmv: 17300, orders: 53 },
  { date: '05/21', gmv: 21100, orders: 65 },
  { date: '05/22', gmv: 14832, orders: 47 },
];

export const conversionData = [
  { date: '04/23', rate: 3.2 },
  { date: '04/26', rate: 3.8 },
  { date: '04/30', rate: 4.1 },
  { date: '05/04', rate: 3.6 },
  { date: '05/07', rate: 4.4 },
  { date: '05/10', rate: 3.9 },
  { date: '05/13', rate: 4.7 },
  { date: '05/16', rate: 4.2 },
  { date: '05/19', rate: 3.5 },
  { date: '05/22', rate: 4.9 },
];

export const productCategoryData = [
  { category: 'Signature Bundle', revenue: 28400, orders: 151 },
  { category: 'Pro Plan Annual', revenue: 22700, orders: 76 },
  { category: 'Premium Membership', revenue: 18900, orders: 386 },
  { category: 'Growth Bundle', revenue: 16200, orders: 108 },
  { category: 'Deluxe Pack', revenue: 11400, orders: 92 },
  { category: 'Essential Plan', revenue: 8700, orders: 223 },
  { category: 'Starter Kit', revenue: 6300, orders: 93 },
];

export const affiliateLeaderboard = [
  { id: 'aff-cristian', name: 'Cristian Ruiz', code: 'ref_cristian_07', clicks: 4821, conversions: 312, convRate: 6.47, gmv: 38420, commission: 3842, status: 'active' },
  { id: 'aff-amara', name: 'Amara Osei', code: 'ref_amara_12', clicks: 3204, conversions: 198, convRate: 6.18, gmv: 24600, commission: 2460, status: 'active' },
  { id: 'aff-leo', name: 'Leo Martins', code: 'ref_leo_03', clicks: 2877, conversions: 145, convRate: 5.04, gmv: 17800, commission: 1780, status: 'active' },
  { id: 'aff-nina', name: 'Nina Vasquez', code: 'ref_nina_21', clicks: 1932, conversions: 89, convRate: 4.61, gmv: 10900, commission: 1090, status: 'active' },
  { id: 'aff-theo', name: 'Theo Bergmann', code: 'ref_theo_08', clicks: 1420, conversions: 54, convRate: 3.80, gmv: 6600, commission: 660, status: 'paused' },
  { id: 'aff-zara', name: 'Zara Okonkwo', code: 'ref_zara_15', clicks: 988, conversions: 31, convRate: 3.14, gmv: 3800, commission: 380, status: 'active' },
];

export const emailCampaigns = [
  { id: 'em-001', name: 'May Flash Sale — 24h Offer', type: 'broadcast', sent: 8420, delivered: 8310, opened: 4012, clicked: 892, unsubscribed: 14, status: 'sent' },
  { id: 'em-002', name: 'Abandoned Cart Recovery — Seq 1', type: 'automation', sent: 1204, delivered: 1196, opened: 712, clicked: 289, unsubscribed: 3, status: 'live' },
  { id: 'em-003', name: 'Post-Purchase Follow-Up', type: 'automation', sent: 3841, delivered: 3809, opened: 2104, clicked: 634, unsubscribed: 22, status: 'live' },
  { id: 'em-004', name: 'Affiliate Welcome Sequence', type: 'automation', sent: 312, delivered: 310, opened: 228, clicked: 145, unsubscribed: 1, status: 'live' },
  { id: 'em-005', name: 'Subscription Renewal Reminder', type: 'transactional', sent: 542, delivered: 541, opened: 398, clicked: 201, unsubscribed: 0, status: 'live' },
  { id: 'em-006', name: 'Re-engagement — 60 Day Inactive', type: 'automation', sent: 2100, delivered: 2077, opened: 621, clicked: 98, unsubscribed: 41, status: 'paused' },
];

export const subscriptionHealth = [
  { month: 'Dec', mrr: 5200, churn: 2.1, newSubs: 28 },
  { month: 'Jan', mrr: 5800, churn: 1.9, newSubs: 34 },
  { month: 'Feb', mrr: 6400, churn: 2.4, newSubs: 31 },
  { month: 'Mar', mrr: 7100, churn: 1.7, newSubs: 42 },
  { month: 'Apr', mrr: 7800, churn: 2.0, newSubs: 38 },
  { month: 'May', mrr: 8420, churn: 1.8, newSubs: 29 },
];