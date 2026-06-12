import { createHash } from "node:crypto";

/**
 * The single hash code path for everything content-addressed (STANDARDS.md,
 * USC addition #2). Artifact ids are sha256Hex(canonicalJson({...})) per
 * schemas/artifact.schema.json. A second canonicalization or hashing routine
 * anywhere in the repo is a correctness bug.
 */

/** A value that cannot be canonicalized is a programming error at the call site. */
export class CanonicalJsonError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(`${message} at ${path === "" ? "$" : `$${path}`}`);
    this.name = "CanonicalJsonError";
    this.path = path;
  }
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * Deterministic JSON serialization: object keys sorted lexicographically at
 * every depth, no insignificant whitespace. Rejects (rather than silently
 * altering) anything JSON cannot represent: undefined, non-finite numbers,
 * functions, symbols, bigints, and non-plain objects such as Date or Map.
 */
export function canonicalJson(value: unknown): string {
  return serialize(value, "");
}

/** Lowercase hex SHA-256. */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new CanonicalJsonError(`non-finite number ${String(value)}`, path);
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new CanonicalJsonError(`unsupported type "${typeof value}"`, path);
  }
  if (Array.isArray(value)) {
    const elements = value.map((element, index) => serialize(element, `${path}[${index}]`));
    return `[${elements.join(",")}]`;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new CanonicalJsonError("non-plain object (Date, Map, class instance, ...)", path);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const members = keys.map(
    (key) => `${JSON.stringify(key)}:${serialize(record[key], `${path}.${key}`)}`,
  );
  return `{${members.join(",")}}`;
}

// JsonValue documents the canonicalizable shape for consumers.
export type { JsonValue };
