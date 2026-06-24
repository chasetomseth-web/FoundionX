import type { IntentScoreResult } from '../types';

export function calculateIntentScore(
  events: Array<{ type: string; url: string }>,
  isReturning: boolean,
  durationSeconds: number | null,
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
  else level = 'low';

  return { score, level, reasoning };
}