from __future__ import annotations

import argparse
import json
from pathlib import Path

from benchmark.scorer import load_cases, markdown_report, score_cases


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the USC motif extraction benchmark scorer.")
    parser.add_argument("--cases", type=Path, default=Path("benchmark/testdata"))
    parser.add_argument("--out", type=Path, default=Path("benchmark/out"))
    args = parser.parse_args()

    cases = load_cases(args.cases)
    body = score_cases(cases)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "benchmark_run_body.json").write_text(json.dumps(body, indent=2, sort_keys=True) + "\n")
    (args.out / "benchmark_report.md").write_text(markdown_report(body))
    print(f"scored {body['caseCount']} cases -> {args.out}")


if __name__ == "__main__":
    main()
