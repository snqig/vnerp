#!/usr/bin/env node
/**
 * Fix i18n migration bug: 'td("...")' string literals → td('...') function calls
 *
 * Bug pattern: toast({ title: 'td("fetchListFailed")' })
 * Correct:     toast({ title: td('fetchListFailed') })
 *
 * The i18n migration script incorrectly wrapped td() calls inside single quotes,
 * turning them into string literals instead of function calls.
 */

const fs = require('fs');

const FILE = 'd:/dcprint/erp-project/src/app/[locale]/prepress/die-template/page.tsx';

const content = fs.readFileSync(FILE, 'utf8');

const bugPattern = /'td\("([^"]+)"\)'/g;
const matches = content.match(bugPattern) || [];

console.log(`Found ${matches.length} string-literal bug(s):`);
matches.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));

const fixed = content.replace(bugPattern, "td('$1')");

fs.writeFileSync(FILE, fixed, 'utf8');

// Verify
const verify = fs.readFileSync(FILE, 'utf8');
const remaining = (verify.match(bugPattern) || []).length;
console.log(`\nReplaced ${matches.length} occurrence(s); remaining: ${remaining}`);

if (remaining === 0) {
  console.log('All td() string-literal bugs fixed.');
} else {
  console.error('ERROR: Some bugs remain — manual inspection needed.');
  process.exit(1);
}
