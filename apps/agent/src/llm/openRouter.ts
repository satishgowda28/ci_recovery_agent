import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  Message,
  Role,
  ToolCall,
  ToolDefinition,
} from '@agent/shared';

interface OpenRouterToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

type OpenRouterMessageDef = {
  role: Role;
  content: string | null;
} & ({ tool_calls?: OpenRouterToolCall[] } | { tool_call_id: string });

interface OpenRouterResponse {
  id: string;
  model: string;
  created: number; // unix timestamp
  object: 'chat.completion';
  choices: OpenRouterChoice[];
  usage?: {
    // optional!
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    // + optional details: cost, cached tokens, reasoning tokens...
  };
}

interface OpenRouterChoice {
  finish_reason: string | null; // e.g. 'stop', 'tool_calls'
  native_finish_reason: string | null;
  message: {
    role: string;
    content: string | null; // null when it only calls tools;
    tool_calls?: OpenRouterToolCall[];
  };
  error?: { code: number; message: string; metadata?: Record<string, unknown> };
}

interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON STRING, not object
  };
}

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
export class OpenRouterProvider implements LLMProvider {
  apiKey: string;
  constructor(key: string) {
    this.apiKey = key;
  }
  async generate(rq: LLMRequest): Promise<LLMResponse> {
    let response: Response;
    try {
      response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: rq.model,
          stream: false,
          ...(rq.messages && rq.messages.length
            ? { messages: this.mapMessagesForRQ(rq.messages) }
            : {}),
          ...(rq.tools && rq.tools.length ? { tools: this.mapToolsForRQ(rq.tools) } : {}),
        }),
      });
    } catch (err) {
      throw new Error(`Cannot reach OpenRouter server @ ${BASE_URL}`, { cause: err });
    }
    if (!response.ok) {
      const errorBody = await response.text().catch(() => response.statusText);
      throw new Error(`OpenRouter API returned ${response.status}: ${errorBody}`);
    }
    let llmResponse: OpenRouterResponse;
    try {
      llmResponse = await response.json();
    } catch (err) {
      throw new Error(`Failed to parse OpenRouter JSON response`, { cause: err });
    }
    return this.mapOpenRouterResponse(llmResponse);
  }
  mapToolsForRQ(tools: ToolDefinition[]): OpenRouterToolDef[] {
    return tools.map((tool) => {
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      };
    });
  }
  mapMessagesForRQ(msgs: Message[]): OpenRouterMessageDef[] {
    const mapToolCall = (tools: ToolCall[]): OpenRouterToolCall[] => {
      return tools.map((tool) => ({
        id: tool.id,
        type: 'function',
        function: { name: tool.name, arguments: JSON.stringify(tool.arguments) },
      }));
    };

    return msgs.map((msg) => {
      const initObj = { role: msg.role, content: msg.content ?? null };
      if (msg.toolCalls && msg.toolCalls.length) {
        return { ...initObj, tool_calls: mapToolCall(msg.toolCalls) };
      }
      if (msg.role === 'tool' && msg.toolCallId) {
        return { ...initObj, tool_call_id: msg.toolCallId };
      }
      return initObj;
    });
  }
  mapOpenRouterResponse(resp: OpenRouterResponse): LLMResponse {
    const mapTools = (tools: OpenRouterToolCall[]): ToolCall[] => {
      return tools.map((tool) => {
        let args;
        try {
          args = JSON.parse(tool.function.arguments);
        } catch {
          args = {};
        }
        return {
          id: tool.id,
          name: tool.function.name,
          arguments: args,
        };
      });
    };
    const choice = resp.choices[0];
    if (!choice) {
      throw new Error('OpenRouter returned no choice');
    }
    if (choice.error) {
      throw new Error(`OpenRouter error ${choice.error.code}: ${choice.error.message}`);
    }
    let usage: LLMResponse['usage'];
    if (resp.usage) {
      usage = {
        completionTokens: resp.usage.completion_tokens,
        promptTokens: resp.usage.prompt_tokens,
        totalTokens: resp.usage.total_tokens,
      };
    }
    if (choice.message.tool_calls?.length) {
      return { usage, type: 'tool_calls', toolCalls: mapTools(choice.message.tool_calls) };
    }
    return { usage, type: 'text', text: choice.message.content ?? '' };
  }
}
