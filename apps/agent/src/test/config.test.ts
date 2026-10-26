import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { createProvider } from '../llm/createProvider';
import { OllamaProvider } from '../llm/ollama';
import { OpenRouterProvider } from '../llm/openRouter';

describe('loadConfig', () => {
  it('applies defaults when only LLM_MODEL is set', () => {
    const config = loadConfig({ LLM_MODEL: 'llama3.2' });
    expect(config).toEqual({
      LLM_PROVIDER: 'ollama',
      LLM_MODEL: 'llama3.2',
      OLLAMA_URL: 'http://localhost:11434',
    });
  });

  it('reads all values from env', () => {
    const config = loadConfig({
      LLM_PROVIDER: 'openrouter',
      LLM_MODEL: 'some/model:free',
      OLLAMA_URL: 'http://other:1234',
      OPENROUTER_API_KEY: 'sk-test',
    });
    expect(config.LLM_PROVIDER).toBe('openrouter');
    expect(config.LLM_MODEL).toBe('some/model:free');
    expect(config.OLLAMA_URL).toBe('http://other:1234');
    expect(config.OPENROUTER_API_KEY).toBe('sk-test');
  });

  it('throws when LLM_MODEL is missing', () => {
    expect(() => loadConfig({})).toThrow(/Invalid config/);
  });

  it('throws on an unknown provider', () => {
    expect(() => loadConfig({ LLM_PROVIDER: 'gpt', LLM_MODEL: 'x' })).toThrow(/Invalid config/);
  });
});

describe('createProvider', () => {
  it('creates an OllamaProvider with the configured URL', () => {
    const provider = createProvider(
      loadConfig({ LLM_MODEL: 'm', OLLAMA_URL: 'http://other:1234' }),
    );
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect((provider as OllamaProvider).baseUrl).toBe('http://other:1234');
  });

  it('creates an OpenRouterProvider when a key is set', () => {
    const provider = createProvider(
      loadConfig({ LLM_PROVIDER: 'openrouter', LLM_MODEL: 'm', OPENROUTER_API_KEY: 'sk-test' }),
    );
    expect(provider).toBeInstanceOf(OpenRouterProvider);
  });

  it('throws for openrouter without a key', () => {
    expect(() =>
      createProvider(loadConfig({ LLM_PROVIDER: 'openrouter', LLM_MODEL: 'm' })),
    ).toThrow('Missing OPENROUTER_API_KEY');
  });
});
