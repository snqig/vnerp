#!/usr/bin/env python
"""
批量访问所有页面，收集实际显示在页面上的原始 i18n 键（如 Common.priority 格式）。
只收集用户能看到的缺失键，比静态分析更精准。
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

# 路由列表
ROUTES = [
    "/", "/analysis/db-relations", "/base-data/material-category", "/business/contract-review",
    "/crm/analysis", "/crm/follow", "/dashboard", "/dashboard/ceo", "/dashboard/finance",
    "/dashboard/flow", "/dashboard/production", "/dashboard/quality", "/dashboard/sales",
    "/dashboard/warehouse", "/dcprint", "/dcprint/die", "/dcprint/ink", "/dcprint/ink-mixed",
    "/dcprint/ink-opening", "/dcprint/ink-usage", "/dcprint/labels", "/dcprint/process-cards",
    "/dcprint/screen-plate", "/dcprint/trace", "/delivery/vehicles", "/delivery/vehicles/new",
    "/engineering/sample-to-mass", "/engineering/sop", "/equipment", "/equipment/calibration",
    "/equipment/maintenance", "/equipment/repair", "/equipment/scrap", "/finance", "/finance/cost",
    "/finance/costs", "/finance/payables", "/finance/receivable", "/finance/receivables",
    "/finance/report", "/hr/attendance", "/hr/employee", "/hr/employee/query", "/hr/salary",
    "/hr/training", "/material-requisitions", "/modules", "/orders/bom", "/orders/bom/create",
    "/orders/customers", "/orders/customers/new", "/orders/products", "/orders/sales",
    "/outsource/issue", "/outsource/order", "/outsource/receive", "/outsource/settlement",
    "/plm/eco", "/plm/lifecycle", "/prepress/die-template", "/production/material-issue",
    "/production/material-return", "/production/mrp", "/production/orders", "/production/process",
    "/production/product-label", "/production/report", "/production/schedule", "/production/workorder",
    "/purchase/orders", "/purchase/request", "/purchase/request/form", "/purchase/request/new",
    "/purchase/return", "/purchase/suppliers", "/qrcode", "/quality/complaint", "/quality/final",
    "/quality/incoming", "/quality/lab-test", "/quality/process", "/quality/sgs", "/quality/spc",
    "/quality/supplier-audit", "/quality/trace", "/quality/unqualified", "/reports",
    "/sales/delivery", "/sales/reconciliation", "/sales/return", "/sample/management",
    "/sample/orders", "/sample/orders/new", "/sample/standard-card", "/sample/standard-card/input",
    "/sample/standard-card/input-v2", "/sample/standard-card/print", "/settings/announcement",
    "/settings/basics", "/settings/config", "/settings/dict", "/settings/login-log",
    "/settings/menus", "/settings/notice", "/settings/oper-log", "/settings/organization",
    "/settings/permissions", "/settings/profile", "/settings/roles", "/settings/scheduler",
    "/settings/seed-data", "/settings/system", "/settings/user", "/settings/users",
    "/settings/warehouse-category", "/srm/evaluation", "/warehouse", "/warehouse/batch",
    "/warehouse/cost", "/warehouse/inbound", "/warehouse/inbound-simple",
    "/warehouse/inbound/cutting", "/warehouse/inventory", "/warehouse/outbound",
    "/warehouse/production-inbound", "/warehouse/sales-outbound", "/warehouse/setup",
    "/warehouse/stock-adjust", "/warehouse/stocktaking", "/warehouse/transfer",
]

# 匹配 i18n 原始键格式：Namespace.key（如 Common.priority, Purchase.statusTransferred）
I18N_KEY_PATTERN = re.compile(r'\b([A-Z][a-zA-Z]+)\.([a-zA-Z][a-zA-Z0-9]*)\b')

# 排除一些常见的误报（文件路径、域名等）
FALSE_POSITIVES = {
    'React.Server', 'Node.Package', 'Next.js', 'ErrorBoundary',
}

BASE_URL = 'http://localhost:5000'

def scan_page(page, route):
    """访问页面，返回找到的原始 i18n 键集合"""
    url = f'{BASE_URL}{route}'
    try:
        page.goto(url, wait_until='networkidle', timeout=15000)
        page.wait_for_timeout(1500)
    except Exception as e:
        return set(), f'NAV_ERROR: {e}'

    try:
        text_content = page.inner_text('body')
    except:
        return set(), 'NO_BODY'

    # 查找所有 i18n 原始键
    found_keys = set()
    for match in I18N_KEY_PATTERN.finditer(text_content):
        namespace = match.group(1)
        key = match.group(2)
        full_key = f'{namespace}.{key}'

        # 排除误报
        if namespace in FALSE_POSITIVES:
            continue
        # 排除一些常见的非 i18n 模式
        if namespace in ('React', 'Node', 'Next', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'JSON', 'API', 'URL', 'DOM', 'SVG'):
            continue

        found_keys.add(full_key)

    return found_keys, None


def main():
    all_missing_keys = {}  # key -> [routes]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        total = len(ROUTES)
        for i, route in enumerate(ROUTES):
            # 进度输出到 stderr
            print(f'[{i+1}/{total}] {route}', file=sys.stderr, flush=True)

            keys, error = scan_page(page, route)

            if error:
                print(f'  ❌ {error}', file=sys.stderr)
                continue

            if keys:
                print(f'  ⚠️  Found {len(keys)} raw i18n keys', file=sys.stderr)
                for key in sorted(keys):
                    if key not in all_missing_keys:
                        all_missing_keys[key] = []
                    all_missing_keys[key].append(route)
            else:
                print(f'  ✅ OK', file=sys.stderr)

        browser.close()

    # 按 namespace 分组
    by_namespace = {}
    for key in all_missing_keys:
        namespace = key.split('.')[0]
        if namespace not in by_namespace:
            by_namespace[namespace] = {}
        key_name = key.split('.', 1)[1]
        by_namespace[namespace][key_name] = all_missing_keys[key]

    # 输出结果到 stdout
    print('\n=== RESULTS ===')
    print(f'Total raw i18n keys found across all pages: {len(all_missing_keys)}')

    for ns in sorted(by_namespace.keys()):
        keys = by_namespace[ns]
        print(f'\n--- {ns} ({len(keys)} keys) ---')
        for k in sorted(keys.keys()):
            routes = keys[k]
            print(f'  {ns}.{k}  (on {len(routes)} pages: {routes[0]})')

    # 输出 JSON
    json_output = {}
    for ns in sorted(by_namespace.keys()):
        json_output[ns] = {}
        for k in sorted(by_namespace[ns].keys()):
            json_output[ns][k] = f'TODO: {ns}.{k}'
    print('\n=== JSON ===')
    print(json.dumps(json_output, indent=2, ensure_ascii=False))

    # 同时写入文件，避免 PowerShell 重定向问题
    with open('scripts/audit-final-result.json', 'w', encoding='utf-8') as f:
        summary = {
            'total_missing_keys': len(all_missing_keys),
            'by_namespace': {ns: len(keys) for ns, keys in by_namespace.items()},
            'keys': {ns: sorted(by_namespace[ns].keys()) for ns in sorted(by_namespace.keys())},
        }
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print('\nResults written to scripts/audit-final-result.json', file=sys.stderr)


if __name__ == '__main__':
    main()
