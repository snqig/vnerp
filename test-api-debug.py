from playwright.sync_api import sync_playwright
import json

BASE_URL = "http://localhost:5000"

endpoints = [
    "/api/production/mrp?action=bom-explode&product_id=1",
    "/api/production/mrp?action=net-requirements&work_order_ids=1&warehouse_id=1",
    "/api/quality/spc?action=pareto&start_date=2026-01-01&end_date=2026-12-31",
    "/api/quality/spc?action=p-chart&start_date=2026-01-01&end_date=2026-12-31",
    "/api/engineering/standard-card?action=templates",
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    for ep in endpoints:
        try:
            resp = page.request.get(f"{BASE_URL}{ep}")
            body = resp.text()
            print(f"\n{'='*60}")
            print(f"ENDPOINT: {ep}")
            print(f"STATUS: {resp.status}")
            try:
                data = json.loads(body)
                print(f"RESPONSE: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")
            except:
                print(f"RESPONSE: {body[:500]}")
        except Exception as e:
            print(f"\nENDPOINT: {ep}")
            print(f"ERROR: {e}")

    browser.close()
