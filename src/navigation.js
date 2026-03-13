'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Navigate up one directory level.
 * @param {string} currentDir - The current directory.
 * @returns {string} The parent directory.
 */
function up(currentDir) {
  const parent = path.dirname(currentDir);
  // Don't go above the filesystem root
  return parent === currentDir ? currentDir : parent;
}

/**
 * Change to the specified directory.
 * @param {string} currentDir - The current directory.
 * @param {string} targetDir  - The target directory path.
 * @returns {{ newDir: string, error?: string }}
 */
function cd(currentDir, targetDir) {
  if (!targetDir) {
    return { newDir: currentDir, error: 'cd: missing argument' };
  }

  const resolved = path.isAbsolute(targetDir)
    ? path.normalize(targetDir)
    : path.resolve(currentDir, targetDir);

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { newDir: currentDir, error: `cd: not a directory: ${targetDir}` };
    }
    return { newDir: resolved };
  } catch {
    return { newDir: currentDir, error: `cd: no such directory: ${targetDir}` };
  }
}

/**
 * List the contents of a directory.
 * @param {string} currentDir - The directory to list.
 * @returns {{ entries: string[], error?: string }}
 */
function ls(currentDir) {
  try {
    const entries = fs.readdirSync(currentDir);
    return { entries };
  } catch (err) {
    return { entries: [], error: `ls: ${err.message}` };
  }
}

module.exports = { up, cd, ls };
