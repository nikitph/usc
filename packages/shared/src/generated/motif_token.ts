// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with `make codegen`. Hand edits fail CI.
import { z } from "zod";
import { EvidenceRefSchema } from "./evidence-ref.ts";

export const MotifTokenSchema = z.object({
  "id": z.string().min(1),
  "motif": z.enum(["state", "transition", "invariant", "identity", "boundary", "terminal_state", "decay", "storage", "addressing", "replication", "synchronization", "representation", "feedback", "prediction", "search", "model", "compression", "optimization", "explore_exploit", "self_reference", "composition", "hierarchy", "modularity", "abstraction", "emergence", "scarcity", "queue", "scheduling", "communication", "authority", "reconciliation", "negotiation"]),
  "evidence": z.array(EvidenceRefSchema).min(1),
  "confidence": z.number().min(0).max(1),
  "role": z.enum(["explicit", "implicit", "inferred", "candidate"]),
  "boundaryRole": z.enum(["scope_delimiter", "concept_reference"]).optional(),
  "domainTerm": z.string().min(1),
  "extractorVersion": z.string().min(1),
}).strict().superRefine((value, refinementCtx) => {
  if (value["motif"] === "boundary") {
    if (value["boundaryRole"] === undefined) {
      refinementCtx.addIssue({ code: z.ZodIssueCode.custom, path: ["boundaryRole"], message: "required when motif === \"boundary\"" });
    }
  }
});

export type MotifToken = z.infer<typeof MotifTokenSchema>;
