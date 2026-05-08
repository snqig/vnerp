from playwright.sync_api import sync_playwright
import json

BASE_URL = "http://localhost:5000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    resp = page.request.get(f"{BASE_URL}/api/production/orders?page=1&pageSize=1")
    body = resp.text()
    print(f"STATUS: {resp.status}")
    print(f"RESPONSE: {body[:500]}")

    resp2 = page.request.get(f"{BASE_URL}/api/workorders?page=1&pageSize=1")
    body2 = resp2.text()
    print(f"\nWORKORDERS STATUS: {resp2.status}")
    print(f"RESPONSE: {body2[:500]}")

    browser.close()
