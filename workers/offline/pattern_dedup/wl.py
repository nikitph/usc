from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Sequence

from generated.pattern_body import PatternBody


@dataclass(frozen=True)
class PatternCanonical:
    pattern_id: str
    canonical_id: str
    canonical_signature: str


@dataclass(frozen=True)
class DuplicateGroup:
    canonical_id: str
    canonical_signature: str
    pattern_ids: tuple[str, ...]


def canonicalize_pattern(pattern: PatternBody) -> PatternCanonical:
    node_colors = initial_node_colors(pattern)
    for _ in range(len(pattern.nodes)):
        node_colors = refine_node_colors(pattern, node_colors)
    signature = canonical_signature(pattern, node_colors)
    return PatternCanonical(
        pattern_id=pattern.id,
        canonical_id=f"wl_{sha256_hex(signature)[:32]}",
        canonical_signature=signature,
    )


def duplicate_groups(patterns: Sequence[PatternBody]) -> tuple[DuplicateGroup, ...]:
    by_signature: dict[tuple[str, str], list[str]] = {}
    for pattern in patterns:
        canonical = canonicalize_pattern(pattern)
        key = (canonical.canonical_id, canonical.canonical_signature)
        existing = by_signature.get(key, [])
        by_signature[key] = [*existing, canonical.pattern_id]
    groups = [
        DuplicateGroup(
            canonical_id=canonical_id,
            canonical_signature=signature,
            pattern_ids=tuple(sorted(pattern_ids)),
        )
        for (canonical_id, signature), pattern_ids in by_signature.items()
        if len(pattern_ids) > 1
    ]
    return tuple(sorted(groups, key=lambda group: group.canonical_id))


def initial_node_colors(pattern: PatternBody) -> dict[str, str]:
    return {
        node.id: canonical_json([motif.root for motif in sorted(node.motifs, key=lambda motif: motif.root)])
        for node in pattern.nodes
    }


def refine_node_colors(pattern: PatternBody, node_colors: dict[str, str]) -> dict[str, str]:
    refined: dict[str, str] = {}
    for node in sorted(pattern.nodes, key=lambda entry: entry.id):
        incident = []
        for edge in pattern.edges:
            if edge.from_ == node.id:
                incident.append(["out", edge.relation.value, node_colors[edge.to]])
            if edge.to == node.id:
                incident.append(["in", edge.relation.value, node_colors[edge.from_]])
        refined[node.id] = sha256_hex(canonical_json([node_colors[node.id], sorted(incident)]))
    return refined


def canonical_signature(pattern: PatternBody, node_colors: dict[str, str]) -> str:
    node_part = sorted(node_colors.values())
    edge_part = sorted(
        [node_colors[edge.from_], edge.relation.value, node_colors[edge.to]]
        for edge in pattern.edges
    )
    return canonical_json(
        {
            "domain": pattern.domain,
            "motifSignature": sorted(motif.root for motif in pattern.motifSignature),
            "nodes": node_part,
            "edges": edge_part,
        }
    )


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
