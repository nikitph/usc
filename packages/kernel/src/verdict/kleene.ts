import type { Verdict3 } from "@usc/shared/generated";

/**
 * Kleene strong three-valued logic (blueprint §3.2) — the ONLY place truth
 * combination is defined (INV-1). Every check folds through these; ad-hoc
 * boolean logic over verdict values is a lint error in this package.
 */
export type Verdict3Value = Verdict3["value"];

export function evaluateAnd(a: Verdict3Value, b: Verdict3Value): Verdict3Value {
  if (a === "invalid" || b === "invalid") return "invalid";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "valid";
}

export function evaluateOr(a: Verdict3Value, b: Verdict3Value): Verdict3Value {
  if (a === "valid" || b === "valid") return "valid";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "invalid";
}

export function evaluateNot(a: Verdict3Value): Verdict3Value {
  switch (a) {
    case "valid":
      return "invalid";
    case "invalid":
      return "valid";
    case "unknown":
      return "unknown";
  }
}
