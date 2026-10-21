import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchCode } from '../../tools/searchCode';

describe('Search Code Test Case', () => {
  let testTmpDir: string;
  beforeEach(async () => {
    testTmpDir = await mkdtemp(join(tmpdir(), 'tool-test-'));
  });
  afterEach(async () => {
    await rm(testTmpDir, { recursive: true, force: true });
  });
  it('Match the code on line 2', async () => {
    const testFile = join(testTmpDir, 'a.txt');
    await writeFile(testFile, `x\nfoo\ny`, 'utf8');
    const result = await searchCode(testTmpDir, { query: 'foo' });
    expect(result).toBe('a.txt:2: foo');
  });
  it('Match the code inside subfolder', async () => {
    const subFolder = join(testTmpDir, 'src');
    const testFile = join(subFolder, 'b.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, `foo`, 'utf8');
    const result = await searchCode(testTmpDir, { query: 'foo' });
    expect(result).toBe('src/b.txt:1: foo');
  });
  it('No Match node_modules', async () => {
    const subFolder = join(testTmpDir, 'node_modules');
    const testFile = join(subFolder, 'b.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, `foo`, 'utf8');
    const result = await searchCode(testTmpDir, { query: 'foo' });
    expect(result).toBe('No matches for "foo"');
  });
  it('No match', async () => {
    const subFolder = join(testTmpDir, 'src');
    const testFile = join(subFolder, 'b.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, `Lorem ipsum`, 'utf8');
    const result = await searchCode(testTmpDir, { query: 'foo' });
    expect(result).toBe('No matches for "foo"');
  });
  it('60 Match', async () => {
    const subFolder = join(testTmpDir, 'src');
    const testFile = join(subFolder, 'b.txt');
    await mkdir(subFolder, { recursive: true });
    await writeFile(testFile, `Lorem ipsum\nfoo\n`.repeat(60), 'utf8');
    const result = await searchCode(testTmpDir, { query: 'foo' });
    const lines = result.split('\n');
    expect(lines).toHaveLength(51);
    expect(result).toContain('[truncated]');
  });
});
