from playwright.sync_api import sync_playwright
import json

BASE_URL = "http://localhost:5000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    resp = page.request.get(f"{BASE_URL}/api/workorders?page=1&pageSize=1")
    data = json.loads(resp.text())
    if data.get("data", {}).get("list"):
        item = data["data"]["list"][0]
        print("prod_work_order columns:")
        for k, v in item.items():
            print(f"  {k}: {v} ({type(v).__name__})")
    browser.close()
