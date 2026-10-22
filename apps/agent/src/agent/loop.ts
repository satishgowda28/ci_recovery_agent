import { isToolCallResponse, LLMProvider, Message, ToolCall } from '@agent/shared';
import { MAX_ITER, SYSTEM_PROMPT } from '../const';
import { getToolDefinitions, runTool } from '../tools/registry';

interface RunAgentArgs {
  provider: LLMProvider;
  model: string;
  root: string;
  question: string;
  maxIterations?: number; //default 8
  onToolCall?: (call: ToolCall, result: string) => void;
}

export async function runAgent({
  provider,
  model,
  root,
  question,
  maxIterations = MAX_ITER,
  onToolCall,
}: RunAgentArgs): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];
  const allTools = getToolDefinitions();
  for (let i = 0; i < maxIterations; i++) {
    const llmResp = await provider.generate({ messages, model, tools: allTools });
    if (!isToolCallResponse(llmResp)) {
      return llmResp.text;
    }
    messages.push({ role: 'assistant', content: '', toolCalls: llmResp.toolCalls });
    for (const tool of llmResp.toolCalls) {
      const toolResp = await runTool(root, tool);
      onToolCall?.(tool, toolResp);
      messages.push({ role: 'tool', content: toolResp, toolCallId: tool.id });
    }
  }
  return `Stopped: reached max iterations (${maxIterations}) without a final answer.`;
}
