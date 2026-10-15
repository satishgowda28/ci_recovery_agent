import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listFiles } from '../../tools/listFiles';

describe('ListFiles tool test', () => {
  let testTmpDir: string;
  beforeEach(async () => {
    testTmpDir = await mkdtemp(join(tmpdir(), 'tool-test-'));
  });
  afterEach(async () => {
    await rm(testTmpDir, { recursive: true, force: true });
  });

  it('A subfolder and file', async () => {
    const subFolder = join(testTmpDir, 'src');
    const testFile = join(testTmpDir, 'test.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, 'Lorem ispsum', 'utf8');
    const dirContent = await listFiles(testTmpDir, { dir: '.' });
    expect(dirContent).toBe(`src/\ntest.txt`);
  });

  it('not dir given', async () => {
    const subFolder = join(testTmpDir, 'src');
    const testFile = join(testTmpDir, 'test.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, 'Lorem ispsum', 'utf8');
    const dirContent = await listFiles(testTmpDir, {});
    expect(dirContent).toBe(`src/\ntest.txt`);
  });

  it('Path: "../"', async () => {
    const subFolder = join(testTmpDir, 'src');
    const testFile = join(testTmpDir, 'test.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, 'Lorem ispsum', 'utf8');
    const dirContent = await listFiles(testTmpDir, { dir: '../test' });
    expect(dirContent).toBe(`Error: Path traversal`);
  });

  it('exclude node_modules .git', async () => {
    const src = join(testTmpDir, 'src');
    const nodeFolder = join(testTmpDir, 'node_modules');
    const testFile = join(testTmpDir, 'test.txt');
    const gitFile = join(testTmpDir, '.git');

    await mkdir(src, { recursive: true });
    await mkdir(nodeFolder, { recursive: true });
    await writeFile(testFile, 'Lorem ispsum', 'utf8');
    await writeFile(gitFile, 'Lorem ispsum', 'utf8');

    const dirContent = await listFiles(testTmpDir, { dir: '.' });
    expect(dirContent).toBe(`src/\ntest.txt`);
  });
});
