import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { z } from 'zod';

const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      content: z.string(),
    })
  ),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  stream: z.boolean().optional(),
});

const CompletionResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.enum(['system', 'user', 'assistant', 'tool']),
        content: z.string(),
      }).passthrough(),
      finish_reason: z.string().optional(),
    }).passthrough()
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export class LLMClient {
  private client: AxiosInstance;
  private config: {
    baseURL: string;
    timeout: number;
    defaultModel: string;
    defaultOptions: CompletionOptions;
  };

  constructor(baseURL: string, config?: Partial<LLMClient['config']>) {
    this.config = {
      baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL,
      timeout: config?.timeout ?? 180000,
      defaultModel: config?.defaultModel ?? 'jev-style-qwen3.5-2b-decision',
      defaultOptions: config?.defaultOptions ?? {
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      },
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },
      (error: unknown) => {
        if (axios.isAxiosError(error) && error.response) {
          console.error('[LLM-CLIENT] 响应错误:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (axios.isAxiosError(error) && error.request) {
          console.error('[LLM-CLIENT] 请求无响应:', error.request);
        } else {
          console.error('[LLM-CLIENT] 请求设置错误:', error);
        }
        throw error;
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      const data = response.data as Record<string, unknown> | undefined;
      return typeof data === 'object' && data !== null && 'status' in data && data.status === 'healthy';
    } catch (error) {
      console.error('[LLM-CLIENT] 健康检查失败:', error);
      return false;
    }
  }

  async complete(
    messages: CompletionMessage[],
    options?: CompletionOptions
  ): Promise<string> {
    const requestData = {
      model: this.config.defaultModel,
      messages,
      ...this.config.defaultOptions,
      ...options,
    };

    try {
      const response = await this.client.post('/v1/chat/completions', requestData);

      const validatedResponse = CompletionResponseSchema.parse(response);

      if (!validatedResponse.choices || validatedResponse.choices.length === 0) {
        throw new Error('LLM 响应中没有选择');
      }

      const firstChoice = validatedResponse.choices[0];
      if (!firstChoice.message || !firstChoice.message.content) {
        throw new Error('LLM 响应格式无效');
      }

      return firstChoice.message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[LLM-CLIENT] LLM 请求失败:', error.response?.data || error.message);
        throw new Error(
          `LLM 服务请求失败: ${error.response?.status || 'unknown'} ${error.response?.statusText || ''}`
        );
      }
      if (error instanceof z.ZodError) {
        const msgs = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        console.error('[LLM-CLIENT] 响应验证失败:', msgs);
        throw new Error('LLM 响应格式验证失败');
      }
      throw error;
    }
  }

  async decision(
    scenario: string,
    options: string[],
    context?: Record<string, unknown>
  ): Promise<string> {
    const systemPrompt = '你是一个专业的ERP数据审计决策分析师，擅长根据系统规则和实际情况对数据问题进行优先级排序和处置建议。';

    const optionsList = options.map((opt, index) => `${index + 1}. ${opt}`).join('\n');
    const contextInfo = context ? `\n\n上下文信息：\n${JSON.stringify(context, null, 2)}` : '';

    const userMessage = `场景：${scenario}

选项：
${optionsList}${contextInfo}

请对每个问题给出处置建议（verdict: fix_immediately / investigate / note_only），并说明优先级排序理由。输出格式为JSON数组，每项包含 id、module、severity、verdict 和 reason 字段。`;

    const messages: CompletionMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.complete(messages, {
        temperature: 0.3,
        max_tokens: 2048,
      });
      return response;
    } catch (error) {
      console.error('[LLM-CLIENT] 决策失败:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.error('[LLM-CLIENT] 客户端已关闭');
  }
}
