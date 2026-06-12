# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with `make codegen`. Hand edits fail CI.

from __future__ import annotations

from enum import Enum

from pydantic import ConfigDict, Field

from usc_models_base import UscFrozenModel

from . import evidence_ref


class Motif(Enum):
    state = "state"
    transition = "transition"
    invariant = "invariant"
    identity = "identity"
    boundary = "boundary"
    terminal_state = "terminal_state"
    decay = "decay"
    storage = "storage"
    addressing = "addressing"
    replication = "replication"
    synchronization = "synchronization"
    representation = "representation"
    feedback = "feedback"
    prediction = "prediction"
    search = "search"
    model = "model"
    compression = "compression"
    optimization = "optimization"
    explore_exploit = "explore_exploit"
    self_reference = "self_reference"
    composition = "composition"
    hierarchy = "hierarchy"
    modularity = "modularity"
    abstraction = "abstraction"
    emergence = "emergence"
    scarcity = "scarcity"
    queue = "queue"
    scheduling = "scheduling"
    communication = "communication"
    authority = "authority"
    reconciliation = "reconciliation"
    negotiation = "negotiation"


class Role(Enum):
    explicit = "explicit"
    implicit = "implicit"
    inferred = "inferred"
    candidate = "candidate"


class BoundaryRole(Enum):
    """
    required iff motif=boundary
    """

    scope_delimiter = "scope_delimiter"
    concept_reference = "concept_reference"


class MotifToken(UscFrozenModel):
    """
    INV-5: span is mandatory. Tokens without evidence do not exist.
    """

    model_config = ConfigDict(
        extra="forbid",
    )
    id: str = Field(..., min_length=1)
    motif: Motif
    evidence: list[evidence_ref.EvidenceRef] = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    role: Role
    boundaryRole: BoundaryRole | None = Field(
        None, description="required iff motif=boundary"
    )
    domainTerm: str = Field(..., min_length=1)
    extractorVersion: str = Field(..., min_length=1)
