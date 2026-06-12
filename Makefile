.PHONY: verify codegen typecheck schemas fixtures properties lint protected

verify: typecheck schemas fixtures properties lint protected
	@echo "✓ verify green"

codegen:
	node scripts/codegen.mjs        # JSON Schema -> Zod (packages/shared/src/generated) + Pydantic (workers/offline/generated)

typecheck:
	pnpm -r exec tsc --noEmit
	cd workers/offline && uv run mypy --strict . || true   # tighten to hard-fail when first worker lands

schemas:
	node scripts/validate-fixture-schemas.mjs   # every fixture body validates against its schema

fixtures:
	pnpm tsx scripts/run-fixtures.ts            # kernel/store/runtime/trap runners

properties:
	pnpm --filter @usc/kernel test:properties   # fast-check Kleene/monotonicity/determinism suites

lint:
	pnpm -r exec eslint . --max-warnings 0
	node scripts/lint-kernel-purity.mjs

protected:
	bash scripts/check-protected-paths.sh
