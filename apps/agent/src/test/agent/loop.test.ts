import { LLMProvider, LLMRequest, LLMResponse, ToolCall } from '@agent/shared';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runAgent } from '../../agent/loop';

// Returns scripted responses in order. Snapshots each request, because the loop
// keeps pushing into the same messages array after generate() returns.
class FakeProvider implements LLMProvider {
  requests: LLMRequest[] = [];
  constructor(private responses: LLMResponse[]) {}

  async generate(rq: LLMRequest): Promise<LLMResponse> {
    this.requests.push(structuredClone(rq));
    const next = this.responses.shift();
    if (!next) throw new Error('FakeProvider: no scripted response left');
    return next;
  }
}

const text = (t: string): LLMResponse => ({ type: 'text', text: t });
const calls = (...toolCalls: ToolCall[]): LLMResponse => ({ type: 'tool_calls', toolCalls });

describe('runAgent', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'loop-test-'));
    await writeFile(join(root, 'a.txt'), 'hello foo', 'utf8');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns the text when the LLM answers right away', async () => {
    const provider = new FakeProvider([text('done')]);
    const result = await runAgent({ provider, model: 'm', root, question: 'q' });

    expect(result).toBe('done');
    expect(provider.requests).toHaveLength(1);
    const [first] = provider.requests;
    expect(first.messages.map((m) => m.role)).toEqual(['system', 'user']);
    expect(first.messages[1].content).toBe('q');
    expect(first.model).toBe('m');
    expect(first.tools?.map((t) => t.name).sort()).toEqual([
      'getGitDiff',
      'listFiles',
      'readFile',
      'searchCode',
    ]);
  });

  it('runs a tool call and sends the call + result back to the LLM', async () => {
    const call = { id: 'c1', name: 'readFile', arguments: { path: 'a.txt' } };
    const provider = new FakeProvider([calls(call), text('it says hello foo')]);
    const seen: Array<[string, string]> = [];

    const result = await runAgent({
      provider,
      model: 'm',
      root,
      question: 'what is in a.txt?',
      onToolCall: (c, r) => seen.push([c.name, r]),
    });

    expect(result).toBe('it says hello foo');
    expect(provider.requests).toHaveLength(2);
    expect(seen).toEqual([['readFile', 'hello foo']]);

    const second = provider.requests[1].messages;
    expect(second.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'tool']);
    expect(second[2].toolCalls).toEqual([call]); // (A) the request
    expect(second[3]).toMatchObject({ role: 'tool', content: 'hello foo', toolCallId: 'c1' }); // (B) the result
  });

  it('handles several tool calls in one response, in order', async () => {
    const provider = new FakeProvider([
      calls(
        { id: 'c1', name: 'listFiles', arguments: {} },
        { id: 'c2', name: 'searchCode', arguments: { query: 'foo' } },
      ),
      text('ok'),
    ]);

    await runAgent({ provider, model: 'm', root, question: 'q' });

    const msgs = provider.requests[1].messages;
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'tool', 'tool']);
    expect(msgs[3]).toMatchObject({ toolCallId: 'c1', content: 'a.txt' });
    expect(msgs[4]).toMatchObject({ toolCallId: 'c2', content: 'a.txt:1: hello foo' });
  });

  it('feeds an unknown-tool error back to the LLM and keeps going', async () => {
    const provider = new FakeProvider([
      calls({ id: 'c1', name: 'deleteAll', arguments: {} }),
      text('sorry'),
    ]);

    const result = await runAgent({ provider, model: 'm', root, question: 'q' });

    expect(result).toBe('sorry');
    const toolMsg = provider.requests[1].messages[3];
    expect(toolMsg.role).toBe('tool');
    expect(toolMsg.content).toMatch(/^Error: Unknown tool/);
  });

  it('stops after maxIterations when the LLM never answers', async () => {
    const loopForever = Array.from({ length: 20 }, (_, i) =>
      calls({ id: `c${i}`, name: 'listFiles', arguments: {} }),
    );
    const provider = new FakeProvider(loopForever);

    const result = await runAgent({ provider, model: 'm', root, question: 'q', maxIterations: 3 });

    expect(provider.requests).toHaveLength(3);
    expect(result).toBe('Stopped: reached max iterations (3) without a final answer.');
  });

  it('uses 8 iterations by default', async () => {
    const loopForever = Array.from({ length: 20 }, (_, i) =>
      calls({ id: `c${i}`, name: 'listFiles', arguments: {} }),
    );
    const provider = new FakeProvider(loopForever);

    const result = await runAgent({ provider, model: 'm', root, question: 'q' });

    expect(provider.requests).toHaveLength(8);
    expect(result).toContain('(8)');
  });
});
