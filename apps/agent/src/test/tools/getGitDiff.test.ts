import { execFile } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_CHARS } from '../../const';
import { getGitDiff } from '../../tools/getGitDiff';

const execFileAsync = promisify(execFile);

// -c flags so tests don't depend on the machine's global git config (CI has no user.name, some machines sign commits).
const git = (cwd: string, ...args: string[]) =>
  execFileAsync(
    'git',
    [
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { cwd },
  );

describe('GetGitDiff Tool Test', () => {
  let testTmpDir: string;

  beforeEach(async () => {
    testTmpDir = await mkdtemp(join(tmpdir(), 'git-test-'));
    await git(testTmpDir, 'init');
    await writeFile(join(testTmpDir, 'a.txt'), 'old\n', 'utf8');
    await git(testTmpDir, 'add', '.');
    await git(testTmpDir, 'commit', '-m', 'initial commit');
  });

  afterEach(async () => {
    await rm(testTmpDir, { recursive: true, force: true });
  });

  it('modified file shows removed and added lines', async () => {
    await writeFile(join(testTmpDir, 'a.txt'), 'new\n', 'utf8');
    const result = await getGitDiff(testTmpDir, {});
    expect(result).toContain('a.txt');
    expect(result).toContain('-old');
    expect(result).toContain('+new');
  });

  it('staged change is included (diff against HEAD)', async () => {
    await writeFile(join(testTmpDir, 'a.txt'), 'staged\n', 'utf8');
    await git(testTmpDir, 'add', 'a.txt');
    const result = await getGitDiff(testTmpDir, {});
    expect(result).toContain('+staged');
  });

  it('clean repo returns "No changes"', async () => {
    const result = await getGitDiff(testTmpDir, {});
    expect(result).toBe('No changes');
  });

  it('folder that is not a git repo returns an error as text', async () => {
    const plainDir = await mkdtemp(join(tmpdir(), 'no-git-'));
    try {
      const result = await getGitDiff(plainDir, {});
      expect(result.startsWith('Error:')).toBe(true);
    } finally {
      await rm(plainDir, { recursive: true, force: true });
    }
  });

  it('huge diff is truncated', async () => {
    await writeFile(join(testTmpDir, 'a.txt'), 'x'.repeat(MAX_CHARS * 2), 'utf8');
    const result = await getGitDiff(testTmpDir, {});
    expect(result.length).toBeLessThanOrEqual(MAX_CHARS + '\n[truncated]'.length);
    expect(result.endsWith('[truncated]')).toBe(true);
  });
});
