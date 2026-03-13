'use strict';

const fs = require('fs');
const { resolvePath } = require('../utils/pathResolver');

/**
 * Convert a CSV file to a JSON file.
 *
 * Usage: csv-to-json <input.csv> <output.json>
 *
 * @param {string[]} args       - [inputPath, outputPath]
 * @param {string}   currentDir - Current navigation directory.
 * @returns {string} Result message.
 */
function csvToJson(args, currentDir) {
  if (args.length < 2) {
    return 'Usage: csv-to-json <input.csv> <output.json>';
  }

  const inputPath = resolvePath(currentDir, args[0]);
  const outputPath = resolvePath(currentDir, args[1]);

  let raw;
  try {
    raw = fs.readFileSync(inputPath, 'utf8');
  } catch (err) {
    return `csv-to-json: cannot read file: ${err.message}`;
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) {
    return 'csv-to-json: input file is empty';
  }

  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] !== undefined ? values[idx] : '';
    });
    records.push(record);
  }

  try {
    fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    return `csv-to-json: cannot write file: ${err.message}`;
  }

  return `csv-to-json: converted ${records.length} record(s) → ${outputPath}`;
}

/**
 * Parse a single CSV line respecting double-quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

module.exports = { csvToJson };
