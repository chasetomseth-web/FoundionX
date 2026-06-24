export interface Location {
  city: string;
  state: string;
  country: string;
  timezone: string;
}

export type IntentScoreLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface IntentScoreResult {
  score: number;
  level: IntentScoreLevel;
  reasoning: string[];
}

export type VisitorEventType =
  | 'session_start'
  | 'page_view'
  | 'email_captured'
  | 'form_submit'
  | 'checkout_started'
  | 'purchase'
  | 'session_end';

export type ConversionStatus = 'anonymous' | 'lead' | 'checkout' | 'customer';

export interface VisitorEvent {
  id: string;
  sessionId: string;
  type: VisitorEventType;
  url: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface Session {
  id: string;
  anonymousId: string;
  visitorId: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  entryPage: string;
  exitPage: string | null;
  pagesViewed: number;
  conversionStatus: ConversionStatus;
  intentScore: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  events: VisitorEvent[];
}

export interface Visitor {
  id: string;
  email: string | null;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  location: Location | null;
  company: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  intentScore: number;
  identified: boolean;
  returning: boolean;
}

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