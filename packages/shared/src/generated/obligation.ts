// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with `make codegen`. Hand edits fail CI.
import { z } from "zod";

export const MotifObligationSchema = z.object({
  "id": z.string(),
  "caseId": z.string(),
  "type": z.enum(["authority", "reconciliation", "evidence", "freshness", "inherited_invariant"]),
  "mandatory": z.boolean(),
  "blocking": z.boolean(),
  "status": z.enum(["satisfied", "violated", "unknown"]),
  "triggeredBy": z.array(z.string()).min(1),
  "resolvedBy": z.array(z.string()).optional(),
  "requiredEvidence": z.array(z.string()).optional(),
  "safeDefault": z.enum(["deny", "pending", "manual_review", "retry", "hold"]),
  "rationale": z.string().min(1),
}).strict();

export type MotifObligation = z.infer<typeof MotifObligationSchema>;
