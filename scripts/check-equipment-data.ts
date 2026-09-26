import mysql from 'mysql2/promise';

const DB = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

async function main() {
  const conn = await mysql.createConnection(DB);
  try {
    const tables = [
      'eqp_equipment',
      'eqp_maintenance_plan',
      'eqp_maintenance_record',
      'eqp_inspection',
      'eqp_scrap',
      'eqp_repair',
      'eqp_calibration',
      'eqp_equipment_status_log',
    ];

    for (const t of tables) {
      try {
        const [c] = await conn.query(`SELECT COUNT(*) as cnt FROM ??`, [t]);
        console.log(`${t}: ${c.cnt} rows`);
      } catch (e: any) {
        console.log(`${t}: TABLE NOT FOUND (${e.code})`);
      }
    }

    // Check existing equipment data
    console.log('\n=== eqp_equipment ===');
    try {
      const eqs = await conn.query(`SELECT id, equipment_code, equipment_name, equipment_type, status FROM eqp_equipment LIMIT 20`);
      for (const row of eqs[0]) {
        console.log(`id=${row.id} code=${row.equipment_code} name=${row.equipment_name} type=${row.equipment_type} status=${row.status}`);
      }
    } catch (e: any) {
      console.log('equipment error:', e.message);
    }

    // Check existing plan data
    console.log('\n=== eqp_maintenance_plan ===');
    try {
      const plans = await conn.query(`SELECT id, plan_no, equipment_id, plan_name, maintenance_type, cycle_type, status FROM eqp_maintenance_plan LIMIT 20`);
      for (const row of (plans[0] || [])) {
        console.log(`id=${row.id} plan=${row.plan_no} eq_id=${row.equipment_id} name=${row.plan_name} type=${row.maintenance_type} cycle=${row.cycle_type} status=${row.status}`);
      }
    } catch (e: any) {
      console.log('plan error:', e.message);
    }

    // Check existing record data
    console.log('\n=== eqp_maintenance_record ===');
    try {
      const recs = await conn.query(`SELECT id, record_no, equipment_id, maintenance_type, result, start_time, end_time FROM eqp_maintenance_record LIMIT 20`);
      for (const row of (recs[0] || [])) {
        console.log(`id=${row.id} no=${row.record_no} eq_id=${row.equipment_id} type=${row.maintenance_type} result=${row.result} start=${row.start_time} end=${row.end_time}`);
      }
    } catch (e: any) {
      console.log('record error:', e.message);
    }

    // Check inspection data
    console.log('\n=== eqp_inspection ===');
    try {
      const ins = await conn.query(`SELECT id, inspection_no, equipment_id, status FROM eqp_inspection LIMIT 10`);
      for (const row of (ins[0] || [])) {
        console.log(`id=${row.id} no=${row.inspection_no} eq_id=${row.equipment_id} status=${row.status}`);
      }
    } catch (e: any) {
      console.log('inspection error:', e.message);
    }

    // Check repair data
    console.log('\n=== eqp_repair ===');
    try {
      const reps = await conn.query(`SELECT id, repair_no, equipment_id, repair_type, status FROM eqp_repair LIMIT 10`);
      for (const row of (reps[0] || [])) {
        console.log(`id=${row.id} no=${row.repair_no} eq_id=${row.equipment_id} type=${row.repair_type} status=${row.status}`);
      }
    } catch (e: any) {
      console.log('repair error:', e.message);
    }

    // Check calibration data
    console.log('\n=== eqp_calibration ===');
    try {
      const cals = await conn.query(`SELECT id, calibration_no, equipment_id, status FROM eqp_calibration LIMIT 10`);
      for (const row of (cals[0] || [])) {
        console.log(`id=${row.id} no=${row.calibration_no} eq_id=${row.equipment_id} status=${row.status}`);
      }
    } catch (e: any) {
      console.log('calibration error:', e.message);
    }

    // Check scrap data
    console.log('\n=== eqp_scrap ===');
    try {
      const scs = await conn.query(`SELECT id, scrap_no, equipment_id, status FROM eqp_scrap LIMIT 10`);
      for (const row of (scs[0] || [])) {
        console.log(`id=${row.id} no=${row.scrap_no} eq_id=${row.equipment_id} status=${row.status}`);
      }
    } catch (e: any) {
      console.log('scrap error:', e.message);
    }

  } finally {
    await conn.end();
  }
}

main().catch(console.error);
