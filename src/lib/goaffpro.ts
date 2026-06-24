/**
 * GoAffPro Service Layer
 * Uses the GoAffPro Admin API at https://api.goaffpro.com/v1/admin/
 * Authentication: X-GOAFFPRO-ACCESS-TOKEN header
 */

const GOAFFPRO_API_BASE = 'https://api.goaffpro.com/v1';

export interface GoAffProConfig {
  accessToken: string;
  publicToken?: string;
  storeId?: string;
}

export interface GoAffProAffiliate {
  id: number;
  name: string;
  email: string;
  ref_code: string;
  status: string;
  commission_rate: number;
  total_earnings: number;
  total_paid: number;
  pending_balance: number;
  total_referrals: number;
  total_conversions: number;
  created_at: string;
  clicks?: number;
  tier?: string;
  paypal_email?: string;
  recurring_commission?: boolean;
}

export interface GoAffProCommission {
  id: number;
  affiliate_id: number;
  order_id: string;
  amount: number;
  rate: number;
  order_total: number;
  type: string;
  status: string;
  created_at: string;
}

export interface GoAffProPayout {
  id: number;
  affiliate_id: number;
  amount: number;
  method: string;
  status: string;
  reference: string;
  created_at: string;
}

export interface GoAffProOrder {
  id: number;
  affiliate_id: number;
  order_id: string;
  commission: number;
  order_total: number;
  status: string;
  created_at: string;
}

class GoAffProService {
  private getConfig(): GoAffProConfig {
    return {
      accessToken: process.env.GOAFFPRO_ACCESS_TOKEN ?? '',
      publicToken: process.env.GOAFFPRO_PUBLIC_TOKEN ?? '',
    };
  }

  private async request<T>(
    config: GoAffProConfig,
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${GOAFFPRO_API_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'X-GOAFFPRO-ACCESS-TOKEN': config.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`GoAffPro API error ${res.status}: ${error}`);
    }

    return res.json();
  }

  // ============================================================
  // AFFILIATES — /admin/affiliates
  // ============================================================

  async getAffiliates(
    config: GoAffProConfig,
    page = 1,
    limit = 50
  ): Promise<{ affiliates: GoAffProAffiliate[]; total: number }> {
    const offset = (page - 1) * limit;
    return this.request(config, 'GET', `/admin/affiliates?limit=${limit}&offset=${offset}&fields=id,name,email,ref_code,status,commission_rate,total_earnings,total_paid,pending_balance,total_referrals,total_conversions,created_at,clicks,tier,paypal_email,recurring_commission`);
  }

  async getAffiliate(config: GoAffProConfig, affiliateId: number): Promise<GoAffProAffiliate> {
    return this.request(config, 'GET', `/admin/affiliates/${affiliateId}`);
  }

  async approveAffiliate(config: GoAffProConfig, affiliateId: number): Promise<GoAffProAffiliate> {
    return this.request(config, 'PATCH', `/admin/affiliates/${affiliateId}`, { status: 'approved' });
  }

  async suspendAffiliate(config: GoAffProConfig, affiliateId: number): Promise<GoAffProAffiliate> {
    return this.request(config, 'PATCH', `/admin/affiliates/${affiliateId}`, { status: 'suspended' });
  }

  async updateAffiliateCommission(
    config: GoAffProConfig,
    affiliateId: number,
    commissionRate: number
  ): Promise<GoAffProAffiliate> {
    return this.request(config, 'PATCH', `/admin/affiliates/${affiliateId}`, {
      commission_rate: commissionRate,
    });
  }

  // ============================================================
  // ORDERS (commissions) — /admin/orders
  // ============================================================

  async getOrders(
    config: GoAffProConfig,
    filters?: { affiliateId?: number; status?: string; page?: number; limit?: number }
  ): Promise<{ orders: GoAffProOrder[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.affiliateId) params.set('affiliate_id', String(filters.affiliateId));
    if (filters?.status) params.set('status', filters.status);
    const limit = filters?.limit ?? 50;
    const offset = ((filters?.page ?? 1) - 1) * limit;
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return this.request(config, 'GET', `/admin/orders?${params.toString()}`);
  }

  // ============================================================
  // PAYMENTS (payouts) — /admin/payments
  // ============================================================

  async getPayments(
    config: GoAffProConfig,
    affiliateId?: number
  ): Promise<{ payments: GoAffProPayout[] }> {
    const params = affiliateId ? `?affiliate_id=${affiliateId}` : '';
    return this.request(config, 'GET', `/admin/payments${params}`);
  }

  async createPayment(
    config: GoAffProConfig,
    affiliateId: number,
    amount: number,
    method: string
  ): Promise<GoAffProPayout> {
    return this.request(config, 'POST', '/admin/payments', {
      affiliate_id: affiliateId,
      amount,
      method,
    });
  }

  async createProduct(
    config: GoAffProConfig,
    product: {
      name: string;
      description?: string;
      price?: number;
      sku?: string;
      url?: string;
    }
  ): Promise<unknown> {
    return this.request(config, 'POST', '/admin/products', {
      name: product.name,
      description: product.description,
      price: product.price,
      sku: product.sku,
      product_url: product.url,
    });
  }

  // ============================================================
  // LIVE DATA FETCH — direct from GoAffPro, no DB required
  // ============================================================

  async getLiveAffiliates(
    page = 1,
    limit = 25,
    search?: string
  ): Promise<{ affiliates: GoAffProAffiliate[]; total: number }> {
    const cfg = this.getConfig();
    if (!cfg.accessToken || cfg.accessToken.startsWith('your-')) {
      return { affiliates: [], total: 0 };
    }
    try {
      const result = await this.getAffiliates(cfg, page, limit);
      let affiliates = result.affiliates ?? [];
      if (search) {
        const q = search.toLowerCase();
        affiliates = affiliates.filter(
          (a) =>
            a.name?.toLowerCase().includes(q) ||
            a.email?.toLowerCase().includes(q) ||
            a.ref_code?.toLowerCase().includes(q)
        );
      }
      return { affiliates, total: result.total ?? affiliates.length };
    } catch (err) {
      console.error('[GoAffPro] getLiveAffiliates error:', err);
      return { affiliates: [], total: 0 };
    }
  }

  async getLiveOrders(
    page = 1,
    limit = 25
  ): Promise<{ orders: GoAffProOrder[]; total: number }> {
    const cfg = this.getConfig();
    if (!cfg.accessToken || cfg.accessToken.startsWith('your-')) {
      return { orders: [], total: 0 };
    }
    try {
      return await this.getOrders(cfg, { page, limit });
    } catch (err) {
      console.error('[GoAffPro] getLiveOrders error:', err);
      return { orders: [], total: 0 };
    }
  }

  async getLivePayments(affiliateId?: number): Promise<GoAffProPayout[]> {
    const cfg = this.getConfig();
    if (!cfg.accessToken || cfg.accessToken.startsWith('your-')) {
      return [];
    }
    try {
      const result = await this.getPayments(cfg, affiliateId);
      return result.payments ?? [];
    } catch (err) {
      console.error('[GoAffPro] getLivePayments error:', err);
      return [];
    }
  }

  // ============================================================
  // SDK INJECTION
  // ============================================================

  generateSdkScript(storeId: string, publicToken: string): string {
    return `
<!-- GoAffPro Tracking SDK - MerchantOS Managed -->
<script>
(function(g,o,a,f,p,r,o2){
  g['GoAffProObject']=f;g[f]=g[f]||function(){
  (g[f].q=g[f].q||[]).push(arguments)},g[f].l=1*new Date();
  r=o.createElement(a),o2=o.getElementsByTagName(a)[0];
  r.async=1;r.src=p;o2.parentNode.insertBefore(r,o2)
})(window,document,'script','goaffpro','https://api.goaffpro.com/loader.js?shop=${storeId}');
goaffpro('init', '${publicToken}');
</script>
<!-- End GoAffPro Tracking SDK -->`.trim();
  }

  // ============================================================
  // SYNC: Pull all affiliates from GoAffPro into local DB
  // ============================================================

  async syncAffiliatesFromGoAffPro(
    config: GoAffProConfig,
    storeId: string
  ): Promise<{ synced: number; errors: number }> {
    const { prisma } = await import('@/lib/prisma');
    let synced = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const { affiliates, total } = await this.getAffiliates(config, page, 50);

        for (const aff of affiliates) {
          try {
            await prisma.affiliate.upsert({
              where: { goaffproAffiliateId: String(aff.id) },
              create: {
                storeId,
                email: aff.email,
                name: aff.name,
                goaffproAffiliateId: String(aff.id),
                referralCode: aff.ref_code,
                status: aff.status === 'approved' ? 'active' : aff.status,
                commissionRate: aff.commission_rate / 100,
                totalEarned: aff.total_earnings,
                totalPaid: aff.total_paid,
                pendingBalance: aff.pending_balance,
                totalReferrals: aff.total_referrals,
                totalConversions: aff.total_conversions,
              },
              update: {
                status: aff.status === 'approved' ? 'active' : aff.status,
                commissionRate: aff.commission_rate / 100,
                totalEarned: aff.total_earnings,
                totalPaid: aff.total_paid,
                pendingBalance: aff.pending_balance,
                totalReferrals: aff.total_referrals,
                totalConversions: aff.total_conversions,
              },
            });
            synced++;
          } catch {
            errors++;
          }
        }

        hasMore = page * 50 < total;
        page++;
      } catch {
        hasMore = false;
        errors++;
      }
    }

    return { synced, errors };
  }
}

export const goaffproService = new GoAffProService();
