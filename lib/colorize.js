export default function colorize(...arguments_) {
  const string_ = arguments_.join(' ');
  const isTTY = Boolean(process.stdout.isTTY);
  const buildColor = (start, end) => `${isTTY ? start : ''}${string_}${isTTY ? end : ''}`;

  return {
    dim: buildColor('\u001B[2m', '\u001B[22m'),
    reset: buildColor('\u001B[0m', '\u001B[0m'),

    black: buildColor('\u001B[30m', '\u001B[39m'),
    blue: buildColor('\u001B[34m', '\u001B[39m'),
    cyan: buildColor('\u001B[36m', '\u001B[39m'),
    green: buildColor('\u001B[32m', '\u001B[39m'),
    magenta: buildColor('\u001B[35m', '\u001B[39m'),
    red: buildColor('\u001B[31m', '\u001B[39m'),
    white: buildColor('\u001B[37m', '\u001B[39m'),
    yellow: buildColor('\u001B[33m', '\u001B[39m'),

    bgBlack: buildColor('\u001B[40m', '\u001B[0m'),
    bgBlue: buildColor('\u001B[44m', '\u001B[0m'),
    bgCyan: buildColor('\u001B[46m', '\u001B[0m'),
    bgGreen: buildColor('\u001B[42m', '\u001B[0m'),
    bgMagenta: buildColor('\u001B[45m', '\u001B[0m'),
    bgRed: buildColor('\u001B[41m', '\u001B[0m'),
    bgWhite: buildColor('\u001B[47m', '\u001B[0m'),
    bgYellow: buildColor('\u001B[43m', '\u001B[0m'),
  };
}
