'use strict';

const path = require('path');

/**
 * Resolve a file path relative to the current navigation directory.
 * @param {string} currentDir - The current navigation directory.
 * @param {string} inputPath  - The path to resolve.
 * @returns {string} Absolute resolved path.
 */
function resolvePath(currentDir, inputPath) {
  if (!inputPath) {
    return currentDir;
  }
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  return path.resolve(currentDir, inputPath);
}

module.exports = { resolvePath };
