import { promises as fs } from 'node:fs';
import path from 'node:path';

export function up(currentDir) {
  const parentDir = path.dirname(currentDir);
  return parentDir === currentDir ? currentDir : parentDir;
}

export async function cd(currentDir, targetDir) {
  if (!targetDir) {
    return { newDir: currentDir, error: true };
  }

  const resolvedPath = path.isAbsolute(targetDir)
    ? path.normalize(targetDir)
    : path.resolve(currentDir, targetDir);

  try {
    const stats = await fs.stat(resolvedPath);

    if (!stats.isDirectory()) {
      return { newDir: currentDir, error: true };
    }

    return { newDir: resolvedPath };
  } catch {
    return { newDir: currentDir, error: true };
  }
}

export async function ls(currentDir) {
  try {
    const dirEntries = await fs.readdir(currentDir, { withFileTypes: true });

    const formattedEntries = dirEntries
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'folder' : 'file',
      }))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      })
      .map((entry) => `${entry.name} [${entry.type}]`);

    return { entries: formattedEntries };
  } catch {
    return { entries: [], error: true };
  }
}