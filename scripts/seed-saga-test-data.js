const mysql = require('mysql2/promise');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('此脚本仅限开发/测试环境使用，不可在生产环境运行！');
    process.exit(1);
  }

  if (!process.env.DB_PASSWORD) {
    console.error('请设置 DB_PASSWORD 环境变量');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'vnerpdacahng'
  });

  console.log('=== Seeding Saga Test Data ===\n');

  const testCases = [
    {
      sagaId: `workorder_completion:TEST001:${Date.now()}:test1`,
      sagaType: 'workorder_completion',
      status: 'failed',
      payload: JSON.stringify({ workOrderId: 10001, productName: '测试产品A', orderQty: 100 }),
      steps: JSON.stringify([
        { name: 'update_workorder', status: 'success', errorMessage: null },
        { name: 'inventory_inbound', status: 'failed', errorMessage: '库存入库失败：批次创建失败' },
        { name: 'finance_cost', status: 'pending', errorMessage: null },
        { name: 'hr_salary', status: 'pending', errorMessage: null }
      ]),
      errorMessage: '库存入库失败：批次创建失败',
      description: '工单完工 - 库存入库失败（模拟场景）'
    },
    {
      sagaId: `workorder_completion:TEST002:${Date.now()}:test2`,
      sagaType: 'workorder_completion',
      status: 'compensated',
      payload: JSON.stringify({ workOrderId: 10002, productName: '测试产品B', orderQty: 50 }),
      steps: JSON.stringify([
        { name: 'update_workorder', status: 'compensated', errorMessage: null },
        { name: 'inventory_inbound', status: 'failed', errorMessage: '库存容量不足' },
        { name: 'finance_cost', status: 'pending', errorMessage: null },
        { name: 'hr_salary', status: 'pending', errorMessage: null }
      ]),
      errorMessage: null,
      description: '工单完工 - 已补偿（模拟场景）'
    },
    {
      sagaId: `workorder_completion:TEST003:${Date.now()}:test3`,
      sagaType: 'workorder_completion',
      status: 'success',
      payload: JSON.stringify({ workOrderId: 10003, productName: '测试产品C', orderQty: 200 }),
      steps: JSON.stringify([
        { name: 'update_workorder', status: 'success', errorMessage: null },
        { name: 'inventory_inbound', status: 'success', errorMessage: null },
        { name: 'finance_cost', status: 'success', errorMessage: null },
        { name: 'hr_salary', status: 'success', errorMessage: null }
      ]),
      errorMessage: null,
      description: '工单完工 - 成功完成（模拟场景）'
    },
    {
      sagaId: `material_issue:TEST004:${Date.now()}:test4`,
      sagaType: 'material_issue',
      status: 'failed',
      payload: JSON.stringify({ pickOrderId: 20001, materialCode: 'MAT-001', qty: 500 }),
      steps: JSON.stringify([
        { name: 'update_pick_order', status: 'success', errorMessage: null },
        { name: 'inventory_deduct', status: 'failed', errorMessage: '库存不足：当前库存100，需求500' },
        { name: 'finance_impact', status: 'pending', errorMessage: null }
      ]),
      errorMessage: '库存不足：当前库存100，需求500',
      description: '领料单 - 库存扣减失败（模拟场景）'
    },
    {
      sagaId: `material_issue:TEST005:${Date.now()}:test5`,
      sagaType: 'material_issue',
      status: 'compensated',
      payload: JSON.stringify({ pickOrderId: 20002, materialCode: 'MAT-002', qty: 200 }),
      steps: JSON.stringify([
        { name: 'update_pick_order', status: 'compensated', errorMessage: null },
        { name: 'inventory_deduct', status: 'failed', errorMessage: '物料批次不存在' },
        { name: 'finance_impact', status: 'pending', errorMessage: null }
      ]),
      errorMessage: null,
      description: '领料单 - 已补偿（模拟场景）'
    },
    {
      sagaId: `material_issue:TEST006:${Date.now()}:test6`,
      sagaType: 'material_issue',
      status: 'success',
      payload: JSON.stringify({ pickOrderId: 20003, materialCode: 'MAT-003', qty: 100 }),
      steps: JSON.stringify([
        { name: 'update_pick_order', status: 'success', errorMessage: null },
        { name: 'inventory_deduct', status: 'success', errorMessage: null },
        { name: 'finance_impact', status: 'success', errorMessage: null }
      ]),
      errorMessage: null,
      description: '领料单 - 成功完成（模拟场景）'
    },
    {
      sagaId: `work_report:TEST007:${Date.now()}:test7`,
      sagaType: 'work_report',
      status: 'executing',
      payload: JSON.stringify({ reportId: 30001, employeeId: 101, workOrderId: 10001, qty: 50 }),
      steps: JSON.stringify([
        { name: 'validate_report', status: 'success', errorMessage: null },
        { name: 'update_workorder_progress', status: 'success', errorMessage: null },
        { name: 'hr_piece_record', status: 'pending', errorMessage: null }
      ]),
      errorMessage: null,
      description: '报工 - 执行中（模拟场景）'
    },
    {
      sagaId: `work_report:TEST008:${Date.now()}:test8`,
      sagaType: 'work_report',
      status: 'success',
      payload: JSON.stringify({ reportId: 30002, employeeId: 102, workOrderId: 10003, qty: 100 }),
      steps: JSON.stringify([
        { name: 'validate_report', status: 'success', errorMessage: null },
        { name: 'update_workorder_progress', status: 'success', errorMessage: null },
        { name: 'hr_piece_record', status: 'success', errorMessage: null }
      ]),
      errorMessage: null,
      description: '报工 - 成功完成（模拟场景）'
    }
  ];

  for (const testCase of testCases) {
    try {
      await conn.execute(
        'INSERT INTO saga_log (saga_id, saga_type, status, payload, steps, error_message) VALUES (?, ?, ?, ?, ?, ?)',
        [testCase.sagaId, testCase.sagaType, testCase.status, testCase.payload, testCase.steps, testCase.errorMessage]
      );
      console.log(`✅ ${testCase.description}`);
    } catch (error) {
      console.log(`❌ ${testCase.description} - ${error.message}`);
    }
  }

  const [count] = await conn.execute('SELECT COUNT(*) as count FROM saga_log');
  console.log(`\n=== Total Saga Log Records: ${count[0].count} ===`);

  await conn.end();
}

main();
