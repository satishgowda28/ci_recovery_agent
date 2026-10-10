import { describe, expect, it } from 'vitest';
import { isToolCallResponse } from '../llm.js';
describe('LLM Reponse safe guard', () => {
  it('return false for text response', () => {
    const boolVal = isToolCallResponse({ type: 'text', text: 'Lorem ipsum' });
    expect(boolVal).toBe(false);
  });

  it('return true for tool response', () => {
    const boolVal = isToolCallResponse({ type: 'tool_calls', toolCalls: [] });
    expect(boolVal).toBe(true);
  });
});
