import { z } from "zod";

import { MotifObligationSchema } from "./generated/obligation.ts";
import { MotifTokenSchema } from "./generated/motif_token.ts";
import { Verdict3Schema } from "./generated/verdict3.ts";

/**
 * Runner-specific fixture envelopes (packet K-02; format per specs/kernel/SPEC.md §6
 * and fixtures/trap_set seed cases). Embedded vocabularies — verdict values, gap
 * kinds, gate verdicts — are DERIVED from the generated schemas, never re-declared
 * (INV-9): if schemas/ changes, these envelopes follow on the next codegen.
 */

const verdict3Shape = Verdict3Schema.innerType().shape;

/** "valid" | "invalid" | "unknown" — from schemas/verdict3.schema.json. */
export const VerdictValueSchema = verdict3Shape.value;

/** Gap kinds from schemas/verdict3.schema.json (missing_evidence, budget_exhausted, ...). */
export const GapKindSchema = verdict3Shape.gaps.unwrap().element.shape.kind;

/**
 * What a fixture may EXPECT the gate to answer. This is the obligation safeDefault
 * enum, where "allow" is unrepresentable by construction (INV-7): no adjudicated
 * expectation can demand fail-open behavior.
 */
export const ExpectedGateVerdictSchema = MotifObligationSchema.shape.safeDefault;

/** The full gate verdict space — "allow" included so mustNotContain can name it. */
export const GateVerdictSchema = z.enum([
  "allow",
  ...ExpectedGateVerdictSchema.options,
]);

const KernelFactSchema = z
  .object({
    fact: z.string().min(1),
    args: z.array(z.string().min(1)),
  })
  .strict();

const KERNEL_CHECKS = [
  "composition_completeness",
  "invariant_propagation",
  "fep_viability",
  "collision_detection",
  "terminal_validity",
  "provenance_check",
] as const;

export const KernelFixtureSchema = z
  .object({
    runner: z.literal("kernel"),
    name: z.string().min(1),
    // Shape owned by packet K-03 (rulebase v0); structurally an object until then.
    rulebaseOverride: z.record(z.unknown()).optional(),
    facts: z.array(KernelFactSchema).min(1),
    mode: z.enum(["production", "research"]).optional(),
    expect: z
      .object({
        check: z.enum(KERNEL_CHECKS),
        nodeOrClaim: z.string().min(1),
        value: VerdictValueSchema,
        gapKinds: z.array(GapKindSchema).min(1).optional(),
        bindingsInclude: z.record(z.string()).optional(),
      })
      .strict(),
  })
  .strict();

const TrapContextEventSchema = z
  .object({
    text: z.string().min(1),
    ts: z.string().datetime({ offset: true }),
  })
  .strict();

const TrapActionSchema = z
  .object({
    name: z.string().min(1),
    target: z.string().min(1),
    declaredGoal: z.string().min(1),
  })
  .strict();

export const TrapFixtureSchema = z
  .object({
    runner: z.literal("trap"),
    name: z.string().min(1),
    input: z
      .object({
        agentId: z.string().min(1),
        action: TrapActionSchema,
        context: z.array(TrapContextEventSchema).min(1),
      })
      .strict(),
    expect: z
      .object({
        terminalValidity: VerdictValueSchema,
        verdict: ExpectedGateVerdictSchema,
        gapKinds: z.array(GapKindSchema).min(1).optional(),
        mustNotContain: z.object({ verdict: GateVerdictSchema }).strict().optional(),
        rationaleMentions: z.array(z.string().min(1)).min(1).optional(),
      })
      .strict(),
    adjudication: z.string().min(1),
  })
  .strict();

/**
 * Extraction benchmark cases (fixtures/extraction/, format per its README).
 * goldTokens are full MotifTokens — span grounding (INV-5) applies to gold
 * labels exactly as it does to extractor output. goldScopes' element shape is
 * owned by packet K-08 (scorer).
 */
export const ExtractionCaseSchema = z
  .object({
    passage: z.string().min(1),
    domain: z.string().min(1),
    goldTokens: z.array(MotifTokenSchema).min(1),
    goldScopes: z.array(z.unknown()),
    annotators: z.array(z.string().min(1)).min(1),
    adjudicationNotes: z.string(),
  })
  .strict();

export type KernelFixture = z.infer<typeof KernelFixtureSchema>;
export type TrapFixture = z.infer<typeof TrapFixtureSchema>;
export type ExtractionCase = z.infer<typeof ExtractionCaseSchema>;

/** Runner kinds declared in fixtures/README.md. store/runtime envelopes land with their packets. */
export const DECLARED_RUNNER_KINDS = ["kernel", "store", "runtime", "trap"] as const;
