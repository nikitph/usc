# Packet K-08: Extraction benchmark scorer (Python)
**Depends on:** K-01
**Spec:** fixtures/extraction/README.md   **Blueprint:** §5
**Deliverables:** workers/offline/benchmark/: loads gold cases, runs a pluggable extractor
[VARIATION-POINT], computes per-motif P/R/F1, hub aggregate, scope accuracy, confusion
matrix over the six adjacent pairs, Cohen's kappa across annotators; emits a
benchmark_run artifact body (schema to be added via _proposed + human approval) and a
markdown report. NO live LLM extractor in this packet — a trivial keyword extractor as
the test double.
**Exit:** scorer runs on 3 synthetic gold cases committed under workers/offline/benchmark/testdata/.
