#!/usr/bin/env bash
# Fails if the current diff (vs origin/main) touches protected paths without an
# approved packet manifest naming them. CLAUDE.md §4.
set -euo pipefail
PROTECTED='^(fixtures/(?!_proposed/)|schemas/|packages/kernel/rulebase/|CLAUDE\.md|docs/STANDARDS\.md|Makefile|scripts/|\.github/)'
BASE="${BASE_REF:-origin/main}"
CHANGED=$(git diff --name-only "$BASE"...HEAD || true)
VIOLATIONS=$(echo "$CHANGED" | grep -P "$PROTECTED" || true)
[ -z "$VIOLATIONS" ] && { echo "✓ no protected paths touched"; exit 0; }
MANIFEST=$(git log "$BASE"..HEAD --pretty=%B | grep -oP 'Approved-Protected-Change: \S+' || true)
if [ -z "$MANIFEST" ]; then
  echo "✗ protected paths modified without 'Approved-Protected-Change: <packet-id>' trailer:"
  echo "$VIOLATIONS"; exit 1
fi
echo "⚠ protected change under $MANIFEST — requires human review:"; echo "$VIOLATIONS"
