from __future__ import annotations

import unittest

from generated.pattern_body import PatternBody
from pattern_dedup import canonicalize_pattern, duplicate_groups


class WlCanonicalDedupTest(unittest.TestCase):
    def test_isomorphic_patterns_share_canonical_id(self) -> None:
        left = pattern_body("p-left", "a", "b")
        right = pattern_body("p-right", "x", "y")

        self.assertEqual(canonicalize_pattern(left).canonical_id, canonicalize_pattern(right).canonical_id)
        groups = duplicate_groups([left, right])

        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0].pattern_ids, ("p-left", "p-right"))

    def test_non_isomorphic_patterns_do_not_duplicate(self) -> None:
        left = pattern_body("p-left", "a", "b")
        right = PatternBody.model_validate(
            {
                **pattern_dict("p-right", "x", "y"),
                "edges": [{"from": "y", "to": "x", "relation": "causes"}],
            }
        )

        self.assertNotEqual(canonicalize_pattern(left).canonical_id, canonicalize_pattern(right).canonical_id)
        self.assertEqual(duplicate_groups([left, right]), ())


def pattern_body(pattern_id: str, source_id: str, target_id: str) -> PatternBody:
    return PatternBody.model_validate(pattern_dict(pattern_id, source_id, target_id))


def pattern_dict(pattern_id: str, source_id: str, target_id: str) -> dict[str, object]:
    return {
        "id": pattern_id,
        "name": "Boundary-authority closure",
        "domain": "agent-trace",
        "motifSignature": ["authority", "boundary"],
        "nodes": [
            {"id": source_id, "label": "scope boundary", "motifs": ["boundary"]},
            {"id": target_id, "label": "approval", "motifs": ["authority"]},
        ],
        "edges": [{"from": source_id, "to": target_id, "relation": "requires"}],
        "provenance": {
            "sourceArtifactIds": ["source:golden-incident"],
            "rationale": "unit test seed",
        },
        "richness": "seed",
    }


if __name__ == "__main__":
    unittest.main()
