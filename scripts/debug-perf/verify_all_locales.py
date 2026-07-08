"""
Comprehensive i18n verification across all 4 locales (zh-CN, en, zh-TW, vi)
for all previously fixed pages. Checks for:
1. Page loads successfully
2. No raw camelCase keys visible (missing translations)
3. No [i18n] Missing translation key warnings in console
4. Correct locale text is present
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5000"

LOCALES = [
    ("zh-CN", "", "简体中文", "zh"),
    ("en", "/en", "English", "en"),
    ("zh-TW", "/zh-TW", "繁體中文", "zh-TW"),
    ("vi", "/vi", "Tiếng Việt", "vi"),
]

PAGES = [
    "/production/workorder",
    "/sample/management",
    "/sample/orders",
    "/sample/standard-card",
    "/warehouse/inventory",
    "/orders/sales",
]

# Known raw key patterns that indicate missing translations
RAW_KEY_PATTERNS = [
    "fetchListFailed", "createSuccess", "createFailed", "statusUpdatedTo",
    "confirmDelete", "workOrderDetail", "workOrderMaterials",
    "sampleManagement", "searchPlaceholder", "addSample", "sampleNo",
    "noSampleData", "pendingApproval", "viewDetail", "submitReview",
    "reviewFailed", "revokeConfirm", "saveSuccess", "saving",
    "andMoreItems", "confirmApproveOutbound", "cutNum", "frozen",
    "stockInsufficient", "unfreeze", "addInboundItemFirst",
    "inboundFailed", "inboundSuccess", "outboundFailed", "outboundSuccess",
    "reconciliationDetails", "selectPeriod", "addReturnItems",
    "confirmReturn", "fetchBatchFailed", "exportFailed", "exportSuccess",
]

# Expected text snippets per locale (to verify correct language is showing)
LOCALE_TEXT = {
    "zh-CN": ["打样", "工单", "仓库", "销售"],
    "en": ["Sample", "Work Order", "Warehouse", "Sales"],
    "zh-TW": ["打樣", "工單", "倉庫", "銷售"],
    "vi": ["mẫu", "sản xuất", "kho", "bán"],
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Login first
    print("Logging in...")
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.locator('input[type="text"]').first.fill("admin")
    page.locator('input[type="password"]').first.fill("admin123")
    page.locator('button:has-text("登录"), button:has-text("Login"), button[type="submit"]').first.click()
    page.wait_for_timeout(3000)
    page.wait_for_load_state("networkidle")
    print(f"  Logged in. URL: {page.url}")

    all_console_msgs = []
    page.on("console", lambda msg: all_console_msgs.append(f"[{msg.type}] {msg.text}"))

    results = []
    total_tests = len(PAGES) * len(LOCALES)
    test_num = 0

    for page_path in PAGES:
        for locale_code, prefix, locale_name, short in LOCALES:
            test_num += 1
            url = f"{BASE}{prefix}{page_path}"
            prev_len = len(all_console_msgs)

            # Reset NEXT_LOCALE cookie before each test to avoid locale persistence
            # (localePrefix: 'as-needed' uses cookie for non-prefixed URLs)
            # add_cookies overwrites existing cookie with same name+domain+path
            context.add_cookies([{
                "name": "NEXT_LOCALE",
                "value": locale_code,
                "domain": "localhost",
                "path": "/",
            }])

            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(2500)
            except Exception as e:
                results.append((page_path, locale_code, "LOAD_ERROR", str(e)[:60], 0, 0))
                continue

            body_text = page.inner_text("body")
            console_msgs = all_console_msgs[prev_len:]

            # Check for raw camelCase keys
            raw_keys = [k for k in RAW_KEY_PATTERNS if k in body_text]

            # Check for i18n warnings
            i18n_warnings = [m for m in console_msgs if "[i18n] Missing" in m or "MISSING_MESSAGE" in m]

            # Check for expected locale text
            expected = LOCALE_TEXT.get(locale_code, [])
            found_expected = [t for t in expected if t.lower() in body_text.lower()]

            # Determine status
            if raw_keys:
                status = "RAW_KEYS"
            elif i18n_warnings:
                status = "I18N_WARN"
            elif not found_expected:
                status = "NO_LOCALE_TEXT"
            else:
                status = "OK"

            results.append((
                page_path,
                locale_code,
                status,
                f"raw={len(raw_keys)}, warn={len(i18n_warnings)}, locale_text={found_expected[:2]}",
                len(raw_keys),
                len(i18n_warnings),
            ))

    # Print results
    print(f"\n{'='*100}")
    print(f"{'Page':<30} {'Locale':<8} {'Status':<15} {'Detail':<45} {'raw':<5} {'warn'}")
    print(f"{'='*100}")

    ok_count = 0
    fail_count = 0
    for page_path, locale_code, status, detail, raw, warn in results:
        icon = "✓" if status == "OK" else "✗"
        print(f"{icon} {page_path:<28} {locale_code:<8} {status:<15} {detail:<45} {raw:<5} {warn}")
        if status == "OK":
            ok_count += 1
        else:
            fail_count += 1

    print(f"\n{'='*100}")
    print(f"Total: {total_tests} tests | Passed: {ok_count} | Failed: {fail_count}")
    print(f"{'='*100}")

    if fail_count > 0:
        print("\nFailed tests:")
        for page_path, locale_code, status, detail, raw, warn in results:
            if status != "OK":
                print(f"  {page_path} [{locale_code}]: {status} - {detail}")

    browser.close()
