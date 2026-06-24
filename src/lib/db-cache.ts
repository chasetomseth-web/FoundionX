/**
 * MerchantOS — Cache-Aware Database Access Layer
 * Redis read-through cache with tag-based invalidation.
 * Flow: Redis check → DB query on miss → cache result → return
 */

import { cacheGet, cacheSet, cacheDel, tagCacheKey, CacheKeys, CacheTags } from './redis-lock';
import { prisma } from './prisma';
import { assertTenantContext } from './tenant-guard';
import { enforcePagination, orderListSelect, customerListSelect, productListSelect } from './db-middleware';

// ============================================================
// CACHE TTL CONSTANTS (seconds)
// ============================================================

const TTL = {
  ORDERS_LIST: 30,          // 30s — high write frequency
  ORDER_DETAIL: 60,         // 1min
  CUSTOMERS_LIST: 60,       // 1min
  CUSTOMER_DETAIL: 120,     // 2min
  PRODUCTS_LIST: 300,       // 5min — lower write frequency
  PRODUCT_DETAIL: 600,      // 10min
  ANALYTICS_KPI: 120,       // 2min — pre-aggregated
  ANALYTICS_EVENTS: 60,     // 1min
  SUBSCRIPTIONS: 120,       // 2min
  AFFILIATES: 180,          // 3min
  DASHBOARD_KPI: 60,        // 1min — critical path
  SEARCH_RESULTS: 30,       // 30s
  MRR: 300,                 // 5min
} as const;

// ============================================================
// GENERIC READ-THROUGH CACHE
// ============================================================

/**
 * Read-through cache wrapper.
 * 1. Check Redis cache
 * 2. On miss: query DB
 * 3. Store in cache with TTL
 * 4. Return result
 */
export async function cachedQuery<T>(
  cacheKey: string,
  dbQuery: () => Promise<T>,
  ttlSeconds: number,
  tags?: string[]
): Promise<T> {
  // Step 1: Check cache
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Step 2: DB query on cache miss
  const result = await dbQuery();

  // Step 3: Store in cache
  await cacheSet(cacheKey, result, ttlSeconds);

  // Step 4: Register cache key under tags for bulk invalidation
  if (tags && tags.length > 0) {
    await Promise.all(tags.map((tag) => tagCacheKey(tag, cacheKey)));
  }

  return result;
}

// ============================================================
// ORDERS — Cached Access
// ============================================================

export interface OrdersListParams {
  storeId: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  pageSize?: number;
}

export async function getCachedOrders(params: OrdersListParams) {
  assertTenantContext({ storeId: params.storeId });

  const { skip, take, page, pageSize } = enforcePagination({
    page: params.page,
    pageSize: params.pageSize,
    maxPageSize: 100,
  });

  const cacheKey = `${CacheKeys.orders(params.storeId)}:${params.status ?? 'all'}:${params.paymentStatus ?? 'all'}:p${page}:s${pageSize}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.order.findMany({
        where: {
          storeId: params.storeId,
          ...(params.status ? { status: params.status } : {}),
          ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
        },
        select: orderListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    TTL.ORDERS_LIST,
    [CacheTags.orders(params.storeId)]
  );
}

export async function getCachedOrderById(storeId: string, orderId: string) {
  assertTenantContext({ storeId });
  const cacheKey = `${CacheKeys.orders(storeId)}:detail:${orderId}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.order.findFirst({
        where: { id: orderId, storeId },
        include: {
          items: true,
          customer: { select: { id: true, name: true, email: true } },
          transactions: true,
          refunds: true,
        },
      }),
    TTL.ORDER_DETAIL,
    [CacheTags.orders(storeId)]
  );
}

export async function invalidateOrderCache(storeId: string, orderId?: string): Promise<void> {
  await cacheDel(CacheKeys.orders(storeId));
  if (orderId) {
    await cacheDel(`${CacheKeys.orders(storeId)}:detail:${orderId}`);
  }
}

// ============================================================
// CUSTOMERS — Cached Access
// ============================================================

export interface CustomersListParams {
  storeId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function getCachedCustomers(params: CustomersListParams) {
  assertTenantContext({ storeId: params.storeId });

  const { skip, take, page, pageSize } = enforcePagination({
    page: params.page,
    pageSize: params.pageSize,
    maxPageSize: 100,
  });

  const cacheKey = `${CacheKeys.customers(params.storeId)}:${params.status ?? 'all'}:p${page}:s${pageSize}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.customer.findMany({
        where: {
          storeId: params.storeId,
          ...(params.status ? { status: params.status } : {}),
        },
        select: customerListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    TTL.CUSTOMERS_LIST,
    [CacheTags.orders(params.storeId)]
  );
}

export async function getCachedCustomerById(storeId: string, customerId: string) {
  assertTenantContext({ storeId });
  const cacheKey = `${CacheKeys.customers(storeId)}:detail:${customerId}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.customer.findFirst({
        where: { id: customerId, storeId },
        include: {
          orders: {
            select: orderListSelect,
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          subscriptions: {
            select: { id: true, status: true, planName: true, amount: true, createdAt: true },
            take: 5,
          },
        },
      }),
    TTL.CUSTOMER_DETAIL,
    [CacheTags.orders(storeId)]
  );
}

// ============================================================
// PRODUCTS — Cached Access
// ============================================================

export interface ProductsListParams {
  storeId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function getCachedProducts(params: ProductsListParams) {
  assertTenantContext({ storeId: params.storeId });

  const { skip, take, page, pageSize } = enforcePagination({
    page: params.page,
    pageSize: params.pageSize,
    maxPageSize: 100,
  });

  const cacheKey = `${CacheKeys.products(params.storeId)}:${params.status ?? 'all'}:p${page}:s${pageSize}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.product.findMany({
        where: {
          storeId: params.storeId,
          ...(params.status ? { status: params.status } : {}),
        },
        select: productListSelect,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    TTL.PRODUCTS_LIST,
    [CacheTags.orders(params.storeId)]
  );
}

// ============================================================
// ANALYTICS KPI SNAPSHOT — Cached
// ============================================================

export interface AnalyticsKPISnapshot {
  revenue: {
    today: number;
    last7d: number;
    last30d: number;
    mtd: number;
  };
  orders: {
    today: number;
    last7d: number;
    last30d: number;
  };
  customers: {
    total: number;
    new30d: number;
    active: number;
  };
  avgOrderValue: number;
  conversionRate: number;
  generatedAt: string;
}

export async function getCachedAnalyticsKPI(storeId: string): Promise<AnalyticsKPISnapshot> {
  assertTenantContext({ storeId });
  const cacheKey = CacheKeys.dashboardKpis(storeId);

  return cachedQuery(
    cacheKey,
    async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [revenueToday, revenue7d, revenue30d, revenueMtd, ordersToday, orders7d, orders30d, customerStats] =
        await Promise.all([
          prisma.order.aggregate({
            where: { storeId, paymentStatus: 'paid', createdAt: { gte: todayStart } },
            _sum: { total: true },
          }),
          prisma.order.aggregate({
            where: { storeId, paymentStatus: 'paid', createdAt: { gte: last7d } },
            _sum: { total: true },
            _count: true,
          }),
          prisma.order.aggregate({
            where: { storeId, paymentStatus: 'paid', createdAt: { gte: last30d } },
            _sum: { total: true },
            _count: true,
          }),
          prisma.order.aggregate({
            where: { storeId, paymentStatus: 'paid', createdAt: { gte: mtdStart } },
            _sum: { total: true },
          }),
          prisma.order.count({ where: { storeId, createdAt: { gte: todayStart } } }),
          prisma.order.count({ where: { storeId, createdAt: { gte: last7d } } }),
          prisma.order.count({ where: { storeId, createdAt: { gte: last30d } } }),
          prisma.customer.aggregate({
            where: { storeId },
            _count: true,
          }),
        ]);

      const newCustomers30d = await prisma.customer.count({
        where: { storeId, createdAt: { gte: last30d } },
      });

      const activeCustomers = await prisma.customer.count({
        where: { storeId, status: 'active' },
      });

      const totalOrders30d = orders30d;
      const totalRevenue30d = Number(revenue30d._sum.total ?? 0);
      const avgOrderValue = totalOrders30d > 0 ? totalRevenue30d / totalOrders30d : 0;

      return {
        revenue: {
          today: Number(revenueToday._sum.total ?? 0),
          last7d: Number(revenue7d._sum.total ?? 0),
          last30d: totalRevenue30d,
          mtd: Number(revenueMtd._sum.total ?? 0),
        },
        orders: {
          today: ordersToday,
          last7d: orders7d,
          last30d: totalOrders30d,
        },
        customers: {
          total: customerStats._count,
          new30d: newCustomers30d,
          active: activeCustomers,
        },
        avgOrderValue,
        conversionRate: 0, // populated from mv_conversion_rates
        generatedAt: new Date().toISOString(),
      } satisfies AnalyticsKPISnapshot;
    },
    TTL.DASHBOARD_KPI,
    [CacheTags.analytics(storeId), CacheTags.revenue(storeId)]
  );
}

// ============================================================
// SUBSCRIPTIONS — Cached Access
// ============================================================

export async function getCachedSubscriptions(storeId: string, page = 1, pageSize = 20) {
  assertTenantContext({ storeId });
  const { skip, take } = enforcePagination({ page, pageSize });
  const cacheKey = `${CacheKeys.subscriptions(storeId)}:p${page}:s${pageSize}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.subscription.findMany({
        where: { storeId },
        select: {
          id: true,
          status: true,
          planName: true,
          amount: true,
          currency: true,
          interval: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
          customerId: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    TTL.SUBSCRIPTIONS,
    [CacheTags.subscriptions(storeId)]
  );
}

// ============================================================
// AFFILIATES — Cached Access
// ============================================================

export async function getCachedAffiliates(storeId: string, page = 1, pageSize = 20) {
  assertTenantContext({ storeId });
  const { skip, take } = enforcePagination({ page, pageSize });
  const cacheKey = `${CacheKeys.affiliates(storeId)}:p${page}:s${pageSize}`;

  return cachedQuery(
    cacheKey,
    () =>
      prisma.affiliate.findMany({
        where: { storeId },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          tier: true,
          totalEarned: true,
          pendingBalance: true,
          totalConversions: true,
          referralCode: true,
          joinedAt: true,
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take,
      }),
    TTL.AFFILIATES,
    [CacheTags.affiliates(storeId)]
  );
}

// ============================================================
// FULL-TEXT SEARCH — Cached
// ============================================================

export interface SearchResults {
  orders: Array<{ id: string; orderNumber: string; storeId: string }>;
  customers: Array<{ id: string; name: string | null; email: string; storeId: string }>;
  products: Array<{ id: string; name: string; sku: string | null; storeId: string }>;
  totalResults: number;
  query: string;
  cachedAt: string;
}

export async function cachedFullTextSearch(
  storeId: string,
  query: string,
  limit = 5
): Promise<SearchResults> {
  assertTenantContext({ storeId });

  const sanitizedQuery = query.trim().replace(/[^a-zA-Z0-9\s\-_@.]/g, '').substring(0, 100);
  if (!sanitizedQuery) {
    return { orders: [], customers: [], products: [], totalResults: 0, query, cachedAt: new Date().toISOString() };
  }

  const cacheKey = `tenant:${storeId}:search:${Buffer.from(sanitizedQuery).toString('base64').substring(0, 32)}`;

  return cachedQuery(
    cacheKey,
    async () => {
      const tsQuery = sanitizedQuery.split(/\s+/).join(' & ');

      const [orders, customers, products] = await Promise.all([
        // Orders: search by order number
        prisma.$queryRaw<Array<{ id: string; orderNumber: string; storeId: string }>>`
          SELECT id, "orderNumber", "storeId" FROM"Order" WHERE"storeId" = ${storeId}
            AND (
              "orderNumber" ILIKE ${'%' + sanitizedQuery + '%'}
              OR search_vector @@ to_tsquery('english', ${tsQuery})
            )
          LIMIT ${limit}
        `,

        // Customers: search by name + email using ts_vector
        prisma.$queryRaw<Array<{ id: string; name: string | null; email: string; storeId: string }>>`
          SELECT id, name, email, "storeId" FROM"Customer" WHERE"storeId" = ${storeId}
            AND search_vector @@ to_tsquery('english', ${tsQuery})
          ORDER BY ts_rank(search_vector, to_tsquery('english', ${tsQuery})) DESC
          LIMIT ${limit}
        `,

        // Products: weighted search using ts_vector
        prisma.$queryRaw<Array<{ id: string; name: string; sku: string | null; storeId: string }>>`
          SELECT id, name, sku, "storeId" FROM"Product" WHERE"storeId" = ${storeId}
            AND search_vector @@ to_tsquery('english', ${tsQuery})
          ORDER BY ts_rank(search_vector, to_tsquery('english', ${tsQuery})) DESC
          LIMIT ${limit}
        `,
      ]);

      return {
        orders,
        customers,
        products,
        totalResults: orders.length + customers.length + products.length,
        query: sanitizedQuery,
        cachedAt: new Date().toISOString(),
      } satisfies SearchResults;
    },
    TTL.SEARCH_RESULTS
  );
}
