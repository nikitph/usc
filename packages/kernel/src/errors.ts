/** Typed errors for the kernel's failure domains (CLAUDE.md §5, INV-8). */

/** A rulebase file's shape does not match the rulebase contract. */
export class SchemaValidationError extends Error {
  readonly file: string;

  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "SchemaValidationError";
    this.file = file;
  }
}

/** Rulebase files are individually well-formed but mutually inconsistent. */
export class RulebaseConflictError extends Error {
  readonly file: string;

  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "RulebaseConflictError";
    this.file = file;
  }
}
