'use strict';

const fs = require('fs');
const { resolvePath } = require('../utils/pathResolver');

/**
 * Count the number of lines, words, and characters in a file.
 *
 * Usage: count <file>
 *
 * @param {string[]} args       - [filePath]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message.
 */
function count(args, currentDir) {
  if (args.length < 1) {
    return 'Usage: count <file>';
  }

  const filePath = resolvePath(currentDir, args[0]);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return `count: cannot read file: ${err.message}`;
  }

  const lines = content.split(/\r?\n/).length;
  const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const chars = content.length;

  return `lines: ${lines}  words: ${words}  chars: ${chars}  ${filePath}`;
}

module.exports = { count };
