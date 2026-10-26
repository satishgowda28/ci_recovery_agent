import { ToolCall } from '@agent/shared';
import { stat } from 'fs/promises';
import path from 'path';
import { parseArgs } from 'util';
import { runAgent } from './agent/loop';
import { loadConfig } from './config';
import { createProvider } from './llm/createProvider';
const { values, positionals } = parseArgs({
  options: {
    repo: { type: 'string' },
    model: { type: 'string' },
  },
  allowPositionals: true,
});

async function main() {
  try {
    process.loadEnvFile();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      return onFail(`Error: cannot read .env: ${(err as Error).message}`);
    }
  }

  const qn = positionals[0];

  if (!qn) {
    return onFail('Usage: npm run agent -- [--repo <path>] [--model <name>] "<question>"');
  }
  const base = process.env.INIT_CWD ?? process.cwd();
  const root = path.resolve(base, values.repo ?? '.');

  let stats;
  try {
    stats = await stat(root);
    if (!stats.isDirectory()) {
      return onFail(`Error: repo not found: ${root}`);
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      return onFail(`Error: repo not found: ${root}`);
    }
    return onFail(`Error: ${(err as Error).message}`);
  }
  try {
    const config = loadConfig(process.env);
    const provider = createProvider(config);
    const result = await runAgent({
      provider,
      model: values.model ?? config.LLM_MODEL,
      question: qn,
      root,
      onToolCall,
    });
    console.log(result);
    return;
  } catch (err) {
    return onFail(`\n ${(err as Error).message}`);
  }
}

function onToolCall(tool: ToolCall, result: string) {
  console.error(`→ ${tool.name}(${JSON.stringify(tool.arguments)})\n ${result.slice(0, 200)}`);
}

function onFail(err: string) {
  console.error(err);
  process.exitCode = 1;
  return;
}
main();
