import os from 'node:os';
import { startRepl } from './repl.js';

const WELCOME_MESSAGE = 'Welcome to Data Processing CLI!';
const GOODBYE_MESSAGE = 'Thank you for using Data Processing CLI!';

function printCurrentDirectory(currentDir) {
  console.log(`You are currently in ${currentDir}`);
}

function exitGracefully() {
  console.log(GOODBYE_MESSAGE);
  process.exit(0);
}

function main() {
  const state = {
    currentDir: os.homedir(),
  };

  console.log(WELCOME_MESSAGE);
  printCurrentDirectory(state.currentDir);

  let isExiting = false;

  const safeExit = () => {
    if (isExiting) {
      return;
    }
    isExiting = true;
    exitGracefully();
  };

  process.on('SIGINT', safeExit);

  process.on('uncaughtException', () => {
    console.log('Operation failed');
  });

  process.on('unhandledRejection', () => {
    console.log('Operation failed');
  });

  startRepl({
    state,
    onExit: safeExit,
    onSuccess: () => {
      printCurrentDirectory(state.currentDir);
    },
  });
}

main();