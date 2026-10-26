import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenRouterProvider } from '../llm/openRouter';

const reply = (body: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });

// Minimal OpenRouter chat-completion response (non-streaming).
const completion = (message: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: 'gen-1',
  model: 'some/model:free',
  created: 0,
  object: 'chat.completion',
  choices: [{ finish_reason: 'stop', native_finish_reason: 'stop', message }],
  ...extra,
});

const ask = (provider = new OpenRouterProvider('sk-test')) =>
  provider.generate({ model: 'some/model:free', messages: [{ role: 'user', content: 'hi' }] });

afterEach(() => vi.unstubAllGlobals());

describe('OpenRouterProvider', () => {
  it('maps a text reply and usage', async () => {
    vi.stubGlobal(
      'fetch',
      reply(
        completion(
          { role: 'assistant', content: 'hello' },
          { usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } },
        ),
      ),
    );
    const res = await ask();
    expect(res).toEqual({
      type: 'text',
      text: 'hello',
      usage: { promptTokens: 5, completionTokens: 2, totalTokens: 7 },
    });
  });

  it('maps null content to empty text and leaves usage undefined when absent', async () => {
    vi.stubGlobal('fetch', reply(completion({ role: 'assistant', content: null })));
    const res = await ask();
    expect(res).toMatchObject({ type: 'text', text: '' });
    expect(res.usage).toBeUndefined();
  });

  it('parses tool call arguments from a JSON string', async () => {
    vi.stubGlobal(
      'fetch',
      reply(
        completion({
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'readFile', arguments: '{"path":"a.txt"}' },
            },
          ],
        }),
      ),
    );
    const res = await ask();
    expect(res).toMatchObject({
      type: 'tool_calls',
      toolCalls: [{ id: 'call_1', name: 'readFile', arguments: { path: 'a.txt' } }],
    });
  });

  it('falls back to {} when tool arguments are not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      reply(
        completion({
          role: 'assistant',
          content: null,
          tool_calls: [
            { id: 'call_1', type: 'function', function: { name: 'searchCode', arguments: '{bad' } },
          ],
        }),
      ),
    );
    const res = await ask();
    expect(res).toMatchObject({ type: 'tool_calls', toolCalls: [{ arguments: {} }] });
  });

  it('treats an empty tool_calls array as a text reply', async () => {
    vi.stubGlobal(
      'fetch',
      reply(completion({ role: 'assistant', content: 'done', tool_calls: [] })),
    );
    const res = await ask();
    expect(res).toMatchObject({ type: 'text', text: 'done' });
  });

  it('sends auth header, stringified tool arguments and tool_call_id', async () => {
    const fetchMock = reply(completion({ role: 'assistant', content: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await new OpenRouterProvider('sk-test').generate({
      model: 'some/model:free',
      messages: [
        { role: 'user', content: 'q' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'c1', name: 'readFile', arguments: { path: 'a.txt' } }],
        },
        { role: 'tool', content: 'hello', toolCallId: 'c1' },
      ],
      tools: [{ name: 'readFile', description: 'read', parameters: { type: 'object' } }],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('some/model:free');
    expect(body.messages[1].tool_calls).toEqual([
      { id: 'c1', type: 'function', function: { name: 'readFile', arguments: '{"path":"a.txt"}' } },
    ]);
    expect(body.messages[2]).toMatchObject({ role: 'tool', content: 'hello', tool_call_id: 'c1' });
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: { name: 'readFile', description: 'read', parameters: { type: 'object' } },
    });
  });

  it('throws with status and body on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error":{"code":401,"message":"No auth credentials found"}}',
      }),
    );
    await expect(ask()).rejects.toThrow(/401.*No auth credentials/);
  });

  it('throws when the error arrives inside a 200 response', async () => {
    vi.stubGlobal(
      'fetch',
      reply({
        ...completion({ role: 'assistant', content: null }),
        choices: [
          {
            finish_reason: 'error',
            native_finish_reason: 'error',
            message: { role: 'assistant', content: null },
            error: { code: 502, message: 'upstream failed' },
          },
        ],
      }),
    );
    await expect(ask()).rejects.toThrow('OpenRouter error 502: upstream failed');
  });

  it('throws when OpenRouter is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(ask()).rejects.toThrow('Cannot reach OpenRouter');
  });
});
