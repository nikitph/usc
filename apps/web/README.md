# USC Workbench

Light-mode React/Vite/Tailwind product surface for the first real product loop:
paste a case, send it to a DeepSeek-backed extraction worker, and inspect motifs,
evidence gaps, verdict state, and candidate interventions.

The UI intentionally does not silently fall back to keyword extraction. Without
`VITE_USC_API_BASE`, live analysis returns a blocked research-mode result and
keeps the bundled golden sample visible for orientation.

Run locally:

```sh
pnpm --filter @usc/web dev
```
