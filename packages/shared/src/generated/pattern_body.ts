// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with `make codegen`. Hand edits fail CI.
import { z } from "zod";

export const PatternBodySchema = z.object({
  "id": z.string().min(1),
  "name": z.string().min(1),
  "domain": z.string().min(1),
  "motifSignature": z.array(z.string().min(1)).min(1),
  "nodes": z.array(z.object({
  "id": z.string().min(1),
  "label": z.string().min(1),
  "motifs": z.array(z.string().min(1)).min(1),
}).strict()).min(1),
  "edges": z.array(z.object({
  "from": z.string().min(1),
  "to": z.string().min(1),
  "relation": z.enum(["scope_contains", "requires", "causes", "contrasts", "analogizes"]),
}).strict()),
  "provenance": z.object({
  "sourceArtifactIds": z.array(z.string().min(1)).min(1),
  "rationale": z.string().min(1),
}).strict(),
  "richness": z.enum(["seed", "reviewed", "calibrated"]),
}).strict();

export type PatternBody = z.infer<typeof PatternBodySchema>;
