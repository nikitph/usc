# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with `make codegen`. Hand edits fail CI.

from __future__ import annotations

from enum import Enum

from pydantic import ConfigDict, Field

from usc_models_base import UscFrozenModel

from . import evidence_ref


class Value(Enum):
    valid = "valid"
    invalid = "invalid"
    unknown = "unknown"


class Kind(Enum):
    missing_evidence = "missing_evidence"
    stale_evidence = "stale_evidence"
    contradictory_evidence = "contradictory_evidence"
    budget_exhausted = "budget_exhausted"
    below_extraction_bar = "below_extraction_bar"


class Gap(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Kind
    description: str
    obligationId: str | None = None


class Verdict3(UscFrozenModel):
    """
    Three-valued structural verdict with mandatory provenance. INV-1: 'unknown' must carry gaps; consumers must never coerce it.
    """

    model_config = ConfigDict(
        extra="forbid",
    )
    value: Value
    rule: str = Field(
        ...,
        description="RuleId in the rulebase that produced this verdict",
        min_length=1,
    )
    bindings: dict[str, str]
    evidence: list[evidence_ref.EvidenceRef]
    gaps: list[Gap] | None = Field(
        None, description="Required (minItems 1) when value is 'unknown'."
    )
    kernelVersion: str = Field(
        ..., description="rulebaseHash", pattern="^[a-f0-9]{16,64}$"
    )
