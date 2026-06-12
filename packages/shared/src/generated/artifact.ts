// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with `make codegen`. Hand edits fail CI.
import { z } from "zod";

export const ArtifactSchema = z.object({
  "id": z.string().regex(new RegExp("^[a-f0-9]{64}$")),
  "kind": z.enum(["source", "chunk", "token_stream", "ast", "motif_vector", "process_ir", "obligation_ledger", "verdict", "pattern", "anti_pattern", "graft_plan", "recommendation", "feedback_event", "transfer_evaluation", "extraction_failure", "benchmark_run"]),
  "body": z.record(z.unknown()),
  "rulebaseHash": z.string().regex(new RegExp("^[a-f0-9]{16,64}$")),
  "parents": z.array(z.string().regex(new RegExp("^[a-f0-9]{64}$"))),
  "extractorVersion": z.string().optional(),
  "tags": z.array(z.enum(["experimental", "stale_kernel", "superseded", "golden"])),
  "createdAt": z.string().datetime({ offset: true }),
}).strict();

export type Artifact = z.infer<typeof ArtifactSchema>;
