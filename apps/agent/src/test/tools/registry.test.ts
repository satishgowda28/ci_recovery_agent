import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getToolDefinitions, runTool } from '../../tools/registry';

describe('Tool registry', () => {
  let testTmpDir: string;

  beforeEach(async () => {
    testTmpDir = await mkdtemp(join(tmpdir(), 'registry-test-'));
    await writeFile(join(testTmpDir, 'a.txt'), 'hello foo', 'utf8');
  });

  afterEach(async () => {
    await rm(testTmpDir, { recursive: true, force: true });
  });

  it('getToolDefinitions returns all 4 tools with JSON Schema parameters', () => {
    const defs = getToolDefinitions();
    expect(defs.map((d) => d.name).sort()).toEqual([
      'getGitDiff',
      'listFiles',
      'readFile',
      'searchCode',
    ]);
    for (const d of defs) {
      expect(d.description).not.toBe('');
      expect(d.parameters).toMatchObject({ type: 'object' });
    }
  });

  it('runTool executes a valid call', async () => {
    const result = await runTool(testTmpDir, { id: '1', name: 'listFiles', arguments: {} });
    expect(result).toBe('a.txt');
  });

  it('runTool passes validated arguments to the tool', async () => {
    const result = await runTool(testTmpDir, {
      id: '1',
      name: 'searchCode',
      arguments: { query: 'foo' },
    });
    expect(result).toBe('a.txt:1: hello foo');
  });

  it('runTool returns an error for an unknown tool instead of throwing', async () => {
    const result = await runTool(testTmpDir, { id: '1', name: 'deleteAll', arguments: {} });
    expect(result).toMatch(/^Error: Unknown tool/);
    expect(result).toContain('deleteAll');
  });

  it('runTool returns an error for invalid arguments instead of throwing', async () => {
    const result = await runTool(testTmpDir, { id: '1', name: 'searchCode', arguments: {} });
    expect(result).toMatch(/^Error: Invalid arguments/);
  });
});
