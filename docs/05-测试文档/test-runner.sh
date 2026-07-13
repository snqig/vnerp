#!/bin/bash
# vnerp（印刷生产经营信息管理系统 Print MIS）测试执行脚本
# 用法: ./test-runner.sh [unit|integration|e2e|typecheck|lint|all]
#
# 依赖：
#   - pnpm（项目强制 only-allow pnpm）
#   - 本地 .env 中配置 DB_PASSWORD / REDIS_URL（Vitest setup-env.ts 自动加载）
#   - Playwright 浏览器：首次执行 `pnpm test:install`
#
# 退出码：任一阶段失败即非零退出（set -e）

set -e

ENV=${1:-all}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="test-reports/$TIMESTAMP"

mkdir -p "$REPORT_DIR"

echo "========================================="
echo " vnerp 测试执行器"
echo " 模式: $ENV"
echo " 时间: $TIMESTAMP"
echo " 报告目录: $REPORT_DIR"
echo "========================================="

# 单元 / 集成测试（Vitest，配置文件为 vitest.config.ts）
# 集成测试默认走 tests/integration/**/*.test.ts，由 vitest.config.ts 的 include 规则匹配
run_unit_tests() {
  echo ""
  echo "--- 运行单元 / 集成测试（Vitest） ---"
  pnpm test:unit:run 2>&1 | tee "$REPORT_DIR/unit-test.log"
  echo "单元 / 集成测试完成"
}

# E2E 测试（Playwright，配置文件为 playwright.config.ts）
# webServer 会自动启动 `pnpm run dev:webpack`（规避 Windows Turbopack nul 崩溃）
run_e2e_tests() {
  echo ""
  echo "--- 运行 E2E 测试（Playwright） ---"
  pnpm test 2>&1 | tee "$REPORT_DIR/e2e-test.log"
  echo "E2E 测试完成"
}

run_type_check() {
  echo ""
  echo "--- TypeScript 类型检查 ---"
  pnpm ts-check 2>&1 | tee "$REPORT_DIR/type-check.log"
  echo "类型检查完成"
}

run_lint() {
  echo ""
  echo "--- ESLint 代码检查 ---"
  pnpm lint 2>&1 | tee "$REPORT_DIR/lint.log"
  echo "代码检查完成"
}

case $ENV in
  unit)
    run_unit_tests
    ;;
  integration)
    # 与 unit 共用 vitest.config.ts；如需单独跑集成测试，可：
    # pnpm vitest run tests/integration
    run_unit_tests
    ;;
  e2e)
    run_e2e_tests
    ;;
  typecheck)
    run_type_check
    ;;
  lint)
    run_lint
    ;;
  all)
    run_type_check
    run_lint
    run_unit_tests
    run_e2e_tests
    ;;
  *)
    echo "未知模式: $ENV"
    echo "用法: $0 [unit|integration|e2e|typecheck|lint|all]"
    exit 1
    ;;
esac

echo ""
echo "========================================="
echo " 测试完成！报告目录: $REPORT_DIR"
echo "========================================="
