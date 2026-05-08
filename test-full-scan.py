import json
import os
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5000"
SCREENSHOT_DIR = "D:/dcprint/erp-project/test-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

results = []

def add_result(page_name, test_name, status, details=""):
    results.append({"page": page_name, "test": test_name, "status": status, "details": details})
    icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"  {icon} {test_name}: {details}" if details else f"  {icon} {test_name}")

def safe_click(page, selector, timeout=3000):
    try:
        el = page.locator(selector).first
        if el.is_visible(timeout=timeout):
            el.click(timeout=timeout)
            return True
    except:
        pass
    return False

def safe_fill(page, selector, value, timeout=3000):
    try:
        el = page.locator(selector).first
        if el.is_visible(timeout=timeout):
            el.fill(value, timeout=timeout)
            return True
    except:
        pass
    return False

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    # ========== TEST 1: LOGIN PAGE ==========
    print("\n🔍 TEST 1: 登录页面")
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.screenshot(path=f"{SCREENSHOT_DIR}/01_login.png", full_page=True)

    username_input = page.locator('input[type="text"], input[name="username"], input[placeholder*="用户"]').count()
    password_input = page.locator('input[type="password"]').count()
    login_button = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').count()
    add_result("登录页", "用户名输入框存在", "PASS" if username_input > 0 else "FAIL", f"count={username_input}")
    add_result("登录页", "密码输入框存在", "PASS" if password_input > 0 else "FAIL", f"count={password_input}")
    add_result("登录页", "登录按钮存在", "PASS" if login_button > 0 else "FAIL", f"count={login_button}")

    form_inputs = page.locator("input").all()
    input_types = [i.get_attribute("type") or i.get_attribute("name") or "unknown" for i in form_inputs]
    add_result("登录页", "表单控件完整性", "PASS" if len(form_inputs) >= 2 else "WARN", f"inputs={input_types}")

    try:
        if form_inputs:
            form_inputs[0].fill("admin")
        pwd = page.locator('input[type="password"]').first
        pwd.fill("admin123")
        page.screenshot(path=f"{SCREENSHOT_DIR}/01_login_filled.png", full_page=True)
        add_result("登录页", "输入交互正常", "PASS")
    except Exception as e:
        add_result("登录页", "输入交互正常", "FAIL", str(e)[:80])

    login_btn = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first
    try:
        if login_btn.is_visible(timeout=3000):
            login_btn.click()
            page.wait_for_load_state("networkidle", timeout=10000)
            current_url = page.url
            add_result("登录页", "登录跳转", "PASS" if "/login" not in current_url else "WARN", f"url={current_url}")
    except Exception as e:
        add_result("登录页", "登录跳转", "WARN", str(e)[:80])

    page.screenshot(path=f"{SCREENSHOT_DIR}/01_login_after.png", full_page=True)

    # ========== TEST 2: DASHBOARD ==========
    print("\n🔍 TEST 2: 仪表盘页面")
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.screenshot(path=f"{SCREENSHOT_DIR}/02_dashboard.png", full_page=True)

    cards = page.locator('[class*="card"], [class*="Card"]').count()
    add_result("仪表盘", "统计卡片存在", "PASS" if cards > 0 else "WARN", f"count={cards}")

    nav_links = page.locator("nav a, aside a, [class*='sidebar'] a, [class*='nav'] a").all()
    nav_texts = []
    for link in nav_links[:20]:
        try:
            txt = link.text_content().strip()
            if txt:
                nav_texts.append(txt)
        except:
            pass
    add_result("仪表盘", "导航菜单存在", "PASS" if len(nav_texts) > 0 else "WARN", f"links={nav_texts[:10]}")

    tables = page.locator("table").count()
    add_result("仪表盘", "数据表格存在", "PASS" if tables > 0 else "WARN", f"count={tables}")

    # ========== TEST 3: WAREHOUSE MODULE ==========
    print("\n🔍 TEST 3: 仓库模块")

    warehouse_pages = [
        ("/warehouse/inventory", "库存管理"),
        ("/warehouse/transfer", "调拨管理"),
        ("/warehouse/inbound", "入库管理"),
        ("/warehouse/outbound", "出库管理"),
        ("/warehouse/stocktaking", "盘点管理"),
        ("/warehouse/stock-adjust", "库存调整"),
        ("/warehouse/production-inbound", "生产入库"),
        ("/warehouse/sales-outbound", "销售出库"),
        ("/warehouse/setup", "仓库设置"),
    ]

    for path, name in warehouse_pages:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle", timeout=15000)
        safe_name = path.replace("/", "_").strip("_")
        page.screenshot(path=f"{SCREENSHOT_DIR}/03_warehouse_{safe_name}.png", full_page=True)

        is_404 = page.locator("text=This page could not be found").count() > 0
        add_result(name, "页面加载", "FAIL" if is_404 else "PASS", f"path={path}")

        if not is_404:
            tables = page.locator("table").count()
            add_result(name, "数据表格", "PASS" if tables > 0 else "WARN", f"count={tables}")

            buttons = page.locator("button").count()
            add_result(name, "操作按钮", "PASS" if buttons > 0 else "WARN", f"count={buttons}")

            selects = page.locator("select, [role='combobox']").count()
            add_result(name, "筛选控件", "PASS" if selects > 0 else "WARN", f"count={selects}")

            inputs = page.locator("input").count()
            add_result(name, "输入控件", "PASS" if inputs > 0 else "WARN", f"count={inputs}")

            gray_headers = page.locator("[class*='bg-gray-100']").count()
            add_result(name, "深色主题兼容(无bg-gray-100)", "PASS" if gray_headers == 0 else "FAIL", f"found={gray_headers}")

    # ========== TEST 4: PRODUCTION MODULE ==========
    print("\n🔍 TEST 4: 生产模块")

    production_pages = [
        ("/production/workorder", "工单管理"),
        ("/production/schedule", "排产管理"),
        ("/production/mrp", "MRP物料需求"),
    ]

    for path, name in production_pages:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle", timeout=15000)
        safe_name = path.replace("/", "_").strip("_")
        page.screenshot(path=f"{SCREENSHOT_DIR}/04_production_{safe_name}.png", full_page=True)

        is_404 = page.locator("text=This page could not be found").count() > 0
        add_result(name, "页面加载", "FAIL" if is_404 else "PASS", f"path={path}")

        if not is_404:
            tabs = page.locator("[role='tab'], button[role='tab']").count()
            add_result(name, "Tab视图切换", "PASS" if tabs > 0 else "WARN", f"count={tabs}")

            if name == "排产管理":
                gantt_btn = page.locator("button:has-text('甘特图'), button:has-text('gantt')").count()
                add_result(name, "甘特图视图按钮", "PASS" if gantt_btn > 0 else "WARN", f"found={gantt_btn}")

                try:
                    list_btn = page.locator("button:has-text('列表'), button:has-text('list')").first
                    if list_btn.is_visible(timeout=2000):
                        list_btn.click()
                        page.wait_for_timeout(500)
                        page.screenshot(path=f"{SCREENSHOT_DIR}/04_schedule_list.png", full_page=True)
                        add_result(name, "列表视图切换", "PASS")
                except:
                    add_result(name, "列表视图切换", "WARN", "button not found")

            if name == "MRP物料需求":
                mrp_btn = page.locator("button:has-text('运行MRP'), button:has-text('计算')").count()
                add_result(name, "MRP运行按钮", "PASS" if mrp_btn > 0 else "WARN", f"found={mrp_btn}")

                bom_tab = page.locator("[role='tab']:has-text('BOM'), button:has-text('BOM')").count()
                add_result(name, "BOM展开Tab", "PASS" if bom_tab > 0 else "WARN", f"found={bom_tab}")

                time_tab = page.locator("[role='tab']:has-text('时间'), button:has-text('时间')").count()
                add_result(name, "时间分桶Tab", "PASS" if time_tab > 0 else "WARN", f"found={time_tab}")

    # ========== TEST 5: QUALITY MODULE ==========
    print("\n🔍 TEST 5: 质量模块")

    page.goto(f"{BASE_URL}/quality/spc")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.screenshot(path=f"{SCREENSHOT_DIR}/05_quality_spc.png", full_page=True)

    is_404 = page.locator("text=This page could not be found").count() > 0
    add_result("SPC分析", "页面加载", "FAIL" if is_404 else "PASS")

    if not is_404:
        xbar_tab = page.locator("[role='tab']:has-text('Xbar'), button:has-text('Xbar')").count()
        add_result("SPC分析", "Xbar-R控制图Tab", "PASS" if xbar_tab > 0 else "WARN", f"found={xbar_tab}")

        pareto_tab = page.locator("[role='tab']:has-text('帕累托'), button:has-text('Pareto')").count()
        add_result("SPC分析", "帕累托分析Tab", "PASS" if pareto_tab > 0 else "WARN", f"found={pareto_tab}")

        pchart_tab = page.locator("[role='tab']:has-text('P控制'), button:has-text('P-chart')").count()
        add_result("SPC分析", "P控制图Tab", "PASS" if pchart_tab > 0 else "WARN", f"found={pchart_tab}")

        gen_btn = page.locator("button:has-text('生成'), button:has-text('计算')").count()
        add_result("SPC分析", "生成图表按钮", "PASS" if gen_btn > 0 else "WARN", f"found={gen_btn}")

    # ========== TEST 6: BUSINESS FLOW VISUALIZATION ==========
    print("\n🔍 TEST 6: 业务流转可视化")

    page.goto(f"{BASE_URL}/dashboard/flow")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.screenshot(path=f"{SCREENSHOT_DIR}/06_flow.png", full_page=True)

    is_404 = page.locator("text=This page could not be found").count() > 0
    add_result("业务流转", "页面加载", "FAIL" if is_404 else "PASS")

    if not is_404:
        flow_tab = page.locator("[role='tab']:has-text('流转'), button:has-text('流转')").count()
        add_result("业务流转", "流转链路Tab", "PASS" if flow_tab > 0 else "WARN", f"found={flow_tab}")

        table_tab = page.locator("[role='tab']:has-text('表间'), button:has-text('表间')").count()
        add_result("业务流转", "表间关联Tab", "PASS" if table_tab > 0 else "WARN", f"found={table_tab}")

        arch_tab = page.locator("[role='tab']:has-text('架构'), button:has-text('架构')").count()
        add_result("业务流转", "系统架构Tab", "PASS" if arch_tab > 0 else "WARN", f"found={arch_tab}")

        flow_nodes = page.locator("[class*='flow'], [class*='node'], [class*='step']").count()
        add_result("业务流转", "流转节点存在", "PASS" if flow_nodes > 0 else "WARN", f"count={flow_nodes}")

    # ========== TEST 7: SETTINGS & OTHER MODULES ==========
    print("\n🔍 TEST 7: 设置与其他模块")

    other_pages = [
        ("/settings/users", "用户管理"),
        ("/sample/management", "样品管理"),
        ("/prepress/die-template", "刀模管理"),
    ]

    for path, name in other_pages:
        page.goto(f"{BASE_URL}{path}")
        page.wait_for_load_state("networkidle", timeout=15000)
        safe_name = path.replace("/", "_").strip("_")
        page.screenshot(path=f"{SCREENSHOT_DIR}/07_other_{safe_name}.png", full_page=True)

        is_404 = page.locator("text=This page could not be found").count() > 0
        add_result(name, "页面加载", "FAIL" if is_404 else "PASS", f"path={path}")

    # ========== TEST 8: DARK MODE COMPATIBILITY ==========
    print("\n🔍 TEST 8: 深色模式兼容性")

    page.goto(f"{BASE_URL}/warehouse/transfer")
    page.wait_for_load_state("networkidle", timeout=15000)

    gray_100_count = page.locator("[class*='bg-gray-100']").count()
    gray_300_count = page.locator("[class*='border-gray-300']").count()
    add_result("深色模式", "仓库调拨-无bg-gray-100", "PASS" if gray_100_count == 0 else "FAIL", f"found={gray_100_count}")
    add_result("深色模式", "仓库调拨-无border-gray-300", "PASS" if gray_300_count == 0 else "FAIL", f"found={gray_300_count}")

    muted_count = page.locator("[class*='bg-muted']").count()
    border_count = page.locator("[class*='border-border']").count()
    add_result("深色模式", "仓库调拨-使用bg-muted主题变量", "PASS" if muted_count > 0 else "WARN", f"count={muted_count}")
    add_result("深色模式", "仓库调拨-使用border-border主题变量", "PASS" if border_count > 0 else "WARN", f"count={border_count}")

    # ========== TEST 9: RESPONSIVE LAYOUT ==========
    print("\n🔍 TEST 9: 响应式布局")

    mobile = context.new_page()
    mobile.set_viewport_size({"width": 375, "height": 812})
    mobile.goto(f"{BASE_URL}/dashboard")
    mobile.wait_for_load_state("networkidle", timeout=15000)
    mobile.screenshot(path=f"{SCREENSHOT_DIR}/09_mobile_dashboard.png", full_page=True)

    body_width = mobile.evaluate("document.body.scrollWidth")
    add_result("响应式", "移动端仪表盘-无水平溢出", "PASS" if body_width <= 500 else "WARN", f"width={body_width}")

    mobile.goto(f"{BASE_URL}/warehouse/inventory")
    mobile.wait_for_load_state("networkidle", timeout=15000)
    mobile.screenshot(path=f"{SCREENSHOT_DIR}/09_mobile_inventory.png", full_page=True)
    add_result("响应式", "移动端库存页-可访问", "PASS")

    mobile.close()

    # ========== TEST 10: API ENDPOINTS ==========
    print("\n🔍 TEST 10: API端点可达性")

    api_endpoints = [
        ("/api/production/mrp?action=bom-explode&product_id=1", "MRP BOM展开"),
        ("/api/production/mrp?action=net-requirements&work_order_ids=1&warehouse_id=1", "MRP净需求"),
        ("/api/quality/spc?action=pareto&start_date=2026-01-01&end_date=2026-12-31", "SPC帕累托"),
        ("/api/quality/spc?action=p-chart&start_date=2026-01-01&end_date=2026-12-31", "SPC P图"),
        ("/api/engineering/standard-card?action=list", "标准卡列表"),
        ("/api/engineering/standard-card?action=templates", "标准卡模板"),
        ("/api/production/schedule?action=stats", "排产统计"),
    ]

    for endpoint, name in api_endpoints:
        try:
            resp = page.request.get(f"{BASE_URL}{endpoint}")
            status = resp.status
            add_result("API端点", f"{name}({endpoint[:40]})", "PASS" if status < 500 else "FAIL", f"status={status}")
        except Exception as e:
            add_result("API端点", f"{name}", "FAIL", str(e)[:60])

    browser.close()

# ========== GENERATE REPORT ==========
print("\n" + "="*80)
print("📊 VNERP 全面测试报告")
print("="*80)

pass_count = sum(1 for r in results if r["status"] == "PASS")
fail_count = sum(1 for r in results if r["status"] == "FAIL")
warn_count = sum(1 for r in results if r["status"] == "WARN")
total = len(results)

print(f"\n总计: {total} 项测试")
print(f"  ✅ 通过: {pass_count}")
print(f"  ❌ 失败: {fail_count}")
print(f"  ⚠️  警告: {warn_count}")
print(f"  通过率: {pass_count/total*100:.1f}%")

if fail_count > 0:
    print("\n❌ 失败项详情:")
    for r in results:
        if r["status"] == "FAIL":
            print(f"  [{r['page']}] {r['test']}: {r['details']}")

if warn_count > 0:
    print("\n⚠️ 警告项详情:")
    for r in results:
        if r["status"] == "WARN":
            print(f"  [{r['page']}] {r['test']}: {r['details']}")

report_path = f"{SCREENSHOT_DIR}/test_report.json"
with open(report_path, "w", encoding="utf-8") as f:
    json.dump({"total": total, "pass": pass_count, "fail": fail_count, "warn": warn_count, "results": results}, f, ensure_ascii=False, indent=2)
print(f"\n详细报告已保存: {report_path}")
print(f"截图目录: {SCREENSHOT_DIR}")
