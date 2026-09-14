#!/usr/bin/env python3
"""Run vitest and extract failures via managed Node + Python (sandbox-safe).

Usage:
  python scripts/vitest-runner.py [vitest filter args...]
Prints a compact failure list + totals. Also writes scripts/.vitest-last.json.
"""
import subprocess, sys, os, re, json

NODE = r"C:/Users/snqig/.workbuddy/binaries/node/versions/22.22.2-3/node.exe"
VITEST = r"D:/dcprint/erp-project/node_modules/vitest/vitest.mjs"
CWD = r"D:/dcprint/erp-project"

args = [NODE, VITEST, "run", "--reporter=json"] + sys.argv[1:]
env = dict(os.environ)
env["PATH"] = r"C:/Users/snqig/.workbuddy/binaries/node/versions/22.22.2-3" + os.pathsep + env.get("PATH", "")
env["CI"] = "true"

proc = subprocess.run(args, cwd=CWD, env=env, capture_output=True, text=True)
raw = (proc.stdout or "") + "\n" + (proc.stderr or "")
ansi = re.compile(r"\x1b\[[0-9;]*m")
raw = ansi.sub("", raw)

m = re.search(r'\{\s*"numTotalTestSuites".*\}', raw, re.DOTALL)
if not m:
    # fallback: first line starting with {
    lines = raw.splitlines()
    start = next((i for i, l in enumerate(lines) if l.lstrip().startswith("{")), -1)
    if start == -1:
        sys.stderr.write("NO JSON FOUND\n")
        sys.stderr.write(raw[-2000:])
        sys.exit(2)
    blob = "\n".join(lines[start:])
    data = json.loads(blob)
else:
    data = json.loads(m.group(0))

with open(os.path.join(CWD, "scripts", ".vitest-last.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

fails = []
for suite in data.get("testResults", []):
    if suite.get("status") == "passed":
        continue
    name = suite.get("name") or suite.get("testFilePath") or "?"
    for t in suite.get("assertionResults", []):
        if t.get("status") == "failed":
            msg = (t.get("failureMessages") or [""])[0]
            # first non-empty line of the message
            first = ""
            for ln in msg.splitlines():
                if ln.strip():
                    first = ln.strip()
                    break
            fails.append((name, t.get("title", "?"), first[:200]))

total = data.get("numTotalTests")
passed = data.get("numPassedTests")
failed = data.get("numFailedTests")
suites_failed = data.get("numFailedTestSuites")
print(f"TOTAL={total} PASSED={passed} FAILED={failed} FAILED_SUITES={suites_failed}")
print(f"FAILING FILES={len(set(f[0] for f in fails))}  FAILING CASES={len(fails)}")
print("-" * 80)
for name, title, first in fails:
    print(f"[{name}]")
    print(f"   {title}")
    print(f"   -> {first}")
