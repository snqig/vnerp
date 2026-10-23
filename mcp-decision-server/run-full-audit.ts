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

    if (!res.ok) {
      console.log(`LLM error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.log(`LLM exception: ${(e as Error).message}`);
    return null;
  }
}

function extractJson(text: string): string {
  let t = text.trim();
  // Strip thinking tags
  const thinkIdx = t.indexOf('</think>');
  if (thinkIdx >= 0) t = t.slice(thinkIdx + 8);
  const closingThink = t.indexOf('</think>');
  if (closingThink >= 0) t = t.slice(closingThink + 8);
  t = t.trim();
  // Strip markdown code fence
  const fenceMatch = t.match(/^\s*```(?:json)?\s*/);
  if (fenceMatch) t = t.slice(fenceMatch[0].length);
  const backtickEnd = t.lastIndexOf('```');
  if (backtickEnd >= 0) t = t.slice(0, backtickEnd);
  return t.trim();
}

async function processBatch(issues: any[], severity: string): Promise<Record<string, string>> {
  const verdictMap: Record<string, string> = {};
  const systemPrompt = `You are a data authenticity auditor. For each issue provided, assign one of these verdicts:
- "fix_immediately": clear data corruption, loss, or violation that must be corrected
- "investigate": suspicious or unclear, needs human review
- "note_only": informational, no corrective action needed

Respond with ONLY a JSON array like: [{"issue_id": "ID1", "verdict": "fix_immediately"}, ...]
No explanation, no markdown, no thinking tags.`;

  for (let i = 0; i < issues.length; i += 15) {
    const chunk = issues.slice(i, i + 15);
    const userPrompt = `SEVERITY: ${severity}\n\nIssues to evaluate:\n${JSON.stringify(chunk, null, 2)}`;

    console.log(`  Processing ${severity} batch ${Math.floor(i / 15) + 1}/${Math.ceil(issues.length / 15)} (${chunk.length} issues)...`);
    const result = await callLLM(systemPrompt, userPrompt);
    if (!result) continue;

    const cleaned = extractJson(result);
    console.log(`    LLM output: ${cleaned.slice(0, 200)}`);

    try {
      let parsed: any;
      // Try to fix comma-separated JSON objects into an array
      let tryClean = cleaned;
      if (tryClean.startsWith('{') && tryClean.endsWith('}') && !Array.isArray(JSON.parse(tryClean))) {
        // Not a single object - might be comma-separated objects without brackets
        tryClean = '[' + tryClean + ']';
      }
      parsed = JSON.parse(tryClean);
      let items: Array<{ issue_id: string; verdict: string }> = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.issue_id != null) {
        const ids = Array.isArray(parsed.issue_id) ? parsed.issue_id : [parsed.issue_id];
        items = ids.map((id: string) => ({ issue_id: id, verdict: parsed.verdict }));
      }
      for (const d of items) {
        if (d.issue_id != null && ['fix_immediately', 'investigate', 'note_only'].includes(d.verdict)) {
          verdictMap[String(d.issue_id)] = d.verdict;
        }
      }
    } catch (e) {
      console.log(`    Parse failed: ${cleaned.slice(0, 100)}`);
    }
  }

  return verdictMap;
}

async function main() {
  console.log('=== VNERP Full Audit + LLM Batch Decision ===\n');

  const raw = readFileSync('audit-result.json', 'utf-8');
  const auditData = JSON.parse(raw);
  const issues: any[] = auditData.issues;

  console.log(`Loaded ${issues.length} issues`);
  const critical = issues.filter((i) => i.severity === 'critical').length;
  const warning = issues.filter((i) => i.severity === 'warning').length;
  const info = issues.filter((i) => i.severity === 'info').length;
  console.log(`Summary: ${critical} critical, ${warning} warning, ${info} info\n`);

  const bySeverity: Record<string, any[]> = {};
  for (const iss of issues) {
    const sev = iss.severity.toUpperCase();
    (bySeverity[sev] ??= []).push(iss);
  }

  const allVerdicts: Record<string, string> = {};
  for (const sev of ['CRITICAL', 'WARNING', 'INFO']) {
    const batch = bySeverity[sev] || [];
    if (batch.length === 0) continue;
    console.log(`\n--- Processing ${sev} (${batch.length} issues) ---`);
    const verdicts = await processBatch(batch, sev);
    Object.assign(allVerdicts, verdicts);
    console.log(`  Got ${Object.keys(verdicts).length} verdicts for ${sev}`);
  }

  for (const issue of issues) {
    const vid = String(issue.id || issue.issue_id);
    if (allVerdicts[vid]) {
      issue.verdict = allVerdicts[vid];
    }
  }

  auditData.verdictMap = allVerdicts;
  auditData.processedAt = new Date().toISOString();

  const outPath = 'audit-decision-result.json';
  writeFileSync(outPath, JSON.stringify(auditData, null, 2));
  console.log(`\nSaved to ${outPath}`);

  const vFix = Object.values(allVerdicts).filter((v) => v === 'fix_immediately').length;
  const vInvest = Object.values(allVerdicts).filter((v) => v === 'investigate').length;
  const vNote = Object.values(allVerdicts).filter((v) => v === 'note_only').length;
  console.log(`Verdicts: ${vFix} fix_immediately, ${vInvest} investigate, ${vNote} note_only`);
  console.log(`Total covered: ${Object.keys(allVerdicts).length}/${issues.length} issues`);
}

main().catch(console.error);
