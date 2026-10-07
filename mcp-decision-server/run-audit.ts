import { runAudit } from './src/auditor.ts';

async function main() {
  console.log('[AUDIT] 开始全模块数据真实性审计...');
  console.log('[AUDIT] 目标数据库:', `${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'vnerpdacahng'}`);
  
  try {
    const result = await runAudit({
      modules: ['warehouse', 'production', 'sales', 'purchase'],
      strict_mode: false,
    });
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('           审计结果总览');
    console.log('═══════════════════════════════════════════════════');
    console.log(`审计时间: ${result.audit_time}`);
    console.log(`数据库连接: ${result.db_connection}`);
    console.log(`问题总数: ${result.total_issues}`);
    console.log(`  🔴 Critical: ${result.severity_summary.critical}`);
    console.log(`  🟡 Warning:  ${result.severity_summary.warning}`);
    console.log(`  🔵 Info:     ${result.severity_summary.info}`);
    console.log('');
    console.log('按模块分布:');
    for (const [mod, count] of Object.entries(result.module_summary)) {
      console.log(`  ${mod}: ${count} 个问题`);
    }
    console.log('═══════════════════════════════════════════════════\n');
    
    // 按严重程度分组展示
    const severityLabels = [
      { key: 'critical', label: '🔴 Critical（严重）', emoji: '🔴' },
      { key: 'warning', label: '🟡 Warning（警告）', emoji: '🟡' },
      { key: 'info', label: '🔵 Info（信息）', emoji: '🔵' },
    ];
    
    for (const sev of severityLabels) {
      const issues = result.issues.filter((i) => i.severity === sev.key);
      if (issues.length === 0) continue;
      
      console.log(`${sev.label} — ${issues.length} 条`);
      for (const issue of issues) {
        console.log(`  [${issue.type}] ${issue.description}`);
        if (issue.field) {
          console.log(`       表: ${issue.table} | 字段: ${issue.field} | 实际值: ${issue.actual_value} | 期望值: ${issue.expected_value}`);
        }
      }
      console.log('');
    }
    
    // 保存完整结果到文件
    const fs = await import('fs');
    const outputPath = './audit-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[AUDIT] 完整结果已保存到: ${outputPath}`);
    
    // 输出 JSON 供 batch_decision 使用
    console.log('\n[JSON_OUTPUT]');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('[AUDIT] 审计执行失败:', error);
    process.exit(1);
  }
}

main();
