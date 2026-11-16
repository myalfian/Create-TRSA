import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log(' Starting TRSA Studio Enterprise Build Process');
console.log('====================================================');

const errors = [];
const stats = {};

// 1. Check required files
const requiredFiles = [
  'index.html',
  'server.py',
  'start.bat',
  'src/data/defaultTRSA.js',
  'src/js/app.js',
  'src/js/security.js',
  'src/js/auditService.js',
  'src/js/supabaseClient.js',
  'src/sql/schema.sql',
  'src/css/style.css'
];

console.log('\n[1/4] Verifying Core Application Files...');
for (const relPath of requiredFiles) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing critical file: ${relPath}`);
  } else {
    const size = fs.statSync(fullPath).size;
    stats[relPath] = `${(size / 1024).toFixed(2)} KB`;
    console.log(`  ✓ ${relPath} (${stats[relPath]})`);
  }
}

// 2. Syntax validation using dynamic ES module import
console.log('\n[2/4] Validating JavaScript & CSS Syntax...');
const jsFiles = [
  'src/data/defaultTRSA.js',
  'src/js/security.js',
  'src/js/auditService.js',
  'src/js/supabaseClient.js',
  'src/js/app.js'
];

// Minimal DOM mocks for headless Node import validation
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

for (const js of jsFiles) {
  try {
    const fullPath = path.join(rootDir, js);
    await import(`file://${fullPath.replace(/\\/g, '/')}?t=${Date.now()}`);
    console.log(`  ✓ Syntax check passed: ${js}`);
  } catch (err) {
    errors.push(`Syntax error in ${js}: ${err.message}`);
  }
}

// 3. Verify CSS Print and DropX classes
console.log('\n[3/4] Validating Design System & Print Style Rules...');
const cssContent = fs.readFileSync(path.join(rootDir, 'src/css/style.css'), 'utf-8');
const requiredCSSRules = [
  '@media print',
  '.a4-document-container',
  '.clean-form-table',
  '.dropx-card',
  '.dropx-sidebar',
  '.document-watermark'
];

for (const rule of requiredCSSRules) {
  if (cssContent.includes(rule)) {
    console.log(`  ✓ CSS Rule verified: ${rule}`);
  } else {
    errors.push(`Missing CSS rule: ${rule}`);
  }
}

// 4. Create / Refresh dist directory
console.log('\n[4/4] Generating Production Distribution Package in dist/...');
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy assets to dist
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
copyRecursive(path.join(rootDir, 'src'), path.join(distDir, 'src'));
copyRecursive(path.join(rootDir, 'README.md'), path.join(distDir, 'README.md'));

console.log('  ✓ Production assets packaged in dist/');

if (errors.length > 0) {
  console.error('\n❌ BUILD FAILED with errors:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('\n====================================================');
  console.log(' ✅ BUILD SUCCESSFUL! All checks and packaging passed.');
  console.log('====================================================');
  console.log('Summary of packaged assets:');
  Object.entries(stats).forEach(([k, v]) => console.log(`  - ${k.padEnd(28)} : ${v}`));
}
