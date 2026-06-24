// ─── Future-Proof Event Schema ───────────────────────────────────────────────
export type VisitorEventType =
  | 'session_start'
  | 'page_view'
  | 'email_captured'
  | 'form_submit'
  | 'checkout_started'
  | 'purchase'
  | 'session_end';

export interface VisitorEvent {
  id: string;
  sessionId: string;
  type: VisitorEventType;
  url: string;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}

// ─── Conversion Status ───────────────────────────────────────────────────────
export type ConversionStatus = 'anonymous' | 'lead' | 'checkout' | 'customer';

// ─── Session Model ───────────────────────────────────────────────────────────
export interface Session {
  id: string;
  anonymousId: string;
  visitorId: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  entryPage: string;
  exitPage: string | null;
  pagePaths: string[];
  conversionStatus: ConversionStatus;
  pagesViewed: number;
  intentScore: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  events: VisitorEvent[];
}

export interface VisitorSession extends Session {
  firstName?: string | null;
  lastName?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
}

// ─── Location ────────────────────────────────────────────────────────────────
export interface Location {
  city: string;
  state: string;
  country: string;
  timezone: string;
}

// ─── Visitor Model (one visitor can have many sessions) ──────────────────────
export interface Visitor {
  id: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  identified: boolean;
  returning: boolean;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  sessions: Session[];
  location?: Location;
  company?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  intentScore: number;
}

// ─── API Response Types ──────────────────────────────────────────────────────
export interface RetentionOverview {
  totalVisitors: number;
  identifiedVisitors: number;
  avgDurationSeconds: number;
  returningVisitors: number;
  emailCaptureRate: number;
  highIntentVisitors: number;
  totalSessions: number;
  avgSessionsPerVisitor: number;
  topTrafficSource: { source: string; count: number } | null;
  periodStart: string;
  periodEnd: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VisitorListItem {
  id: string;
  anonymousId: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  identified: boolean;
  isReturning: boolean;
  company: string | null;
  location: Location | null;
  source: string | null;
  durationSeconds: number | null;
  pagesViewed: number;
  totalVisits: number;
  entryPage: string;
  exitPage: string | null;
  intentScore: number | null;
  firstSeen: string;
  lastSeen: string;
  conversionStatus: ConversionStatus;
  status: 'anonymous' | 'identified' | 'returning';
}

// ─── Intent Score ────────────────────────────────────────────────────────────
export interface IntentScoreResult {
  score: number;
  level: 'low' | 'medium' | 'high' | 'very_high';
  reasoning: string[];
}

// ─── Session Intelligence ────────────────────────────────────────────────────
export interface SessionIntelligence {
  intentScore: IntentScoreResult;
  interestLevel: string;
  isReturning: boolean;
  totalSessionTime: number;
  totalPagesViewed: number;
  hasEmail: boolean;
  visitedPricing: boolean;
  visitedCheckout: boolean;
}

// ─── Activity Feed ───────────────────────────────────────────────────────────
export interface ActivityFeedItem {
  id: string;
  type: VisitorEventType;
  sessionId: string;
  visitorEmail: string | null;
  url: string;
  timestamp: string;
  description: string;
}