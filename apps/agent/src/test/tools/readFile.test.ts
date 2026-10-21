import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_CHARS } from '../../const';
import { readFileContent } from '../../tools/readFile';

describe('ReadFile Tool Test', () => {
  let testTmpDir: string;

  beforeEach(async () => {
    testTmpDir = await mkdtemp(join(tmpdir(), 'tool-test-'));
  });

  afterEach(async () => {
    await rm(testTmpDir, { recursive: true, force: true });
  });
  it('right file path', async () => {
    const filePath = join(testTmpDir, 'hello.txt');
    await writeFile(filePath, 'Hello from the sandbox!', 'utf-8');
    const content = await readFileContent(testTmpDir, { path: filePath });
    expect(content).toBe('Hello from the sandbox!');
  });
  it('outside', async () => {
    const filePath = join(testTmpDir, 'hello.txt');
    await writeFile(filePath, 'Hello from the sandbox!', 'utf-8');
    const content = await readFileContent(testTmpDir, { path: `../${filePath}` });
    expect(content).toBe('Error reading file: Path traversal');
  });
  it('missing file', async () => {
    const content = await readFileContent(testTmpDir, { path: 'hello.txt' });
    expect(content).toContain('Error: The file at path');
  });
  it('large file with truncate', async () => {
    const filePath = join(testTmpDir, 'hello.txt');
    await writeFile(filePath, 'AB'.repeat(MAX_CHARS + 1), 'utf-8');
    const content = await readFileContent(testTmpDir, { path: filePath });
    expect(content.endsWith('[truncated]')).toBe(true);
  });
});
