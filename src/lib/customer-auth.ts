/**
 * Customer Authentication System
 *
 * Separate from merchant auth. Customers log in at /portal/login.
 * Uses email + password with session tokens stored in CustomerSession.
 */
import { prisma } from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a password using SHA-256 with a salt.
 * In production, use bcrypt or argon2. This uses SHA-256 for simplicity
 * given the Prisma Customer model already stores passwordHash as String?.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return { hash: `${salt}:${hash}`, salt };
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return hash === computedHash;
}

// ── Session Management ───────────────────────────────────────────────────────

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Create a customer session and return the token.
 */
export async function createCustomerSession(customerId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const token = generateSessionToken();

  await prisma.customerSession.create({
    data: {
      customerId,
      token,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });

  return token;
}

/**
 * Verify a session token. Returns the customer or null if invalid/expired.
 */
export async function verifyCustomerSession(token: string) {
  const session = await prisma.customerSession.findUnique({
    where: { token },
    include: { customer: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.customerSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.customer;
}

/**
 * Delete a customer session (logout).
 */
export async function deleteCustomerSession(token: string): Promise<void> {
  await prisma.customerSession.delete({ where: { token } }).catch(() => {});
}

/**
 * Delete all sessions for a customer (logout from all devices).
 */
export async function deleteAllCustomerSessions(customerId: string): Promise<void> {
  await prisma.customerSession.deleteMany({ where: { customerId } });
}

// ── Authentication Flow ──────────────────────────────────────────────────────

export type CustomerAuthResult = {
  success: boolean;
  customer?: {
    id: string;
    email: string;
    name: string | null;
    storeId: string;
    emailVerified: boolean;
  };
  token?: string;
  error?: string;
};

/**
 * Register a new customer account.
 */
export async function registerCustomer(params: {
  storeId: string;
  email: string;
  password: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<CustomerAuthResult> {
  // Check if customer already exists
  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: params.storeId, email: params.email } },
  });

  if (existing) {
    return { success: false, error: 'An account with this email already exists' };
  }

  const { hash } = hashPassword(params.password);

  const customer = await prisma.customer.create({
    data: {
      storeId: params.storeId,
      email: params.email,
      name: params.name ?? null,
      passwordHash: hash,
      status: 'active',
    },
  });

  const token = await createCustomerSession(customer.id, params.ipAddress, params.userAgent);

  return {
    success: true,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      storeId: customer.storeId,
      emailVerified: customer.emailVerified,
    },
    token,
  };
}

/**
 * Log in an existing customer.
 */
export async function loginCustomer(params: {
  storeId: string;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<CustomerAuthResult> {
  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: params.storeId, email: params.email } },
  });

  if (!customer) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!customer.passwordHash) {
    return { success: false, error: 'This account does not have a password set. Try signing in with a different method.' };
  }

  if (!verifyPassword(params.password, customer.passwordHash)) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (customer.status !== 'active') {
    return { success: false, error: 'This account has been deactivated' };
  }

  const token = await createCustomerSession(customer.id, params.ipAddress, params.userAgent);

  return {
    success: true,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      storeId: customer.storeId,
      emailVerified: customer.emailVerified,
    },
    token,
  };
}

/**
 * Get the authenticated customer from a request (checks cookie or header).
 */
export async function getCustomerFromRequest(req: NextRequest): Promise<{
  customer: NonNullable<Awaited<ReturnType<typeof verifyCustomerSession>>>;
} | null> {
  const token =
    req.cookies.get('customer_session')?.value ??
    req.headers.get('x-customer-token') ??
    undefined;

  if (!token) return null;

  const customer = await verifyCustomerSession(token);
  if (!customer) return null;

  return { customer };
}

/**
 * Set the customer session cookie on a response.
 */
export function setCustomerSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set('customer_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/**
 * Clear the customer session cookie on a response.
 */
export function clearCustomerSessionCookie(response: NextResponse): void {
  response.cookies.set('customer_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}