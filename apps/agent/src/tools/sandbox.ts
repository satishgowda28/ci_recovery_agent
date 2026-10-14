import path from 'path';

export function resolveInRoot(root: string, userPath: string): string {
  const fullPath = path.resolve(root, userPath);
  const relPath = path.relative(root, fullPath);
  if (relPath.includes('\0')) {
    throw new Error('Null bytes not allowed');
  }
  if (relPath === '..' || relPath.startsWith(`..${path.sep}`) || path.isAbsolute(relPath)) {
    throw new Error('Path traversal');
  }

  return fullPath;
}
