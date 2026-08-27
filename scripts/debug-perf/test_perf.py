"""
Performance diagnostic for ERP menu navigation.
Logs in as admin/admin123, then navigates through several pages while
capturing: page response times, XHR timings, console errors, and slow requests.
"""
import json
import time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5000"

requests_log = []
console_log = []
page_errors = []


def on_request_finished(request, response):
    try:
        url = request.url
        # only care about same-origin API + page navigations
        if BASE not in url and not url.startswith("http://127.0.0.1:5000"):
            return
        resource_type = request.resource_type
        method = request.method
        status = response.status
        # timing
        try:
            timing = response.request.timing
        except Exception:
            timing = None
        requests_log.append(
            {
                "url": url,
                "method": method,
                "status": status,
                "resource_type": resource_type,
                "timing": timing,
            }
        )
    except Exception:
        pass


def measure_page(page, name, url, wait_selector=None):
    print(f"\n=== {name}: {url} ===")
    requests_log.clear()
    t0 = time.time()
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
    except Exception as e:
        print(f"  goto error: {e}")
    # wait for network to settle (but cap it)
    try:
        page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        print("  networkidle timeout (still loading after 30s)")
    if wait_selector:
        try:
            page.wait_for_selector(wait_selector, timeout=20000)
        except Exception:
            print(f"  selector not found: {wait_selector}")
    t1 = time.time()
    print(f"  total page time: {t1 - t0:.2f}s")

    # summarize requests by type, sorted by duration
    api_reqs = [r for r in requests_log if "/api/" in r["url"]]
    doc_reqs = [r for r in requests_log if r["resource_type"] == "document"]
    print(f"  document requests: {len(doc_reqs)}, api requests: {len(api_reqs)}, total: {len(requests_log)}")

    # show slow API requests (use timing responseEnd - startTime in ms)
    slow = []
    for r in api_reqs + doc_reqs:
        t = r.get("timing") or {}
        start = t.get("startTime", 0)
        end = t.get("responseEnd", 0)
        dur = (end - start) if (end and start) else 0
        r["dur_ms"] = round(dur, 1)
        slow.append(r)
    slow.sort(key=lambda x: x["dur_ms"], reverse=True)
    print("  top requests by duration:")
    for r in slow[:15]:
        print(f"    {r['dur_ms']:>8.1f}ms  {r['status']}  {r['method']:<5} {r['url'][:110]}")
    return t1 - t0


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: console_log.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("requestfinished", lambda req: on_request_finished(req, req.response))

        # Step 1: open login page
        print("############ STEP 1: LOGIN PAGE ############")
        t0 = time.time()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            print("login networkidle timeout")
        print(f"login page load: {time.time() - t0:.2f}s")
        page.screenshot(path="d:/dcprint/erp-project/scripts/debug-perf/shot-01-login.png")

        # Step 2: fill credentials and submit
        print("\n############ STEP 2: LOGIN SUBMIT ############")
        # discover inputs
        inputs = page.locator("input").all()
        print(f"input count: {len(inputs)}")
        for i, inp in enumerate(inputs):
            try:
                print(f"  input[{i}] type={inp.get_attribute('type')} name={inp.get_attribute('name')} placeholder={inp.get_attribute('placeholder')}")
            except Exception:
                pass

        # fill username / password
        try:
            page.fill('input[name="username"]', "admin")
        except Exception:
            try:
                page.locator("input").nth(0).fill("admin")
            except Exception as e:
                print(f"fill username failed: {e}")
        try:
            page.fill('input[name="password"]', "admin123")
        except Exception:
            try:
                page.locator("input").nth(1).fill("admin123")
            except Exception as e:
                print(f"fill password failed: {e}")

        requests_log.clear()
        t0 = time.time()
        # submit
        try:
            page.click('button[type="submit"]')
        except Exception:
            try:
                page.get_by_role("button", name="登录").click()
            except Exception:
                page.locator("button").first.click()
        # wait for redirect to dashboard
        try:
            page.wait_for_url("**/dashboard**", timeout=30000)
        except Exception:
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                pass
        print(f"login submit -> dashboard: {time.time() - t0:.2f}s, current url: {page.url}")
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            print("post-login networkidle timeout")
        page.screenshot(path="d:/dcprint/erp-project/scripts/debug-perf/shot-02-dashboard.png")

        # show API calls during login
        print("API calls during login:")
        for r in requests_log:
            t = r.get("timing") or {}
            dur = (t.get("responseEnd", 0) - t.get("startTime", 0)) if t else 0
            print(f"  {dur:>7.1f}ms  {r['status']}  {r['method']:<5} {r['url'][:110]}")

        # Step 3: navigate to various pages via direct URL (simulate menu click)
        targets = [
            ("销售订单", f"{BASE}/zh-CN/sales/orders"),
            ("生产工单", f"{BASE}/zh-CN/production/orders"),
            ("库存管理", f"{BASE}/zh-CN/warehouse/inventory"),
            ("质量不合格", f"{BASE}/zh-CN/quality/unqualified"),
            ("仪表盘", f"{BASE}/zh-CN/dashboard"),
            ("客户管理", f"{BASE}/zh-CN/sales/customers"),
            ("采购订单", f"{BASE}/zh-CN/purchase/orders"),
            ("系统用户", f"{BASE}/zh-CN/system/users"),
        ]
        results = []
        for name, url in targets:
            elapsed = measure_page(page, name, url)
            results.append((name, elapsed))
            page.screenshot(path=f"d:/dcprint/erp-project/scripts/debug-perf/shot-{name}.png")

        print("\n############ SUMMARY: PAGE LOAD TIMES ############")
        for name, elapsed in results:
            print(f"  {name:>10}: {elapsed:.2f}s")

        # console errors
        print(f"\n############ CONSOLE ({len(console_log)} msgs, errors/warnings only) ############")
        for line in console_log:
            if line.startswith("[error]") or line.startswith("[warning]"):
                print(f"  {line[:200]}")

        print(f"\n############ PAGE ERRORS ({len(page_errors)}) ############")
        for err in page_errors[:20]:
            print(f"  {err[:300]}")

        # save full request log
        with open("d:/dcprint/erp-project/scripts/debug-perf/requests.json", "w", encoding="utf-8") as f:
            json.dump(requests_log, f, ensure_ascii=False, indent=2)
        with open("d:/dcprint/erp-project/scripts/debug-perf/console.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(console_log))

        browser.close()


if __name__ == "__main__":
    main()
