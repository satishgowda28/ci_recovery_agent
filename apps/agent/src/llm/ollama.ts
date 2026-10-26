import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  Message,
  Role,
  ToolCall,
  ToolDefinition,
} from '@agent/shared';

interface OllamaToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OllamaMessageToolCall {
  id: string;
  function: {
    name: string;
    description?: string;
    arguments: Record<string, unknown>;
  };
}
interface OllamaMessageDef {
  role: Role;
  content: string;
  tool_calls?: OllamaMessageToolCall[];
  tool_name?: string;
  tool_call_id?: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessageDef;
  done: boolean;
  done_reason: string;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}
const DEFAULT_URL = 'http://localhost:11434';
export class OllamaProvider implements LLMProvider {
  baseUrl: string;
  constructor(url = DEFAULT_URL) {
    this.baseUrl = url;
  }

  async generate(rq: LLMRequest): Promise<LLMResponse> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      throw new Error(`Cannot reach Ollama server @ ${this.baseUrl}`, { cause: err });
    }
    if (!response.ok) {
      // let errorBody = 'Unknown error';
      const errorBody = await response.text().catch(() => response.statusText);
      throw new Error(`Ollama API returned ${response.status}: ${errorBody}`);
    }
    let ollamaResponse: OllamaResponse;
    try {
      ollamaResponse = await response.json();
      return this.mapOllamaResponse(ollamaResponse);
    } catch (err) {
      throw new Error(`Failed to parse Ollama JSON response`, { cause: err });
    }
  }
  mapToolsForRQ(tools: ToolDefinition[]): OllamaToolDef[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
  mapMessagesForRQ(msgs: Message[]): OllamaMessageDef[] {
    const mapTools = (tools: ToolCall[]): OllamaMessageToolCall[] => {
      return tools.map((tool) => ({
        id: tool.id,
        function: {
          name: tool.name,
          arguments: tool.arguments,
        },
      }));
    };
    const namesById = new Map<string, string>();
    return msgs.map((msg) => {
      const initObj = { role: msg.role, content: msg.content };
      if (msg.toolCalls && msg.toolCalls.length) {
        msg.toolCalls.forEach(({ id, name }) => namesById.set(id, name));
        return { ...initObj, tool_calls: mapTools(msg.toolCalls) };
      }
      if (msg.role === 'tool' && msg.toolCallId) {
        const toolName = namesById.get(msg.toolCallId);
        if (toolName) {
          return { ...initObj, tool_name: toolName };
        }
      }
      return initObj;
    });
  }
  mapOllamaResponse(res: OllamaResponse): LLMResponse {
    const mapTools = (tools: OllamaMessageToolCall[]): ToolCall[] => {
      return tools.map((t) => ({
        id: t.id ?? crypto.randomUUID(),
        name: t.function.name,
        arguments: t.function.arguments,
      }));
    };
    const usage: LLMResponse['usage'] = {
      promptTokens: res.prompt_eval_count,
      completionTokens: res.eval_count,
      totalTokens: res.prompt_eval_count + res.eval_count,
    };
    if (res.message.tool_calls && res.message.tool_calls.length) {
      return { usage, type: 'tool_calls', toolCalls: mapTools(res.message.tool_calls) };
    }
    return { usage, type: 'text', text: res.message.content };
  }
}
