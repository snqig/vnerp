import { NextRequest, NextResponse } from 'next/server';
import { escapeId } from 'mysql2';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (_request: NextRequest) => {
  try {
    const tables = await query('SHOW TABLES LIKE "%material%"');
    let material: Record<string, any> = { exists: false };

    if (tables.length > 0) {
      const tableName = tables[0][Object.keys(tables[0])[0]];
      const columns = await query(`SHOW COLUMNS FROM ${escapeId(tableName)}`);
      const data = await query(`SELECT * FROM ${escapeId(tableName)} LIMIT 3`);
      material = {
        exists: true,
        tableName,
        columns: columns.map((c: any) => c.Field),
        sampleData: data,
      };
    }

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
});
