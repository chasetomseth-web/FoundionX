import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('src/app/api/**/route.ts');

let modifiedCount = 0;
let skippedCount = 0;
let prismaFiles = [];
let webhookFiles = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  
  // Find all files using prisma
  const usesPrisma = content.includes('prisma.') || 
                      content.includes('@prisma/client') ||
                      content.includes('$queryRaw') ||
                      content.includes('$transaction');
  
  if (!usesPrisma) continue;
  
  prismaFiles.push(file);
  
  // Track webhook routes
  if (file.includes('/webhooks/')) {
    webhookFiles.push(file);
  }
  
  // Check if runtime is already declared
  if (content.includes("export const runtime = 'nodejs'")) {
    skippedCount++;
    continue;
  }
  
  // Find last import line to insert after
  const importMatch = content.match(/^import .+$/m);
  if (!importMatch) {
    // No imports, insert near top
    const lines = content.split('\n');
    lines.splice(1, 0, "\nexport const runtime = 'nodejs';");
    writeFileSync(file, lines.join('\n'));
    modifiedCount++;
    continue;
  }
  
  // Find the last import line
  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  // Check if there's existing exports between imports and function
  const afterImport = lines.slice(lastImportIndex + 1);
  let insertIndex = lastImportIndex + 1;
  
  // Skip any existing export statements or blank lines
  while (insertIndex < lines.length) {
    const line = lines[insertIndex].trim();
    if (line === '' || line.startsWith('//') || line === '') {
      insertIndex++;
    } else {
      break;
    }
  }
  
  // Insert runtime declaration right after imports (before other exports or function)
  lines.splice(lastImportIndex + 1, 0, "export const runtime = 'nodejs';");
  if (lines[lastImportIndex + 1] !== '') {
    lines.splice(lastImportIndex + 1, 0, '');
  }
  if (lines[lastImportIndex + 2] !== '') {
    lines.splice(lastImportIndex + 2, 0, '');
  }
  
  writeFileSync(file, lines.join('\n'));
  modifiedCount++;
}

console.log('\n=== RUNTIME FIX COMPLETE ===');
console.log(`Modified: ${modifiedCount} files`);
console.log(`Already had runtime: ${skippedCount} files`);
console.log(`Total Prisma-using routes: ${prismaFiles.length}`);
console.log(`\nWebhook routes (must verify): ${webhookFiles.length}`);
for (const wf of webhookFiles) {
  console.log(`  - ${wf}`);
}