import { color } from "./logger.js";

export interface Column<T> {
  header: string;
  /** Returns the cell value for a row. */
  value: (row: T) => string;
}

/**
 * Renders a simple, dependency-free aligned text table to stdout. Column widths
 * are sized to the widest cell. Designed for human-readable `list` output; use
 * `--json` on commands when machine-readable output is required.
 */
export function printTable<T>(rows: T[], columns: Column<T>[]): void {
  if (rows.length === 0) {
    console.log(color.dim("(no results)"));
    return;
  }

  const cells = rows.map((row) => columns.map((c) => c.value(row) ?? ""));
  const widths = columns.map((c, i) =>
    Math.max(c.header.length, ...cells.map((r) => r[i].length)),
  );

  const pad = (text: string, width: number): string =>
    text + " ".repeat(Math.max(0, width - text.length));

  const headerLine = columns
    .map((c, i) => color.bold(pad(c.header, widths[i])))
    .join("  ");
  console.log(headerLine);
  console.log(color.dim(widths.map((w) => "-".repeat(w)).join("  ")));

  for (const row of cells) {
    console.log(row.map((cell, i) => pad(cell, widths[i])).join("  "));
  }
}
