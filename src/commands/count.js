import fs from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolveInputPath } from '../utils/pathResolver.js';

class CountTransform extends Transform {
  constructor() {
    super();
    this.lines = 0;
    this.words = 0;
    this.characters = 0;
    this.lastChunkEndedWithWhitespace = true;
  }

  _transform(chunk, encoding, callback) {
    try {
      const text = chunk.toString();

      this.characters += text.length;

      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];

        if (char === '\n') {
          this.lines += 1;
        }

        const isWhitespace = /\s/.test(char);

        if (!isWhitespace && this.lastChunkEndedWithWhitespace) {
          this.words += 1;
        }

        this.lastChunkEndedWithWhitespace = isWhitespace;
      }

      callback(null, chunk);
    } catch (error) {
      callback(error);
    }
  }
}

function getInputPath(args) {
  const inputIndex = args.indexOf('--input');

  if (inputIndex === -1 || !args[inputIndex + 1]) {
    throw new Error('Invalid input');
  }

  return args[inputIndex + 1];
}

export async function count(args, currentDir) {
  const inputArg = getInputPath(args);
  const inputPath = resolveInputPath(currentDir, inputArg);
  const counter = new CountTransform();

  try {
    await pipeline(
      fs.createReadStream(inputPath),
      counter
    );

    return [
      `Lines: ${counter.lines}`,
      `Words: ${counter.words}`,
      `Characters: ${counter.characters}`,
    ].join('\n');
  } catch {
    throw new Error('Operation failed');
  }
}