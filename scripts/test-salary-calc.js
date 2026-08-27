const { calculateMonthlySalary, batchCalculateSalary } = require('../src/lib/hr/salary-engine');

async function testSalaryCalculation() {
  console.log('=== 薪资计算引擎测试 ===\n');
  
  console.log('[1/3] 测试单员工薪资计算 (员工ID: 1001)');
  try {
    const result = await calculateMonthlySalary(1001, '2026-07');
    console.log('  ✓ 计算成功');
    console.log('  员工:', result.employeeName);
    console.log('  月份:', result.month);
    console.log('  基本工资:', result.baseSalary.toFixed(2));
    console.log('  绩效工资:', result.performanceSalary.toFixed(2));
    console.log('  社保个人:', result.socialInsurancePersonal.toFixed(2));
    console.log('  公积金个人:', result.housingFundPersonal.toFixed(2));
    console.log('  个税:', result.individualTax.toFixed(2));
    console.log('  应发合计:', result.grossPay.toFixed(2));
    console.log('  应扣合计:', result.totalDeduction.toFixed(2));
    console.log('  实发工资:', result.netPay.toFixed(2));
  } catch (e) {
    console.log('  ✗ 计算失败:', e.message);
  }
  
  console.log('\n[2/3] 测试批量薪资计算');
  try {
    const results = await batchCalculateSalary([1001, 1002, 1003, 1004, 1005], '2026-07');
    console.log(`  ✓ 批量计算成功 - 共 ${results.length} 人`);
    console.log('');
    console.log('  ┌───────┬────────┬────────────┬─────────────┬────────────┐');
    console.log('  │ 员工ID │ 姓名   │ 基本工资   │ 应发合计   │ 实发工资   │');
    console.log('  ├───────┼────────┼────────────┼─────────────┼────────────┤');
    for (const r of results) {
      console.log(`  │ ${r.employeeId.toString().padStart(5)} │ ${r.employeeName.padEnd(4)} │ ${r.baseSalary.toFixed(2).padStart(10)} │ ${r.grossPay.toFixed(2).padStart(11)} │ ${r.netPay.toFixed(2).padStart(10)} │`);
    }
    console.log('  └───────┴────────┴────────────┴─────────────┴────────────┘');
    const totalNetPay = results.reduce((sum, r) => sum + r.netPay, 0);
    console.log(`  实发合计: ${totalNetPay.toFixed(2)}`);
  } catch (e) {
    console.log('  ✗ 批量计算失败:', e.message);
  }
  
  console.log('\n[3/3] 测试不同基本工资的计算差异');
  const testCases = [
    { id: 1003, name: '王五', base: 5000 },
    { id: 1002, name: '李四', base: 6500 },
    { id: 1004, name: '赵六', base: 7000 },
    { id: 1001, name: '张三', base: 8000 },
    { id: 1005, name: '钱七', base: 9000 },
  ];
  
  console.log('');
  console.log('  ┌────────┬────────────┬───────────────┬───────────────┬──────────────┬──────────────┬────────────┐');
  console.log('  │ 姓名   │ 基本工资   │ 社保个人     │ 公积金个人   │ 个税        │ 应扣合计     │ 实发工资   │');
  console.log('  ├────────┼────────────┼───────────────┼───────────────┼──────────────┼──────────────┼────────────┤');
  
  for (const tc of testCases) {
    try {
      const r = await calculateMonthlySalary(tc.id, '2026-07');
      console.log(`  │ ${tc.name.padEnd(4)} │ ${r.baseSalary.toFixed(2).padStart(10)} │ ${r.socialInsurancePersonal.toFixed(2).padStart(13)} │ ${r.housingFundPersonal.toFixed(2).padStart(13)} │ ${r.individualTax.toFixed(2).padStart(12)} │ ${r.totalDeduction.toFixed(2).padStart(12)} │ ${r.netPay.toFixed(2).padStart(10)} │`);
    } catch (e) {
      console.log(`  │ ${tc.name.padEnd(4)} │ 计算失败     │ ${e.message.substring(0, 10)}...`);
    }
  }
  
  console.log('  └────────┴────────────┴───────────────┴───────────────┴──────────────┴──────────────┴────────────┘');
  
  console.log('\n=== 测试完成 ===');
}

testSalaryCalculation().catch(e => {
  console.error('测试脚本执行失败:', e);
  process.exit(1);
});