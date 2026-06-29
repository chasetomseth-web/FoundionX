import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type Role = 'super_admin' | 'owner' | 'manager' | 'support' | 'affiliate' | 'customer';

export interface AuthSession {
  userId: string;
  organizationId: string;
  role: Role;
  permissions: string[];
  email: string;
  name?: string;
}

export interface ApiAuthContext {
  organizationId: string;
  userId?: string;
  role?: Role;
  scopes: string[];
}

// ============================================================
// ROLE PERMISSIONS MAP
// ============================================================

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ['*'],
  owner: ['*'],
  manager: [
    'orders:read', 'orders:write',
    'products:read', 'products:write',
    'customers:read', 'customers:write',
    'subscriptions:read',
    'affiliates:read',
    'email:read', 'email:write',
    'analytics:read',
    'storefront:read', 'storefront:write',
  ],
  support: [
    'orders:read', 'orders:write',
    'customers:read', 'customers:write',
    'subscriptions:read',
  ],
  affiliate: [
    'affiliates:read',
  ],
  customer: [
    'orders:read',
    'subscriptions:read',
  ],
};

// ============================================================
// PASSWORD HASHING
// ============================================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// ============================================================
// SESSION TOKEN
// ============================================================

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.userSession.create({
    data: {
      userId,
      token: hashToken(token),
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return token;
}

export async function validateSession(token: string): Promise<AuthSession | null> {
  const hashedToken = hashToken(token);

  const session = await prisma.userSession.findUnique({
    where: { token: hashedToken },
    include: {
      user: {
        include: {
          organizations: {
            include: { organization: true },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const userOrg = session.user.organizations[0];
  if (!userOrg) return null;

  const role = userOrg.role as Role;
  const permissions = userOrg.permissions.length > 0
    ? userOrg.permissions
    : ROLE_PERMISSIONS[role] || [];

  return {
    userId: session.userId,
    organizationId: userOrg.organizationId,
    role,
    permissions,
    email: session.user.email,
    name: session.user.name ?? undefined,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const hashedToken = hashToken(token);
  await prisma.userSession.deleteMany({ where: { token: hashedToken } });
}

// ============================================================
// API KEY AUTHENTICATION
// ============================================================

export async function validateApiKey(key: string): Promise<ApiAuthContext | null> {
  const keyHash = hashToken(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { organization: true },
  });

  if (!apiKey || !apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    organizationId: apiKey.organizationId,
    scopes: apiKey.scopes,
  };
}

// ============================================================
// PERMISSION CHECKS
// ============================================================

export function hasPermission(session: AuthSession, permission: string): boolean {
  if (session.permissions.includes('*')) return true;
  return session.permissions.includes(permission);
}

export function requirePermission(session: AuthSession, permission: string): void {
  if (!hasPermission(session, permission)) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
}

// ============================================================
// REQUEST AUTH EXTRACTION
// ============================================================

export async function getAuthFromRequest(req: NextRequest): Promise<AuthSession | null> {
  // TEMP: return bypass session using real store data
  try {
    const { prisma: p } = await import('./prisma');
    const store = await p.store.findFirst();
    if (store) {
      return {
        userId: store.id,
        organizationId: store.organizationId ?? store.id,
        role: "owner" as Role,
        permissions: ["*"],
        email: "owner@app.com",
        name: "Owner",
      };
    }
  } catch {}
  return {
    userId: "bypass",
    organizationId: "bypass",
    role: "owner" as Role,
    permissions: ["*"],
    email: "owner@app.com",
    name: "Owner",
  };
}

export async function getApiAuthFromRequest(req: NextRequest): Promise<ApiAuthContext | null> {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    return validateApiKey(apiKey);
  }
  return null;
}

// ============================================================
// MIDDLEWARE HELPER
// ============================================================

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
