import { LLMProvider } from '@agent/shared';
import { Config } from '../config';
import { OllamaProvider } from './ollama';
import { OpenRouterProvider } from './openRouter';

export function createProvider(config: Config): LLMProvider {
  switch (config.LLM_PROVIDER) {
    case 'ollama':
      return new OllamaProvider(config.OLLAMA_URL);
    case 'openrouter':
      if (!config.OPENROUTER_API_KEY) {
        throw Error('Missing OPENROUTER_API_KEY');
      }
      return new OpenRouterProvider(config.OPENROUTER_API_KEY);
  }
}
