export { loadRulebase } from "./rulebase/load.ts";
export { evaluate, type KernelReport } from "./evaluate.ts";
export { astToFacts } from "./facts/ast-to-facts.ts";
export {
  affectedChecks,
  innovationGradient,
  phaseTransitions,
  ruleDiff,
  viabilityCheck,
} from "./geometry/geometry.ts";
export { evaluateAnd, evaluateNot, evaluateOr, type Verdict3Value } from "./verdict/kleene.ts";
export { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "./verdict/build.ts";
export type { Fact, MotifAstNode } from "./facts/types.ts";
export type {
  AstNodeFacts,
  GradientEntry,
  HubCrossing,
  MotifVector,
  RuleDiff,
  RulebaseSection,
  ViabilityVerdict,
} from "./geometry/types.ts";
export type {
  DischargeStatus,
  EvaluationMode,
  FactIndex,
  ObligationFact,
  ProvisionQualifier,
} from "./facts/fact-index.ts";
export { RulebaseConflictError, SchemaValidationError } from "./errors.ts";
export { PROCESS_IR_EVENT_TYPES, SEMANTIC_CHECK_IDS } from "./rulebase/types.ts";
export type {
  ActiveObligationRule,
  CheckId,
  CompositionRequirement,
  DiagnosticPassDefinition,
  EmergentComposite,
  MotifCollision,
  MotifDefinition,
  MotifFacets,
  MotifGroup,
  MotifName,
  ObligationRule,
  ObligationSafeDefault,
  ObligationType,
  ProcessIrEventType,
  Rulebase,
  RulebaseEntryStatus,
  RulebaseHash,
  SemanticCheckDefinition,
  TodoObligationRule,
} from "./rulebase/types.ts";
