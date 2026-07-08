const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'vnerpdacahng',
  });

  await c.execute('DELETE FROM hr_attendance');

  const [depts] = await c.execute('SELECT id, dept_name FROM sys_department WHERE deleted = 0');
  const deptMap = {};
  for (const d of depts) {
    deptMap[d.id] = d.dept_name;
  }

  const [users] = await c.execute('SELECT id, username, real_name, department_id FROM sys_user WHERE (deleted = 0 OR deleted IS NULL) AND id > 1');

  const employees = users.map(u => ({
    id: u.id,
    employeeId: u.username,
    employeeName: u.real_name,
    departmentName: deptMap[u.department_id] || '管理部',
  }));

  if (employees.length === 0) {
    console.log('No employees found, using defaults');
    employees.push(
      { employeeId: 'EMP001', employeeName: '张三', departmentName: '生产部' },
      { employeeId: 'EMP002', employeeName: '李四', departmentName: '生产部' },
      { employeeId: 'EMP003', employeeName: '王五', departmentName: '品质部' },
      { employeeId: 'EMP004', employeeName: '赵六', departmentName: '采购部' },
      { employeeId: 'EMP005', employeeName: '孙七', departmentName: '业务部' },
      { employeeId: 'EMP006', employeeName: '周八', departmentName: '管理部' },
      { employeeId: 'EMP007', employeeName: '吴九', departmentName: '打样中心' },
    );
  }

  console.log(`Found ${employees.length} employees`);
  console.log('Departments:', [...new Set(employees.map(e => e.departmentName))].join(', '));

  const today = new Date();
  const records = [];

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = date.toISOString().slice(0, 10);

    for (const emp of employees) {
      const rand = Math.random();
      let status, checkIn, checkOut, workingHours, overtimeHours, remark;

      if (rand < 0.75) {
        status = 'normal';
        const inMinute = 7 * 60 + 45 + Math.floor(Math.random() * 15);
        const outMinute = 17 * 60 + 25 + Math.floor(Math.random() * 15);
        checkIn = `${String(Math.floor(inMinute / 60)).padStart(2, '0')}:${String(inMinute % 60).padStart(2, '0')}`;
        checkOut = `${String(Math.floor(outMinute / 60)).padStart(2, '0')}:${String(outMinute % 60).padStart(2, '0')}`;
        workingHours = Math.round(((outMinute - inMinute) / 60) * 100) / 100;
        overtimeHours = outMinute > 17 * 60 + 30 ? Math.round(((outMinute - 17 * 60 - 30) / 60) * 100) / 100 : 0;
        remark = '';
      } else if (rand < 0.88) {
        status = 'late';
        const inMinute = 8 * 60 + 31 + Math.floor(Math.random() * 30);
        const outMinute = 17 * 60 + 25 + Math.floor(Math.random() * 15);
        checkIn = `${String(Math.floor(inMinute / 60)).padStart(2, '0')}:${String(inMinute % 60).padStart(2, '0')}`;
        checkOut = `${String(Math.floor(outMinute / 60)).padStart(2, '0')}:${String(outMinute % 60).padStart(2, '0')}`;
        workingHours = Math.round(((outMinute - inMinute) / 60) * 100) / 100;
        overtimeHours = 0;
        remark = '迟到';
      } else if (rand < 0.95) {
        status = 'absent';
        checkIn = null;
        checkOut = null;
        workingHours = 0;
        overtimeHours = 0;
        remark = '缺勤';
      } else {
        status = 'leave';
        checkIn = null;
        checkOut = null;
        workingHours = 0;
        overtimeHours = 0;
        remark = ['年假', '事假', '病假'][Math.floor(Math.random() * 3)];
      }

      records.push([
        dateStr,
        emp.employeeId,
        emp.id || null,
        emp.employeeName,
        emp.departmentName,
        checkIn,
        checkOut,
        status,
        workingHours,
        overtimeHours,
        remark,
      ]);
    }
  }

  console.log(`\nInserting ${records.length} attendance records...`);

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = batch.flat();
    await c.execute(
      `INSERT INTO hr_attendance (attendance_date, employee_id, employee_id_int, employee_name, department_name, check_in_time, check_out_time, status, working_hours, overtime_hours, remark) VALUES ${placeholders}`,
      values
    );
  }

  const [result] = await c.execute('SELECT COUNT(*) as cnt FROM hr_attendance');
  console.log(`\nDone! Total attendance records: ${result[0].cnt}`);

  const [stats] = await c.execute('SELECT status, COUNT(*) as cnt FROM hr_attendance GROUP BY status');
  console.log('\nStatus distribution:');
  for (const s of stats) {
    console.log(`  ${s.status}: ${s.cnt}`);
  }

  const [deptStats] = await c.execute('SELECT department_name, COUNT(*) as cnt FROM hr_attendance GROUP BY department_name');
  console.log('\nDepartment distribution:');
  for (const d of deptStats) {
    console.log(`  ${d.department_name}: ${d.cnt}`);
  }

  await c.end();
}

main().catch(console.error);
