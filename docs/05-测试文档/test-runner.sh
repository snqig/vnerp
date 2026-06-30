#!/bin/bash
# VNERP 测试执行脚本
# 用法: ./test-runner.sh [unit|integration|e2e|all]

set -e

ENV=${1:-all}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="test-reports/$TIMESTAMP"

mkdir -p $REPORT_DIR

echo "========================================="
echo " VNERP 测试执行器"
echo " 模式: $ENV"
echo " 时间: $TIMESTAMP"
echo "========================================="

run_unit_tests() {
  echo ""
  echo "--- 运行单元测试 ---"
  pnpm test:unit:run 2>&1 | tee "$REPORT_DIR/unit-test.log"
  echo "单元测试完成"
}

run_integration_tests() {
  echo ""
  echo "--- 运行集成测试 ---"
  # 初始化测试数据库
  mysql -u root -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS vnerp_test DEFAULT CHARSET utf8mb4;"
  mysql -u root -p"$DB_PASSWORD" vnerp_test < docs/harness/fixtures/base-data.sql
  mysql -u root -p"$DB_PASSWORD" vnerp_test < docs/harness/fixtures/production-data.sql
  mysql -u root -p"$DB_PASSWORD" vnerp_test < docs/harness/fixtures/warehouse-data.sql

  # 运行集成测试
  pnpm vitest run --config vitest.integration.config.ts 2>&1 | tee "$REPORT_DIR/integration-test.log"
  echo "集成测试完成"
}

run_e2e_tests() {
  echo ""
  echo "--- 运行E2E测试 ---"
  pnpm test 2>&1 | tee "$REPORT_DIR/e2e-test.log"
  echo "E2E测试完成"
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
    run_integration_tests
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
    run_integration_tests
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
