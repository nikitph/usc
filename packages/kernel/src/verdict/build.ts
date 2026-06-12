import { Verdict3Schema, type Verdict3 } from "@usc/shared/generated";

import { SchemaValidationError } from "../errors.ts";
import type { CheckId, RulebaseHash } from "../rulebase/types.ts";
import type { Verdict3Value } from "./kleene.ts";

export type EvidenceGap = NonNullable<Verdict3["gaps"]>[number];

/** One check's answer for one node or claim; the unit the fixture runner asserts on. */
export interface CheckVerdict {
  readonly check: CheckId;
  readonly nodeOrClaim: string;
  readonly verdict: Verdict3;
}

/**
 * The single constructor for kernel verdicts. Every verdict is re-validated
 * against the generated Verdict3Schema before it leaves the kernel, so the
 * "unknown must carry gaps" rule (INV-1) is enforced structurally, not by
 * reviewer vigilance.
 */
export function buildCheckVerdict(parts: {
  readonly check: CheckId;
  readonly nodeOrClaim: string;
  readonly value: Verdict3Value;
  readonly bindings: Readonly<Record<string, string>>;
  readonly gaps?: readonly EvidenceGap[];
  readonly kernelVersion: RulebaseHash;
}): CheckVerdict {
  const candidate = {
    value: parts.value,
    rule: parts.check,
    bindings: parts.bindings,
    evidence: [],
    ...(parts.gaps !== undefined && parts.gaps.length > 0 ? { gaps: parts.gaps } : {}),
    kernelVersion: parts.kernelVersion,
  };
  const validated = Verdict3Schema.safeParse(candidate);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new SchemaValidationError(
      "Verdict3",
      `${parts.check}/${parts.nodeOrClaim} produced a schema-invalid verdict — ${issues}`,
    );
  }
  return Object.freeze({
    check: parts.check,
    nodeOrClaim: parts.nodeOrClaim,
    verdict: Object.freeze(validated.data),
  });
}
