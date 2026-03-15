import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

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

function splitCsvLine(line) {
  return line.split(',');
}

class CsvToJsonTransform extends Transform {
  constructor() {
    super();
    this.leftover = '';
    this.headers = null;
    this.hasRows = false;
    this.hasSeenHeader = false;
  }

  processLine(line) {
    if (!this.hasSeenHeader) {
      this.headers = splitCsvLine(line);
      this.hasSeenHeader = true;
      return;
    }

    if (line.trim() === '') {
      return;
    }

    const values = splitCsvLine(line);
    const row = {};
    let index = 0;

    while (index < this.headers.length) {
      row[this.headers[index]] = values[index] ?? '';
      index += 1;
    }

    const jsonChunk = JSON.stringify(row, null, 2);

    if (!this.hasRows) {
      this.push('[\n');
      this.push(jsonChunk);
      this.hasRows = true;
      return;
    }

    this.push(',\n');
    this.push(jsonChunk);
  }

  _transform(chunk, encoding, callback) {
    try {
      const text = this.leftover + chunk.toString('utf8');
      const lines = text.split('\n');

      this.leftover = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.endsWith('\r')
          ? rawLine.slice(0, -1)
          : rawLine;

        this.processLine(line);
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    try {
      if (this.leftover.length > 0) {
        const line = this.leftover.endsWith('\r')
          ? this.leftover.slice(0, -1)
          : this.leftover;

        this.processLine(line);
      }

      if (!this.hasRows) {
        this.push('[]');
      } else {
        this.push('\n]');
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }
}

export async function csvToJson(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const outputArg = getOptionValue(args, '--output');

  const inputPath = resolvePath(currentDir, inputArg);
  const outputPath = resolvePath(currentDir, outputArg);

  try {
    await pipeline(
      fs.createReadStream(inputPath),
      new CsvToJsonTransform(),
      fs.createWriteStream(outputPath)
    );
  } catch {
    throw new Error('Operation failed');
  }
}