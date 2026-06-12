// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with `make codegen`. Hand edits fail CI.
import { z } from "zod";

export const EvidenceRefSchema = z.object({
  "sourceArtifactId": z.string().min(1),
  "span": z.object({
  "start": z.number().int().min(0),
  "end": z.number().int().min(0),
  "locator": z.string().optional(),
}).strict(),
  "validUntil": z.string().datetime({ offset: true }).optional(),
  "extractionMethod": z.enum(["human", "deterministic", "llm_single", "llm_ensemble"]).optional(),
}).strict();

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
