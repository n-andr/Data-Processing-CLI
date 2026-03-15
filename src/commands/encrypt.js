import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomBytes, createCipheriv, scryptSync } from 'node:crypto';
import { promises as fsp } from 'node:fs';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ALGORITHM = 'aes-256-gcm';

function getOptionValue(args, optionName) {
  const index = args.indexOf(optionName);

  if (index === -1 || !args[index + 1]) {
    throw new Error('Invalid input');
  }

  return args[index + 1];
}

function resolvePath(currentDir, targetPath) {
  return path.isAbsolute(targetPath)
    ? path.normalize(targetPath)
    : path.resolve(currentDir, targetPath);
}

class EncryptTransform extends Transform {
  constructor(password) {
    super();
    this.password = password;
    this.headerPushed = false;
    this.salt = randomBytes(SALT_LENGTH);
    this.iv = randomBytes(IV_LENGTH);
    this.key = scryptSync(this.password, this.salt, 32);
    this.cipher = createCipheriv(ALGORITHM, this.key, this.iv);
  }

  pushHeaderOnce() {
    if (this.headerPushed) {
      return;
    }

    this.push(this.salt);
    this.push(this.iv);
    this.headerPushed = true;
  }

  _transform(chunk, encoding, callback) {
    try {
      this.pushHeaderOnce();

      const encrypted = this.cipher.update(chunk);

      if (encrypted.length > 0) {
        this.push(encrypted);
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      this.pushHeaderOnce();

      const finalChunk = this.cipher.final();
      const authTag = this.cipher.getAuthTag();

      if (finalChunk.length > 0) {
        this.push(finalChunk);
      }

      this.push(authTag);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

export async function encrypt(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const outputArg = getOptionValue(args, '--output');
  const password = getOptionValue(args, '--password');

  const inputPath = resolvePath(currentDir, inputArg);
  const outputPath = resolvePath(currentDir, outputArg);

  try {
    await pipeline(
      fs.createReadStream(inputPath),
      new EncryptTransform(password),
      fs.createWriteStream(outputPath)
    );
  } catch {
    try {
      await fsp.unlink(outputPath);
    } catch {
      // ignore cleanup errors
    }

    throw new Error('Operation failed');
  }
}