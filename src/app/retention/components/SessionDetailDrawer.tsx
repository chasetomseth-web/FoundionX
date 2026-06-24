'use client';

import React from 'react';
import { X, Copy, Clock, Mail, Globe, Radar, ArrowRight, User } from 'lucide-react';
import { useVisitorById } from '../hooks/useRetentionData';
import { formatDuration, formatTimestamp } from '@/lib/retention-mock-data';
import type { IntentScoreResult, Visitor, VisitorSession } from '@/lib/retention-types';

interface Props {
  visitorId: string | null;
  onClose: () => void;
}

function Repeat2Icon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function TargetIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function calculateIntentScore(
  events: Array<{ type: string; url: string }>,
  isReturning: boolean,
  durationSeconds: number | null
): IntentScoreResult {
  let score = 0;
  const reasoning: string[] = [];

  const pricingViews = events.filter((e) => e.url.includes('/pricing')).length;
  const checkoutViews = events.filter((e) => e.url.includes('/checkout')).length;
  const emailCaptured = events.some((e) => e.type === 'email_captured');
  const pagesViewed = events.filter((e) => e.type === 'page_view').length;

  if (pricingViews >= 1) {
    score += 20;
    reasoning.push(`Visited pricing page ${pricingViews} time${pricingViews > 1 ? 's' : ''}`);
  }

  if (checkoutViews >= 1) {
    score += 30;
    reasoning.push(`Visited checkout page ${checkoutViews} time${checkoutViews > 1 ? 's' : ''}`);
  }

  if (emailCaptured) {
    score += 20;
    reasoning.push('Email captured');
  }

  if (isReturning) {
    score += 10;
    reasoning.push('Returning visitor');
  }

  if (pagesViewed > 5) {
    score += 10;
    reasoning.push(`Viewed ${pagesViewed} pages`);
  }

  if (durationSeconds && durationSeconds > 600) {
    score += 10;
    const mins = Math.floor(durationSeconds / 60);
    reasoning.push(`Spent ${mins} minutes on site`);
  }

  score = Math.min(100, score);

  let level: IntentScoreResult['level'] = 'low';
  if (score >= 80) level = 'very_high';
  else if (score >= 60) level = 'high';
  else if (score >= 30) level = 'medium';

  return { score, level, reasoning };
}

function InterestLevelBadge({ level }: { level: IntentScoreResult['level'] }) {
  const styles = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-primary/10 text-primary',
    high: 'bg-warning-bg text-warning',
    very_high: 'bg-success-bg text-success',
  };

  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    very_high: 'Very High',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-600 ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}

function getFullName(visitor: Visitor, latestSession?: VisitorSession) {
  const firstName = visitor.firstName ?? latestSession?.firstName;
  const lastName = visitor.lastName ?? latestSession?.lastName;
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function getLocation(visitor: Visitor, latestSession?: VisitorSession) {
  const city = visitor.locationCity ?? latestSession?.locationCity;
  const country = visitor.locationCountry ?? latestSession?.locationCountry;
  return city && country ? `${city}, ${country}` : null;
}

export default function SessionDetailDrawer({ visitorId, onClose }: Props) {
  const { data: visitor, isLoading } = useVisitorById(visitorId);

  const latestSession = (visitor?.sessions?.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )[0] ?? undefined) as VisitorSession | undefined;

  const fullName = visitor ? getFullName(visitor, latestSession) : null;
  const location = visitor ? getLocation(visitor, latestSession) : null;
  const displayName = fullName ?? visitor?.email ?? 'Anonymous Visitor';

  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const intentScore =
    visitor && latestSession
      ? calculateIntentScore(
          latestSession.events,
          visitor.returning,
          latestSession.durationSeconds
        )
      : null;

  if (!visitorId) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-700 text-foreground">Session Detail</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-5 bg-muted rounded w-full" />
            ))}
          </div>
        ) : !visitor ? (
          <div className="p-6 text-center text-muted-foreground">Visitor not found</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">Identity</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-600 ${
                    visitor.identified
                      ? 'bg-success-bg text-success border border-success/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {visitor.identified ? 'Identified' : 'Anonymous'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground font-500">{displayName}</span>
                </div>

                {visitor.identified && visitor.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{visitor.email}</span>
                  </div>
                )}

                {location && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Radar size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {latestSession?.anonymousId ?? '—'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(latestSession?.anonymousId ?? '')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {visitor.returning && (
                  <div className="flex items-center gap-2 text-xs text-success font-600">
                    <Repeat2Icon />
                    Returning visitor ({visitor.totalSessions} sessions)
                  </div>
                )}
              </div>
            </div>

            {latestSession && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">
                  Session Details
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">First Seen</p>
                    <p className="text-sm font-500 text-foreground">{formatTimestamp(latestSession.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Seen</p>
                    <p className="text-sm font-500 text-foreground">{formatTimestamp(latestSession.endTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-500 text-foreground">{formatDuration(latestSession.durationSeconds)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pages Viewed</p>
                    <p className="text-sm font-500 text-foreground">{latestSession.pagesViewed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry Page</p>
                    <p className="text-sm font-500 text-foreground truncate max-w-[120px]">{latestSession.entryPage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Exit Page</p>
                    <p className="text-sm font-500 text-foreground truncate max-w-[120px]">{latestSession.exitPage ?? '—'}</p>
                  </div>
                </div>

                {latestSession.conversionStatus && (
                  <div className="flex items-center gap-2 text-xs font-600 text-success bg-success-bg px-3 py-1.5 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Conversion: {latestSession.conversionStatus}
                  </div>
                )}
              </div>
            )}

            {latestSession && (latestSession.utmSource || latestSession.referrer) && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">
                  Acquisition
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">UTM Source</p>
                    <p className="text-sm font-500 text-foreground">{latestSession.utmSource ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">UTM Medium</p>
                    <p className="text-sm font-500 text-foreground">{latestSession.utmMedium ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">UTM Campaign</p>
                    <p className="text-sm font-500 text-foreground">{latestSession.utmCampaign ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Referrer</p>
                    <p className="text-sm font-500 text-foreground truncate max-w-[140px]">{latestSession.referrer ?? '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {latestSession && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">
                  Visitor Journey
                </span>
                <div className="space-y-2">
                  {latestSession.events
                    .filter((e) => e.type === 'page_view' || e.type === 'email_captured')
                    .map((event, i, arr) => (
                      <div key={event.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {event.type === 'page_view' ? (
                              <>
                                <span className="text-sm text-foreground">{event.url}</span>
                                <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                              </>
                            ) : (
                              <span className="text-sm text-success font-500">Email Captured</span>
                            )}
                          </div>
                        </div>
                        {i < arr.length - 1 && <ArrowRight size={12} className="text-muted-foreground shrink-0" />}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {latestSession && intentScore && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">
                  Session Intelligence
                </span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Intent Score</span>
                    <span className="text-sm font-600 text-foreground">{intentScore.score}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Interest Level</span>
                    <InterestLevelBadge level={intentScore.level} />
                  </div>
                  {intentScore.reasoning.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-600 text-muted-foreground">Reasoning</p>
                      <ul className="space-y-1">
                        {intentScore.reasoning.map((r, i) => (
                          <li key={i} className="text-xs text-foreground flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {latestSession && latestSession.pagePaths && latestSession.pagePaths.length > 0 && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">
                    Pages Viewed ({latestSession.pagePaths.length})
                  </span>
                  <Globe size={14} className="text-muted-foreground" />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {latestSession.pagePaths.map((path, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-foreground py-1 px-2 rounded hover:bg-muted transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                      <span className="font-mono text-xs">{path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {latestSession && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-600 uppercase tracking-widest text-muted-foreground">
                    Event Timeline
                  </span>
                  <Clock size={14} className="text-muted-foreground" />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {latestSession.events
                    .sort(
                      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    )
                    .map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 text-sm py-1.5 px-2 rounded hover:bg-muted transition-colors"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 ${
                              event.type === 'email_captured'
                                ? 'bg-success'
                                : event.type === 'session_end'
                                ? 'bg-danger'
                                : 'bg-primary'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-500 truncate">
                            {event.type === 'page_view'
                              ? `Visited ${event.url}`
                              : event.type === 'email_captured'
                              ? `Email captured on ${event.url}`
                              : event.type === 'session_start'
                              ? 'Session started'
                              : event.type === 'session_end'
                              ? 'Session ended'
                              : event.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}