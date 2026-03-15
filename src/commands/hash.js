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

function hasFlag(args, flagName) {
  return args.includes(flagName);
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

export async function hash(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const algorithm = getAlgorithm(args);
  const shouldSave = hasFlag(args, '--save');

  const inputPath = resolveInputPath(currentDir, inputArg);
  const hashInstance = createHash(algorithm);
  const hashWriter = new HashWritable(hashInstance);

  try {
    await pipeline(
      fs.createReadStream(inputPath),
      hashWriter
    );

    const digest = hashInstance.digest('hex');
    const output = `${algorithm}: ${digest}`;

    if (shouldSave) {
      const hashFilePath = `${inputPath}.${algorithm}`;
      await fsp.writeFile(hashFilePath, digest);
    }

    return output;
  } catch {
    throw new Error('Operation failed');
  }
}