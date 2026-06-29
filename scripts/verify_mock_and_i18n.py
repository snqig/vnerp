"""Verify mock data, i18n switching, and logger output across core modules."""
from playwright.sync_api import sync_playwright
import sys
import json

BASE_URL = "http://localhost:3001"

PAGES_TO_TEST = [
    {"name": "仓储入库", "path": "/zh-CN/warehouse/inbound", "key_fields": ["inbound_no", "仓库", "入库"]},
    {"name": "销售发货", "path": "/zh-CN/sales/delivery", "key_fields": ["shipment_no", "发货", "客户"]},
    {"name": "采购订单", "path": "/zh-CN/purchase/orders", "key_fields": ["po_no", "采购", "供应商"]},
    {"name": "品质过程", "path": "/zh-CN/quality/process", "key_fields": ["card_no", "品质", "检验"]},
    {"name": "员工管理", "path": "/zh-CN/hr/employee", "key_fields": ["员工", "部门"]},
]

LANGUAGES = [
    {"code": "zh-CN", "name": "简体中文"},
    {"code": "zh-TW", "name": "繁體中文"},
    {"code": "en", "name": "English"},
    {"code": "vi", "name": "Tiếng Việt"},
]

results = {
    "mock_data_loaded": [],
    "mock_data_failed": [],
    "i18n_switched": [],
    "i18n_failed": [],
    "logger_output": [],
    "errors": [],
}


def test_page(page, page_info):
    """Test a single page for mock data loading."""
    name = page_info["name"]
    url = f"{BASE_URL}{page_info['path']}"
    print(f"\n{'='*60}")
    print(f"  Testing: {name} ({url})")
    print(f"{'='*60}")

    try:
        page.goto(url, timeout=30000)
        page.wait_for_load_state("networkidle", timeout=30000)
        page.wait_for_timeout(2000)  # Wait for mock data to render

        # Check for mock data by looking for known data fields
        content = page.content()
        for key in page_info["key_fields"]:
            if key in content:
                print(f"  [OK] Found key field: '{key}' in page content")
                results["mock_data_loaded"].append(f"{name}: {key}")
            else:
                print(f"  [WARN] Key field '{key}' NOT found in page content")
                results["mock_data_failed"].append(f"{name}: {key}")

        return True
    except Exception as e:
        print(f"  [FAIL] Error: {e}")
        results["errors"].append(f"{name}: {str(e)}")
        return False


def test_i18n_switching(page):
    """Test i18n language switching."""
    print(f"\n{'='*60}")
    print(f"  Testing i18n Language Switching")
    print(f"{'='*60}")

    for lang in LANGUAGES:
        url = f"{BASE_URL}/{lang['code']}/hr/employee"
        try:
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=30000)
            page.wait_for_timeout(1500)

            # Take screenshot for visual verification
            screenshot_path = f"d:/dcprint/erp-project/scripts/screenshots/hr_employee_{lang['code']}.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"  [OK] {lang['name']} ({lang['code']}) - Screenshot saved: {screenshot_path}")
            results["i18n_switched"].append(lang["code"])
        except Exception as e:
            print(f"  [FAIL] {lang['name']} ({lang['code']}): {e}")
            results["i18n_failed"].append(f"{lang['code']}: {str(e)}")


def test_logger_output(page):
    """Capture console logs to verify logger output."""
    print(f"\n{'='*60}")
    print(f"  Testing Logger Output")
    print(f"{'='*60}")

    logs = []

    def handle_console(msg):
        if msg.type in ("info", "log", "warn", "error"):
            logs.append(f"[{msg.type}] {msg.text}")
            if "mock" in msg.text.lower() or "fetcher" in msg.text.lower() or "获取" in msg.text:
                print(f"  [LOG] {msg.text[:120]}")

    page.on("console", handle_console)

    # Visit each page to generate logs
    for page_info in PAGES_TO_TEST:
        url = f"{BASE_URL}{page_info['path']}"
        try:
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle", timeout=30000)
            page.wait_for_timeout(1000)
        except Exception as e:
            print(f"  [ERR] Failed to visit {page_info['name']}: {e}")

    results["logger_output"] = logs
    print(f"\n  Total console messages captured: {len(logs)}")


def main():
    import os
    os.makedirs("d:/dcprint/erp-project/scripts/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()

        # 1. Test mock data loading on all pages
        print("\n" + "="*60)
        print("  PHASE 1: Mock Data Loading Verification")
        print("="*60)
        for page_info in PAGES_TO_TEST:
            test_page(page, page_info)

        # 2. Test i18n switching
        print("\n" + "="*60)
        print("  PHASE 2: i18n Language Switching")
        print("="*60)
        test_i18n_switching(page)

        # 3. Test logger output
        print("\n" + "="*60)
        print("  PHASE 3: Logger Output Verification")
        print("="*60)
        test_logger_output(page)

        browser.close()

    # Print summary
    print("\n\n" + "="*60)
    print("  TEST SUMMARY")
    print("="*60)
    print(f"  Mock Data Loaded: {len(results['mock_data_loaded'])} checks passed")
    print(f"  Mock Data Failed: {len(results['mock_data_failed'])} checks failed")
    print(f"  i18n Switched:    {len(results['i18n_switched'])} languages")
    print(f"  i18n Failed:      {len(results['i18n_failed'])} failures")
    print(f"  Logger Messages:  {len(results['logger_output'])} captured")
    print(f"  Errors:           {len(results['errors'])}")

    if results["mock_data_failed"]:
        print(f"\n  Failed mock data checks:")
        for f in results["mock_data_failed"]:
            print(f"    - {f}")

    if results["errors"]:
        print(f"\n  Errors:")
        for e in results["errors"]:
            print(f"    - {e}")

    # Save results
    with open("d:/dcprint/erp-project/scripts/verify_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n  Results saved to: scripts/verify_results.json")

    # Return non-zero exit code if there are failures
    if results["mock_data_failed"] or results["errors"]:
        sys.exit(1)
    else:
        print("\n  All checks passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()