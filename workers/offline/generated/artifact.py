# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with `make codegen`. Hand edits fail CI.

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import ConfigDict, Field, RootModel

from usc_models_base import UscFrozenModel


class Kind(Enum):
    source = "source"
    chunk = "chunk"
    token_stream = "token_stream"
    ast = "ast"
    motif_vector = "motif_vector"
    process_ir = "process_ir"
    obligation_ledger = "obligation_ledger"
    verdict = "verdict"
    pattern = "pattern"
    anti_pattern = "anti_pattern"
    graft_plan = "graft_plan"
    recommendation = "recommendation"
    feedback_event = "feedback_event"
    transfer_evaluation = "transfer_evaluation"
    extraction_failure = "extraction_failure"
    benchmark_run = "benchmark_run"


class Parent(RootModel[str]):
    root: str = Field(..., pattern="^[a-f0-9]{64}$")


class Tag(Enum):
    experimental = "experimental"
    stale_kernel = "stale_kernel"
    superseded = "superseded"
    golden = "golden"


class Artifact(UscFrozenModel):
    """
    Envelope for every node in the content-addressed store. INV-3/INV-4. id = sha256(canonicalJson({kind, body, rulebaseHash, parents})).
    """

    model_config = ConfigDict(
        extra="forbid",
    )
    id: str = Field(..., pattern="^[a-f0-9]{64}$")
    kind: Kind
    body: dict[str, Any]
    rulebaseHash: str = Field(..., pattern="^[a-f0-9]{16,64}$")
    parents: list[Parent]
    extractorVersion: str | None = Field(
        None, description="required for any LLM-derived kind; enforced in store SPEC"
    )
    tags: list[Tag] = Field(
        ...,
        description="Mutable metadata; the ONLY mutable surface of an artifact (INV-3 exception list).",
    )
    createdAt: datetime
