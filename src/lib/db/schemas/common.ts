import {
  bigint,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
export const sysCurrency = mysqlTable(
  'sys_currency',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 10 }).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 10 }),
    decimalPlaces: tinyint('decimal_places').default(2),
    status: tinyint('status').default(1),
    sort: int('sort').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    currencyCodeIdx: uniqueIndex('uk_currency_code').on(table.code),
  })
);

export const sysExchangeRate = mysqlTable(
  'sys_exchange_rate',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    fromCurrency: varchar('from_currency', { length: 10 }).notNull(),
    toCurrency: varchar('to_currency', { length: 10 }).notNull(),
    rate: decimal('rate', { precision: 18, scale: 6 }).notNull(),
    rateDate: date('rate_date').notNull(),
    source: varchar('source', { length: 50 }).default('manual'),
    remark: varchar('remark', { length: 200 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  },
  (table) => ({
    fromToDateIdx: index('idx_from_to_date').on(
      table.fromCurrency,
      table.toCurrency,
      table.rateDate
    ),
    dateIdx: index('idx_date').on(table.rateDate),
  })
);

export const sysDepartment = mysqlTable(
  'sys_department',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 50 }),
    name: varchar('name', { length: 100 }).notNull(),
    parentId: bigint('parent_id', { mode: 'number', unsigned: true }),
    sortOrder: int('sort_order').default(0),
    managerName: varchar('manager_name', { length: 50 }),
    description: varchar('description', { length: 200 }),
    status: tinyint('status').default(1),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    parentIdx: index('idx_dept_parent').on(table.parentId),
  })
);

export const sysEmployee = mysqlTable(
  'sys_employee',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeNo: varchar('employee_no', { length: 50 }),
    name: varchar('name', { length: 100 }).notNull(),
    gender: tinyint('gender').default(1),
    age: int('age'),
    idCard: varchar('id_card', { length: 20 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    deptId: bigint('dept_id', { mode: 'number', unsigned: true }),
    deptName: varchar('dept_name', { length: 100 }),
    section: varchar('section', { length: 100 }),
    roleId: bigint('role_id', { mode: 'number', unsigned: true }),
    roleName: varchar('role_name', { length: 100 }),
    position: varchar('position', { length: 100 }),
    entryDate: date('entry_date'),
    birthDate: date('birth_date'),
    nativePlace: varchar('native_place', { length: 100 }),
    homeAddress: varchar('home_address', { length: 255 }),
    currentAddress: varchar('current_address', { length: 255 }),
    education: varchar('education', { length: 50 }),
    photo: varchar('photo', { length: 255 }),
    skillLevel: int('skill_level').default(1),
    contractType: varchar('contract_type', { length: 20 }),
    contractStart: date('contract_start'),
    contractEnd: date('contract_end'),
    bankAccount: varchar('bank_account', { length: 50 }),
    emergencyContact: varchar('emergency_contact', { length: 50 }),
    emergencyPhone: varchar('emergency_phone', { length: 20 }),
    remark: text('remark'),
    status: tinyint('status').default(1),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    deptIdx: index('idx_emp_dept').on(table.deptId),
    statusIdx: index('idx_emp_status').on(table.status, table.deleted),
    employeeNoIdx: index('idx_emp_no').on(table.employeeNo),
  })
);

export const sysSalary = mysqlTable(
  'sys_salary',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    month: varchar('month', { length: 7 }).notNull(),
    basicSalary: decimal('basic_salary', { precision: 10, scale: 2 }).default('0.00'),
    positionAllowance: decimal('position_allowance', { precision: 10, scale: 2 }).default('0.00'),
    performanceBonus: decimal('performance_bonus', { precision: 10, scale: 2 }).default('0.00'),
    overtimePay: decimal('overtime_pay', { precision: 10, scale: 2 }).default('0.00'),
    otherBonus: decimal('other_bonus', { precision: 10, scale: 2 }).default('0.00'),
    socialSecurity: decimal('social_security', { precision: 10, scale: 2 }).default('0.00'),
    housingFund: decimal('housing_fund', { precision: 10, scale: 2 }).default('0.00'),
    personalTax: decimal('personal_tax', { precision: 10, scale: 2 }).default('0.00'),
    otherDeduction: decimal('other_deduction', { precision: 10, scale: 2 }).default('0.00'),
    actualSalary: decimal('actual_salary', { precision: 10, scale: 2 }).default('0.00'),
    remark: text('remark'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    empMonthIdx: index('idx_sal_emp_month').on(table.employeeId, table.month),
    monthIdx: index('idx_sal_month').on(table.month),
  })
);

export const sagaLog = mysqlTable(
  'saga_log',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    sagaId: varchar('saga_id', { length: 64 }).notNull(),
    sagaType: varchar('saga_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    payload: text('payload'),
    steps: text('steps'),
    errorMessage: text('error_message'),
    createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    sagaIdIdx: uniqueIndex('uk_saga_id').on(table.sagaId),
    typeIdx: index('idx_saga_type').on(table.sagaType),
    statusIdx: index('idx_saga_status').on(table.status),
  })
);

export const sysWarehouseCategory = mysqlTable(
  'sys_warehouse_category',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    sortOrder: int('sort_order', { unsigned: true }).default(0),
    status: tinyint('status').notNull().default(1),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    codeIdx: uniqueIndex('uk_code').on(table.code),
    statusIdx: index('idx_status').on(table.status),
    deletedIdx: index('idx_deleted').on(table.deleted),
  })
);
