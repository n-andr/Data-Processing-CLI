'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { resolvePath } = require('../utils/pathResolver');

const SUPPORTED_ALGORITHMS = ['md5', 'sha1', 'sha256', 'sha512'];

/**
 * Compute and compare the hash of two files.
 *
 * Usage: hash-compare <algorithm> <file1> <file2>
 *   algorithm: md5 | sha1 | sha256 | sha512
 *
 * @param {string[]} args       - [algorithm, filePath1, filePath2]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message indicating whether the hashes match.
 */
function hashCompare(args, currentDir) {
  if (args.length < 3) {
    return `Usage: hash-compare <algorithm> <file1> <file2>\n  algorithms: ${SUPPORTED_ALGORITHMS.join(', ')}`;
  }

  const algorithm = args[0].toLowerCase();
  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    return `hash-compare: unsupported algorithm "${algorithm}". Supported: ${SUPPORTED_ALGORITHMS.join(', ')}`;
  }

  const file1 = resolvePath(currentDir, args[1]);
  const file2 = resolvePath(currentDir, args[2]);

  let content1, content2;
  try {
    content1 = fs.readFileSync(file1);
  } catch (err) {
    return `hash-compare: cannot read file "${args[1]}": ${err.message}`;
  }
  try {
    content2 = fs.readFileSync(file2);
  } catch (err) {
    return `hash-compare: cannot read file "${args[2]}": ${err.message}`;
  }

  const digest1 = crypto.createHash(algorithm).update(content1).digest('hex');
  const digest2 = crypto.createHash(algorithm).update(content2).digest('hex');

  const match = digest1 === digest2;
  return [
    `${algorithm}(${file1}) = ${digest1}`,
    `${algorithm}(${file2}) = ${digest2}`,
    match ? 'MATCH ✓' : 'MISMATCH ✗',
  ].join('\n');
}

module.exports = { hashCompare };
