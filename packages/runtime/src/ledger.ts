import type { Fact, Rulebase } from "@usc/kernel";
import { MotifObligationSchema } from "@usc/shared/generated";
import { canonicalJson, sha256Hex } from "@usc/shared/hashing";

import { ObligationLedgerError } from "./errors.ts";
import type { LedgerEntry, ProcessIrEvent, ProcessIrLite, RuntimeAstNode, RuntimeKernelFacts } from "./types.ts";
import { runtimeAstToFacts } from "./parser.ts";

export function materializeObligationLedger(
  rulebase: Rulebase,
  ir: ProcessIrLite,
  caseId: string,
): readonly LedgerEntry[] {
  if (caseId.length === 0) throw new ObligationLedgerError("caseId is required");
  const entries: LedgerEntry[] = [];
  for (const event of ir.events) {
    if (event.type === "observation") continue;
    for (const rule of rulebase.obligationRules) {
      if (rule.eventType !== event.type || rule.opens === null) continue;
      const claimId = event.terminalClaimId ?? event.id;
      entries.push({
        claimId,
        obligation: MotifObligationSchema.parse({
          id: obligationId(caseId, event, rule.id),
          caseId,
          type: rule.opens,
          mandatory: rule.mandatory,
          blocking: rule.blocking,
          status: "unknown",
          triggeredBy: [event.id],
          requiredEvidence: [rule.dischargedBy],
          safeDefault: rule.safeDefault,
          rationale: `IR event ${event.id} matched rule ${rule.id}`,
        }),
      });
    }
  }
  return Object.freeze(entries.sort(compareLedgerEntries));
}

export function processIrTerminalClaimFacts(ir: ProcessIrLite): readonly Fact[] {
  return ir.events
    .filter((event) => event.terminalClaimId !== undefined && event.nodeId !== undefined)
    .map((event) => ({
      fact: "terminal_claim",
      args: [event.terminalClaimId as string, event.nodeId as string],
    }))
    .sort(compareFacts);
}

export function obligationLedgerToFacts(entries: readonly LedgerEntry[]): readonly Fact[] {
  return entries
    .map((entry) => ({
      fact: "obligation",
      args: [
        entry.obligation.id,
        entry.claimId,
        entry.obligation.type,
        entry.obligation.mandatory ? "mandatory" : "optional",
        entry.obligation.blocking ? "blocking" : "nonblocking",
        entry.obligation.status,
      ],
    }))
    .sort(compareFacts);
}

export function runtimeFactsForKernel(
  ast: RuntimeAstNode,
  ir: ProcessIrLite,
  ledger: readonly LedgerEntry[],
): RuntimeKernelFacts {
  return {
    astFacts: runtimeAstToFacts(ast),
    terminalClaimFacts: processIrTerminalClaimFacts(ir),
    obligationFacts: obligationLedgerToFacts(ledger),
  };
}

function obligationId(caseId: string, event: ProcessIrEvent, ruleId: string): string {
  return `obl_${sha256Hex(canonicalJson({ caseId, eventId: event.id, ruleId })).slice(0, 24)}`;
}

function compareLedgerEntries(left: LedgerEntry, right: LedgerEntry): number {
  return left.claimId.localeCompare(right.claimId) || left.obligation.id.localeCompare(right.obligation.id);
}

function compareFacts(left: Fact, right: Fact): number {
  const leftKey = `${left.fact}(${left.args.join(",")})`;
  const rightKey = `${right.fact}(${right.args.join(",")})`;
  return leftKey.localeCompare(rightKey);
}
