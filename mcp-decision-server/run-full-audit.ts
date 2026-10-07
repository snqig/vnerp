import { readFileSync, writeFileSync } from 'fs';

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const payload = JSON.stringify({
    model: 'jev-style-qwen3.5-2b-decision',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    stream: false,
  });

  try {
    const res = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    console.log(`    callLLM status=${res.status}`);
    const text = await res.text();
    if (!res.ok) { console.log(`    error body: ${text.slice(0, 300)}`); return null; }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    console.log(`    content length: ${content?.length || 0}`);
    console.log(`    content: ${JSON.stringify(content)?.slice(0, 200)}`);
    return content || '';
  } catch (e) {
    console.log(`LLM exception: ${(e as Error).message}`);
    return null;
  }
}

function extractJson(text: string): string {
  let t = text.trim();

  // Remove ALL <think>...</think> blocks
  // First try to find and strip them entirely
  const thinkOpen = t.indexOf('<think');
  const thinkClose = t.indexOf('</think>');
  if (thinkOpen >= 0 && thinkClose >= 0) {
    t = t.slice(0, thinkOpen) + t.slice(thinkClose + 8);
  } else if (thinkClose >= 0) {
    t = t.slice(thinkClose + 8);
  } else if (thinkOpen >= 0) {
    t = t.slice(0, thinkOpen);
  }
  t = t.trim();

  // Strip markdown code fence
  const fenceMatch = t.match(/^\s*```(?:json)?\s*/);
  if (fenceMatch) t = t.slice(fenceMatch[0].length);
  const backtickEnd = t.lastIndexOf('```');
  if (backtickEnd >= 0) t = t.slice(0, backtickEnd);
  t = t.trim();

  // If it looks like comma-separated objects without brackets, wrap them
  const trimmed = t.trim();
  if (trimmed.startsWith('{') && !trimmed.startsWith('[{')) {
    // Count braces - if multiple top-level objects separated by commas, wrap
    let depth = 0;
    let objects = 0;
    let inString = false;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '"' && (i === 0 || trimmed[i - 1] !== '\\')) inString = !inString;
      if (!inString) {
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) objects++; }
      }
    }
    if (objects > 1) {
      t = '[' + trimmed + ']';
    }
  }

  return t.trim();
}

interface Decision { issue_id: string; verdict: string; }

function parseDecisions(text: string): Decision[] {
  const cleaned = extractJson(text);
  try {
    const parsed = JSON.parse(cleaned);
    let items: Decision[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object' && parsed.issue_id != null) {
      const ids = Array.isArray(parsed.issue_id) ? parsed.issue_id : [parsed.issue_id];
      items = ids.map((id: string) => ({ issue_id: id, verdict: parsed.verdict }));
    }
    return items.filter((d) =>
      d.issue_id != null &&
      ['fix_immediately', 'investigate', 'note_only'].includes(d.verdict)
    );
  } catch {
    // Try to extract individual JSON objects as fallback
    const results: Decision[] = [];
    const objRegex = /\{[^{}]*"issue_id"[^{}]*"verdict"[^{}]*\}/g;
    const matches = cleaned.match(objRegex);
    if (matches) {
      for (const m of matches) {
        try {
          const obj = JSON.parse(m);
          if (obj.issue_id && obj.verdict) {
            results.push({ issue_id: String(obj.issue_id), verdict: obj.verdict });
          }
        } catch { /* skip */ }
      }
    }
    return results;
  }
}

async function processBatch(issues: any[], severity: string): Promise<Record<string, string>> {
  const verdictMap: Record<string, string> = {};
  const systemPrompt = `You are a data authenticity auditor. For each issue provided, assign one verdict:
- "fix_immediately": clear data corruption, loss, or violation that must be corrected
- "investigate": suspicious or unclear, needs human review
- "note_only": informational, no corrective action needed

Respond with ONLY a JSON array: [{"issue_id": "ID1", "verdict": "fix_immediately"}, ...]
No explanation, no markdown, no thinking tags, no prose. Just pure JSON.`;

  for (let i = 0; i < issues.length; i += 15) {
    const chunk = issues.slice(i, i + 15);
    const userPrompt = `SEVERITY: ${severity}\n\nIssues:\n${JSON.stringify(chunk, null, 2)}`;

    const progress = `[${Math.floor(i / 15) + 1}/${Math.ceil(issues.length / 15)}]`;
    console.log(`  ${progress} ${severity} ${chunk.length} issues...`);

    const result = await callLLM(systemPrompt, userPrompt);
    if (!result) { console.log(`    SKIP (no response)`); continue; }

    const decisions = parseDecisions(result);
    for (const d of decisions) {
      verdictMap[d.issue_id] = d.verdict;
    }
    console.log(`    Got ${decisions.length}/${chunk.length} verdicts`);
  }

  return verdictMap;
}

async function main() {
  console.log('=== VNERP Full Audit + LLM Batch Decision ===\n');

  // Load existing results (if any) to merge with missing ones
  let auditData: any;
  const existingMap: Record<string, string> = {};
  try {
    const prev = readFileSync('audit-decision-result.json', 'utf-8');
    const prevData = JSON.parse(prev);
    Object.assign(existingMap, prevData.verdictMap || {});
    auditData = prevData;
    console.log(`Loaded ${Object.keys(existingMap).length} existing verdicts from previous run`);
  } catch {
    auditData = JSON.parse(readFileSync('audit-result.json', 'utf-8'));
  }

  const issues: any[] = auditData.issues;
  console.log(`Total issues: ${issues.length}`);

  // Identify which ones still need verdicts
  const missing = issues.filter((i) => !existingMap[String(i.id || i.issue_id)]);
  console.log(`Need verdicts for: ${missing.length} issues\n`);

  if (missing.length === 0) {
    console.log('All issues already have verdicts!');
    return;
  }

  const bySeverity: Record<string, any[]> = {};
  for (const iss of missing) {
    const sev = iss.severity.toUpperCase();
    (bySeverity[sev] ??= []).push(iss);
  }

  for (const sev of ['CRITICAL', 'WARNING', 'INFO']) {
    const batch = bySeverity[sev] || [];
    if (batch.length === 0) continue;
    console.log(`\n--- ${sev} (${batch.length} missing) ---`);
    const verdicts = await processBatch(batch, sev);
    Object.assign(existingMap, verdicts);
  }

  // Apply all verdicts
  for (const issue of issues) {
    const vid = String(issue.id || issue.issue_id);
    if (existingMap[vid]) issue.verdict = existingMap[vid];
  }

  auditData.verdictMap = existingMap;
  auditData.processedAt = new Date().toISOString();

  const outPath = 'audit-decision-result.json';
  writeFileSync(outPath, JSON.stringify(auditData, null, 2));

  const vFix = Object.values(existingMap).filter((v) => v === 'fix_immediately').length;
  const vInv = Object.values(existingMap).filter((v) => v === 'investigate').length;
  const vNote = Object.values(existingMap).filter((v) => v === 'note_only').length;
  const covered = Object.keys(existingMap).length;

  console.log(`\n=== DONE ===`);
  console.log(`Verdicts: ${vFix} fix_immediately, ${vInv} investigate, ${vNote} note_only`);
  console.log(`Coverage: ${covered}/${issues.length} (${Math.round((covered / issues.length) * 100)}%)`);
  console.log(`Saved: ${outPath}`);
}

main().catch(console.error);
