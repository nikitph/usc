export { ObligationLedgerError, ParserError, ProcessIrError, RuntimeError } from "./errors.ts";
export { EvidenceFixpointEngine } from "./evidence.ts";
export {
  KeywordExtractionBackend,
  TerminalClaimKeywordDetector,
  createExtractionRegistry,
  runLexer,
} from "./lexer.ts";
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
  EvidenceFactStatus,
  FixpointRunReport,
  LexerRunResult,
  RawExtraction,
  TerminalClaimDetector,
} from "./types.ts";
