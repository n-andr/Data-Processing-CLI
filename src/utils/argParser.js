'use strict';

/**
 * Parse a raw argument string into an array of tokens, respecting
 * double-quoted strings (quotes are stripped from tokens).
 *
 * @param {string} input - The raw argument string (excluding the command name).
 * @returns {string[]} Array of parsed argument tokens.
 */
function parseArgs(input) {
  const args = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ' ' && !inQuotes) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

module.exports = { parseArgs };
