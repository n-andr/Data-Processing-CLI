import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolveInputPath } from '../utils/pathResolver.js';

function getOptionValue(args, optionName) {
  const index = args.indexOf(optionName);

  if (index === -1 || !args[index + 1]) {
    throw new Error('Invalid input');
  }

  return args[index + 1];
}

function escapeCsv(value) {
  const str = String(value ?? '');

  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export async function jsonToCsv(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const outputArg = getOptionValue(args, '--output');

  const inputPath = resolveInputPath(currentDir, inputArg);
  const outputPath = resolveInputPath(currentDir, outputArg);

  try {
    const jsonContent = await fs.promises.readFile(inputPath, 'utf8');
    const data = JSON.parse(jsonContent);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error();
    }

    const headers = Object.keys(data[0]);

    async function* generateCsv() {
      yield headers.join(',') + '\n';

      for (const row of data) {
        const line = headers
          .map((key) => escapeCsv(row[key]))
          .join(',');

        yield line + '\n';
      }
    }

    await pipeline(
      Readable.from(generateCsv()),
      fs.createWriteStream(outputPath)
    );
  } catch {
    throw new Error('Operation failed');
  }
}