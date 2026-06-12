# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with `make codegen`. Hand edits fail CI.

from __future__ import annotations

from enum import Enum

from pydantic import ConfigDict, Field

from usc_models_base import UscFrozenModel


class Type(Enum):
    authority = "authority"
    reconciliation = "reconciliation"
    evidence = "evidence"
    freshness = "freshness"
    inherited_invariant = "inherited_invariant"


class Status(Enum):
    satisfied = "satisfied"
    violated = "violated"
    unknown = "unknown"


class SafeDefault(Enum):
    """
    'allow' is intentionally not in this enum (INV-7)
    """

    deny = "deny"
    pending = "pending"
    manual_review = "manual_review"
    retry = "retry"
    hold = "hold"


class MotifObligation(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    caseId: str
    type: Type
    mandatory: bool
    blocking: bool
    status: Status
    triggeredBy: list[str] = Field(
        ...,
        description="ProcessIR event ids (IR-confirmed, never raw keywords — INV per blueprint §6.3)",
        min_length=1,
    )
    resolvedBy: list[str] | None = None
    requiredEvidence: list[str] | None = None
    safeDefault: SafeDefault = Field(
        ..., description="'allow' is intentionally not in this enum (INV-7)"
    )
    rationale: str = Field(..., min_length=1)
