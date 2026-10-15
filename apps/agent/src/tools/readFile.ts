import { ToolDefinition } from '@agent/shared';
import { readFile } from 'fs/promises';
import { z } from 'zod';
import { resolveInRoot } from './sandbox';

export const MAX_CHARS = 20000;

const Schema = z.object({
  path: z.string().describe('Path relative to repo root'),
});

const readFileToolDef: ToolDefinition = {
  name: 'readFileContent',
  description: '',
  parameters: Schema.toJSONSchema(),
};

export async function readFileContent(root: string, args: { path: string }): Promise<string> {
  try {
    const parsed = Schema.safeParse(args);
    if (!parsed.success) {
      return `Invalid arguments: ${parsed.error.message}`;
    }
    const { path } = parsed.data;
    const filePath = resolveInRoot(root, path);
    const content = await readFile(filePath, 'utf8');
    if (content.length > MAX_CHARS) {
      return `${content.slice(0, MAX_CHARS)}\n[truncated]`;
    }
    return content;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      return `Error: The file at path "${args.path}" does not exist.`;
    }
    return `Error reading file: ${e.message}`;
  }
}
readFileContent.toolDef = readFileToolDef;
