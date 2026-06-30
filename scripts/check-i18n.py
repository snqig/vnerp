"""精简版 i18n 检查：登录 → 4 语言首页截图 → en/vi 中文残留检测"""
import os, json
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(__file__), "i18n-check")
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()

    # 1. 登录
    page.goto("http://localhost:5000/login", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    page.locator('input[type="text"], input[name="username"]').first.fill("admin")
    page.locator('input[type="password"]').first.fill("admin123")
    page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first.click()
    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_timeout(2000)
    print("LOGIN_OK url=", page.url)

    result = {}
    # 2. 4 语言首页
    for locale, url in [("zh-CN", "http://localhost:5000/"), ("zh-TW", "http://localhost:5000/zh-TW"), ("en", "http://localhost:5000/en"), ("vi", "http://localhost:5000/vi")]:
        page.goto(url, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(OUT, f"home-{locale}.png"), full_page=True)
        # 提取关键文本
        texts = page.evaluate("() => {const o=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(t&&t.length>=2)o.add(t)}return [...o].slice(0,50)}")
        result[locale] = texts[:30]
        print(f"{locale}: captured {len(texts)} texts")

    # 3. en/vi 中文残留检测（warehouse 关键页）
    for locale in ["en", "vi"]:
        result[locale + "_residue"] = {}
        for name in ["setup", "stock-adjust", "batch", "inbound", "outbound"]:
            url = f"http://localhost:5000/{locale}/warehouse/{name}"
            try:
                page.goto(url, wait_until="networkidle", timeout=12000)
                page.wait_for_timeout(1000)
                page.screenshot(path=os.path.join(OUT, f"wh-{locale}-{name}.png"), full_page=True)
                cn = page.evaluate("() => {const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;const re=/[\\u4e00-\\u9fa5]{2,}/g;while(n=w.nextNode()){const t=n.textContent.trim();if(t&&re.test(t))o.push(t.slice(0,60))}return [...new Set(o)].slice(0,15)}")
                result[locale + "_residue"][name] = {"count": len(cn), "samples": cn[:5]}
            except Exception as e:
                result[locale + "_residue"][name] = {"error": str(e)[:150]}

    browser.close()

with open(os.path.join(OUT, "result.json"), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("\n=== Summary ===")
for loc in ["en", "vi"]:
    print(f"\n[{loc}] warehouse 中文残留:")
    for name, info in result[loc + "_residue"].items():
        if "count" in info:
            print(f"  {name}: {info['count']} 处中文残留")
            if info["samples"]:
                print(f"    示例: {info['samples'][:3]}")
        else:
            print(f"  {name}: ERROR {info.get('error','')[:80]}")
print(f"\n报告已写入: {os.path.join(OUT, 'result.json')}")
print(f"截图目录: {OUT}")
