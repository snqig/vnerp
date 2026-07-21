import { bigint, date, datetime, decimal, index, int, mysqlTable, text, tinyint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const hrAttendance = mysqlTable(
  'hr_attendance',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    attendanceDate: date('attendance_date').notNull(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }),
    employeeName: varchar('employee_name', { length: 100 }),
    departmentName: varchar('department_name', { length: 100 }),
    checkInTime: varchar('check_in_time', { length: 10 }),
    checkOutTime: varchar('check_out_time', { length: 10 }),
    status: varchar('status', { length: 20 }).default('normal'),
    workingHours: decimal('working_hours', { precision: 5, scale: 2 }),
    overtimeHours: decimal('overtime_hours', { precision: 5, scale: 2 }),
    shiftId: bigint('shift_id', { mode: 'number', unsigned: true }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    empIdx: index('idx_att_employee').on(table.employeeId),
    dateIdx: index('idx_att_date').on(table.attendanceDate),
    statusIdx: index('idx_att_status').on(table.status),
  })
);

export const hrTraining = mysqlTable(
  'hr_training',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    trainingNo: varchar('training_no', { length: 50 }).notNull(),
    trainingName: varchar('training_name', { length: 200 }).notNull(),
    trainingType: tinyint('training_type'),
    trainingDate: date('training_date'),
    trainingHours: decimal('training_hours', { precision: 5, scale: 1 }),
    trainer: varchar('trainer', { length: 100 }),
    trainingContent: text('training_content'),
    trainingPlace: varchar('training_place', { length: 200 }),
    status: tinyint('status').default(0),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    noIdx: uniqueIndex('idx_tr_no').on(table.trainingNo),
    dateIdx: index('idx_tr_date').on(table.trainingDate),
  })
);

export const hrTrainingParticipant = mysqlTable(
  'hr_training_participant',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    trainingId: bigint('training_id', { mode: 'number', unsigned: true }).notNull(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }),
    employeeName: varchar('employee_name', { length: 100 }),
    score: decimal('score', { precision: 5, scale: 1 }),
    isQualified: tinyint('is_qualified'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    trIdx: index('idx_tp_training').on(table.trainingId),
    empIdx: index('idx_tp_employee').on(table.employeeId),
  })
);

export const hrSalaryStandard = mysqlTable(
  'hr_salary_standard',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    positionCode: varchar('position_code', { length: 50 }).notNull(),
    skillLevel: int('skill_level').default(1),
    baseSalary: decimal('base_salary', { precision: 10, scale: 2 }).default('0.00'),
    pieceRateType: varchar('piece_rate_type', { length: 20 }),
    performanceBase: decimal('performance_base', { precision: 10, scale: 2 }).default('0.00'),
    allowanceNight: decimal('allowance_night', { precision: 10, scale: 2 }).default('0.00'),
    allowanceHighTemp: decimal('allowance_high_temp', { precision: 10, scale: 2 }).default('0.00'),
    effectiveDate: date('effective_date').notNull(),
    factoryId: bigint('factory_id', { mode: 'number', unsigned: true }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    posIdx: index('idx_ss_position').on(table.positionCode),
    effIdx: index('idx_ss_effective').on(table.effectiveDate),
  })
);

export const hrPieceRate = mysqlTable(
  'hr_piece_rate',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    processCode: varchar('process_code', { length: 50 }).notNull(),
    productType: varchar('product_type', { length: 50 }),
    unitPrice: decimal('unit_price', { precision: 10, scale: 4 }).notNull().default('0.0000'),
    unit: varchar('unit', { length: 20 }).default('件'),
    qualityThreshold: decimal('quality_threshold', { precision: 5, scale: 2 }).default('0.00'),
    effectiveDate: date('effective_date').notNull(),
    factoryId: bigint('factory_id', { mode: 'number', unsigned: true }),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    procIdx: index('idx_pr_process').on(table.processCode),
    prodIdx: index('idx_pr_product').on(table.productType),
  })
);

export const hrSalaryProfile = mysqlTable(
  'hr_salary_profile',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    salaryType: varchar('salary_type', { length: 20 }).default('mixed'),
    baseSalary: decimal('base_salary', { precision: 10, scale: 2 }).default('0.00'),
    socialInsuranceBase: decimal('social_insurance_base', { precision: 10, scale: 2 }).default('0.00'),
    housingFundRate: decimal('housing_fund_rate', { precision: 5, scale: 2 }).default('0.00'),
    taxDeduction: decimal('tax_deduction', { precision: 10, scale: 2 }).default('0.00'),
    bankAccount: varchar('bank_account', { length: 50 }),
    bankName: varchar('bank_name', { length: 100 }),
    effectiveDate: date('effective_date').notNull(),
    status: tinyint('status').default(1),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    empIdx: index('idx_sp_employee').on(table.employeeId),
    effIdx: index('idx_sp_effective').on(table.effectiveDate),
  })
);

export const hrSalaryCalculation = mysqlTable(
  'hr_salary_calculation',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    calcMonth: varchar('calc_month', { length: 7 }).notNull(),

    baseSalary: decimal('base_salary', { precision: 10, scale: 2 }).default('0.00'),
    pieceSalary: decimal('piece_salary', { precision: 10, scale: 2 }).default('0.00'),
    overtimeSalary: decimal('overtime_salary', { precision: 10, scale: 2 }).default('0.00'),
    performanceSalary: decimal('performance_salary', { precision: 10, scale: 2 }).default('0.00'),
    allowances: decimal('allowances', { precision: 10, scale: 2 }).default('0.00'),

    socialInsurancePersonal: decimal('social_insurance_personal', { precision: 10, scale: 2 }).default('0.00'),
    housingFundPersonal: decimal('housing_fund_personal', { precision: 10, scale: 2 }).default('0.00'),
    individualTax: decimal('individual_tax', { precision: 10, scale: 2 }).default('0.00'),
    attendanceDeduction: decimal('attendance_deduction', { precision: 10, scale: 2 }).default('0.00'),
    otherDeduction: decimal('other_deduction', { precision: 10, scale: 2 }).default('0.00'),

    grossPay: decimal('gross_pay', { precision: 10, scale: 2 }).default('0.00'),
    totalDeduction: decimal('total_deduction', { precision: 10, scale: 2 }).default('0.00'),
    netPay: decimal('net_pay', { precision: 10, scale: 2 }).default('0.00'),

    status: varchar('status', { length: 20 }).default('draft'),
    calcLog: text('calc_log'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    empMonthUk: uniqueIndex('uk_sc_emp_month').on(table.employeeId, table.calcMonth),
    monthIdx: index('idx_sc_month').on(table.calcMonth),
    statusIdx: index('idx_sc_status').on(table.status),
  })
);

export const hrPieceWorkDetail = mysqlTable(
  'hr_piece_work_detail',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    workDate: date('work_date').notNull(),
    processCode: varchar('process_code', { length: 50 }).notNull(),
    productCode: varchar('product_code', { length: 50 }),
    quantity: int('quantity').default(0),
    defectiveQuantity: int('defective_quantity').default(0),
    unitPrice: decimal('unit_price', { precision: 10, scale: 4 }).notNull().default('0.0000'),
    amount: decimal('amount', { precision: 10, scale: 2 }),
    machineId: varchar('machine_id', { length: 50 }),
    mesSyncId: varchar('mes_sync_id', { length: 50 }),
    syncStatus: tinyint('sync_status').default(0),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    empDateIdx: index('idx_pw_emp_date').on(table.employeeId, table.workDate),
    dateIdx: index('idx_pw_date').on(table.workDate),
    processIdx: index('idx_pw_process').on(table.processCode),
    mesIdx: index('idx_pw_mes').on(table.mesSyncId),
  })
);

export const hrAttendanceException = mysqlTable(
  'hr_attendance_exception',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    exceptionDate: date('exception_date').notNull(),
    exceptionType: varchar('exception_type', { length: 20 }).notNull(),
    minutes: int('minutes').default(0),
    deductionAmount: decimal('deduction_amount', { precision: 10, scale: 2 }).default('0.00'),
    status: varchar('status', { length: 20 }).default('pending'),
    handlerId: bigint('handler_id', { mode: 'number', unsigned: true }),
    handleTime: datetime('handle_time'),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    empDateIdx: index('idx_ae_emp_date').on(table.employeeId, table.exceptionDate),
    typeIdx: index('idx_ae_type').on(table.exceptionType),
    statusIdx: index('idx_ae_status').on(table.status),
  })
);

export const hrShift = mysqlTable('hr_shift', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  shiftName: varchar('shift_name', { length: 50 }).notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(),
  endTime: varchar('end_time', { length: 5 }).notNull(),
  allowOvertime: tinyint('allow_overtime').default(1),
  overtimeRate: decimal('overtime_rate', { precision: 3, scale: 1 }).default('1.5'),
  nightAllowance: decimal('night_allowance', { precision: 10, scale: 2 }).default('0.00'),
  lateThreshold: int('late_threshold').default(15),
  earlyLeaveThreshold: int('early_leave_threshold').default(15),
  workingHours: decimal('working_hours', { precision: 4, scale: 1 }),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const hrSchedule = mysqlTable('hr_schedule', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
  scheduleDate: date('schedule_date').notNull(),
  shiftId: bigint('shift_id', { mode: 'number', unsigned: true }),
  scheduleType: varchar('schedule_type', { length: 20 }).default('normal'),
  source: varchar('source', { length: 20 }).default('manual'),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  empDateUk: uniqueIndex('uk_sc_emp_date').on(table.employeeId, table.scheduleDate),
  dateIdx: index('idx_sc_date').on(table.scheduleDate),
}));

export const orgGroup = mysqlTable('org_group', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const orgLegalEntity = mysqlTable('org_legal_entity', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  groupId: bigint('group_id', { mode: 'number', unsigned: true }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  taxId: varchar('tax_id', { length: 50 }),
  legalPerson: varchar('legal_person', { length: 50 }),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const orgFactory = mysqlTable('org_factory', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  legalEntityId: bigint('legal_entity_id', { mode: 'number', unsigned: true }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  address: varchar('address', { length: 255 }),
  contactPerson: varchar('contact_person', { length: 50 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const orgWorkshop = mysqlTable('org_workshop', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  factoryId: bigint('factory_id', { mode: 'number', unsigned: true }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  managerName: varchar('manager_name', { length: 50 }),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const orgTeam = mysqlTable('org_team', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  workshopId: bigint('workshop_id', { mode: 'number', unsigned: true }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  teamLeader: varchar('team_leader', { length: 50 }),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const orgPosition = mysqlTable('org_position', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  teamId: bigint('team_id', { mode: 'number', unsigned: true }),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  skillLevel: int('skill_level').default(1),
  baseSalaryRange: varchar('base_salary_range', { length: 50 }),
  sortOrder: int('sort_order').default(0),
  status: tinyint('status').default(1),
  remark: text('remark'),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  deleted: tinyint('deleted').default(0),
});

export const hrEmployeePosition = mysqlTable('hr_employee_position', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
  positionId: bigint('position_id', { mode: 'number', unsigned: true }).notNull(),
  isPrimary: tinyint('is_primary').default(0),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: tinyint('status').default(1),
  createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
});

export const hrSkillMatrix = mysqlTable(
  'hr_skill_matrix',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    skillCode: varchar('skill_code', { length: 50 }).notNull(),
    skillName: varchar('skill_name', { length: 100 }).notNull(),
    skillCategory: varchar('skill_category', { length: 50 }),
    skillLevel: tinyint('skill_level').default(1),
    certified: tinyint('certified').default(0),
    certificateId: bigint('certificate_id', { mode: 'number', unsigned: true }),
    assessor: varchar('assessor', { length: 50 }),
    assessDate: date('assess_date'),
    nextAssessDate: date('next_assess_date'),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    empIdx: index('idx_sk_employee').on(table.employeeId),
    catIdx: index('idx_sk_category').on(table.skillCategory),
    lvlIdx: index('idx_sk_level').on(table.skillLevel),
  })
);

export const hrCertificate = mysqlTable(
  'hr_certificate',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    certName: varchar('cert_name', { length: 200 }).notNull(),
    certCode: varchar('cert_code', { length: 100 }),
    certType: varchar('cert_type', { length: 50 }),
    issueAuthority: varchar('issue_authority', { length: 200 }),
    issueDate: date('issue_date'),
    expiryDate: date('expiry_date'),
    remindDays: int('remind_days').default(30),
    status: tinyint('status').default(1),
    fileUrl: varchar('file_url', { length: 500 }),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    empIdx: index('idx_ce_employee').on(table.employeeId),
    typeIdx: index('idx_ce_type').on(table.certType),
    expiryIdx: index('idx_ce_expiry').on(table.expiryDate),
    statusIdx: index('idx_ce_status').on(table.status),
  })
);

export const hrPayrollSnapshot = mysqlTable(
  'hr_payroll_snapshot',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    payrollId: bigint('payroll_id', { mode: 'number', unsigned: true }).notNull(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    periodMonth: varchar('period_month', { length: 7 }).notNull(),
    sourceType: varchar('source_type', { length: 20 }),
    sourceId: bigint('source_id', { mode: 'number', unsigned: true }),
    payload: text('payload'),
    createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    payrollIdx: index('idx_ps_payroll').on(table.payrollId),
    employeePeriodIdx: index('idx_ps_employee_period').on(table.employeeId, table.periodMonth),
  })
);