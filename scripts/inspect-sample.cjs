const mysql = require('mysql2/promise');
const db = mysql.createPool({host:'127.0.0.1',port:3306,user:'root',password:'Snqig521223',database:'vnerpdacahng'});
(async () => {
  const [cols] = await db.query('SHOW COLUMNS FROM sal_sample_order');
  cols.forEach(c => console.log(c.Field, c.Type));
  await db.end();
})();
