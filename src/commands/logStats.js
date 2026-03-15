import path from 'node:path';
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { promises as fs } from 'node:fs';

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

async function findNextLineBoundary(fileHandle, startPos, fileSize) {
  if (startPos <= 0) {
    return 0;
  }
  if (startPos >= fileSize) {
    return fileSize;
  }

  const CHUNK_SIZE = 64 * 1024;
  const buffer = Buffer.alloc(CHUNK_SIZE);
  let position = startPos;

  while (position < fileSize) {
    const bytesToRead = Math.min(CHUNK_SIZE, fileSize - position);
    const { bytesRead } = await fileHandle.read(
      buffer,
      0,
      bytesToRead,
      position
    );

    if (bytesRead === 0) {
      return fileSize;
    }

    const newlineIndex = buffer.subarray(0, bytesRead).indexOf(0x0a);

    if (newlineIndex !== -1) {
      return position + newlineIndex + 1;
    }

    position += bytesRead;
  }

  return fileSize;
}

async function buildRanges(inputPath, workerCount) {
  const fileHandle = await fs.open(inputPath, 'r');

  try {
    const stats = await fileHandle.stat();
    const fileSize = stats.size;

    if (fileSize === 0) {
      return [];
    }

    const starts = [0];

    for (let i = 1; i < workerCount; i += 1) {
      const roughStart = Math.floor((fileSize * i) / workerCount);
      const alignedStart = await findNextLineBoundary(
        fileHandle,
        roughStart,
        fileSize
      );

      starts.push(alignedStart);
    }

    starts.push(fileSize);

    const ranges = [];
    for (let i = 0; i < starts.length - 1; i += 1) {
      const start = starts[i];
      const end = starts[i + 1];

      if (start < end) {
        ranges.push({ start, end });
      }
    }

    return ranges;
  } finally {
    await fileHandle.close();
  }
}

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/logWorker.js', import.meta.url),
      { workerData }
    );

    worker.once('message', (result) => {
      resolve(result);
    });

    worker.once('error', (error) => {
      reject(error);
    });

    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

function mergePartials(partials) {
  const merged = {
    total: 0,
    levels: {},
    status: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    },
    pathCounts: {},
    responseTimeSum: 0,
  };

  for (const partial of partials) {
    merged.total += partial.total;
    merged.responseTimeSum += partial.responseTimeSum;

    for (const [level, count] of Object.entries(partial.levels)) {
      merged.levels[level] = (merged.levels[level] || 0) + count;
    }

    for (const [statusClass, count] of Object.entries(partial.status)) {
      merged.status[statusClass] = (merged.status[statusClass] || 0) + count;
    }

    for (const [requestPath, count] of Object.entries(partial.pathCounts)) {
      merged.pathCounts[requestPath] =
        (merged.pathCounts[requestPath] || 0) + count;
    }
  }

  const topPaths = Object.entries(merged.pathCounts)
    .map(([requestPath, count]) => ({
      path: requestPath,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.path.localeCompare(b.path);
    })
    .slice(0, 10);

  return {
    total: merged.total,
    levels: merged.levels,
    status: merged.status,
    topPaths,
    avgResponseTimeMs:
      merged.total === 0
        ? 0
        : Number((merged.responseTimeSum / merged.total).toFixed(2)),
  };
}

export async function logStats(args, currentDir) {
  const inputArg = getOptionValue(args, '--input');
  const outputArg = getOptionValue(args, '--output');

  const inputPath = resolvePath(currentDir, inputArg);
  const outputPath = resolvePath(currentDir, outputArg);

  try {
    const inputStats = await fs.stat(inputPath);

    if (!inputStats.isFile()) {
      throw new Error('Operation failed');
    }

    const cpuCount = cpus().length;
    const workerCount = Math.max(1, cpuCount);
    const ranges = await buildRanges(inputPath, workerCount);

    let result;

    if (ranges.length === 0) {
      result = {
        total: 0,
        levels: {},
        status: {
          '2xx': 0,
          '3xx': 0,
          '4xx': 0,
          '5xx': 0,
        },
        topPaths: [],
        avgResponseTimeMs: 0,
      };
    } else {
      const partials = await Promise.all(
        ranges.map((range) =>
          runWorker({
            inputPath,
            start: range.start,
            end: range.end,
          })
        )
      );

      result = mergePartials(partials);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  } catch {
    throw new Error('Operation failed');
  }
}