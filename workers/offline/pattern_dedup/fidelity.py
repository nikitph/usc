from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence

from generated.pattern_body import PatternBody


@dataclass(frozen=True)
class FidelityScore:
    pattern_id: str
    gold_id: str
    motif_f1: float
    edge_f1: float
    fidelity: float
    band: Literal["reject", "review", "candidate"]


@dataclass(frozen=True)
class CalibrationCase:
    name: str
    predicted: PatternBody
    gold: PatternBody
    expected_band: Literal["reject", "review", "candidate"]


@dataclass(frozen=True)
class CalibrationReport:
    case_count: int
    accuracy: float
    average_fidelity: float
    confusion_pairs: dict[str, int]
    threshold_config: dict[str, float | bool]
    scores: tuple[FidelityScore, ...]


class CalibrationError(ValueError):
    pass


THRESHOLD_CONFIG: dict[str, float | bool] = {
    "candidateMin": 0.82,
    "reviewMin": 0.3,
    "autoInsertEnabled": False,
}


def score_pattern_fidelity(predicted: PatternBody, gold: PatternBody) -> FidelityScore:
    motif_f1 = f1(set(motif.root for motif in predicted.motifSignature), set(motif.root for motif in gold.motifSignature))
    edge_f1 = f1(edge_signatures(predicted), edge_signatures(gold))
    fidelity = round((0.65 * motif_f1) + (0.35 * edge_f1), 6)
    return FidelityScore(
        pattern_id=predicted.id,
        gold_id=gold.id,
        motif_f1=motif_f1,
        edge_f1=edge_f1,
        fidelity=fidelity,
        band=band_for(fidelity),
    )


def calibration_report(cases: Sequence[CalibrationCase]) -> CalibrationReport:
    if len(cases) == 0:
        raise CalibrationError("calibration requires at least one case")
    scores = tuple(score_pattern_fidelity(case.predicted, case.gold) for case in cases)
    correct = sum(1 for case, score in zip(cases, scores, strict=True) if case.expected_band == score.band)
    return CalibrationReport(
        case_count=len(cases),
        accuracy=round(correct / len(cases), 6),
        average_fidelity=round(sum(score.fidelity for score in scores) / len(scores), 6),
        confusion_pairs=confusion_pairs(cases),
        threshold_config=THRESHOLD_CONFIG,
        scores=scores,
    )


def f1(predicted: set[str], gold: set[str]) -> float:
    if len(predicted) == 0 and len(gold) == 0:
        return 1.0
    true_positive = len(predicted & gold)
    false_positive = len(predicted - gold)
    false_negative = len(gold - predicted)
    denominator = (2 * true_positive) + false_positive + false_negative
    return round(0.0 if denominator == 0 else (2 * true_positive) / denominator, 6)


def edge_signatures(pattern: PatternBody) -> set[str]:
    motifs_by_node = {
        node.id: "+".join(sorted(motif.root for motif in node.motifs))
        for node in pattern.nodes
    }
    return {
        f"{motifs_by_node[edge.from_]}->{edge.relation.value}->{motifs_by_node[edge.to]}"
        for edge in pattern.edges
    }


def band_for(fidelity: float) -> Literal["reject", "review", "candidate"]:
    candidate_min = THRESHOLD_CONFIG["candidateMin"]
    review_min = THRESHOLD_CONFIG["reviewMin"]
    if not isinstance(candidate_min, float) or not isinstance(review_min, float):
        raise TypeError("threshold values must be floats")
    if fidelity >= candidate_min:
        return "candidate"
    if fidelity >= review_min:
        return "review"
    return "reject"


def confusion_pairs(cases: Sequence[CalibrationCase]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for case in cases:
        predicted = set(motif.root for motif in case.predicted.motifSignature)
        gold = set(motif.root for motif in case.gold.motifSignature)
        for missed in sorted(gold - predicted):
            for extra in sorted(predicted - gold):
                key = f"{missed}->{extra}"
                counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))
