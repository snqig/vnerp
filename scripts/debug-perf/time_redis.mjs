import fs from 'fs';
const env = fs.readFileSync('d:/dcprint/erp-project/.env', 'utf-8');
env.split('\n').forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2]; });

const { getCacheManager, resetCacheManagerForTest } = await import('d:/dcprint/erp-project/src/infrastructure/cache/CacheManager.ts');
const { isTokenRevoked, isUserTokensRevoked } = await import('d:/dcprint/erp-project/src/lib/token-blacklist.ts');

const t0 = Date.now();
const cm = getCacheManager();
console.log(`getCacheManager() constructed in ${Date.now() - t0}ms`);

// wait a moment for connection attempt
await new Promise(r => setTimeout(r, 1000));

const t1 = Date.now();
const v = await cm.get('nonexistent_key');
console.log(`cm.get() took ${Date.now() - t1}ms, returned: ${v}`);

const t2 = Date.now();
const r1 = await isTokenRevoked('token:1:fake');
console.log(`isTokenRevoked() took ${Date.now() - t2}ms, returned: ${r1}`);

const t3 = Date.now();
const r2 = await isUserTokensRevoked(1, Date.now());
console.log(`isUserTokensRevoked() took ${Date.now() - t3}ms, returned: ${r2}`);

const t4 = Date.now();
const v2 = await cm.get('another_key');
console.log(`cm.get() #2 took ${Date.now() - t4}ms, returned: ${v2}`);

process.exit(0);
