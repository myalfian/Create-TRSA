import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running TRSA Enterprise Test Suite...');

const testFiles = [
  path.join(__dirname, 'defaultTRSA.test.js'),
  path.join(__dirname, 'store.test.js'),
  path.join(__dirname, 'docNumber.test.js'),
  path.join(__dirname, 'draftHistory.test.js'),
  path.join(__dirname, 'validation.test.js'),
  path.join(__dirname, 'dashboardStats.test.js'),
  path.join(__dirname, 'matrixAudit.test.js'),
  path.join(__dirname, 'userMatrixSettings.test.js'),
  path.join(__dirname, 'masterDataAndAuth.test.js'),
  path.join(__dirname, 'auditService.test.js'),
  path.join(__dirname, 'activityLogging.test.js')
];

run({ files: testFiles })
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .compose(new spec())
  .pipe(process.stdout);
