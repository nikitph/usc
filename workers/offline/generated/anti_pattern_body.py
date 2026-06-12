# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with `make codegen`. Hand edits fail CI.

from __future__ import annotations

from enum import Enum

from pydantic import ConfigDict, Field, RootModel

from usc_models_base import UscFrozenModel


class MotifSignatureItem(RootModel[str]):
    root: str = Field(..., min_length=1)


class TriggeringPatternId(RootModel[str]):
    root: str = Field(..., min_length=1)


class Motif(RootModel[str]):
    root: str = Field(..., min_length=1)


class Node(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    motifs: list[Motif] = Field(..., min_length=1)


class Relation(Enum):
    scope_contains = "scope_contains"
    requires = "requires"
    causes = "causes"
    contrasts = "contrasts"
    analogizes = "analogizes"


class Edge(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    from_: str = Field(..., alias="from", min_length=1)
    to: str = Field(..., min_length=1)
    relation: Relation


class SourceArtifactId(RootModel[str]):
    root: str = Field(..., min_length=1)


class Provenance(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    sourceArtifactIds: list[SourceArtifactId] = Field(..., min_length=1)
    rationale: str = Field(..., min_length=1)


class Severity(Enum):
    low = "low"
    medium = "medium"
    high = "high"


class AntiPatternBody(UscFrozenModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    domain: str = Field(..., min_length=1)
    failureMode: str = Field(..., min_length=1)
    motifSignature: list[MotifSignatureItem] = Field(..., min_length=1)
    triggeringPatternIds: list[TriggeringPatternId]
    nodes: list[Node] = Field(..., min_length=1)
    edges: list[Edge]
    provenance: Provenance
    severity: Severity
