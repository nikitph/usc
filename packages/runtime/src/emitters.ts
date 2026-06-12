import { computeArtifactId, type ArtifactEnvelope, type ArtifactId } from "@usc/store";

import { RuntimeError } from "./errors.ts";

export type CodegenEmitterTarget = "engineering_spec" | "compliance_checklist";

export interface CodegenEmitterInput {
  readonly recommendationArtifactId: ArtifactId;
  readonly recommendationTitle: string;
  readonly collapsedSymptoms: readonly string[];
  readonly antiPatternWarnings: readonly string[];
  readonly rulebaseHash: string;
  readonly createdAt: string;
}

export interface CodegenEmitter {
  readonly target: CodegenEmitterTarget;
  emit(input: CodegenEmitterInput): ArtifactEnvelope;
}

export interface CodegenEmitterRegistry {
  register(emitter: CodegenEmitter): void;
  get(target: CodegenEmitterTarget): CodegenEmitter;
}

export function createCodegenEmitterRegistry(): CodegenEmitterRegistry {
  return new InMemoryCodegenEmitterRegistry();
}

export class EngineeringSpecEmitter implements CodegenEmitter {
  readonly target = "engineering_spec";

  emit(input: CodegenEmitterInput): ArtifactEnvelope {
    return emitterArtifact(input, this.target, [
      `# ${input.recommendationTitle}`,
      "",
      "## Engineering Intent",
      `Address: ${input.collapsedSymptoms.join(", ")}`,
      "",
      "## Acceptance Checks",
      "- Recompile the AST after every proposed edit.",
      "- Keep DLR-O gaps explicit when evidence is unknown.",
      "- Do not auto-apply generated changes.",
    ].join("\n"));
  }
}

export class ComplianceChecklistEmitter implements CodegenEmitter {
  readonly target = "compliance_checklist";

  emit(input: CodegenEmitterInput): ArtifactEnvelope {
    const warnings = input.antiPatternWarnings.length === 0
      ? ["No nearby anti-pattern warning recorded."]
      : input.antiPatternWarnings;
    return emitterArtifact(input, this.target, [
      `# Compliance Checklist: ${input.recommendationTitle}`,
      "",
      "## Required Review",
      ...input.collapsedSymptoms.map((symptom) => `- Confirm control coverage for ${symptom}.`),
      "",
      "## Anti-pattern Warnings",
      ...warnings.map((warning) => `- ${warning}`),
      "",
      "Generated output is advisory until reviewer approval.",
    ].join("\n"));
  }
}

class InMemoryCodegenEmitterRegistry implements CodegenEmitterRegistry {
  readonly #emitters = new Map<CodegenEmitterTarget, CodegenEmitter>();

  register(emitter: CodegenEmitter): void {
    if (this.#emitters.has(emitter.target)) {
      throw new RuntimeError(`duplicate codegen emitter target: ${emitter.target}`);
    }
    this.#emitters.set(emitter.target, emitter);
  }

  get(target: CodegenEmitterTarget): CodegenEmitter {
    const emitter = this.#emitters.get(target);
    if (emitter === undefined) {
      throw new RuntimeError(`codegen emitter not registered: ${target}`);
    }
    return emitter;
  }
}

function emitterArtifact(
  input: CodegenEmitterInput,
  target: CodegenEmitterTarget,
  content: string,
): ArtifactEnvelope {
  const body = {
    id: `emission:${target}:${input.recommendationArtifactId}`,
    target,
    format: "markdown",
    content,
    provenance: {
      recommendationArtifactId: input.recommendationArtifactId,
      emitter: target,
    },
    autoApplied: false,
  };
  const draft = {
    kind: "recommendation" as const,
    body,
    rulebaseHash: input.rulebaseHash,
    parents: [input.recommendationArtifactId],
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt: input.createdAt,
  };
}
