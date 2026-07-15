import { query } from '../src/lib/db';

(async () => {
  const rows = await query(`SELECT config_key, config_value FROM sys_config WHERE config_key IN ('sys.name', 'company.name', 'company_name', 'company_short_name')`);
  console.log(JSON.stringify(rows, null, 2));
})();