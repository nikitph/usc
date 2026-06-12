import type { Fact, MotifAstNode, MotifName, ProcessIrEventType } from "@usc/kernel";
import type { MotifObligation, MotifToken } from "@usc/shared/generated";

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

export type { Fact, MotifName, MotifObligation, MotifToken, ProcessIrEventType };
