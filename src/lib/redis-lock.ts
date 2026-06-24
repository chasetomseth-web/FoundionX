/**
 * Redis Lock Manager + Cache Invalidation Engine
 * Tenant-scoped, tag-based cache busting with stale-while-revalidate support
 */

import { createClient, RedisClientType } from 'redis';

// ============================================================
// REDIS CLIENT SINGLETON
// ============================================================

let redisClient: RedisClientType | null = null;

function getRedis(): RedisClientType | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    redisClient.on('error', (err) => {
      console.error('[REDIS] Client error:', err);
    });
    redisClient.connect().catch((err) => {
      console.error('[REDIS] Connection failed:', err);
    });
  }
  return redisClient;
}

// ============================================================
// REDIS LOCK MANAGER
// ============================================================

const LOCK_TTL_MS = 30_000; // 30 seconds default lock TTL

/**
 * Acquire a distributed Redis lock.
 * Returns true if lock acquired, false if already held.
 */
export async function acquireLock(
  key: string,
  ttlMs: number = LOCK_TTL_MS
): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    const lockKey = `lock:${key}`;
    const result = await redis.set(lockKey, '1', {
      NX: true,
      PX: ttlMs,
    });
    return result === 'OK';
  } catch (err) {
    console.error('[REDIS LOCK] acquireLock failed:', err);
    return false; // fail open — don't block processing on Redis failure
  }
}

/**
 * Release a distributed Redis lock.
 */
export async function releaseLock(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(`lock:${key}`);
  } catch (err) {
    console.error('[REDIS LOCK] releaseLock failed:', err);
  }
}

/**
 * Check if a lock is currently held.
 */
export async function isLocked(key: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    const val = await redis.get(`lock:${key}`);
    return val !== null;
  } catch {
    return false;
  }
}

/**
 * Idempotency check: mark an event as seen.
 * Returns true if this is the FIRST time we've seen this eventId.
 */
export async function markEventSeen(
  eventId: string,
  ttlSeconds: number = 86400 // 24h
): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return true;
    const key = `idempotency:${eventId}`;
    const result = await redis.set(key, '1', { NX: true, EX: ttlSeconds });
    return result === 'OK';
  } catch (err) {
    console.error('[REDIS] markEventSeen failed:', err);
    return true; // fail open
  }
}

// ============================================================
// CACHE KEY BUILDERS (tenant-scoped)
// ============================================================

export const CacheKeys = {
  orders: (tenantId: string) => `tenant:${tenantId}:orders`,
  products: (tenantId: string) => `tenant:${tenantId}:products`,
  customers: (tenantId: string) => `tenant:${tenantId}:customers`,
  subscriptions: (tenantId: string) => `tenant:${tenantId}:subscriptions`,
  affiliates: (tenantId: string) => `tenant:${tenantId}:affiliates`,
  analytics: (tenantId: string) => `tenant:${tenantId}:analytics`,
  storefront: (tenantId: string, storeId: string) => `tenant:${tenantId}:storefront:${storeId}`,
  dashboardKpis: (tenantId: string) => `tenant:${tenantId}:dashboard:kpis`,
  mrrMetrics: (tenantId: string) => `tenant:${tenantId}:mrr`,
  affiliateDashboard: (tenantId: string) => `tenant:${tenantId}:affiliate:dashboard`,
  campaignAnalytics: (tenantId: string) => `tenant:${tenantId}:campaigns:analytics`,
};

// Tag-based cache groups
export const CacheTags = {
  orders: (tenantId: string) => `tag:${tenantId}:orders`,
  revenue: (tenantId: string) => `tag:${tenantId}:revenue`,
  subscriptions: (tenantId: string) => `tag:${tenantId}:subscriptions`,
  affiliates: (tenantId: string) => `tag:${tenantId}:affiliates`,
  analytics: (tenantId: string) => `tag:${tenantId}:analytics`,
  campaigns: (tenantId: string) => `tag:${tenantId}:campaigns`,
};

// ============================================================
// CACHE SET / GET
// ============================================================

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 60
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error('[CACHE] cacheSet failed:', err);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const val = await redis.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch (err) {
    console.error('[CACHE] cacheGet failed:', err);
    return null;
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(key);
  } catch (err) {
    console.error('[CACHE] cacheDel failed:', err);
  }
}

// ============================================================
// TAG-BASED CACHE INVALIDATION
// ============================================================

/**
 * Register a cache key under a tag for bulk invalidation.
 */
export async function tagCacheKey(tag: string, key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.sAdd(tag, key);
    await redis.expire(tag, 3600); // tag set expires in 1h
  } catch (err) {
    console.error('[CACHE] tagCacheKey failed:', err);
  }
}

/**
 * Invalidate all cache keys associated with a tag.
 */
export async function invalidateByTag(tag: string): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;
    const keys = await redis.sMembers(tag);
    if (keys.length === 0) return 0;

    const pipeline = redis.multi();
    for (const key of keys) {
      pipeline.del(key);
    }
    pipeline.del(tag);
    await pipeline.exec();
    return keys.length;
  } catch (err) {
    console.error('[CACHE] invalidateByTag failed:', err);
    return 0;
  }
}

/**
 * Invalidate multiple tags at once.
 */
export async function invalidateTags(tags: string[]): Promise<void> {
  await Promise.all(tags.map((t) => invalidateByTag(t)));
}

// ============================================================
// EVENT-DRIVEN CACHE INVALIDATION RULES
// ============================================================

/**
 * Stripe event → cache invalidation mapping.
 * Call this after processing any Stripe webhook.
 */
export async function invalidateOnStripeEvent(
  eventType: string,
  tenantId: string
): Promise<void> {
  const tagsToInvalidate: string[] = [];

  switch (eventType) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded':
      tagsToInvalidate.push(
        CacheTags.orders(tenantId),
        CacheTags.revenue(tenantId),
        CacheTags.analytics(tenantId)
      );
      await cacheDel(CacheKeys.dashboardKpis(tenantId));
      await cacheDel(CacheKeys.orders(tenantId));
      await cacheDel(CacheKeys.analytics(tenantId));
      break;

    case 'charge.refunded':
      tagsToInvalidate.push(CacheTags.orders(tenantId), CacheTags.revenue(tenantId));
      await cacheDel(CacheKeys.orders(tenantId));
      await cacheDel(CacheKeys.dashboardKpis(tenantId));
      break;

    case 'customer.subscription.created': case'customer.subscription.updated': case'customer.subscription.deleted': case'invoice.paid': case'invoice.payment_failed':
      tagsToInvalidate.push(
        CacheTags.subscriptions(tenantId),
        CacheTags.revenue(tenantId),
        CacheTags.analytics(tenantId)
      );
      await cacheDel(CacheKeys.subscriptions(tenantId));
      await cacheDel(CacheKeys.mrrMetrics(tenantId));
      await cacheDel(CacheKeys.dashboardKpis(tenantId));
      break;

    default:
      break;
  }

  if (tagsToInvalidate.length > 0) {
    await invalidateTags(tagsToInvalidate);
  }
}

/**
 * GoAffPro event → cache invalidation mapping.
 */
export async function invalidateOnGoAffProEvent(
  eventType: string,
  tenantId: string
): Promise<void> {
  switch (eventType) {
    case 'commission.created':
      await invalidateTags([CacheTags.affiliates(tenantId), CacheTags.analytics(tenantId)]);
      await cacheDel(CacheKeys.affiliates(tenantId));
      await cacheDel(CacheKeys.affiliateDashboard(tenantId));
      break;

    case 'payout.completed':
      await invalidateTags([CacheTags.affiliates(tenantId)]);
      await cacheDel(CacheKeys.affiliateDashboard(tenantId));
      break;

    default:
      break;
  }
}

/**
 * Brevo event → cache invalidation mapping.
 */
export async function invalidateOnBrevoEvent(
  eventType: string,
  tenantId: string
): Promise<void> {
  switch (eventType) {
    case 'opened': case'click': case'unsubscribed': case'bounced': case'hard_bounce':
      await invalidateTags([CacheTags.campaigns(tenantId)]);
      await cacheDel(CacheKeys.campaignAnalytics(tenantId));
      break;

    default:
      break;
  }
}

// ============================================================
// CACHE WARM-UP
// ============================================================

/**
 * Warm up critical caches for a tenant after invalidation.
 * Schedules background re-population.
 */
export async function scheduleCacheWarmup(tenantId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.lPush('cache:warmup:queue', tenantId);
  } catch (err) {
    console.error('[CACHE] scheduleCacheWarmup failed:', err);
  }
}

// ============================================================
// FORCE INVALIDATION (admin tool)
// ============================================================

/**
 * Force-invalidate ALL cache keys for a tenant.
 */
export async function forceInvalidateTenant(tenantId: string): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;
    const pattern = `tenant:${tenantId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    const pipeline = redis.multi();
    for (const key of keys) {
      pipeline.del(key);
    }
    await pipeline.exec();
    return keys.length;
  } catch (err) {
    console.error('[CACHE] forceInvalidateTenant failed:', err);
    return 0;
  }
}

export { getRedis };
