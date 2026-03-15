import readline from 'node:readline';
import { parseArgs } from './utils/argParser.js';
import { up, cd, ls } from './navigation.js';
import { csvToJson } from './commands/csvToJson.js';
import { jsonToCsv } from './commands/jsonToCsv.js';
import { count } from './commands/count.js';
import { hash } from './commands/hash.js';
import { hashCompare } from './commands/hashCompare.js';
import { encrypt } from './commands/encrypt.js';
import { decrypt } from './commands/decrypt.js';
import { logStats } from './commands/logStats.js';

async function dispatch(line, state) {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed === '.exit') {
    return 'exit';
  }

  const spaceIdx = trimmed.indexOf(' ');
  const command = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
  const args = parseArgs(rest);

  switch (command) {
    case 'up': {
      state.currentDir = up(state.currentDir);
      return true;
    }

    case 'cd': {
      if (!args[0]) {
        console.log('Invalid input');
        return false;
      }

      const { newDir, error } = await cd(state.currentDir, args[0]);

      if (error) {
        console.log('Operation failed');
        return false;
      }

      state.currentDir = newDir;
      return true;
    }

    case 'ls': {
      const { entries, error } = await ls(state.currentDir);

      if (error) {
        console.log('Operation failed');
        return false;
      }

      console.log(entries.join('\n'));
      return true;
    }

    case 'csv-to-json': {
      await csvToJson(args, state.currentDir);
      return true;
    }

    case 'json-to-csv': {
      await jsonToCsv(args, state.currentDir);
      return true;
    }

    case 'count': {
      const result = await count(args, state.currentDir);
      console.log(result);
      return true;
    }

    case 'hash': {
      const result = await hash(args, state.currentDir);
      console.log(result);
      return true;
    }

    case 'hash-compare': {
      const result = await hashCompare(args, state.currentDir);
      console.log(result);
      return true;
    }

    case 'encrypt': {
      await encrypt(args, state.currentDir);
      return true;
    }

    case 'decrypt': {
      await decrypt(args, state.currentDir);
      return true;
    }

    case 'log-stats': {
      await logStats(args, state.currentDir);
      return true;
    }

    default: {
      console.log('Invalid input');
      return false;
    }
  }
}

export function startRepl({ state, onExit, onSuccess }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    try {
      const result = await dispatch(line, state);

      if (result === 'exit') {
        rl.close();
        onExit();
        return;
      }

      if (result === true) {
        onSuccess();
      }
    } catch (error) {
      console.log('Operation failed');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    onExit();
  });
}