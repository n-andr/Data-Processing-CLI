import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';

function createEmptyStats() {
  return {
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
}

function addLine(stats, line) {
  const trimmed = line.trim();

  if (trimmed === '') {
    return;
  }

  const parts = trimmed.split(' ');

  if (parts.length < 7) {
    return;
  }

  const level = parts[1];
  const statusCode = Number(parts[3]);
  const responseTimeMs = Number(parts[4]);
  const requestPath = parts.slice(6).join(' ');

  stats.total += 1;
  stats.levels[level] = (stats.levels[level] || 0) + 1;

  if (statusCode >= 200 && statusCode < 300) {
    stats.status['2xx'] += 1;
  } else if (statusCode >= 300 && statusCode < 400) {
    stats.status['3xx'] += 1;
  } else if (statusCode >= 400 && statusCode < 500) {
    stats.status['4xx'] += 1;
  } else if (statusCode >= 500 && statusCode < 600) {
    stats.status['5xx'] += 1;
  }

  if (!Number.isNaN(responseTimeMs)) {
    stats.responseTimeSum += responseTimeMs;
  }

  stats.pathCounts[requestPath] = (stats.pathCounts[requestPath] || 0) + 1;
}

function processChunk() {
  const stats = createEmptyStats();
  const { inputPath, start, end } = workerData;

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(inputPath, {
      start,
      end: end - 1,
      encoding: 'utf8',
    });

    let leftover = '';

    stream.on('data', (chunk) => {
      const text = leftover + chunk;
      const lines = text.split('\n');

      leftover = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.endsWith('\r')
          ? rawLine.slice(0, -1)
          : rawLine;

        addLine(stats, line);
      }
    });

    stream.on('end', () => {
      if (leftover.trim() !== '') {
        const line = leftover.endsWith('\r')
          ? leftover.slice(0, -1)
          : leftover;

        addLine(stats, line);
      }

      resolve(stats);
    });

    stream.on('error', reject);
  });
}

processChunk()
  .then((stats) => {
    parentPort.postMessage(stats);
  })
  .catch(() => {
    process.exit(1);
  });