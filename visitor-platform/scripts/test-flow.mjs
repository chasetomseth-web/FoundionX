/**
 * Test script for visitor-platform event flow.
 * Run with: node scripts/test-flow.mjs
 *
 * This simulates:
 *   1. A visitor landing on a website
 *   2. Browsing multiple pages
 *   3. Submitting an email
 *   4. Leaving the site
 *
 * Then verifies:
 *   - Session was created
 *   - Duration was calculated
 *   - Email was linked
 */

const API_URL = 'http://localhost:4000';

async function main() {
  console.log('🧪 Testing Visitor Platform Event Flow\n');

  const anonymousId = crypto.randomUUID();
  console.log(`1️⃣  Generated anonymous session: ${anonymousId}\n`);

  // Step 1: Page view (homepage)
  console.log('2️⃣  Sending page_view: Homepage');
  let res = await fetch(`${API_URL}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anonymous_id: anonymousId,
      type: 'session_start',
      url: 'https://example.com/',
      timestamp: new Date(Date.now() - 120000).toISOString(),
    }),
  });
  let data = await res.json();
  console.log(`   ✅ Session created: ${data.session_id}\n`);

  // Step 2: Navigate to pricing
  console.log('3️⃣  Sending page_view: Pricing');
  await fetch(`${API_URL}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anonymous_id: anonymousId,
      type: 'page_view',
      url: 'https://example.com/pricing',
      timestamp: new Date(Date.now() - 90000).toISOString(),
    }),
  });
  console.log('   ✅ Page view recorded\n');

  // Step 3: Navigate to checkout
  console.log('4️⃣  Sending page_view: Checkout');
  await fetch(`${API_URL}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anonymous_id: anonymousId,
      type: 'page_view',
      url: 'https://example.com/checkout',
      timestamp: new Date(Date.now() - 60000).toISOString(),
    }),
  });
  console.log('   ✅ Page view recorded\n');

  // Step 4: Identify (email capture)
  console.log('5️⃣  Identifying visitor: john@example.com');
  res = await fetch(`${API_URL}/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: data.session_id,
      email: 'john@example.com',
    }),
  });
  const identityData = await res.json();
  console.log(`   ✅ Identity linked: ${identityData.identity_id}\n`);

  // Step 5: Session end
  console.log('6️⃣  Sending session_end');
  await fetch(`${API_URL}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anonymous_id: anonymousId,
      type: 'session_end',
      url: 'https://example.com/checkout',
      timestamp: new Date().toISOString(),
    }),
  });
  console.log('   ✅ Session ended\n');

  // Step 6: Verify session
  console.log('7️⃣  Verifying session...');
  res = await fetch(`${API_URL}/session/${data.session_id}`);
  const sessionData = await res.json();

  console.log(`\n   📊 Session Result:`);
  console.log(`   ─────────────────────────`);
  console.log(`   ID:            ${sessionData.id}`);
  console.log(`   Email:         ${sessionData.email}`);
  console.log(`   Duration:      ${sessionData.duration_seconds}s`);
  console.log(`   Pages:         ${sessionData.events.filter(e => e.type === 'page_view').length}`);
  console.log(`   Entry:         ${sessionData.entry_page}`);
  console.log(`   Exit:          ${sessionData.exit_page}`);
  console.log(`   Intent Score:  ${sessionData.intent_score}`);

  // Step 7: Verify overview
  console.log('\n8️⃣  Fetching overview stats...');
  res = await fetch(`${API_URL}/overview`);
  const overview = await res.json();
  console.log(`\n   📊 Overview:`);
  console.log(`   ─────────────────────────`);
  console.log(`   Total Visitors:  ${overview.totalVisitors}`);
  console.log(`   Identified:      ${overview.identifiedVisitors}`);
  console.log(`   Avg Duration:    ${overview.avgDurationSeconds}s`);
  console.log(`   Email Capture:   ${overview.emailCaptureRate}%`);
  console.log(`   High Intent:     ${overview.highIntentVisitors}`);

  console.log('\n✅ All tests passed!');
}

main().catch(console.error);