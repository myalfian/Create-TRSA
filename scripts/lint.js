import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Running TRSA Code Linter & Quality Check...');

const filesToLint = [
  'src/data/defaultTRSA.js',
  'src/js/draftHistoryService.js',
  'src/js/validationService.js',
  'src/js/dashboardStatsService.js',
  'src/js/trsaMatrixService.js',
  'src/js/userMatrixSettingsService.js',
  'src/js/masterDataService.js',
  'src/js/app.js'
];

globalThis.window = { 
  addEventListener: () => {}, 
  removeEventListener: () => {},
  scrollTo: () => {} 
};
globalThis.localStorage = { getItem: () => null, setItem: () => null };
globalThis.document = { 
  getElementById: () => null, 
  querySelectorAll: () => [], 
  addEventListener: () => {},
  createElement: () => ({ setAttribute: () => {}, click: () => {}, remove: () => {} }),
  body: { appendChild: () => {} }
};

let issues = 0;

for (const file of filesToLint) {
  const fullPath = path.join(rootDir, file);
  try {
    await import(`file://${fullPath.replace(/\\/g, '/')}?t=${Date.now()}`);
    console.log(`  ✓ ${file} syntax valid.`);
  } catch (err) {
    console.error(`  ✗ ${file} syntax error:`, err.message);
    issues++;
  }
}

if (issues > 0) {
  console.error(`\nFound ${issues} linting issue(s).`);
  process.exit(1);
} else {
  console.log('\n✅ All files passed lint and syntax inspection.');
  process.exit(0);
}
