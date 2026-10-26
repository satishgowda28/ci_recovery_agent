import z from 'zod';

const ConfigSchema = z.object({
  LLM_PROVIDER: z.enum(['ollama', 'openrouter']).default('ollama'),
  LLM_MODEL: z.string(),
  OLLAMA_URL: z.string().optional().default('http://localhost:11434'),
  OPENROUTER_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env = process.env): Config {
  const config = ConfigSchema.safeParse(env);
  if (!config.success) {
    throw new Error(`Error: Invalid config: ${config.error.message}`);
  }

  return config.data;
}
