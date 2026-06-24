import { PrismaClient } from '@prisma/client';
import { createQueryPerformanceMiddleware } from './db-middleware';
import { createTenantAuditMiddleware } from './tenant-guard';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Attach query performance middleware (slow query detection, N+1 auditing)
  client.$use(createQueryPerformanceMiddleware());

  // Attach tenant audit middleware (warns on missing tenant scope)
  client.$use(createTenantAuditMiddleware());

  return client;
}

export const prisma = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
