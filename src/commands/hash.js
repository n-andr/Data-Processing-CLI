'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { resolvePath } = require('../utils/pathResolver');

const SUPPORTED_ALGORITHMS = ['md5', 'sha1', 'sha256', 'sha512'];

/**
 * Compute the hash of a file.
 *
 * Usage: hash <algorithm> <file>
 *   algorithm: md5 | sha1 | sha256 | sha512
 *
 * @param {string[]} args       - [algorithm, filePath]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message containing the hex digest.
 */
function hash(args, currentDir) {
  if (args.length < 2) {
    return `Usage: hash <algorithm> <file>\n  algorithms: ${SUPPORTED_ALGORITHMS.join(', ')}`;
  }

  const algorithm = args[0].toLowerCase();
  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    return `hash: unsupported algorithm "${algorithm}". Supported: ${SUPPORTED_ALGORITHMS.join(', ')}`;
  }

  const filePath = resolvePath(currentDir, args[1]);

  let content;
  try {
    content = fs.readFileSync(filePath);
  } catch (err) {
    return `hash: cannot read file: ${err.message}`;
  }

  const digest = crypto.createHash(algorithm).update(content).digest('hex');
  return `${algorithm}(${filePath}) = ${digest}`;
}

module.exports = { hash };
