import path from 'node:path';

export function resolveInputPath(currentDir, targetPath) {
  if (!targetPath) {
    throw new Error('Invalid input');
  }

  return path.isAbsolute(targetPath)
    ? path.normalize(targetPath)
    : path.resolve(currentDir, targetPath);
}
