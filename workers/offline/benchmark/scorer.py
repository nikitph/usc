from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, NotRequired, Sequence, TypedDict, cast

from generated.evidence_ref import EvidenceRef, ExtractionMethod, Span
from generated.motif_token import BoundaryRole, Motif, MotifToken, Role


EXTRACTOR_VERSION = "keyword-baseline-v0"
HUB_MOTIFS = {
    Motif.representation,
    Motif.scarcity,
    Motif.boundary,
    Motif.authority,
    Motif.feedback,
    Motif.composition,
}
CONFUSION_PAIRS = (
    (Motif.synchronization, Motif.reconciliation),
    (Motif.invariant, Motif.boundary),
    (Motif.hierarchy, Motif.authority),
    (Motif.representation, Motif.model),
    (Motif.replication, Motif.storage),
    (Motif.composition, Motif.modularity),
)
KEYWORDS: Mapping[Motif, tuple[str, ...]] = {
    Motif.authority: ("authority", "approves", "approval"),
    Motif.boundary: ("boundary",),
    Motif.feedback: ("feedback",),
    Motif.transition: ("transition",),
    Motif.state: ("state",),
    Motif.reconciliation: ("reconciliation", "reconcile"),
    Motif.replication: ("replication", "copies"),
    Motif.synchronization: ("synchronization", "consistent"),
    Motif.scarcity: ("scarcity",),
}


class MetricBody(TypedDict):
    precision: float
    recall: float
    f1: float
    tp: int
    fp: int
    fn: int


class AggregateBody(TypedDict):
    precision: float
    recall: float
    f1: float


class BenchmarkRunBody(TypedDict):
    extractorVersion: str
    caseCount: int
    perMotif: dict[str, MetricBody]
    hubAggregate: AggregateBody
    scopeAccuracy: float
    confusionPairs: dict[str, int]
    cohenKappa: float


class ScopeAnnotations(TypedDict):
    annotatorMotifs: dict[str, list[str]]


class GoldCase(TypedDict):
    passage: str
    domain: str
    goldTokens: list[MotifToken]
    goldScopes: list[ScopeAnnotations]
    annotators: list[str]
    adjudicationNotes: str
    sourcePath: NotRequired[str]


@dataclass(frozen=True)
class Counts:
    tp: int = 0
    fp: int = 0
    fn: int = 0

    def with_added(self, *, tp: int = 0, fp: int = 0, fn: int = 0) -> Counts:
        return Counts(tp=self.tp + tp, fp=self.fp + fp, fn=self.fn + fn)


def load_cases(cases_dir: Path) -> list[GoldCase]:
    cases: list[GoldCase] = []
    for path in sorted(cases_dir.glob("*.json")):
        raw: object
        with path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        raw_case = cast(Mapping[str, object], raw)
        cases.append(
            {
                "passage": require_string(raw_case, "passage"),
                "domain": require_string(raw_case, "domain"),
                "goldTokens": [
                    MotifToken.model_validate(token)
                    for token in require_sequence(raw_case, "goldTokens")
                ],
                "goldScopes": parse_scope_annotations(require_sequence(raw_case, "goldScopes")),
                "annotators": [require_string_value(value) for value in require_sequence(raw_case, "annotators")],
                "adjudicationNotes": require_string(raw_case, "adjudicationNotes"),
                "sourcePath": path.name,
            }
        )
    if not cases:
        raise ValueError(f"no benchmark cases found in {cases_dir}")
    return cases


def keyword_extract(case: GoldCase) -> list[MotifToken]:
    passage = case["passage"]
    tokens: list[MotifToken] = []
    for motif, keywords in KEYWORDS.items():
        match = first_keyword_match(passage, keywords)
        if match is None:
            continue
        boundary_role = BoundaryRole.scope_delimiter if motif is Motif.boundary else None
        tokens.append(
            MotifToken(
                id=f"{case['sourcePath']}-{motif.value}-{match.start()}",
                motif=motif,
                evidence=[
                    EvidenceRef(
                        sourceArtifactId=case["sourcePath"],
                        span=Span(start=match.start(), end=match.end(), locator=None),
                        validUntil=None,
                        extractionMethod=ExtractionMethod.deterministic,
                    )
                ],
                confidence=1.0,
                role=Role.explicit,
                boundaryRole=boundary_role,
                domainTerm=match.group(0),
                extractorVersion=EXTRACTOR_VERSION,
            )
        )
    return sorted(tokens, key=lambda token: (token.motif.value, token.evidence[0].span.start))


def score_cases(cases: Sequence[GoldCase]) -> BenchmarkRunBody:
    counts = {motif: Counts() for motif in Motif}
    confusion = {pair_key(left, right): 0 for left, right in directional_confusion_pairs()}
    scope_total = 0
    scope_correct = 0
    kappas: list[float] = []

    for case in cases:
        predicted = keyword_extract(case)
        gold_motifs = {token.motif for token in case["goldTokens"]}
        predicted_motifs = {token.motif for token in predicted}
        for motif in Motif:
            counts[motif] = counts[motif].with_added(
                tp=1 if motif in gold_motifs and motif in predicted_motifs else 0,
                fp=1 if motif not in gold_motifs and motif in predicted_motifs else 0,
                fn=1 if motif in gold_motifs and motif not in predicted_motifs else 0,
            )
        for left, right in directional_confusion_pairs():
            if left in gold_motifs and right in predicted_motifs and left not in predicted_motifs:
                confusion[pair_key(left, right)] += 1
        boundary_total, boundary_correct = boundary_scope_score(case["goldTokens"], predicted)
        scope_total += boundary_total
        scope_correct += boundary_correct
        kappa = cohen_kappa(case)
        if kappa is not None:
            kappas.append(kappa)

    per_motif = {motif.value: metric_body(counts[motif]) for motif in Motif}
    hub_counts = Counts(
        tp=sum(counts[motif].tp for motif in HUB_MOTIFS),
        fp=sum(counts[motif].fp for motif in HUB_MOTIFS),
        fn=sum(counts[motif].fn for motif in HUB_MOTIFS),
    )
    return {
        "extractorVersion": EXTRACTOR_VERSION,
        "caseCount": len(cases),
        "perMotif": per_motif,
        "hubAggregate": aggregate_body(hub_counts),
        "scopeAccuracy": safe_divide(scope_correct, scope_total),
        "confusionPairs": confusion,
        "cohenKappa": safe_average(kappas),
    }


def markdown_report(body: BenchmarkRunBody) -> str:
    lines = [
        "# Motif Extraction Benchmark",
        "",
        f"Extractor: `{body['extractorVersion']}`",
        f"Cases: {body['caseCount']}",
        "",
        "## Hub Aggregate",
        "",
        f"- Precision: {body['hubAggregate']['precision']:.3f}",
        f"- Recall: {body['hubAggregate']['recall']:.3f}",
        f"- F1: {body['hubAggregate']['f1']:.3f}",
        f"- Scope accuracy: {body['scopeAccuracy']:.3f}",
        f"- Cohen's kappa: {body['cohenKappa']:.3f}",
        "",
        "## Per Motif",
        "",
        "| Motif | Precision | Recall | F1 | TP | FP | FN |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for motif, metric in sorted(body["perMotif"].items()):
        lines.append(
            f"| {motif} | {metric['precision']:.3f} | {metric['recall']:.3f} | {metric['f1']:.3f} | {metric['tp']} | {metric['fp']} | {metric['fn']} |"
        )
    lines.extend(["", "## Confusion Pairs", ""])
    for key, value in sorted(body["confusionPairs"].items()):
        lines.append(f"- {key}: {value}")
    return "\n".join(lines) + "\n"


def first_keyword_match(passage: str, keywords: Sequence[str]) -> re.Match[str] | None:
    matches: list[re.Match[str]] = []
    for keyword in keywords:
        match = re.search(rf"\b{re.escape(keyword)}\b", passage, flags=re.IGNORECASE)
        if match is not None:
            matches.append(match)
    if not matches:
        return None
    return sorted(matches, key=lambda match: match.start())[0]


def boundary_scope_score(gold: Sequence[MotifToken], predicted: Sequence[MotifToken]) -> tuple[int, int]:
    gold_boundaries = [token for token in gold if token.motif is Motif.boundary]
    if not gold_boundaries:
        return (0, 0)
    predicted_roles = [token.boundaryRole for token in predicted if token.motif is Motif.boundary]
    correct = sum(1 for token in gold_boundaries if token.boundaryRole in predicted_roles)
    return (len(gold_boundaries), correct)


def cohen_kappa(case: GoldCase) -> float | None:
    labels = merged_annotator_labels(case["goldScopes"])
    annotators = sorted(labels)
    if len(annotators) < 2:
        return None
    kappas: list[float] = []
    for left_index, left in enumerate(annotators):
        for right in annotators[left_index + 1 :]:
            kappas.append(pairwise_kappa(set(labels[left]), set(labels[right])))
    return safe_average(kappas)


def pairwise_kappa(left: set[str], right: set[str]) -> float:
    motifs = [motif.value for motif in Motif]
    agreements = sum(1 for motif in motifs if (motif in left) == (motif in right))
    observed = agreements / len(motifs)
    left_yes = len(left) / len(motifs)
    right_yes = len(right) / len(motifs)
    expected = left_yes * right_yes + (1 - left_yes) * (1 - right_yes)
    if expected == 1:
        return 1.0
    return (observed - expected) / (1 - expected)


def merged_annotator_labels(scopes: Sequence[ScopeAnnotations]) -> dict[str, list[str]]:
    merged: dict[str, set[str]] = {}
    for scope in scopes:
        for annotator, motifs in scope["annotatorMotifs"].items():
            merged.setdefault(annotator, set()).update(motifs)
    return {annotator: sorted(motifs) for annotator, motifs in merged.items()}


def metric_body(counts: Counts) -> MetricBody:
    return {
        "precision": safe_divide(counts.tp, counts.tp + counts.fp),
        "recall": safe_divide(counts.tp, counts.tp + counts.fn),
        "f1": f1(counts),
        "tp": counts.tp,
        "fp": counts.fp,
        "fn": counts.fn,
    }


def aggregate_body(counts: Counts) -> AggregateBody:
    return {
        "precision": safe_divide(counts.tp, counts.tp + counts.fp),
        "recall": safe_divide(counts.tp, counts.tp + counts.fn),
        "f1": f1(counts),
    }


def f1(counts: Counts) -> float:
    precision = safe_divide(counts.tp, counts.tp + counts.fp)
    recall = safe_divide(counts.tp, counts.tp + counts.fn)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def safe_divide(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def safe_average(values: Sequence[float]) -> float:
    if len(values) == 0:
        return 0.0
    return sum(values) / len(values)


def directional_confusion_pairs() -> tuple[tuple[Motif, Motif], ...]:
    pairs: list[tuple[Motif, Motif]] = []
    for left, right in CONFUSION_PAIRS:
        pairs.append((left, right))
        pairs.append((right, left))
    return tuple(pairs)


def pair_key(left: Motif, right: Motif) -> str:
    return f"{left.value}->{right.value}"


def parse_scope_annotations(values: Sequence[object]) -> list[ScopeAnnotations]:
    scopes: list[ScopeAnnotations] = []
    for value in values:
        scope = cast(Mapping[str, object], value)
        raw_annotator_motifs = cast(Mapping[str, object], scope.get("annotatorMotifs", {}))
        annotator_motifs = {
            annotator: [require_string_value(motif) for motif in require_sequence_value(motifs)]
            for annotator, motifs in raw_annotator_motifs.items()
        }
        scopes.append({"annotatorMotifs": annotator_motifs})
    return scopes


def require_string(mapping: Mapping[str, object], key: str) -> str:
    return require_string_value(mapping[key])


def require_string_value(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError(f"expected string, got {value!r}")
    return value


def require_sequence(mapping: Mapping[str, object], key: str) -> Sequence[object]:
    return require_sequence_value(mapping[key])


def require_sequence_value(value: object) -> Sequence[object]:
    if not isinstance(value, list):
        raise ValueError(f"expected list, got {value!r}")
    return value
