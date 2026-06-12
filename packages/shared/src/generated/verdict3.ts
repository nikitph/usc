// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with `make codegen`. Hand edits fail CI.
import { z } from "zod";
import { EvidenceRefSchema } from "./evidence-ref.ts";

export const Verdict3Schema = z.object({
  "value": z.enum(["valid", "invalid", "unknown"]),
  "rule": z.string().min(1),
  "bindings": z.record(z.string()),
  "evidence": z.array(EvidenceRefSchema),
  "gaps": z.array(z.object({
  "kind": z.enum(["missing_evidence", "stale_evidence", "contradictory_evidence", "budget_exhausted", "below_extraction_bar"]),
  "description": z.string(),
  "obligationId": z.string().optional(),
}).strict()).optional(),
  "kernelVersion": z.string().regex(new RegExp("^[a-f0-9]{16,64}$")),
}).strict().superRefine((value, refinementCtx) => {
  if (value["value"] === "unknown") {
    if (value["gaps"] === undefined) {
      refinementCtx.addIssue({ code: z.ZodIssueCode.custom, path: ["gaps"], message: "required when value === \"unknown\"" });
    }
    const gapsValue = value["gaps"];
    if (gapsValue !== undefined && gapsValue.length < 1) {
      refinementCtx.addIssue({ code: z.ZodIssueCode.custom, path: ["gaps"], message: "at least 1 item(s) required when value === \"unknown\"" });
    }
  }
});

export type Verdict3 = z.infer<typeof Verdict3Schema>;
