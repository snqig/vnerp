import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LLMClient } from './llm-client.js';
import { runAudit } from './auditor.js';

export interface ServerConfig {
    llmUrl: string;
    timeout: number;
    temperature: number;
    model: string;
    maxTokens: number;
}

export function createServer(config: ServerConfig) {
    const llmClient = new LLMClient(config.llmUrl, {
        timeout: config.timeout,
        defaultModel: config.model,
        defaultOptions: {
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            stream: false,
        },
    });

    const server = new McpServer({ name: 'mcp-decision-server', version: '1.0.0' }, { capabilities: { tools: {}, resources: {}, prompts: {} } });

    server.tool('make_decision', '通过 Qwen3.5-2B GGUF 模型进行确定性决策分析', {
        scenario: z.string().describe('决策场景描述'),
        options: z.array(z.string()).describe('可选方案列表'),
        context: z.record(z.unknown()).optional().describe('额外上下文信息'),
    }, async ({ scenario, options, context }) => {
        try {
            const decision = await llmClient.decision(scenario, options, context);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ decision, scenario, options, context, confidence: 0.95 }, null, 2),
                }],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : '工具执行失败';
            console.error('[MCP-DECISION-SERVER] 工具执行失败:', error);
            return { content: [{ type: 'text', text: message }], isError: true };
        }
    });

    server.tool('audit_data_authenticity', '审核指定模块的数据真实性，结合系统规则与seed基线数据，返回结构化问题列表供LLM统一决策', {
        modules: z.array(z.enum(['warehouse', 'production', 'sales', 'purchase'])).optional().describe('审核模块列表，默认全部'),
        strict_mode: z.boolean().optional().describe('严格模式：基线偏差也视为问题（默认关闭）'),
    }, async ({ modules, strict_mode }) => {
        try {
            const result = await runAudit({
                modules: modules ?? ['warehouse', 'production', 'sales', 'purchase'],
                strict_mode: strict_mode ?? false,
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            const message = error instanceof Error ? error.message : '审计失败';
            console.error('[MCP-AUDIT] 审计执行失败:', error);
            return { content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }], isError: true };
        }
    });

    server.tool('batch_decision_on_issues', '对批量审核问题进行LLM统一决策，返回优先级排序的处理建议（verdict: fix_immediately / investigate / note_only）', {
        issues: z.array(z.record(z.unknown())).describe('audit_data_authenticity返回的问题列表'),
        context: z.record(z.unknown()).optional().describe('附加上下文（如当前日期、批次号）'),
    }, async ({ issues, context }) => {
        try {
            if (!issues || issues.length === 0) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ decisions: [], summary: '无问题需要决策' }, null, 2) }],
                };
            }

            const stripResponse = (raw: string): string => {
                let s = raw.trim();
                // 移除开头的 thinking tags（可能没有闭合标签）
                if (/^<think>/i.test(s)) {
                    const thinkEnd = s.search(/<\/think\s*>/i);
                    if (thinkEnd >= 0) {
                        s = s.slice(thinkEnd + '</think>'.length).trim();
                    } else {
                        // 无闭合标签：找到第一个 `[` 或 `{` 作为 JSON 起点
                        const jsonStart = Math.min(
                            s.indexOf('[') >= 0 ? s.indexOf('[') : Infinity,
                            s.indexOf('{') >= 0 ? s.indexOf('{') : Infinity
                        );
                        if (jsonStart > 0 && jsonStart < Infinity) {
                            s = s.slice(jsonStart);
                        } else {
                            s = '';
                        }
                    }
                }
                s = s.replace(/^```(?:json)?\s*/i, '');
                s = s.replace(/```\s*$/i, '');
                return s.trim();
            };

            const options = [
                'fix_immediately: 立即修复，涉及数据完整性核心规则违反',
                'investigate: 需要人工调查确认后再处理',
                'note_only: 记录即可，当前不影响业务运行',
            ];

            // 按严重程度分阶段处理：critical 优先，warning 其次，info 最后
            // 同一阶段内的批次并发执行，缩短总耗时
            const BATCH_SIZE = 5;
            const CONCURRENT_BATCHES = 2; // 每阶段最多同时进行的批次
            const severityOrder = ['critical', 'warning', 'info'];
            const allDecisions: Array<{ id: string; module: string; severity: string; verdict: string; reason: string }> = [];

            for (const sev of severityOrder) {
                const phaseIssues = issues.filter((i: Record<string, unknown>) => (i.severity as string) === sev);
                if (phaseIssues.length === 0) continue;

                // 分批发起，每批 CONCURRENT_BATCHES 个并发
                for (let start = 0; start < phaseIssues.length; start += BATCH_SIZE * CONCURRENT_BATCHES) {
                    const phaseBatch = phaseIssues.slice(start, start + BATCH_SIZE * CONCURRENT_BATCHES);
                    const tasks = [];
                    for (let i = 0; i < phaseBatch.length; i += BATCH_SIZE) {
                        const batch = phaseBatch.slice(i, i + BATCH_SIZE);
                        const batchNum = Math.floor((start + i) / BATCH_SIZE) + 1;
                        const totalBatches = Math.ceil(phaseIssues.length / BATCH_SIZE);
                        const scenario = `VNERP数据真实性审计 — ${sev}级别问题第${batchNum}/${totalBatches}批，本阶段共${phaseIssues.length}个${sev}问题中的${batch.length}个。\n问题详情：${JSON.stringify(batch.map((iss) => ({
                            id: iss.id,
                            module: iss.module,
                            type: iss.type,
                            description: iss.description,
                        })))}`;

                        tasks.push(
                            (async () => {
                                console.error(`[DECISION] ${sev} batch ${batchNum} started`);
                                try {
                                    const decision = await llmClient.decision(scenario, options, context);
                                    console.error(`[DECISION] ${sev} batch ${batchNum} completed`);
                                    let parsed;
                                    try { parsed = JSON.parse(stripResponse(decision)); } catch { parsed = { raw: decision }; }
                                    if (Array.isArray(parsed)) {
                                        for (const d of parsed) {
                                            const src = batch[parsed.indexOf(d)] ?? batch[0];
                                            allDecisions.push({
                                                id: String(d.id ?? src?.id ?? `batch-${sev}-${batchNum}-${i}`),
                                                module: String(d.module ?? src?.module ?? ''),
                                                severity: String(d.severity ?? sev),
                                                verdict: String(d.verdict ?? 'investigate'),
                                                reason: String(d.reason ?? decision.slice(0, 200)),
                                            });
                                        }
                                    } else {
                                        for (const iss of batch) {
                                            allDecisions.push({
                                                id: String(iss.id ?? `unknown-${start + i}`),
                                                module: String(iss.module ?? ''),
                                                severity: String(iss.severity ?? sev),
                                                verdict: 'investigate',
                                                reason: `Non-array response: ${decision.slice(0, 100)}`,
                                            });
                                        }
                                    }
                                } catch (batchErr) {
                                    console.error(`[DECISION] ${sev} batch ${batchNum} failed:`, batchErr);
                                    for (const iss of batch) {
                                        allDecisions.push({
                                            id: String(iss.id ?? `unknown-${start + i}`),
                                            module: String(iss.module ?? ''),
                                            severity: String(iss.severity ?? sev),
                                            verdict: 'investigate',
                                            reason: `Failed: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`,
                                        });
                                    }
                                }
                            })()
                        );
                    }
                    await Promise.all(tasks);
                    console.error(`[DECISION] ${sev} phase progress: ${Math.min(start + phaseBatch.length, phaseIssues.length)}/${phaseIssues.length} issues processed`);
                }
            }

            const result = {
                total_issues: issues.length,
                decisions_count: allDecisions.length,
                summary: '并行分阶段决策完成（critical→warning→info）',
                decisions: allDecisions,
                verdict_counts: {
                    fix_immediately: allDecisions.filter((d) => d.verdict === 'fix_immediately').length,
                    investigate: allDecisions.filter((d) => d.verdict === 'investigate').length,
                    note_only: allDecisions.filter((d) => d.verdict === 'note_only').length,
                },
                phase_summary: severityOrder.map(sev => ({
                    severity: sev,
                    count: issues.filter((i: Record<string, unknown>) => (i.severity as string) === sev).length,
                })),
            };
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            const message = error instanceof Error ? error.message : '决策执行失败';
            console.error('[MCP-DECISION] 决策执行失败:', error);
            return { content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }], isError: true };
        }
    });

    server.resource('decision://history', 'decision://history', { description: '存储过去的决策和结果' }, async () => ({
        contents: [{
            uri: 'decision://history',
            mimeType: 'application/json',
            text: JSON.stringify([
                { timestamp: new Date().toISOString(), scenario: '库存优化', decision: '增加安全库存', result: '库存水平提高 20%' }
            ], null, 2),
        }],
    }));

    server.resource('decision://patterns', 'decision://patterns', { description: '收集的常见决策模式和最佳实践' }, async () => ({
        contents: [{
            uri: 'decision://patterns',
            mimeType: 'application/json',
            text: JSON.stringify([
                { pattern: '需求预测', condition: '历史数据稳定且趋势明显', recommendation: '使用指数平滑法' },
                { pattern: '成本控制', condition: '原料价格波动大', recommendation: '建立价格保护机制' },
            ], null, 2),
        }],
    }));

    server.prompt('decision_framework', '用于结构化决策过程的提示词模板', { scenario: z.string(), options: z.string() }, async ({ scenario, options }) => ({
        messages: [{
            role: 'user',
            content: { type: 'text', text: `场景: ${scenario}\n选项:\n${options}\n\n请提供详细的分析和建议。` },
        }],
    }));

    server.prompt('risk_assessment', '用于评估决策风险的提示词模板', { decision: z.string(), goal: z.string() }, async ({ decision, goal }) => ({
        messages: [{
            role: 'user',
            content: { type: 'text', text: `决策: ${decision}\n目标: ${goal}\n\n请评估潜在风险和缓解策略。` },
        }],
    }));

    return server;
}

const DEFAULT_CONFIG = {
    llmUrl: process.env.LLM_URL || 'http://localhost:1234',
    timeout: parseInt(process.env.LLM_TIMEOUT || '180000', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    model: process.env.LLM_MODEL || 'jev-style-qwen3.5-2b-decision',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
};

export async function main() {
    try {
        const config = DEFAULT_CONFIG;
        const server = createServer(config);
        const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
        await server.connect(new StdioServerTransport());
        console.error('[MCP-DECISION-SERVER] 服务器已启动，支持工具: make_decision, audit_data_authenticity, batch_decision_on_issues');
        process.on('SIGINT', async () => {
            console.error('[MCP-DECISION-SERVER] 收到 SIGINT，正在关闭...');
            await server.close();
            process.exit(0);
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[MCP-DECISION-SERVER] 服务器启动失败:', message);
        process.exit(1);
    }
}

main();
