#!/usr/bin/env bash
# Fails if the current diff (vs origin/main) touches protected paths without an
# approved packet manifest naming them. CLAUDE.md §4.
# Portable: BSD/macOS grep has no -P (PCRE) — a silent `grep: invalid option`
# previously made this check pass vacuously on macOS. The fixtures/_proposed/
# carve-out is a grep -v second pass instead of a negative lookahead, and the
# manifest scan uses POSIX -oE.
set -euo pipefail
PROTECTED='^(fixtures/|schemas/|packages/kernel/rulebase/|CLAUDE\.md|docs/STANDARDS\.md|Makefile|scripts/|\.github/)'
BASE="${BASE_REF:-origin/main}"
CHANGED=$(git diff --name-only "$BASE"...HEAD || true)
VIOLATIONS=$(printf '%s\n' "$CHANGED" | grep -E "$PROTECTED" | grep -Ev '^fixtures/_proposed/' || true)
[ -z "$VIOLATIONS" ] && { echo "✓ no protected paths touched"; exit 0; }
MANIFEST=$(git log "$BASE"..HEAD --pretty=%B | grep -oE 'Approved-Protected-Change: [^[:space:]]+' | sort -u || true)
if [ -z "$MANIFEST" ]; then
  echo "✗ protected paths modified without 'Approved-Protected-Change: <packet-id>' trailer:"
  echo "$VIOLATIONS"; exit 1
fi
echo "⚠ protected change under $MANIFEST — requires human review:"; echo "$VIOLATIONS"
