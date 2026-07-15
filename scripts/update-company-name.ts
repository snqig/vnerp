import { query } from '../src/lib/db';

async function updateCompanyName() {
  try {
    console.log('正在更新公司名称配置...');
    
    await query(`
      UPDATE sys_config 
      SET config_value = 'VNERP丝网印刷管理系统', update_time = NOW()
      WHERE config_key IN ('sys.name', 'company.name', 'company_name', 'company_short_name')
    `);
    
    console.log('公司名称配置更新成功！');
    
    const rows = await query(`
      SELECT config_key, config_value 
      FROM sys_config 
      WHERE config_key IN ('sys.name', 'company.name', 'company_name', 'company_short_name')
    `);
    console.log('当前配置值:', JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('更新失败:', error);
  }
}

updateCompanyName();