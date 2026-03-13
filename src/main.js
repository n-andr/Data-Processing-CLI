'use strict';

const repl = require('repl');
const { dispatch } = require('./repl');

/**
 * Navigation state shared across all REPL commands.
 * Starts in the user's home directory.
 */
const state = {
  currentDir: process.cwd(),
};

/**
 * Custom REPL evaluator that delegates every input line to the command
 * dispatcher and manages async results.
 *
 * @param {string}   cmd      - Input line (Node REPL appends a newline).
 * @param {object}   _context - REPL context (unused).
 * @param {string}   _file    - Filename (unused).
 * @param {Function} callback - Node REPL callback(err, result).
 */
async function evaluate(cmd, _context, _file, callback) {
  try {
    await dispatch(cmd, state);
    callback(null);
  } catch (err) {
    callback(err);
  }
}

/**
 * Dynamic prompt that always shows the current directory.
 * @returns {string}
 */
function buildPrompt() {
  return `[${state.currentDir}] $ `;
}

// ── Start REPL ────────────────────────────────────────────────────────────────

const replServer = repl.start({
  prompt: buildPrompt(),
  eval: evaluate,
  ignoreUndefined: true,
});

// Refresh the prompt to reflect directory changes after each command
replServer.on('reset', () => {
  replServer.setPrompt(buildPrompt());
});

replServer.eval = async function (cmd, context, file, callback) {
  await evaluate(cmd, context, file, (err, result) => {
    replServer.setPrompt(buildPrompt());
    callback(err, result);
  });
};

console.log('Data Processing CLI — type "help" for available commands.\n');
