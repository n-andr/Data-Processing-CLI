'use strict';

const fs = require('fs');
const { resolvePath } = require('../utils/pathResolver');

/**
 * Convert a JSON file (array of objects) to a CSV file.
 *
 * Usage: json-to-csv <input.json> <output.csv>
 *
 * @param {string[]} args       - [inputPath, outputPath]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message.
 */
function jsonToCsv(args, currentDir) {
  if (args.length < 2) {
    return 'Usage: json-to-csv <input.json> <output.csv>';
  }

  const inputPath = resolvePath(currentDir, args[0]);
  const outputPath = resolvePath(currentDir, args[1]);

  let records;
  try {
    const raw = fs.readFileSync(inputPath, 'utf8');
    records = JSON.parse(raw);
  } catch (err) {
    return `json-to-csv: cannot read/parse file: ${err.message}`;
  }

  if (!Array.isArray(records) || records.length === 0) {
    return 'json-to-csv: input must be a non-empty JSON array';
  }

  const headers = Object.keys(records[0]);
  const csvLines = [headers.map(escapeCSV).join(',')];

  for (const record of records) {
    const row = headers.map((h) => escapeCSV(record[h] !== undefined ? String(record[h]) : ''));
    csvLines.push(row.join(','));
  }

  try {
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  } catch (err) {
    return `json-to-csv: cannot write file: ${err.message}`;
  }

  return `json-to-csv: converted ${records.length} record(s) → ${outputPath}`;
}

/**
 * Escape a field value for CSV output.
 * @param {string} value
 * @returns {string}
 */
function escapeCSV(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = { jsonToCsv };
