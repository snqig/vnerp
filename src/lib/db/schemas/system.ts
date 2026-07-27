import {
  bigint,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const sysUser = mysqlTable(
  'sys_user',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    realName: varchar('real_name', { length: 50 }),
    avatar: varchar('avatar', { length: 255 }),
    email: varchar('email', { length: 100 }),
    phone: varchar('phone', { length: 20 }),
    departmentId: bigint('department_id', { mode: 'number', unsigned: true }),
    status: tinyint('status').default(1),
    firstLogin: tinyint('first_login').default(1),
    loginFailCount: int('login_fail_count').default(0),
    lockTime: datetime('lock_time'),
    pwdUpdateTime: datetime('pwd_update_time'),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    lastLoginTime: datetime('last_login_time'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    usernameIdx: uniqueIndex('uk_username').on(table.username),
    deptIdx: index('idx_user_dept').on(table.departmentId),
    statusIdx: index('idx_user_status').on(table.status, table.deleted),
  })
);

export const sysRole = mysqlTable(
  'sys_role',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    roleCode: varchar('role_code', { length: 50 }).notNull().unique(),
    roleName: varchar('role_name', { length: 50 }).notNull(),
    description: varchar('description', { length: 200 }),
    dataScope: varchar('data_scope', { length: 20 }).default('self'),
    status: tinyint('status').default(1),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    codeIdx: uniqueIndex('uk_role_code').on(table.roleCode),
    statusIdx: index('idx_role_status').on(table.status, table.deleted),
  })
);

export const sysMenu = mysqlTable(
  'sys_menu',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    menuName: varchar('menu_name', { length: 50 }).notNull(),
    menuCode: varchar('menu_code', { length: 50 }),
    menuType: varchar('menu_type', { length: 1 }).default('M'),
    parentId: bigint('parent_id', { mode: 'number', unsigned: true }).default(0),
    path: varchar('path', { length: 200 }),
    component: varchar('component', { length: 200 }),
    permission: varchar('permission', { length: 100 }),
    icon: varchar('icon', { length: 50 }),
    sortOrder: int('sort_order').default(0),
    status: tinyint('status').default(1),
    isVisible: tinyint('is_visible').default(1),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    codeIdx: uniqueIndex('uk_menu_code').on(table.menuCode),
    parentIdx: index('idx_menu_parent').on(table.parentId),
    sortIdx: index('idx_menu_sort').on(table.sortOrder),
    statusIdx: index('idx_menu_status').on(table.status, table.deleted),
  })
);

export const sysUserRole = mysqlTable(
  'sys_user_role',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
    roleId: bigint('role_id', { mode: 'number', unsigned: true }).notNull(),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userRoleIdx: uniqueIndex('uk_user_role').on(table.userId, table.roleId),
    userIdx: index('idx_user_role_user').on(table.userId),
    roleIdx: index('idx_user_role_role').on(table.roleId),
  })
);

export const sysRoleMenu = mysqlTable(
  'sys_role_menu',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    roleId: bigint('role_id', { mode: 'number', unsigned: true }).notNull(),
    menuId: bigint('menu_id', { mode: 'number', unsigned: true }).notNull(),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    roleMenuIdx: uniqueIndex('uk_role_menu').on(table.roleId, table.menuId),
    roleIdx: index('idx_role_menu_role').on(table.roleId),
    menuIdx: index('idx_role_menu_menu').on(table.menuId),
  })
);

export const sysConfig = mysqlTable(
  'sys_config',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    configKey: varchar('config_key', { length: 100 }).notNull().unique(),
    configValue: text('config_value'),
    description: varchar('description', { length: 200 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex('uk_config_key').on(table.configKey),
  })
);

export const sysLoginLog = mysqlTable(
  'sys_login_log',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    username: varchar('username', { length: 50 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    status: tinyint('status').default(1),
    errorMsg: varchar('error_msg', { length: 255 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index('idx_login_log_user').on(table.username),
    timeIdx: index('idx_login_log_time').on(table.createTime),
    statusIdx: index('idx_login_log_status').on(table.status),
  })
);

export const sysNotification = mysqlTable(
  'sys_notification',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    type: varchar('type', { length: 20 }).default('system'),
    title: varchar('title', { length: 100 }).notNull(),
    content: text('content'),
    userId: bigint('user_id', { mode: 'number', unsigned: true }),
    isRead: tinyint('is_read').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index('idx_notification_user').on(table.userId),
    readIdx: index('idx_notification_read').on(table.isRead),
    typeIdx: index('idx_notification_type').on(table.type),
  })
);

export const sysDataScope = mysqlTable(
  'sys_data_scope',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    roleId: bigint('role_id', { mode: 'number', unsigned: true }).notNull(),
    scopeType: varchar('scope_type', { length: 20 }).notNull(),
    targetIds: text('target_ids'),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    roleIdx: index('idx_data_scope_role').on(table.roleId),
    typeIdx: index('idx_data_scope_type').on(table.scopeType),
  })
);

export type SysUser = typeof sysUser.$inferSelect;
export type SysRole = typeof sysRole.$inferSelect;
export type SysMenu = typeof sysMenu.$inferSelect;
export type SysUserRole = typeof sysUserRole.$inferSelect;
export type SysRoleMenu = typeof sysRoleMenu.$inferSelect;
export type SysConfig = typeof sysConfig.$inferSelect;
export type SysLoginLog = typeof sysLoginLog.$inferSelect;
export type SysNotification = typeof sysNotification.$inferSelect;
export type SysDataScope = typeof sysDataScope.$inferSelect;
