import { ToolDefinition } from '@agent/shared';
import { readdir } from 'fs/promises';
import z from 'zod';
import { resolveInRoot } from './sandbox';

const EXCLUDE_FOLDE_FILES = ['node_modules', '.git'];
const Schema = z.object({
  dir: z
    .string()
    .optional()
    .describe('Folder path relative to the repo root. Omit to list the root.'),
});

const listFilesToolDef: ToolDefinition = {
  name: 'listFiles',
  description:
    'List files and folders in a repository directory. Folders end with "/". Not recursive.',
  parameters: Schema.toJSONSchema(),
};

export async function listFiles(root: string, args: { dir?: string }): Promise<string> {
  try {
    const parsed = Schema.safeParse(args);
    if (!parsed.success) {
      return `Error: Invalid arguments: ${parsed.error.message}`;
    }
    const { dir } = parsed.data;
    const dirPath = resolveInRoot(root, dir ?? '.');
    const dirContent = await readdir(dirPath, { withFileTypes: true });
    const result = dirContent
      .map((file) => {
        if (EXCLUDE_FOLDE_FILES.includes(file.name)) {
          return;
        }
        let post = '';
        if (file.isDirectory()) {
          post = '/';
        }
        return `${file.name}${post}`;
      })
      .filter(Boolean)
      .sort()
      .join('\n');
    return result;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      return `Error: The folder at path "${args.dir ?? '.'}" does not exist.`;
    }
    return `Error: ${e.message}`;
  }
}

listFiles.toolDef = listFilesToolDef;
