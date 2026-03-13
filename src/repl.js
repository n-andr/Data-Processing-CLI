'use strict';

const { parseArgs } = require('./utils/argParser');
const { up, cd, ls } = require('./navigation');
const { csvToJson } = require('./commands/csvToJson');
const { jsonToCsv } = require('./commands/jsonToCsv');
const { count } = require('./commands/count');
const { hash } = require('./commands/hash');
const { hashCompare } = require('./commands/hashCompare');
const { encrypt } = require('./commands/encrypt');
const { decrypt } = require('./commands/decrypt');
const { logStats } = require('./commands/logStats');

/**
 * Dispatch a REPL input line to the appropriate command handler.
 *
 * @param {string}   line       - Raw input line from the REPL.
 * @param {object}   state      - Mutable navigation state: { currentDir: string }
 * @param {Function} output     - Function to write output (defaults to console.log).
 * @returns {Promise<void>}
 */
async function dispatch(line, state, output = console.log) {
  const trimmed = line.trim();
  if (!trimmed) return;

  // Split into command and the rest of the line
  const spaceIdx = trimmed.indexOf(' ');
  const command = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
  const args = parseArgs(rest);

  switch (command) {
    // ── Navigation ──────────────────────────────────────────────────────────
    case 'up': {
      state.currentDir = up(state.currentDir);
      output(state.currentDir);
      break;
    }

    case 'cd': {
      const { newDir, error } = cd(state.currentDir, args[0]);
      state.currentDir = newDir;
      if (error) output(error);
      else output(state.currentDir);
      break;
    }

    case 'ls': {
      const { entries, error } = ls(state.currentDir);
      if (error) output(error);
      else output(entries.join('\n'));
      break;
    }

    // ── Data conversion ──────────────────────────────────────────────────────
    case 'csv-to-json': {
      output(csvToJson(args, state.currentDir));
      break;
    }

    case 'json-to-csv': {
      output(jsonToCsv(args, state.currentDir));
      break;
    }

    // ── File utilities ────────────────────────────────────────────────────────
    case 'count': {
      output(count(args, state.currentDir));
      break;
    }

    case 'hash': {
      output(hash(args, state.currentDir));
      break;
    }

    case 'hash-compare': {
      output(hashCompare(args, state.currentDir));
      break;
    }

    // ── Encryption ────────────────────────────────────────────────────────────
    case 'encrypt': {
      output(encrypt(args, state.currentDir));
      break;
    }

    case 'decrypt': {
      output(decrypt(args, state.currentDir));
      break;
    }

    // ── Log analysis ──────────────────────────────────────────────────────────
    case 'log-stats': {
      const result = await logStats(args, state.currentDir);
      output(result);
      break;
    }

    // ── Meta ──────────────────────────────────────────────────────────────────
    case 'help': {
      output(HELP_TEXT);
      break;
    }

    case 'pwd': {
      output(state.currentDir);
      break;
    }

    case 'exit':
    case 'quit': {
      output('Goodbye!');
      process.exit(0);
      break;
    }

    default: {
      output(`Unknown command: "${command}". Type "help" for available commands.`);
    }
  }
}

const HELP_TEXT = `
Available commands:
  Navigation:
    pwd                              Print current directory
    ls                               List directory contents
    cd <dir>                         Change directory
    up                               Go up one directory level

  Data conversion:
    csv-to-json <input> <output>     Convert CSV file to JSON
    json-to-csv <input> <output>     Convert JSON file to CSV

  File utilities:
    count <file>                     Count lines, words and characters
    hash <algorithm> <file>          Compute file hash (md5/sha1/sha256/sha512)
    hash-compare <algo> <f1> <f2>   Compare hashes of two files

  Encryption:
    encrypt <input> <output> <pass>  Encrypt a file with AES-256-CBC
    decrypt <input> <output> <pass>  Decrypt an encrypted file

  Log analysis:
    log-stats <logfile>              Show statistics for an access log file

  Other:
    help                             Show this help text
    exit | quit                      Exit the CLI
`.trim();

module.exports = { dispatch };
