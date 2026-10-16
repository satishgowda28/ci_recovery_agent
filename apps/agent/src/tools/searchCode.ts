import { ToolDefinition } from '@agent/shared';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import z from 'zod';

const EXCLUDE_DIR = ['node_modules', '.git'];
const Schema = z.object({
  query: z.string().describe('Exact text to find, e.g. a function name or "4173"'),
});

const searchCodeToolDef: ToolDefinition = {
  name: 'searchCode',
  description:
    'Search all repository files for an exact text (not regex). Returns matches as "path:line: text". Max 50 results',
  parameters: Schema.toJSONSchema(),
};

async function walkDir(dirPath: string): Promise<Array<string>> {
  const dirContent = await readdir(dirPath, { withFileTypes: true });
  const result = [];
  for (const file of dirContent) {
    if (EXCLUDE_DIR.includes(file.name)) {
      continue;
    }
    const filePath = path.join(file.parentPath, file.name);
    if (file.isFile()) {
      result.push(filePath);
    } else if (file.isDirectory()) {
      result.push(...(await walkDir(filePath)));
    }
  }

  return result;
}

async function searchFile(root: string, filePath: string, query: string) {
  const result = [];
  const content = await readFile(filePath, 'utf8');
  const contentArray = content.split('\n');
  let idx = 0;
  for (const text of contentArray) {
    idx += 1;
    if (text.includes(query)) {
      const relPath = path.relative(root, filePath);
      result.push(`${relPath}:${idx}: ${text}`);
    }
  }
  return result;
}

export async function searchCode(root: string, args: { query: string }) {
  try {
    const parsed = Schema.safeParse(args);
    if (!parsed.success) {
      return `Error: Invalid arguments: ${parsed.error.message}`;
    }
    const { query } = parsed.data;
    const filePaths = await walkDir(root);
    const searchResult = [];
    for (const filePath of filePaths) {
      const stats = await stat(filePath);
      if (stats.size >= 1024 * 1024) {
        continue;
      }
      searchResult.push(...(await searchFile(root, filePath, query)));
      if (searchResult.length > 50) {
        searchResult.splice(50);
        searchResult.push('[truncated]');
        break;
      }
    }
    if (searchResult.length === 0) {
      return `No matches for "${query}"`;
    }
    return searchResult.join('\n');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `Error: ${e.message}`;
  }
}
searchCode.toolDef = searchCodeToolDef;
