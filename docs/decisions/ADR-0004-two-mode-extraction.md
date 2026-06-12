# ADR-0004: Research/production two-mode regime
Extraction may run below benchmark bars; resulting artifacts carry tag `experimental` and
propagate it through provenance. Production decisions (gate verdicts, recommendations, KG
inserts, transfer-score updates) are kernel-rejected if any DAG ancestor is experimental.
Bars per BLUEPRINT §5.3; enforcement is the provenance query (kernel + store mirror),
never code-path discipline.
