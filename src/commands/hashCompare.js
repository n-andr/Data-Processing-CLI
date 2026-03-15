import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { promises as fsp } from 'node:fs';
import { resolveInputPath } from '../utils/pathResolver.js';

const SUPPORTED_ALGORITHMS = new Set(['sha256', 'md5', 'sha512']);

function getOptionValue(args, optionName) {
  const index = args.indexOf(optionName);

  if (index === -1 || !args[index + 1]) {
    throw new Error('Invalid input');
  }

  return args[index + 1];
}


function getAlgorithm(args) {
  if (!args.includes('--algorithm')) {
    return 'sha256';
  }

  const algorithm = getOptionValue(args, '--algorithm');

  if (!SUPPORTED_ALGORITHMS.has(algorithm)) {
    throw new Error('Operation failed');
  }

  return algorithm;
}

class HashWritable extends Writable {
  constructor(hash) {
    super();
    this.hash = hash;
  }

  _write(chunk, encoding, callback) {
    try {
      this.hash.update(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

async function calculateFileHash(inputPath, algorithm) {
  const hashInstance = createHash(algorithm);
  const hashWriter = new HashWritable(hashInstance);

  await pipeline(
    fs.createReadStream(inputPath),
    hashWriter
  );

  return hashInstance.digest('hex');
}

export async function hashCompare(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const hashArg = getOptionValue(args, '--hash');
  const algorithm = getAlgorithm(args);

  const inputPath = resolveInputPath(currentDir, inputArg);
  const hashPath = resolveInputPath(currentDir, hashArg);

  try {
    const [actualHash, expectedHashRaw] = await Promise.all([
      calculateFileHash(inputPath, algorithm),
      fsp.readFile(hashPath, 'utf8'),
    ]);

    const expectedHash = expectedHashRaw.trim().toLowerCase();

    if (actualHash.toLowerCase() === expectedHash) {
      return 'OK';
    }

    return 'MISMATCH';
  } catch {
    throw new Error('Operation failed');
  }
}