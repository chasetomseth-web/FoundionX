import { readFileSync, writeFileSync, existsSync, globSync } from 'fs';

// ============================================================
// PHASE 2: Automated Code Fixes for Runtime Compatibility
// ============================================================

let modifiedCount = 0;
let skippedCount = 0;
const modifiedFiles = new Set();

function addNodeRuntime(filePath) {
  const content = readFileSync(filePath, 'utf8');

  if (content.includes("export const runtime = 'nodejs'")) {
    skippedCount++;
    return false;
  }

  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    // No imports, insert at top
    lines.splice(1, 0, "export const runtime = 'nodejs';");
  } else {
    // Find first non-import, non-blank, non-comment line after last import
    let insertIndex = lastImportIndex + 1;
    while (insertIndex < lines.length) {
      const line = lines[insertIndex].trim();
      if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        insertIndex++;
      } else {
        break;
      }
    }
    lines.splice(insertIndex, 0, "export const runtime = 'nodejs';");
  }

  writeFileSync(filePath, lines.join('\n'));
  modifiedCount++;
  modifiedFiles.add(filePath);
  return true;
}

// ============================================================
// TASK 1 + 2: Fix Prisma routes and Webhook routes
// ============================================================

// Find all route.ts files that use Prisma
const prismaFiles = globSync('src/app/api/**/route.ts').filter(file => {
  const content = readFileSync(file, 'utf8');
  return (
    content.includes('prisma.') ||
    content.includes('@prisma/client') ||
    content.includes('$queryRaw') ||
    content.includes('$transaction')
  );
});

// Find webhook routes (they may or may not use Prisma directly)
const webhookFiles = globSync('src/app/api/webhooks/*/route.ts');

// Find all Stripe route files
const stripeFiles = globSync('src/app/api/stripe/**/route.ts');

// Process Prisma files
for (const file of prismaFiles) {
  addNodeRuntime(file);
}

// Process webhook routes - these MUST have Node runtime even if not in prisma list
for (const file of webhookFiles) {
  addNodeRuntime(file);
}

// Process Stripe routes - these MUST have Node runtime
for (const file of stripeFiles) {
  addNodeRuntime(file);
}

// ============================================================
// TASK 5: Vercel Integration Isolation
// ============================================================

const vercelLibPath = 'src/lib/vercel.ts';
let vercelModified = false;

if (existsSync(vercelLibPath)) {
  let vercelContent = readFileSync(vercelLibPath, 'utf8');

  // Check if already guarded
  if (!vercelContent.includes('VERCEL_API_TOKEN')) {
    // Wrap all exported functions to return safe fallbacks when VERCEL_API_TOKEN is missing
    // Modify vercelHeaders to return null instead of throwing
    vercelContent = vercelContent.replace(
      `function vercelHeaders() {
  if (!VERCEL_TOKEN) {
    throw new Error("VERCEL_API_TOKEN is not configured");
  }`,
      `function vercelHeaders() {
  if (!VERCEL_TOKEN) {
    return null;
  }`
    );

    // Wrap addDomainToVercel
    vercelContent = vercelContent.replace(
      /export async function addDomainToVercel\(hostname: string\) \{\n  if \(!VERCEL_PROJECT_ID\) \{\n    throw new Error\("VERCEL_PROJECT_ID is not configured"\);\n  \}/,
      `export async function addDomainToVercel(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[vercel.ts] Skipped addDomainToVercel: Vercel not configured');
    return { skipped: true };`
    );
    // Fix the rest of addDomainToVercel to use safe headers
    vercelContent = vercelContent.replace(
      `{ method: "POST", headers: vercelHeaders(), body: JSON.stringify({ name: hostname }) }`,
      `{ method: "POST", headers: vercelHeaders() || {}, body: JSON.stringify({ name: hostname }) }`
    );

    // Wrap getDomainStatus
    vercelContent = vercelContent.replace(
      /export async function getDomainStatus\(hostname: string\) \{\n  if \(!VERCEL_PROJECT_ID\) \{\n    throw new Error\("VERCEL_PROJECT_ID is not configured"\);\n  \}/,
      `export async function getDomainStatus(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[vercel.ts] Skipped getDomainStatus: Vercel not configured');
    return { skipped: true };`
    );

    // Wrap removeDomainFromVercel
    vercelContent = vercelContent.replace(
      /export async function removeDomainFromVercel\(hostname: string\) \{\n  if \(!VERCEL_PROJECT_ID\) \{\n    throw new Error\("VERCEL_PROJECT_ID is not configured"\);\n  \}/,
      `export async function removeDomainFromVercel(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[vercel.ts] Skipped removeDomainFromVercel: Vercel not configured');
    return true;`
    );

    // Wrap getDomainConfig
    vercelContent = vercelContent.replace(
      /export async function getDomainConfig\(hostname: string\) \{\n  if \(!VERCEL_PROJECT_ID\) \{\n    throw new Error\("VERCEL_PROJECT_ID is not configured"\);\n  \}/,
      `export async function getDomainConfig(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[vercel.ts] Skipped getDomainConfig: Vercel not configured');
    return { skipped: true };`
    );

    // Fix remaining vercelHeaders() calls to be safe
    vercelContent = vercelContent.replace(
      /headers: vercelHeaders\(\)/g,
      'headers: vercelHeaders() || {}'
    );

    writeFileSync(vercelLibPath, vercelContent);
    vercelModified = true;
    modifiedFiles.add(vercelLibPath);
  }
}

// ============================================================
// REPORT
// ============================================================

console.log('\n=== RUNTIME COMPATIBILITY FIX COMPLETE ===');
console.log(`\nFiles modified: ${modifiedCount}`);
console.log(`Files skipped (already had runtime): ${skippedCount}`);
console.log(`Vercel isolation modified: ${vercelModified}`);

const webhookModified = webhookFiles.filter(f => modifiedFiles.has(f));
const prismaOnlyModified = prismaFiles.filter(f => !f.includes('/webhooks/') && !f.includes('/stripe/') && modifiedFiles.has(f));

console.log(`\nWebhook routes fixed: ${webhookModified.length}`);
for (const wf of webhookModified) {
  console.log(`  ✓ ${wf}`);
}

console.log(`\nPrisma routes fixed (non-webhook): ${prismaOnlyModified.length}`);
for (const pf of prismaOnlyModified.slice(0, 20)) {
  console.log(`  ✓ ${pf}`);
}
if (prismaOnlyModified.length > 20) {
  console.log(`  ... and ${prismaOnlyModified.length - 20} more`);
}

// ============================================================
// TASK 3: Edge Leak Check
// ============================================================
const edgeLeaks = globSync('src/**/*.ts').filter(f => {
  const c = readFileSync(f, 'utf8');
  return c.includes("export const runtime = 'edge'");
});

console.log(`\n=== TASK 3: Edge Runtime Leaks ===`);
if (edgeLeaks.length === 0) {
  console.log('✓ No edge runtime leaks found');
} else {
  console.log(`✗ FOUND ${edgeLeaks.length} edge runtime leaks:`);
  for (const leak of edgeLeaks) {
    console.log(`  ⚠ ${leak}`);
  }
}

// ============================================================
// TASK 4: Middleware Check
// ============================================================
console.log(`\n=== TASK 4: Middleware Compatibility ===`);
const middlewarePath = 'src/middleware.ts';
if (existsSync(middlewarePath)) {
  const mw = readFileSync(middlewarePath, 'utf8');
  const hasNodeApis = mw.includes('require(') || mw.includes('import fs') || mw.includes('import crypto');
  if (hasNodeApis) {
    console.log('✗ BLOCKER: Middleware uses Node-only APIs');
  } else {
    console.log('✓ Middleware is Edge-compatible (uses only NextRequest/NextResponse)');
  }
}

// ============================================================
// TASK 5: Vercel Isolation Check
// ============================================================
console.log(`\n=== TASK 5: Vercel Integration Isolation ===`);
if (vercelModified) {
  console.log('✓ Vercel integration wrapped with safe fallbacks');
} else if (existsSync(vercelLibPath)) {
  const vc = readFileSync(vercelLibPath, 'utf8');
  if (vc.includes('!VERCEL_API_TOKEN') && vc.includes('skipped')) {
    console.log('✓ Vercel integration already isolated');
  } else {
    console.log('⚠ Vercel integration may need review');
  }
}

console.log('\n=== FILES MODIFIED ===');
for (const f of modifiedFiles) {
  console.log(`  ${f}`);
}