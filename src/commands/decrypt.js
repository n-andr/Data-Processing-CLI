import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createDecipheriv, scryptSync } from 'node:crypto';
import { promises as fsp } from 'node:fs';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const HEADER_LENGTH = SALT_LENGTH + IV_LENGTH;
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

class DecryptTransform extends Transform {
  constructor(password) {
    super();
    this.password = password;
    this.headerBuffer = Buffer.alloc(0);
    this.trailingBuffer = Buffer.alloc(0);
    this.decipher = null;
    this.headerParsed = false;
  }

  initDecipher(header) {
    const salt = header.subarray(0, SALT_LENGTH);
    const iv = header.subarray(SALT_LENGTH, HEADER_LENGTH);
    const key = scryptSync(this.password, salt, 32);

    this.decipher = createDecipheriv(ALGORITHM, key, iv);
    this.headerParsed = true;
  }

  pushDecryptedData(buffer) {
    if (!buffer || buffer.length === 0) {
      return;
    }

    const decrypted = this.decipher.update(buffer);

    if (decrypted.length > 0) {
      this.push(decrypted);
    }
  }

  _transform(chunk, encoding, callback) {
    try {
      let data = chunk;

      if (!this.headerParsed) {
        this.headerBuffer = Buffer.concat([this.headerBuffer, data]);

        if (this.headerBuffer.length < HEADER_LENGTH) {
          callback();
          return;
        }

        const header = this.headerBuffer.subarray(0, HEADER_LENGTH);
        const remaining = this.headerBuffer.subarray(HEADER_LENGTH);

        this.initDecipher(header);
        this.headerBuffer = Buffer.alloc(0);
        data = remaining;
      }

      if (data.length > 0) {
        const combined = Buffer.concat([this.trailingBuffer, data]);

        if (combined.length <= AUTH_TAG_LENGTH) {
          this.trailingBuffer = combined;
          callback();
          return;
        }

        const encryptedPart = combined.subarray(
          0,
          combined.length - AUTH_TAG_LENGTH
        );

        this.trailingBuffer = combined.subarray(
          combined.length - AUTH_TAG_LENGTH
        );

        this.pushDecryptedData(encryptedPart);
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      if (!this.headerParsed) {
        callback(new Error('Operation failed'));
        return;
      }

      if (this.trailingBuffer.length !== AUTH_TAG_LENGTH) {
        callback(new Error('Operation failed'));
        return;
      }

      this.decipher.setAuthTag(this.trailingBuffer);

      const finalChunk = this.decipher.final();

      if (finalChunk.length > 0) {
        this.push(finalChunk);
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }
}

export async function decrypt(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const outputArg = getOptionValue(args, '--output');
  const password = getOptionValue(args, '--password');

  const inputPath = resolvePath(currentDir, inputArg);
  const outputPath = resolvePath(currentDir, outputArg);

  try {
    await pipeline(
      fs.createReadStream(inputPath),
      new DecryptTransform(password),
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