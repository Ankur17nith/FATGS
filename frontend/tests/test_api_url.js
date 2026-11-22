/**
 * FATGS Frontend Test: API address helper
 *
 * With no VITE_API_BASE_URL (development) paths must stay relative so the dev proxy works;
 * with one (separate static-site deployment) every call must target that backend.
 */
import { makeApiUrl, apiUrl } from '../src/api.js';

let passed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`  [PASS] ${msg}`);
}

console.log('======================================================');
console.log('          FATGS FRONTEND API ADDRESS TESTS            ');
console.log('======================================================');

check(apiUrl('/api/health') === '/api/health', 'default (no base) keeps relative paths for the dev proxy');
check(makeApiUrl('')('/api/x') === '/api/x', 'empty base keeps relative paths');
check(makeApiUrl(undefined)('/api/x') === '/api/x', 'undefined base keeps relative paths');
check(makeApiUrl('https://fatgs-api.onrender.com')('/api/x?y=1') === 'https://fatgs-api.onrender.com/api/x?y=1', 'base is prefixed and the query string is kept');
check(makeApiUrl('https://fatgs-api.onrender.com/')('/api/x') === 'https://fatgs-api.onrender.com/api/x', 'a trailing slash on the base is removed');
check(makeApiUrl('  https://a.example  ')('/api/x') === 'https://a.example/api/x', 'surrounding whitespace is trimmed');

console.log('\n======================================================');
console.log(`   ALL ${passed} API ADDRESS CHECKS PASSED!`);
console.log('======================================================');
