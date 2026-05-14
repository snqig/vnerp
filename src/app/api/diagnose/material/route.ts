import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const tables = await query('SHOW TABLES LIKE "%material%"');
    let material = { exists: false };
    
    if (tables.length > 0) {
      const tableName = tables[0][Object.keys(tables[0])[0]];
      const columns = await query(`SHOW COLUMNS FROM ${tableName}`);
      const data = await query(`SELECT * FROM ${tableName} LIMIT 3`);
      material = { exists: true, tableName, columns: columns.map((c: any) => c.Field), sampleData: data };
    }

    return Response.json({
      success: true,
      material
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
