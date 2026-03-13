'use strict';

const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { resolvePath } = require('../utils/pathResolver');

/**
 * Analyse an Apache/Nginx-style access log file and report statistics.
 * The heavy parsing is delegated to a worker thread.
 *
 * Usage: log-stats <logfile>
 *
 * @param {string[]} args       - [logFilePath]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {Promise<string>} Result message with statistics.
 */
function logStats(args, currentDir) {
  if (args.length < 1) {
    return Promise.resolve('Usage: log-stats <logfile>');
  }

  const logPath = resolvePath(currentDir, args[0]);

  if (!fs.existsSync(logPath)) {
    return Promise.resolve(`log-stats: file not found: ${logPath}`);
  }

  const workerPath = path.resolve(__dirname, '../workers/logWorker.js');

  return new Promise((resolve) => {
    const worker = new Worker(workerPath, { workerData: { logPath } });

    worker.on('message', (stats) => {
      resolve(formatStats(stats));
    });

    worker.on('error', (err) => {
      resolve(`log-stats: worker error: ${err.message}`);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        resolve(`log-stats: worker exited with code ${code}`);
      }
    });
  });
}

/**
 * Format the statistics object returned by the worker into a human-readable string.
 * @param {object} stats
 * @returns {string}
 */
function formatStats(stats) {
  const lines = [
    `Log file: ${stats.logPath}`,
    `Total requests  : ${stats.totalRequests}`,
    `Unique IPs      : ${stats.uniqueIPs}`,
    '',
    'Status codes:',
  ];

  const codes = Object.keys(stats.statusCodes).sort();
  for (const code of codes) {
    lines.push(`  ${code}: ${stats.statusCodes[code]}`);
  }

  lines.push('', 'Top 5 requested paths:');
  stats.topPaths.forEach(([p, n], i) => {
    lines.push(`  ${i + 1}. ${p} (${n})`);
  });

  return lines.join('\n');
}

module.exports = { logStats };
