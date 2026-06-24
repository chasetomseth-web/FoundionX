import type {
  RetentionOverview,
  Visitor,
  Session,
  VisitorEvent,
  VisitorListItem,
  ActivityFeedItem,
  PaginatedResponse,
} from './retention-types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}

function sessionId(): string {
  return `sess_${uuid().slice(0, 8)}`;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimestamp(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(0, daysAgo));
  d.setHours(randomBetween(0, 23), randomBetween(0, 59), randomBetween(0, 59));
  return d.toISOString();
}

function addMinutes(iso: string, mins: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

// ─── Data Pools ──────────────────────────────────────────────────────────────
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const usCities = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Seattle',
];
const countries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'BR'];
const domains = ['acme.com', 'globex.io', 'initech.org', 'umbrella.corp', 'stark.net', 'wayne.co'];

const pages = [
  '/',
  '/pricing',
  '/features',
  '/about',
  '/blog',
  '/contact',
  '/checkout',
  '/product/combat-creatine',
  '/product/protein-isolate',
  '/product/pre-workout',
  '/cart',
  '/login',
  '/signup',
];

const utmSources = ['google', 'facebook', 'twitter', 'linkedin', 'direct', null];
const utmMediums = ['cpc', 'organic', 'social', 'email', 'referral', null];
const utmCampaigns = ['spring_sale', 'product_launch', 'retargeting', 'newsletter', null];
const referrers = [
  'https://google.com',
  'https://facebook.com',
  'https://twitter.com',
  'https://linkedin.com',
  null,
];

// ─── Factory ─────────────────────────────────────────────────────────────────
function generateSessionEvents(sessId: string, baseTime: string, pageCount: number): VisitorEvent[] {
  const events: VisitorEvent[] = [];
  const startTime = new Date(baseTime);

  // Session start
  events.push({
    id: uuid(),
    sessionId: sessId,
    type: 'session_start',
    url: pick(pages),
    timestamp: baseTime,
    metadata: {},
  });

  // Page views
  const viewedPages: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const ts = new Date(startTime.getTime() + i * randomBetween(15, 120) * 1000);
    const url = pick(pages);
    viewedPages.push(url);
    events.push({
      id: uuid(),
      sessionId: sessId,
      type: 'page_view',
      url,
      timestamp: ts.toISOString(),
      metadata: { referrer: pick(referrers) },
    });
  }

  // Maybe email capture
  if (Math.random() > 0.6) {
    const ts = new Date(startTime.getTime() + pageCount * randomBetween(20, 60) * 1000);
    events.push({
      id: uuid(),
      sessionId: sessId,
      type: 'email_captured',
      url: pick(['/signup', '/checkout', '/lead-magnet']),
      timestamp: ts.toISOString(),
      metadata: { source: 'form_submit' },
    });
  }

  // Session end
  const endTime = new Date(startTime.getTime() + pageCount * randomBetween(30, 180) * 1000);
  events.push({
    id: uuid(),
    sessionId: sessId,
    type: 'session_end',
    url: pick(pages),
    timestamp: endTime.toISOString(),
    metadata: {},
  });

  return events;
}

function generateVisitor(index: number): Visitor {
  const visitorId = uuid();
  const hasEmail = index % 3 !== 0;
  const firstName = hasEmail ? pick(firstNames) : null;
  const lastName = hasEmail ? pick(lastNames) : null;
  const email = firstName ? `${firstName.toLowerCase()}${index}@${pick(domains)}` : null;
  const isReturning = index % 2 === 0;
  const sessionCount = randomBetween(1, isReturning ? 5 : 1);
  const firstSeen = randomTimestamp(30);
  const sessions: Session[] = [];
  const allEvents: VisitorEvent[] = [];

  const locationCity = pick(usCities);
  const locationCountry = pick(countries);
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'WA', null];
  const companies = ['Acme Corp', 'Globex Inc', 'Initech', 'Umbrella Ltd', 'Stark Industries', null];

  const location = {
    city: locationCity,
    state: pick(states) ?? '',
    country: locationCountry,
    timezone: 'UTC',
  };
  const company = pick(companies) ?? null;

  for (let s = 0; s < sessionCount; s++) {
    const sessId = sessionId();
    const pageCount = randomBetween(1, 8);
    const sessionStart = addMinutes(firstSeen, s * randomBetween(60, 1440));
    const events = generateSessionEvents(sessId, sessionStart, pageCount);
    const pageViewEvents = events.filter((e) => e.type === 'page_view');
    const emailCaptureEvent = events.find((e) => e.type === 'email_captured');
    const sessionEndEvent = events.find((e) => e.type === 'session_end');
    const pagePaths = pageViewEvents.map((e) => e.url);
    const startTime = events[0]?.timestamp ?? sessionStart;
    const endTime = sessionEndEvent?.timestamp ?? pageViewEvents[pageViewEvents.length - 1]?.timestamp ?? startTime;
    const durationSec = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
    );

    allEvents.push(...events);

    sessions.push({
      id: sessId,
      anonymousId: uuid(),
      visitorId,
      startTime,
      endTime,
      durationSeconds: durationSec > 0 ? durationSec : null,
      entryPage: pagePaths[0] ?? '/',
      exitPage: pagePaths[pagePaths.length - 1] ?? null,
      conversionStatus: emailCaptureEvent ? 'lead' : 'anonymous',
      pagesViewed: pagePaths.length,
      intentScore: pagePaths.some((p) => p.includes('pricing') || p.includes('checkout'))
        ? randomBetween(60, 99)
        : null,
      pagePaths,
      utmSource: pick(utmSources),
      utmMedium: pick(utmMediums),
      utmCampaign: pick(utmCampaigns),
      referrer: pick(referrers),
      events,
    });
  }

  return {
    id: visitorId,
    email,
    firstName,
    lastName,
    locationCity,
    locationCountry,
    identified: hasEmail,
    returning: isReturning,
    firstSeen: sessions.reduce(
      (earliest, s) => (s.startTime < earliest ? s.startTime : earliest),
      sessions[0]?.startTime ?? firstSeen
    ),
    lastSeen: sessions.reduce(
      (latest, s) => (s.endTime && s.endTime > latest ? s.endTime : latest),
      sessions[0]?.endTime ?? firstSeen
    ),
    totalSessions: sessions.length,
    sessions,
    location: location.city ? location : undefined,
    company: company,
    source: sessions[0]?.utmSource ?? null,
    medium: sessions[0]?.utmMedium ?? null,
    campaign: sessions[0]?.utmCampaign ?? null,
    intentScore: calculateIntentScoreFromEvents(allEvents),
  };
}

function calculateIntentScoreFromEvents(events: VisitorEvent[]): number {
  let score = 0;
  const pricingViews = events.filter((e) => e.url.includes('/pricing')).length;
  const checkoutViews = events.filter((e) => e.url.includes('/checkout')).length;
  const emailCaptured = events.some((e) => e.type === 'email_captured');
  const pagesViewed = events.filter((e) => e.type === 'page_view').length;

  if (pricingViews >= 1) score += 20;
  if (checkoutViews >= 1) score += 30;
  if (emailCaptured) score += 20;
  if (pagesViewed > 5) score += 10;

  return Math.min(100, score);
}

// ─── Generate global mock data set ──────────────────────────────────────────
const VISITORS: Visitor[] = Array.from({ length: 50 }, (_, i) => generateVisitor(i));
const SESSIONS: Session[] = VISITORS.flatMap((v) => v.sessions);
const EVENTS: VisitorEvent[] = SESSIONS.flatMap((s) => s.events);

// ─── Public API ──────────────────────────────────────────────────────────────
export function getRetentionOverview(): RetentionOverview {
  const totalVisitors = VISITORS.length;
  const identifiedVisitors = VISITORS.filter((v) => v.identified).length;
  const returningVisitors = VISITORS.filter((v) => v.returning).length;
  const sessionsWithDuration = SESSIONS.filter((s) => s.durationSeconds !== null);
  const avgDurationSeconds = sessionsWithDuration.length > 0
    ? Math.round(
        sessionsWithDuration.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) /
          sessionsWithDuration.length
      )
    : 0;
  const highIntentVisitors = VISITORS.filter((v) =>
    v.sessions.some((s) => (s.intentScore ?? 0) >= 80)
  ).length;
  const sourceCounts = SESSIONS.reduce(
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
    .map(([source, count]) => ({ source, count }))[0] ?? null;

  const avgSessionsPerVisitor =
    totalVisitors > 0 ? Math.round((SESSIONS.length / totalVisitors) * 10) / 10 : 0;

  const emailCaptureRate =
    totalVisitors > 0 ? Math.round((identifiedVisitors / totalVisitors) * 100) : 0;

  return {
    totalVisitors,
    identifiedVisitors,
    avgDurationSeconds,
    returningVisitors,
    emailCaptureRate,
    highIntentVisitors,
    totalSessions: SESSIONS.length,
    avgSessionsPerVisitor,
    topTrafficSource,
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

export function getVisitors(page = 1, limit = 20): PaginatedResponse<VisitorListItem> {
  const sorted = [...VISITORS].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = sorted.slice(start, start + limit);

  const data: VisitorListItem[] = paginated.map((v) => {
    const latestSession = v.sessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];
    return {
      id: v.id,
      anonymousId: latestSession?.anonymousId ?? uuid(),
      email: v.email,
      firstName: v.firstName,
      lastName: v.lastName,
      locationCity: v.locationCity,
      locationCountry: v.locationCountry,
      identified: v.identified,
      isReturning: v.returning,
      company: v.company ?? null,
      location: v.location ?? null,
      source: v.source ?? null,
      durationSeconds: latestSession?.durationSeconds ?? null,
      pagesViewed: latestSession?.pagesViewed ?? 0,
      totalVisits: v.totalSessions,
      entryPage: latestSession?.entryPage ?? '/',
      exitPage: latestSession?.exitPage ?? null,
      intentScore: v.intentScore,
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen,
      status: v.returning ? 'returning' : v.identified ? 'identified' : 'anonymous',
      conversionStatus: latestSession?.conversionStatus ?? 'anonymous',
    };
  });

  return { data, total, page, limit, totalPages };
}

export function getVisitorById(id: string): Visitor | undefined {
  return VISITORS.find((v) => v.id === id);
}

export function getActivityFeed(limit = 25): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = EVENTS.map((e) => {
    const visitor = VISITORS.find((v) => v.sessions.some((s) => s.id === e.sessionId));
    const descriptions: Record<string, string> = {
      session_start: 'Session started',
      page_view: `Visited ${e.url}`,
      email_captured: visitor?.email
        ? `Email captured: ${visitor.email}`
        : 'Email captured',
      form_submit: `Form submitted on ${e.url}`,
      checkout_started: `Checkout started on ${e.url}`,
      purchase: `Purchase completed on ${e.url}`,
      session_end: 'Session ended',
    };
    return {
      id: e.id,
      type: e.type,
      sessionId: e.sessionId,
      visitorEmail: visitor?.email ?? null,
      url: e.url,
      timestamp: e.timestamp,
      description: descriptions[e.type] ?? `Event: ${e.type}`,
    };
  });

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  return `${mins}m ${secs}s`;
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}