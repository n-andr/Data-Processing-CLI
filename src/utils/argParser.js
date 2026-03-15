export function parseArgs(input) {
  if (!input || input.trim() === '') {
    return [];
  }

  const args = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ' ' && !insideQuotes) {
      if (current !== '') {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current !== '') {
    args.push(current);
  }

  return args;
}