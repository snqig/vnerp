/** 临时脚本：单独应用指定迁移文件（不跑全量历史）。用完即删。 */
import mysql from 'mysql2/promise';

const FILES = ['20260822080004_batch_fifo_columns'];

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
    multipleStatements: true,
  });
  for (const f of FILES) {
    const mod = await import(`../database/migrations/${f}.ts`);
    console.log(`--- applying ${f}`);
    await mod.up(conn as never);
  }
  await conn.end();
  console.log('DONE');
})().catch((e) => {
  console.error('FAILED', e);
  process.exit(1);
});
