# 性能调优指南

> 文档编号：VNERP-WIKI-TECH-002 | 版本：V1.0 | 更新日期：2026-05-10

## 数据库优化

### 索引优化

```sql
-- 检查慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 20;

-- 检查索引使用情况
EXPLAIN SELECT * FROM qrcode_record WHERE material_id = 1 AND status = 1;

-- 添加缺失索引
ALTER TABLE qrcode_record ADD INDEX idx_material_status (material_id, status);
ALTER TABLE prd_work_order ADD INDEX idx_status_create (status, create_time);
```

### 查询优化

1. 避免 `SELECT *`，只查询需要的字段
2. 大数据量查询必须分页
3. 避免在 WHERE 条件中对字段使用函数
4. 使用 LIMIT 限制结果集
5. 复杂统计查询考虑使用物化视图

## 应用层优化

### Next.js 优化

1. 使用 `dynamic import` 按需加载大型组件
2. 使用 `Suspense` 和 `loading.tsx` 实现流式渲染
3. API 路由避免阻塞操作
4. 合理使用 `revalidate` 控制缓存

### 前端优化

1. 列表组件使用虚拟滚动（大数据量时）
2. 避免不必要的重渲染（使用 React.memo、useMemo）
3. 图片使用 Next.js Image 组件自动优化
4. 减少客户端 JavaScript 体积

## 连接池配置

```typescript
// db.ts 连接池配置
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,     // 根据服务器配置调整
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
```

## 监控指标

| 指标 | 阈值 | 监控方式 |
|------|------|---------|
| API 响应时间 | < 500ms (P95) | PM2 监控 |
| 数据库查询时间 | < 200ms (P95) | 慢查询日志 |
| 内存使用率 | < 85% | 系统监控 |
| CPU 使用率 | < 80% | 系统监控 |
| 数据库连接数 | < 连接池上限 | MySQL 监控 |
