import type { ProcessIrEventType } from "@usc/kernel";
import { PROCESS_IR_EVENT_TYPES } from "@usc/kernel";

import { ProcessIrError } from "./errors.ts";
import type { DetectedEvent, ProcessIrEvent, ProcessIrLite, RuntimeEventType } from "./types.ts";

export const EVENT_TYPES_WITH_OBSERVATION = [...PROCESS_IR_EVENT_TYPES, "observation"] as const;

const eventTypes = new Set<string>(EVENT_TYPES_WITH_OBSERVATION);

export function buildProcessIrLite(events: readonly DetectedEvent[]): ProcessIrLite {
  const ids = new Set<string>();
  const processEvents = events.map((event) => {
    if (event.id.length === 0) throw new ProcessIrError("event id is required");
    if (ids.has(event.id)) throw new ProcessIrError(`duplicate event id "${event.id}"`);
    ids.add(event.id);
    if (event.sourceTokenIds.length === 0) {
      throw new ProcessIrError(`event "${event.id}" must carry at least one source token id`);
    }
    const processEvent: ProcessIrEvent = {
      id: event.id,
      type: classifyEventText(event.text),
      text: event.text,
      sourceTokenIds: [...event.sourceTokenIds].sort(),
    };
    if (event.terminalClaimId !== undefined) {
      return event.nodeId === undefined
        ? processEventWith(processEvent, { terminalClaimId: event.terminalClaimId })
        : processEventWith(processEvent, { terminalClaimId: event.terminalClaimId, nodeId: event.nodeId });
    }
    return event.nodeId === undefined ? processEvent : processEventWith(processEvent, { nodeId: event.nodeId });
  });
  return Object.freeze({ events: Object.freeze(processEvents.sort(compareEvents)) });
}

export function classifyEventText(text: string): RuntimeEventType {
  const normalized = text.toLowerCase();
  if (matches(normalized, ["sudo", "admin", "privileged", "permission", "approve", "authorized"])) {
    return "privileged_transition";
  }
  if (matches(normalized, ["delete", "deleted", "drop", "dropped", "destroy", "remove", "removed"])) {
    return "state_destruction";
  }
  if (matches(normalized, ["deploy", "deployed", "publish", "published", "release", "released", "commit"])) {
    return "external_commitment";
  }
  if (matches(normalized, ["exit scope", "scope exit", "close scope", "finalize", "finalized"])) {
    return "scope_exit";
  }
  if (matches(normalized, ["irreversible", "migrate", "migration", "charged", "sent email", "sent notification"])) {
    return "irreversible_effect";
  }
  return "observation";
}

export function assertProcessIrEventType(value: string): ProcessIrEventType {
  if (!eventTypes.has(value) || value === "observation") {
    throw new ProcessIrError(`"${value}" is not a kernel ProcessIR event type`);
  }
  return value as ProcessIrEventType;
}

function matches(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function compareEvents(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id.localeCompare(right.id);
}

function processEventWith(
  event: ProcessIrEvent,
  optionals: Pick<ProcessIrEvent, "terminalClaimId"> | Pick<ProcessIrEvent, "nodeId"> | Pick<ProcessIrEvent, "terminalClaimId" | "nodeId">,
): ProcessIrEvent {
  return { ...event, ...optionals };
}
