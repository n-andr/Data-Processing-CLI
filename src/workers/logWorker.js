'use strict';

const fs = require('fs');
const { workerData, parentPort } = require('worker_threads');

/**
 * Worker thread for the log-stats command.
 *
 * Parses a Common Log Format (CLF) / Combined Log Format access log and
 * computes the following statistics:
 *   - totalRequests  — total number of log entries
 *   - uniqueIPs      — count of distinct client IP addresses
 *   - statusCodes    — map of HTTP status code → count
 *   - topPaths       — top 5 requested URL paths (sorted by frequency, desc)
 *
 * Expected CLF line format:
 *   <ip> - - [<date>] "<method> <path> <protocol>" <status> <bytes>
 */

const { logPath } = workerData;

// CLF/Combined log format regex
const LOG_REGEX = /^(\S+)\s+\S+\s+\S+\s+\[.*?\]\s+"(?:\S+\s+(\S+)\s+\S+|\S*)"\s+(\d{3})\s+/;

let raw;
try {
  raw = fs.readFileSync(logPath, 'utf8');
} catch (err) {
  parentPort.postMessage({ error: err.message });
  process.exit(1);
}

const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');

let totalRequests = 0;
const ipSet = new Set();
const statusCodes = {};
const pathCounts = {};

for (const line of lines) {
  const match = LOG_REGEX.exec(line);
  if (!match) continue;

  totalRequests++;
  const ip = match[1];
  const urlPath = match[2] || '-';
  const status = match[3];

  ipSet.add(ip);

  statusCodes[status] = (statusCodes[status] || 0) + 1;
  pathCounts[urlPath] = (pathCounts[urlPath] || 0) + 1;
}

const topPaths = Object.entries(pathCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

parentPort.postMessage({
  logPath,
  totalRequests,
  uniqueIPs: ipSet.size,
  statusCodes,
  topPaths,
});
