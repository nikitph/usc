from __future__ import annotations

import unittest

from generated.pattern_body import PatternBody
from pattern_dedup import CalibrationCase, calibration_report, score_pattern_fidelity
from pattern_dedup.test_wl import pattern_dict


class FidelityScorerTest(unittest.TestCase):
    def test_scores_identical_pattern_as_candidate(self) -> None:
        gold = PatternBody.model_validate(pattern_dict("gold", "a", "b"))
        predicted = PatternBody.model_validate(pattern_dict("predicted", "x", "y"))

        score = score_pattern_fidelity(predicted, gold)

        self.assertEqual(score.band, "candidate")
        self.assertEqual(score.fidelity, 1.0)

    def test_scores_partial_pattern_as_review_and_reports_confusion(self) -> None:
        gold = PatternBody.model_validate(pattern_dict("gold", "a", "b"))
        predicted = PatternBody.model_validate(
            {
                **pattern_dict("predicted", "x", "y"),
                "motifSignature": ["boundary", "freshness"],
                "nodes": [
                    {"id": "x", "label": "scope boundary", "motifs": ["boundary"]},
                    {"id": "y", "label": "freshness", "motifs": ["freshness"]},
                ],
            }
        )

        score = score_pattern_fidelity(predicted, gold)
        report = calibration_report([
            CalibrationCase(name="partial", predicted=predicted, gold=gold, expected_band="review")
        ])

        self.assertEqual(score.band, "review")
        self.assertEqual(report.case_count, 1)
        self.assertEqual(report.accuracy, 1.0)
        self.assertEqual(report.confusion_pairs, {"authority->freshness": 1})
        self.assertEqual(report.threshold_config["autoInsertEnabled"], False)

    def test_scores_mismatched_pattern_as_reject(self) -> None:
        gold = PatternBody.model_validate(pattern_dict("gold", "a", "b"))
        predicted = PatternBody.model_validate(
            {
                **pattern_dict("predicted", "x", "y"),
                "motifSignature": ["feedback"],
                "nodes": [{"id": "x", "label": "feedback", "motifs": ["feedback"]}],
                "edges": [],
            }
        )

        self.assertEqual(score_pattern_fidelity(predicted, gold).band, "reject")


if __name__ == "__main__":
    unittest.main()
