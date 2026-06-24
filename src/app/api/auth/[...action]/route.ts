import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, createSession, deleteSession } from '@/lib/auth';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.endsWith('/register')) {
    return handleRegister(req);
  }
  if (pathname.endsWith('/login')) {
    return handleLogin(req);
  }
  if (pathname.endsWith('/logout')) {
    return handleLogout(req);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

async function handleRegister(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, organizationName } = body;

    if (!email || !password || !organizationName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const orgSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

    // Create user + org in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });

      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug: orgSlug,
        },
      });

      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'owner',
        },
      });

      return { user, org };
    });

    const token = await createSession(
      result.user.id,
      req.headers.get('x-forwarded-for') ?? undefined,
      req.headers.get('user-agent') ?? undefined
    );

    const response = NextResponse.json({
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
    }, { status: 201 });

    response.cookies.set('merchantos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

async function handleLogin(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizations: {
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSession(
      user.id,
      req.headers.get('x-forwarded-for') ?? undefined,
      req.headers.get('user-agent') ?? undefined
    );

    const org = user.organizations[0]?.organization;

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      organization: org ? { id: org.id, name: org.name, slug: org.slug } : null,
    });

    response.cookies.set('merchantos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

async function handleLogout(req: NextRequest) {
  const token = req.cookies.get('merchantos_session')?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('merchantos_session');
  return response;
}
