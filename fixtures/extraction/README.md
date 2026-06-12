# Extraction Benchmark Corpus (blueprint §5.1)

Gold-labeled passages live here as `case-XXX.json`: { passage, domain, goldTokens[],
goldScopes[], annotators[], adjudicationNotes }. Packet K-08 builds the scorer that
emits benchmark_run artifacts (per-motif P/R/F1, confusion pairs, scope accuracy) and
writes the extractor version's pass/fail vs bars into the store — which is what flips
research→production mode. POPULATING THIS CORPUS IS HUMAN WORK (Tier-4): Amul + one more
annotator, per-motif Cohen's kappa reported by the scorer. Seed target: 40 passages
before MVP-1 exit, 200+ before any production-mode claim.
