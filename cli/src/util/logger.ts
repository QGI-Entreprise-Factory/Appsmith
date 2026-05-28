/**
 * Tiny ANSI colour + logging helpers. We avoid third-party colour libraries to
 * keep the dependency surface of the CLI minimal. Colours are automatically
 * disabled when stdout is not a TTY or when NO_COLOR / --no-color is set.
 */

let colorEnabled = process.stdout.isTTY === true && !process.env.NO_COLOR;

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

function wrap(open: number, close: number) {
  return (text: string | number): string =>
    colorEnabled ? `[${open}m${text}[${close}m` : String(text);
}

export const color = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

export const log = {
  info: (msg: string): void => console.log(msg),
  success: (msg: string): void => console.log(`${color.green("✔")} ${msg}`),
  warn: (msg: string): void => console.warn(`${color.yellow("!")} ${msg}`),
  error: (msg: string): void => console.error(`${color.red("✖")} ${msg}`),
  step: (msg: string): void => console.log(`${color.cyan("›")} ${msg}`),
  json: (value: unknown): void => console.log(JSON.stringify(value, null, 2)),
};

/** Error type that carries an exit code and prints cleanly (no stack trace). */
export class CliError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}
