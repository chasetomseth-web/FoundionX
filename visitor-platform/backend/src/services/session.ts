import prisma from '../db/prisma';
import { calculateDurationSeconds, resolveEndTime } from './duration';
import { calculateIntentScore } from './intentScore';
import { MockGeolocationProvider } from './geolocation';
import { MockCompanyResolverProvider } from './companyResolver';

const geolocationProvider = new MockGeolocationProvider();
const companyResolver = new MockCompanyResolverProvider();

export async function createOrUpdateSession(
  anonymousId: string,
  eventType: string,
  url: string,
  timestamp: string,
  metadata?: Record<string, unknown>
) {
  let session = await prisma.session.findUnique({
    where: { anonymousId },
    include: { events: { orderBy: { timestamp: 'asc' } }, visitor: true },
  });

  const eventTime = new Date(timestamp);

  if (!session) {
    const ip = metadata?.ip as string | undefined;
    const location = ip ? await geolocationProvider.getLocationFromIp(ip) : null;
    const company = ip ? (await companyResolver.resolveCompany(ip)).company : null;

    // Create a visitor first
    const visitor = await prisma.visitor.create({
      data: {
        locationCity: location?.city,
        locationState: location?.state,
        locationCountry: location?.country,
        locationTimezone: location?.timezone,
        company: company,
      },
    });

    session = await prisma.session.create({
      data: {
        anonymousId,
        visitorId: visitor.id,
        startTime: eventTime,
        entryPage: url,
        utmSource: metadata?.utmSource as string,
        utmMedium: metadata?.utmMedium as string,
        utmCampaign: metadata?.utmCampaign as string,
        referrer: metadata?.referrer as string,
      },
      include: { events: { orderBy: { timestamp: 'asc' } }, visitor: true },
    });
  }

  const event = await prisma.event.create({
    data: {
      sessionId: session.id,
      type: eventType,
      url,
      pagePath: url,
      timestamp: eventTime,
      metadata: metadata ?? {},
    },
  });

  const pagesViewed = await prisma.event.count({
    where: { sessionId: session.id, type: 'page_view' },
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { pagesViewed },
  });

  if (eventType === 'session_end') {
    const endTime = eventTime;
    const startTime = session.startTime;
    const durationSeconds = calculateDurationSeconds(startTime, endTime);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        endTime,
        durationSeconds,
        exitPage: url,
      },
    });
  }

  const allEvents = await prisma.event.findMany({
    where: { sessionId: session.id },
  });

  const intentScore = calculateIntentScore(
    allEvents,
    (session.visitor?.totalSessions ?? 0) > 0,
    session.durationSeconds
  );

  await prisma.session.update({
    where: { id: session.id },
    data: { intentScore: intentScore.score },
  });

  return { session, event };
}

export async function finalizeSession(anonymousId: string) {
  const session = await prisma.session.findUnique({
    where: { anonymousId },
  });

  if (!session) return null;

  if (!session.endTime) {
    const lastEvent = await prisma.event.findFirst({
      where: { sessionId: session.id },
      orderBy: { timestamp: 'desc' },
    });

    if (lastEvent) {
      const endTime = resolveEndTime(null, lastEvent.timestamp);
      if (endTime) {
        const durationSeconds = calculateDurationSeconds(session.startTime, endTime);
        await prisma.session.update({
          where: { id: session.id },
          data: { endTime, durationSeconds },
        });
      }
    }
  }

  return prisma.session.findUnique({
    where: { id: session.id },
    include: { events: { orderBy: { timestamp: 'asc' } }, visitor: true },
  });
}

export async function getSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      events: { orderBy: { timestamp: 'asc' } },
      visitor: true,
    },
  });
}

export async function getOverview() {
  const [totalSessions, totalVisitors, identifiedVisitors, sessionsWithDuration, allSessions] =
    await Promise.all([
      prisma.session.count(),
      prisma.visitor.count(),
      prisma.visitor.count({ where: { email: { not: null } } }),
      prisma.session.findMany({
        where: { durationSeconds: { not: null } },
        select: { durationSeconds: true },
      }),
      prisma.session.findMany({ select: { utmSource: true } }),
    ]);

  const avgDurationSeconds =
    sessionsWithDuration.length > 0
      ? Math.round(
          sessionsWithDuration.reduce(
            (sum, s) => sum + (s.durationSeconds ?? 0),
            0
          ) / sessionsWithDuration.length
        )
      : 0;

  const totalVisitorCount = await prisma.visitor.count();

  const returningVisitors = await prisma.visitor.count({
    where: { totalSessions: { gt: 1 } },
  });

  const identifiedCount = await prisma.visitor.count({
    where: { email: { not: null } },
  });
  const emailCaptureRate =
    totalVisitorCount > 0
      ? Math.round((identifiedCount / totalVisitorCount) * 100)
      : 0;

  const highIntentVisitors = await prisma.session.count({
    where: { intentScore: { gte: 80 } },
  });

  const avgSessionsPerVisitor =
    totalVisitorCount > 0
      ? Math.round((totalSessions / totalVisitorCount) * 10) / 10
      : 0;

  const sourceCounts = allSessions.reduce(
    (acc, s) => {
      const source = s.utmSource || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topTrafficSource = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([source, count]) => ({ source, count }))[0] || null;

  return {
    totalVisitors: totalVisitorCount,
    identifiedVisitors: identifiedCount,
    avgDurationSeconds,
    returningVisitors,
    emailCaptureRate,
    highIntentVisitors,
    totalSessions,
    avgSessionsPerVisitor,
    topTrafficSource,
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

export async function getVisitors(page = 1, limit = 20) {
  const total = await prisma.visitor.count();
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const visitors = await prisma.visitor.findMany({
    skip,
    take: limit,
    orderBy: { lastSeen: 'desc' },
    include: {
      sessions: {
        orderBy: { startTime: 'desc' },
        take: 1,
        include: { events: { orderBy: { timestamp: 'asc' } } },
      },
    },
  });

  const data = visitors.map((v) => {
    const latestSession = v.sessions[0];
    const status = v.totalSessions > 1 ? 'returning' : v.email ? 'identified' : 'anonymous';

    return {
      id: v.id,
      anonymousId: latestSession?.anonymousId ?? '',
      email: v.email,
      identified: !!v.email,
      isReturning: v.totalSessions > 1,
      company: v.company,
      location: v.locationCity
        ? {
            city: v.locationCity,
            state: v.locationState ?? '',
            country: v.locationCountry ?? '',
            timezone: v.locationTimezone ?? '',
          }
        : null,
      source: latestSession?.utmSource ?? null,
      durationSeconds: latestSession?.durationSeconds ?? null,
      pagesViewed: latestSession?.pagesViewed ?? 0,
      entryPage: latestSession?.entryPage ?? '/',
      exitPage: latestSession?.exitPage ?? null,
      intentScore: latestSession?.intentScore ?? null,
      firstSeen: v.firstSeen.toISOString(),
      lastSeen: v.lastSeen.toISOString(),
      status,
      totalVisits: v.totalSessions,
      conversionStatus: (latestSession?.conversionStatus ?? 'anonymous') as 'anonymous' | 'lead' | 'checkout' | 'customer',
    };
  });

  return { data, total, page, limit, totalPages };
}