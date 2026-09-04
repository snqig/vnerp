import { getTranslations } from 'next-intl/server';

;
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

async function addColumnIfNotExists(table: string, column: string, definition: string) {
  const result = await query(
    'SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );

  if (result[0]?.cnt === 0) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    return true;
  }
  return false;
}

async function _createTableIfNotExists(sql: string) {
  try {
    await query(sql);
    return true;
  } catch {
    return false;
  }
}

export const POST = withPermission(async () => {
  const ts = await getTranslations('Common');
  try {
    const results: string[] = [];

    const prdSchedule = await addColumnIfNotExists(
      'prd_schedule',
      'workshop',
      ts('k_tqqfm3')
    );
    if (prdSchedule) {
      results.push(ts('k_hla8bb'));
    } else {
      results.push(ts('k_w6t2te'));
    }

    await addColumnIfNotExists('eqp_equipment', 'workshop', ts('k_1d5yq6o'));
    results.push(ts('k_bbtp3b'));

    await addColumnIfNotExists(
      'eqp_equipment',
      'capacity_per_hour',
      ts('k_1dvh31d')
    );
    results.push(ts('k_13iepad'));

    await addColumnIfNotExists(
      'eqp_equipment',
      'max_colors',
      ts('k_1pw5pmm')
    );
    results.push(ts('k_e2lsk9'));

    await addColumnIfNotExists(
      'eqp_equipment',
      'setup_time_minutes',
      ts('k_ipqc4j')
    );
    results.push(ts('k_1sojpx3'));

    const colorSeqExists = await query(`
       SELECT COUNT(*) as cnt FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'prd_work_order_color_seq'
    `);
    if (colorSeqExists[0]?.cnt === 0) {
      await query(ts('k_rszvqc'));
      results.push(ts('k_pxmjhl'));
    } else {
      results.push(ts('k_1o6y5e2'));
    }

    const scheduleDetailExists = await query(`
      SELECT COUNT(*) as cnt FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'prd_schedule_detail'
    `);
    if (scheduleDetailExists[0]?.cnt === 0) {
      await query(ts('k_1f7vnf'));
      results.push(ts('k_zp7hsu'));
    } else {
      results.push(ts('k_1so7mzt'));
    }

    return NextResponse.json({
      success: true,
      message: results.join('; '),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

export const GET = POST;
