import { ExecException, execFile } from 'child_process';
import { promisify } from 'util';
import z from 'zod';
import { MAX_CHARS } from '../const';
import { defineTool } from './defineTools';

const execFileAsync = promisify(execFile);
const Schema = z.object({});

export async function getGitDiff(root: string) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', 'HEAD', '--no-color', '--no-ext-diff'], {
      cwd: root,
      timeout: 10_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stdout.trim() === '') {
      return 'No changes';
    }
    if (stdout.length > MAX_CHARS) {
      return `${stdout.slice(0, MAX_CHARS)}\n[truncated]`;
    }
    return stdout;
  } catch (err) {
    const e = err as ExecException;
    if (e.code) {
      return `Error: Command failed with exit code ${e.code} ${e.stderr}`;
    }
    return `Error: Git command failed: ${e.message}`;
  }
}

export const getGitDiffTool = defineTool({
  name: 'getGitDiff',
  description:
    'Show uncommitted changes (staged and unstaged) since the last commit, as a unified diff. Untracked files are not included.',
  schema: Schema,
  func: getGitDiff,
});
