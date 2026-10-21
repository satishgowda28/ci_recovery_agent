import { readdir } from 'fs/promises';
import z from 'zod';
import { defineTool } from './defineTools';
import { resolveInRoot } from './sandbox';

const EXCLUDE_FOLDE_FILES = ['node_modules', '.git'];
const Schema = z.object({
  dir: z
    .string()
    .optional()
    .describe('Folder path relative to the repo root. Omit to list the root.'),
});

export async function listFiles(root: string, args: z.infer<typeof Schema>): Promise<string> {
  try {
    const { dir } = args;
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

export const listFilesTool = defineTool({
  name: 'listFiles',
  description:
    'List files and folders in a repository directory. Folders end with "/". Not recursive.',
  schema: Schema,
  func: listFiles,
});
