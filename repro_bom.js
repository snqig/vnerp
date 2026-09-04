const mysql = require('mysql2/promise');
const fs = require('fs');
const env = fs.readFileSync('.env','utf8').split('\n').reduce((a,l)=>{const m=l.match(/^([A-Z_]+)=(.+)$/);if(m)a[m[1]]=m[2].trim();return a;},{});
(async()=>{
  const c = await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,charset:'utf8mb4'});
  async function typ(t,col){ const [r]=await c.query(`SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,[t,col]); return r[0]?r[0].COLUMN_TYPE:'?'; }
  for(const t of ['bom_header','bom_line','bom_material']){ try{console.log(t+'.id =', await typ(t,'id'));}catch(e){console.log(t,'ERR',e.message);} }

  const cre = async (name, sql) => {
    try { await c.query(sql); console.log('CREATE '+name+': OK'); }
    catch(e){ console.log('CREATE '+name+': 1215? errno='+e.errno+' :: '+e.sqlMessage); }
  };
  // exact route SQL, but use real names (will create if not exist)
  await cre('bom_alternative', `CREATE TABLE bom_alternative (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    bom_line_id INT NOT NULL,
    priority INT UNSIGNED DEFAULT 1,
    material_id INT UNSIGNED NOT NULL,
    material_code VARCHAR(50) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    conversion_rate DECIMAL(10,6) DEFAULT 1,
    is_enabled TINYINT(1) DEFAULT 1,
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bom_line (bom_line_id),
    INDEX idx_material (material_id),
    FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_line_id) REFERENCES bom_line(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await cre('bom_version_history', `CREATE TABLE bom_version_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    version VARCHAR(20) NOT NULL,
    change_type ENUM('CREATE','UPDATE','DELETE','PUBLISH','DISABLE') NOT NULL,
    change_content TEXT,
    change_reason VARCHAR(200),
    operator_id INT UNSIGNED DEFAULT NULL,
    operator_name VARCHAR(100),
    operate_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bom_id (bom_id),
    INDEX idx_version (version),
    INDEX idx_operate_time (operate_time),
    FOREIGN KEY (bom_id) REFERENCES bom_header(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  // now drop them to avoid leaving artifacts (they didn't exist before)
  await c.query('DROP TABLE IF EXISTS bom_alternative, bom_version_history').catch(()=>{});
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1);});
