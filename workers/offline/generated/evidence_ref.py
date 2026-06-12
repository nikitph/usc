# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with `make codegen`. Hand edits fail CI.

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import ConfigDict, Field

from usc_models_base import UscFrozenModel


class Span(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    start: int = Field(..., ge=0)
    end: int = Field(..., ge=0)
    locator: str | None = Field(
        None, description="page/line/event-id locator for non-text sources"
    )


class ExtractionMethod(Enum):
    human = "human"
    deterministic = "deterministic"
    llm_single = "llm_single"
    llm_ensemble = "llm_ensemble"


class EvidenceRef(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    sourceArtifactId: str = Field(..., min_length=1)
    span: Span
    validUntil: datetime | None = Field(
        None, description="decay as TTL; absent = no known expiry"
    )
    extractionMethod: ExtractionMethod | None = None
