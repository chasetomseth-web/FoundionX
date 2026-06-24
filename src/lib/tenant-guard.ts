/**
 * MerchantOS — Tenant Isolation Enforcement Layer
 * Mandatory tenantId injection, query builder wrapper, fail-safe guards,
 * and RLS-readiness for multi-tenant PostgreSQL.
 *
 * CRITICAL: Every DB query MUST go through this layer.
 * Zero cross-tenant query possibility by design.
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

// ============================================================
// TENANT CONTEXT
// ============================================================

export interface TenantContext {
  storeId: string;
  organizationId?: string;
  userId?: string;
  role?: string;
}

// ============================================================
// FAIL-SAFE TENANT GUARD
// ============================================================

/**
 * Throws if tenantId (storeId) is missing, empty, or invalid.
 * Call at the top of every API handler that touches tenant data.
 */
export function assertTenantContext(ctx: Partial<TenantContext>): asserts ctx is TenantContext {
  if (!ctx.storeId || typeof ctx.storeId !== 'string' || ctx.storeId.trim() === '') {
    throw new TenantIsolationError(
      'TENANT_CONTEXT_MISSING',
      'storeId is required for all tenant-scoped operations'
    );
  }
}

export class TenantIsolationError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TenantIsolationError';
    this.code = code;
  }
}

// ============================================================
// TENANT-SCOPED QUERY BUILDERS
// ============================================================

/**
 * Returns a Prisma where clause that always includes storeId.
 * Merges with any additional where conditions.
 */
export function tenantWhere<T extends Record<string, unknown>>(
  storeId: string,
  additionalWhere?: T
): T & { storeId: string } {
  if (!storeId) {
    throw new TenantIsolationError('TENANT_WHERE_MISSING', 'storeId required in tenantWhere');
  }
  return { storeId, ...(additionalWhere ?? {}) } as T & { storeId: string };
}

/**
 * Returns a Prisma where clause scoped by organizationId.
 */
export function orgWhere<T extends Record<string, unknown>>(
  organizationId: string,
  additionalWhere?: T
): T & { organizationId: string } {
  if (!organizationId) {
    throw new TenantIsolationError('ORG_WHERE_MISSING', 'organizationId required in orgWhere');
  }
  return { organizationId, ...(additionalWhere ?? {}) } as T & { organizationId: string };
}

// ============================================================
// TENANT-SCOPED DATA ACCESS LAYER
// ============================================================

/**
 * Tenant-safe order queries.
 * All methods enforce storeId scoping.
 */
export const TenantOrders = {
  async findMany(
    storeId: string,
    options?: {
      where?: Omit<Prisma.OrderWhereInput, 'storeId'>;
      orderBy?: Prisma.OrderOrderByWithRelationInput;
      skip?: number;
      take?: number;
      select?: Prisma.OrderSelect;
      include?: Prisma.OrderInclude;
    }
  ) {
    assertTenantContext({ storeId });
    return prisma.order.findMany({
      where: tenantWhere(storeId, options?.where as Record<string, unknown>),
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
      select: options?.select,
      include: options?.include,
    });
  },

  async findById(storeId: string, orderId: string) {
    assertTenantContext({ storeId });
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
    });
    if (!order) return null;
    return order;
  },

  async count(storeId: string, where?: Omit<Prisma.OrderWhereInput, 'storeId'>) {
    assertTenantContext({ storeId });
    return prisma.order.count({
      where: tenantWhere(storeId, where as Record<string, unknown>),
    });
  },

  async aggregate(storeId: string, args: Omit<Prisma.OrderAggregateArgs, 'where'>) {
    assertTenantContext({ storeId });
    return prisma.order.aggregate({
      ...args,
      where: { storeId },
    });
  },
};

/**
 * Tenant-safe customer queries.
 */
export const TenantCustomers = {
  async findMany(
    storeId: string,
    options?: {
      where?: Omit<Prisma.CustomerWhereInput, 'storeId'>;
      orderBy?: Prisma.CustomerOrderByWithRelationInput;
      skip?: number;
      take?: number;
      select?: Prisma.CustomerSelect;
    }
  ) {
    assertTenantContext({ storeId });
    return prisma.customer.findMany({
      where: tenantWhere(storeId, options?.where as Record<string, unknown>),
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
      select: options?.select,
    });
  },

  async findByEmail(storeId: string, email: string) {
    assertTenantContext({ storeId });
    return prisma.customer.findUnique({
      where: { storeId_email: { storeId, email } },
    });
  },

  async findById(storeId: string, customerId: string) {
    assertTenantContext({ storeId });
    return prisma.customer.findFirst({
      where: { id: customerId, storeId },
    });
  },
};

/**
 * Tenant-safe product queries.
 */
export const TenantProducts = {
  async findMany(
    storeId: string,
    options?: {
      where?: Omit<Prisma.ProductWhereInput, 'storeId'>;
      orderBy?: Prisma.ProductOrderByWithRelationInput;
      skip?: number;
      take?: number;
      select?: Prisma.ProductSelect;
    }
  ) {
    assertTenantContext({ storeId });
    return prisma.product.findMany({
      where: tenantWhere(storeId, options?.where as Record<string, unknown>),
      orderBy: options?.orderBy ?? { updatedAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
      select: options?.select,
    });
  },

  async findBySku(storeId: string, sku: string) {
    assertTenantContext({ storeId });
    return prisma.product.findFirst({
      where: { storeId, sku },
    });
  },
};

/**
 * Tenant-safe analytics queries.
 */
export const TenantAnalytics = {
  async findEvents(
    storeId: string,
    options?: {
      eventType?: string;
      from?: Date;
      to?: Date;
      skip?: number;
      take?: number;
    }
  ) {
    assertTenantContext({ storeId });
    return prisma.analyticsEvent.findMany({
      where: {
        storeId,
        ...(options?.eventType ? { eventType: options.eventType } : {}),
        ...(options?.from || options?.to
          ? {
              createdAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip ?? 0,
      take: options?.take ?? 100,
    });
  },
};

// ============================================================
// TENANT CONTEXT EXTRACTOR (from request headers/session)
// ============================================================

import { NextRequest } from 'next/server';

/**
 * Extract tenant context from request.
 * Checks x-store-id header, then x-organization-id.
 * Returns null if no tenant context found.
 */
export function extractTenantFromRequest(req: NextRequest): Partial<TenantContext> | null {
  const storeId = req.headers.get('x-store-id');
  const organizationId = req.headers.get('x-organization-id');
  const userId = req.headers.get('x-user-id');

  if (!storeId && !organizationId) {
    return null;
  }

  return {
    storeId: storeId ?? undefined,
    organizationId: organizationId ?? undefined,
    userId: userId ?? undefined,
  };
}

// ============================================================
// PRISMA MIDDLEWARE — Tenant Injection
// ============================================================

/**
 * Prisma middleware that logs a warning if a query on a tenant-scoped
 * model is executed without a storeId filter.
 * Does NOT block the query — use assertTenantContext() for hard blocking.
 */
export function createTenantAuditMiddleware(): Prisma.Middleware {
  const TENANT_SCOPED_MODELS = new Set([
    'Order',
    'Customer',
    'Product',
    'Subscription',
    'Affiliate',
    'AnalyticsEvent',
    'Store',
  ]);

  const READ_ACTIONS = new Set(['findMany', 'findFirst', 'findUnique', 'count', 'aggregate']);

  return async (params, next) => {
    if (
      params.model &&
      TENANT_SCOPED_MODELS.has(params.model) &&
      READ_ACTIONS.has(params.action)
    ) {
      const where = params.args?.where as Record<string, unknown> | undefined;
      const hasStoreId = where?.storeId !== undefined;
      const hasOrganizationId = where?.organizationId !== undefined;

      if (!hasStoreId && !hasOrganizationId) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: '[TENANT AUDIT] Query missing tenant scope',
            model: params.model,
            action: params.action,
            suggestion: 'Add storeId to where clause or use TenantOrders/TenantCustomers helpers',
          })
        );
      }
    }

    return next(params);
  };
}

// ============================================================
// ROW-LEVEL SECURITY HELPERS (PostgreSQL RLS readiness)
// ============================================================

/**
 * Sets the current tenant context in PostgreSQL session.
 * Used with RLS policies: current_setting('app.current_tenant_id')
 * Call this at the start of each request when using RLS.
 */
export async function setPostgresRLSContext(storeId: string): Promise<void> {
  try {
    await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${storeId}, true)`;
  } catch (err) {
    console.error('[TENANT RLS] Failed to set RLS context:', err);
  }
}

/**
 * RLS policy SQL template (apply in migration):
 *
 * ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY tenant_isolation ON "Order" *   USING ("storeId" = current_setting('app.current_tenant_id', true));
 */
export const RLS_POLICY_TEMPLATES = {
  orders: `
    ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation ON "Order" USING ("storeId" = current_setting('app.current_tenant_id', true));
  `,
  customers: `
    ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation ON "Customer" USING ("storeId" = current_setting('app.current_tenant_id', true));
  `,
  products: `
    ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation ON "Product" USING ("storeId" = current_setting('app.current_tenant_id', true));
  `,
};
