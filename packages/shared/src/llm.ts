export const RoleType = {
  System: 'system',
  User: 'user',
  Assistant: 'assistant',
  Tool: 'tool',
} as const;

export type Role = (typeof RoleType)[keyof typeof RoleType];

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; //
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Message {
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface TextResponse {
  type: 'text';
  text: string;
}

export interface ToolCallResponse {
  type: 'tool_calls';
  toolCalls: Array<ToolCall>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMRequest {
  messages: Message[];
  model: string;
  tools?: ToolDefinition[];
}

export type LLMResponse = { usage?: TokenUsage } & (TextResponse | ToolCallResponse);

export interface LLMProvider {
  generate(rq: LLMRequest): Promise<LLMResponse>;
}

export function isToolCallResponse(r: LLMResponse): r is LLMResponse & ToolCallResponse {
  return r.type === 'tool_calls';
}
