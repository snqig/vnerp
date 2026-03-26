const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

async function addColumn() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected');

    await connection.execute('ALTER TABLE prd_standard_card ADD COLUMN mold_code VARCHAR(50) COMMENT "模具编号" AFTER process_method');
    console.log('Added mold_code column');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addColumn();
