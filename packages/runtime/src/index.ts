export { ObligationLedgerError, ParserError, ProcessIrError, RuntimeError } from "./errors.ts";
export { EvidenceFixpointEngine } from "./evidence.ts";
export {
  DeterministicTextEvidenceSource,
  createEvidenceSourceRegistry,
  evidenceGapsForLedger,
  evidenceJoinRulesForLedger,
  resolveLedgerWithEvidence,
} from "./evidence-sources.ts";
export {
  KeywordExtractionBackend,
  TerminalClaimKeywordDetector,
  createExtractionRegistry,
  runLexer,
} from "./lexer.ts";
export {
  applyAstOperations,
  createGraftPlanBody,
  graftPlanArtifact,
  validateMandatoryRecompile,
} from "./graft-plan.ts";
export {
  EVENT_TYPES_WITH_OBSERVATION,
  buildProcessIrLite,
  classifyEventText,
} from "./process-ir.ts";
export {
  materializeObligationLedger,
  obligationLedgerToFacts,
  processIrTerminalClaimFacts,
  runtimeFactsForKernel,
} from "./ledger.ts";
export { parseMotifTokens, runtimeAstToFacts } from "./parser.ts";
export {
  rankRecommendations,
  recommendationArtifact,
} from "./recommendation.ts";
export type {
  DetectedEvent,
  LedgerEntry,
  ParseOptions,
  ProcessIrEvent,
  ProcessIrLite,
  RuntimeAstNode,
  RuntimeEventType,
  CandidateTerminalClaim,
  ExtractionBackend,
  ExtractionInput,
  ExtractionRegistry,
  EvidenceDerivationRule,
  EvidenceFact,
  EvidenceFactDraft,
  EvidenceGapLike,
  EvidenceSource,
  EvidenceSourceInput,
  EvidenceSourceRegistry,
  EvidenceFactStatus,
  FixpointRunReport,
  LexerRunResult,
  RawExtraction,
  TerminalClaimDetector,
} from "./types.ts";
export type {
  AstModificationOperation,
  GraftPlanArtifactInput,
  GraftPlanBody,
  GraftPlanDraft,
} from "./graft-plan.ts";
export type {
  AntiPatternWarning,
  RankedRecommendation,
  RecommendationArtifactBody,
  RecommendationArtifactInput,
  RecommendationCandidate,
} from "./recommendation.ts";
