import { describe, expect, it } from 'vitest';
import { resolveInRoot } from '../../tools/sandbox';
const ROOT = '/repo';
describe('Sandbox Test case', () => {
  it('Proper Path', () => {
    const path = resolveInRoot(ROOT, 'src/a.ts');
    expect(path).toBe('/repo/src/a.ts');
  });
  it('Path notes..md', () => {
    const path = resolveInRoot(ROOT, 'notes..md');
    expect(path).toBe('/repo/notes..md');
  });
  it('Path ../x', () => {
    expect(() => resolveInRoot(ROOT, '../x')).toThrow();
  });
  it('Path /etc/passwd', () => {
    expect(() => resolveInRoot(ROOT, '/etc/passwd')).toThrow();
  });
  it('Path ../repo-evil/x', () => {
    expect(() => resolveInRoot(ROOT, '../repo-evil/x')).toThrow();
  });
});
