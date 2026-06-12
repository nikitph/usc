import type { Fact, MotifAstNode, MotifName, ProcessIrEventType } from "@usc/kernel";
import type { MotifObligation, MotifToken } from "@usc/shared/generated";
import type { ArtifactEnvelope, ArtifactId, ArtifactRepository } from "@usc/store";

export type RuntimeEventType = ProcessIrEventType | "observation";

export interface RuntimeAstNode extends MotifAstNode {
  readonly sourceTokenIds: readonly string[];
  readonly children?: readonly RuntimeAstNode[];
}

export interface ParseOptions {
  readonly rootId?: string;
  readonly autonomousNodeIds?: ReadonlySet<string>;
}

export interface DetectedEvent {
  readonly id: string;
  readonly text: string;
  readonly sourceTokenIds: readonly string[];
  readonly terminalClaimId?: string;
  readonly nodeId?: string;
}

export interface ProcessIrEvent {
  readonly id: string;
  readonly type: RuntimeEventType;
  readonly text: string;
  readonly sourceTokenIds: readonly string[];
  readonly terminalClaimId?: string;
  readonly nodeId?: string;
}

export interface ProcessIrLite {
  readonly events: readonly ProcessIrEvent[];
}

export interface LedgerEntry {
  readonly claimId: string;
  readonly obligation: MotifObligation;
}

export interface RuntimeKernelFacts {
  readonly astFacts: readonly Fact[];
  readonly terminalClaimFacts: readonly Fact[];
  readonly obligationFacts: readonly Fact[];
}

export interface TokenWithSpan {
  readonly token: MotifToken;
  readonly start: number;
  readonly end: number;
}

export interface RawExtraction {
  readonly rawText: string;
  readonly tokens: readonly unknown[];
}

export interface ExtractionInput {
  readonly sourceText: string;
  readonly sourceArtifactId: ArtifactId;
  readonly sampleIndex: number;
}

export interface ExtractionBackend {
  readonly name: string;
  readonly extractorVersion: string;
  extract(input: ExtractionInput): Promise<RawExtraction>;
}

export interface ExtractionRegistry {
  register(backend: ExtractionBackend): void;
  get(name: string): ExtractionBackend;
}

export interface LexerRunRequest {
  readonly repository: ArtifactRepository;
  readonly backendName: string;
  readonly registry: ExtractionRegistry;
  readonly sourceText: string;
  readonly sourceArtifactId: ArtifactId;
  readonly rulebaseHash: string;
  readonly sampleCount: number;
  readonly createdAt: string;
  readonly createdBy: string;
}

export interface LexerRunResult {
  readonly rawOutputArtifacts: readonly ArtifactEnvelope[];
  readonly extractionFailures: readonly ArtifactEnvelope[];
  readonly tokenStreamArtifact: ArtifactEnvelope;
  readonly tokens: readonly MotifToken[];
}

export interface CandidateTerminalClaim {
  readonly id: string;
  readonly text: string;
  readonly sourceArtifactId: ArtifactId;
  readonly span: {
    readonly start: number;
    readonly end: number;
  };
}

export interface TerminalClaimDetector {
  readonly name: string;
  detect(sourceText: string, sourceArtifactId: ArtifactId): readonly CandidateTerminalClaim[];
}

export type EvidenceFactStatus = "active" | "retracted" | "superseded";

export interface EvidenceFact {
  readonly id: string;
  readonly body: unknown;
  readonly assertedAt: string;
  readonly validUntil?: string;
  readonly supports: readonly string[];
  readonly status: EvidenceFactStatus;
}

export interface EvidenceFactDraft {
  readonly id: string;
  readonly body: unknown;
  readonly assertedAt: string;
  readonly validUntil?: string;
  readonly supports?: readonly string[];
}

export interface EvidenceDerivationRule {
  readonly id: string;
  derive(activeFacts: readonly EvidenceFact[]): readonly EvidenceFactDraft[];
}

export interface FixpointRunReport {
  readonly iterations: number;
  readonly derivedFactIds: readonly string[];
}

export type { ArtifactEnvelope, ArtifactId, ArtifactRepository, Fact, MotifName, MotifObligation, MotifToken, ProcessIrEventType };
