import { readFile } from 'fs/promises';
import { z } from 'zod';
import { MAX_CHARS } from '../const';
import { defineTool } from './defineTools';
import { resolveInRoot } from './sandbox';

const Schema = z.object({
  path: z.string().describe('Path relative to repo root'),
});

export async function readFileContent(root: string, args: z.infer<typeof Schema>): Promise<string> {
  try {
    const { path } = args;
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

export const readFileTool = defineTool({
  name: 'readFile',
  description:
    'Read a text file from the repository. Path is relative to the repo root. Long files are truncated.',
  schema: Schema,
  func: readFileContent,
});
