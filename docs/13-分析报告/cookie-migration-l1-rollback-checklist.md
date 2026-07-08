# L1 回滚验证 Checklist — Cookie 模式 → Header 模式

> **用途**: Cookie 迁移 Phase 2 上线后如发现异常，按本 Checklist 执行 L1 回滚（Feature Flag 切换）并逐项验证。
>
> **执行人**: 运维 / 值班开发 | **预计耗时**: 10 分钟 | **回滚方式**: 改 env + rebuild + restart
>
> **关联文档**: [Cookie 迁移 Phase 2 实施计划](./cookie-migration-phase-2-implementation-plan.md) 第七章

---

## 〇、回滚决策确认

回滚前确认符合以下任一触发条件：

- [ ] 登录失败率 > 5%（5 分钟窗口）
- [ ] API 401 错误率 > 10%（5 分钟窗口）
- [ ] refresh 端点 401 率 > 20%
- [ ] 用户投诉"频繁掉线" > 3 例/小时
- [ ] Safari/Edge 特定浏览器登录失败（任何复现）
- [ ] 其他经值班判断需立即回滚的异常

**触发条件记录**:
```
异常现象: _______________________________________________
开始时间: _______________________________________________
影响范围: _______________________________________________
决策人:   _______________________________________________
```

---

## 一、回滚前状态快照（30 秒）

在回滚前捕获当前 cookie 模式的异常状态，用于事后分析。

### 1.1 捕获当前 Feature Flag 值
```bash
# 查看当前 .env 中的 AUTH_COOKIE_MODE 配置
grep NEXT_PUBLIC_AUTH_COOKIE_MODE .env .env.local .env.production 2>/dev/null
```
记录输出: _______________________________________________

### 1.2 捕获当前服务状态
```bash
# 健康检查
curl -s http://localhost:5000/api/health | jq .

# 记录关键字段
# status: __________  version: __________  environment: __________
```

### 1.3 捕获错误日志摘要
```bash
# 最近 5 分钟的 401 错误计数
pm2 logs erp --lines 200 --nostream 2>&1 | grep -c "401"
# 记录: __________ 次

# 最近 5 分钟的登录失败计数
pm2 logs erp --lines 200 --nostream 2>&1 | grep -c "login.*fail\|密码错误"
# 记录: __________ 次
```

---

## 二、执行 L1 回滚（3 分钟）

### 2.1 修改环境变量

```bash
# 确保 .env 中 AUTH_COOKIE_MODE 为 header（或删除该行）
# 方法 A：直接修改（推荐）
sed -i 's/^NEXT_PUBLIC_AUTH_COOKIE_MODE=.*/NEXT_PUBLIC_AUTH_COOKIE_MODE=header/' .env

# 方法 B：如该行不存在则追加
echo 'NEXT_PUBLIC_AUTH_COOKIE_MODE=header' >> .env

# 验证修改
grep NEXT_PUBLIC_AUTH_COOKIE_MODE .env
# 预期输出: NEXT_PUBLIC_AUTH_COOKIE_MODE=header
```

- [ ] `.env` 中 `NEXT_PUBLIC_AUTH_COOKIE_MODE=header` 已确认

### 2.2 重新构建

```bash
# Feature Flag 在 build 时固化，必须 rebuild
pnpm build 2>&1 | tail -20

# 预期: Build completed / Compiled successfully
# 记录构建耗时: __________ 秒
```

- [ ] 构建成功，无报错

### 2.3 重启服务

```bash
# PM2 方式
pm2 restart all
# 或 Docker 方式
# docker-compose restart web

# 验证服务启动
sleep 3
curl -s http://localhost:5000/api/health | jq -r '.status'
# 预期: healthy
```

- [ ] 服务重启后 `/api/health` 返回 `healthy`

---

## 三、回滚后验证（5 分钟）

### 3.1 构建产物验证

```bash
# 验证 bundle 中 cookie 模式分支已被 tree-shaking 移除
grep -rl "AUTH_COOKIE_MODE" .next/static/chunks/ 2>/dev/null | wc -l
# 预期: 0（或仅匹配到 false 分支的死代码）
```

- [ ] 构建产物中无 cookie 模式活跃代码

### 3.2 API 全流程验证（curl）

依次执行以下 4 个 curl 命令，每个记录结果。

**测试 1: 登录**
```bash
LOGIN_RESP=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')

echo "$LOGIN_RESP" | jq '{success, token: (.data.token // "")[:20], userId: .data.user.id}'
# 预期: {"success": true, "token": "eyJhbGciOiJIUzI1Ni...", "userId": 1}
```
- [ ] 登录成功，返回 token 和 userId
- 记录: _______________________________________________

**测试 2: 受保护 API（Authorization header 模式）**
```bash
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.token')

curl -s http://localhost:5000/api/auth/menus \
  -H "Authorization: Bearer $TOKEN" | jq '{success, menuCount: (.data | length)}'
# 预期: {"success": true, "menuCount": <数字>}
```
- [ ] menus API 用 Authorization header 访问成功
- 记录 menu 数量: __________

**测试 3: Refresh token（body 传参模式）**
```bash
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.refreshToken')
USER_ID=$(echo "$LOGIN_RESP" | jq -r '.data.user.id')

curl -s -X POST http://localhost:5000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\",\"userId\":\"$USER_ID\"}" | jq '{success, newToken: (.data.token // "")[:20]}'
# 预期: {"success": true, "newToken": "eyJhbGciOiJIUzI1Ni..."}
```
- [ ] refresh 用 body 传参成功，返回新 token
- 记录: _______________________________________________

**测试 4: 登出**
```bash
curl -s -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq '{success}'
# 预期: {"success": true}
```
- [ ] 登出成功
- 记录: _______________________________________________

### 3.3 浏览器运行时验证

打开浏览器访问 `http://localhost:5000`，登录后执行以下 Console 检查：

**Console 检查 1: Feature Flag 值**
```js
console.log('Flag:', process.env.NEXT_PUBLIC_AUTH_COOKIE_MODE)
// 预期: 'header' 或 undefined
```
- [ ] 返回 `'header'` 或 `undefined`

**Console 检查 2: localStorage 有 token**
```js
console.log('token:', localStorage.getItem('token')?.substring(0, 20) + '...')
// 预期: token: eyJhbGciOiJIUzI1Ni...
```
- [ ] localStorage 中有 token（JWT 字符串）

**Console 检查 3: localStorage 无 token（cookie 模式残留检查）**
```js
// header 模式下 token 应存在；如为空说明回滚未生效
if (!localStorage.getItem('token')) {
  console.error('FAIL: localStorage 无 token，回滚未生效！')
} else {
  console.log('OK: localStorage token 已恢复')
}
```
- [ ] 输出 `OK: localStorage token 已恢复`

**Network 面板检查 4: Authorization header**
```
操作: 在页面上执行任意操作触发 API 请求（如刷新页面、点击菜单）
检查: Network 面板 → 任意 API 请求 → Request Headers
预期: Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```
- [ ] API 请求包含 `Authorization: Bearer` header

**Network 面板检查 5: CSRF header（POST 请求）**
```
操作: 触发任意 POST 请求（如保存表单）
检查: Network 面板 → POST 请求 → Request Headers
预期: X-CSRF-Token: <token 值>
```
- [ ] POST 请求包含 `X-CSRF-Token` header

**DevTools 检查 6: Cookie 状态（无害残留）**
```
操作: DevTools → Application → Cookies → http://localhost:5000
预期: access_token 仍可能存在（后端仍下发，无害）
注意: 这不是问题 — header 模式优先读 Authorization header，Cookie 仅作兜底
```
- [ ] 已确认 Cookie 残留无害（不影响 header 模式正常工作）

### 3.4 E2E 自动化验证（可选，如时间允许）

```bash
# 跑核心 E2E（header 模式下应全绿）
pnpm exec playwright test tests/e2e/auth.spec.ts --project=chromium 2>&1 | tail -10
# 预期: All tests passed
```
- [ ] auth E2E 全部通过

---

## 四、监控指标回归确认（15-30 分钟后）

回滚后观察 15-30 分钟，确认指标恢复正常：

| 指标 | 回滚前异常值 | 回滚后观察值 | 是否恢复 | 确认人 |
|------|------------|------------|----------|--------|
| 登录失败率 | >5% | ________ % | [ ] | ________ |
| API 401 率 | >10% | ________ % | [ ] | ________ |
| refresh 401 率 | >20% | ________ % | [ ] | ________ |
| 用户投诉 | >3 例/h | ________ 例 | [ ] | ________ |

---

## 五、回滚完成确认

所有以下条件满足时，回滚视为成功：

- [ ] 2.1-2.3 执行步骤全部完成
- [ ] 3.1 构建产物验证通过
- [ ] 3.2 API 全流程 4/4 测试通过
- [ ] 3.3 浏览器运行时 6/6 检查通过
- [ ] 3.4 E2E 测试通过（如执行）
- [ ] 4. 监控指标 15-30 分钟后恢复正常

**回滚完成签字**:
```
回滚开始时间: _______________________________________________
回滚完成时间: _______________________________________________
总耗时:       _______________________________________________
执行人签字:   _______________________________________________
复核人签字:   _______________________________________________

后续行动:
  [ ] 创建事故报告（含根因分析）
  [ ] 在 Staging 复现问题并修复
  [ ] 修复后重新灰度 cookie 模式
  [ ] 更新 Runbook
```

---

## 附录: 常见问题排查

### Q1: 回滚后用户仍报登录失败
**可能原因**: 用户浏览器缓存了 cookie 模式的 JS bundle
**解决**: 让用户硬刷新（Ctrl+Shift+R）或清除浏览器缓存

### Q2: 回滚后 API 仍返回 401
**可能原因**: 服务未正确重启，或构建产物未更新
**解决**:
```bash
# 确认服务已重启
pm2 status
# 确认构建时间是最新的
ls -la .next/BUILD_ID
# 强制重启
pm2 delete all && pm2 start ecosystem.config.js
```

### Q3: 回滚后 refresh 仍走 cookie 模式
**可能原因**: refresh 路由的 cookie 读取逻辑是后端代码，不受 Feature Flag 控制
**说明**: 这是预期行为 — 后端 extractToken 和 refresh 路由的 cookie 支持是 Phase 1 改动，向后兼容，不影响 header 模式正常工作

### Q4: curl 测试 3（refresh）返回 401
**可能原因**: refreshToken 已过期或被登出清除
**解决**: 重新执行测试 1（登录）获取新的 refreshToken，再执行测试 3

### Q5: L1 回滚后问题仍存在
**行动**: 执行 L2 回滚（代码层）— `git revert` Phase 2 commit，详见 [Phase 2 实施计划](./cookie-migration-phase-2-implementation-plan.md) 第七章 L2 回滚章节
