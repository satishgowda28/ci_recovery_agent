import { afterEach, describe, expect, it, vi } from 'vitest';
import { OllamaProvider } from '../ollama';

const reply = (body: unknown, init: Partial<Response> = {}) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body, ...init });

afterEach(() => vi.unstubAllGlobals());

describe('OllamaProvider', () => {
  it('maps a text reply', async () => {
    const fetchMock = reply({
      message: { role: 'assistant', content: 'hi' },
      prompt_eval_count: 5,
      eval_count: 2,
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await new OllamaProvider().generate({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(res).toMatchObject({ type: 'text', text: 'hi' });
  });
  it('maps a tool-call reply', async () => {
    const fetchMock = reply({
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [
          { id: 'call_dl9ezo82', function: { name: 'get_weather', arguments: { city: 'Mumbai' } } },
        ],
      },
      prompt_eval_count: 5,
      eval_count: 2,
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await new OllamaProvider().generate({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [{ name: 'get_weather', description: 'get weather', parameters: { city: 'Mumbai' } }],
    });
    expect(res.type).toBe('tool_calls');
    if (res.type === 'tool_calls') expect(res.toolCalls[0].id).toBe('call_dl9ezo82');
  });
  it('throws with status on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'boom',
      }),
    );
    await expect(
      new OllamaProvider().generate({
        model: 'llama3.2',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('boom');
  });
  it('throws when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(
      new OllamaProvider().generate({
        model: 'llama3.2',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('Cannot reach Ollama');
  });
  it('sends stream:false, model and mapped tools', async () => {
    const fetchMock = reply({
      message: { role: 'assistant', content: 'hi' },
      prompt_eval_count: 1,
      eval_count: 1,
    });
    vi.stubGlobal('fetch', fetchMock);

    await new OllamaProvider().generate({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [{ name: 'get_weather', description: 'get weather', parameters: {} }],
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(body.stream).toBe(false);
    expect(body.model).toBe('llama3.2');
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: { name: 'get_weather', description: 'get weather', parameters: {} },
    });
  });
});
