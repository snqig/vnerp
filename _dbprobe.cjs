const mysql = require('mysql2/promise');
(async () => {
  const pwds = [process.env.DB_PASSWORD || '', 'Snqig521223'];
  for (const pwd of pwds) {
    try {
      const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:pwd,database:'vnerpdacahng',connectTimeout:3000});
      const [r] = await c.query('SELECT DATABASE() AS db, (SELECT COUNT(*) FROM inv_inbound_order) AS t');
      console.log('DB OK pwdLen='+pwd.length, JSON.stringify(r[0]));
      await c.end();
      process.exit(0);
    } catch(e){ console.log('fail pwdLen='+pwd.length, String(e.message).split('\n')[0]); }
  }
  process.exit(2);
})();
