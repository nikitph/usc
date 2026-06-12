import {
  dashboardMetrics,
  patternReviewMetrics,
  patternReviewRows,
  reviewStateClass,
  trapRuns,
  verdictClass,
  type LedgerRow,
  type PatternReviewRow,
  type TrapRun,
} from "./dashboard.ts";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) throw new Error("missing #app root");

const metrics = dashboardMetrics(trapRuns);
const reviewMetrics = patternReviewMetrics(patternReviewRows);
app.innerHTML = `
  <section class="page-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">USC Action Gate</p>
        <h1>Ledger and Trap Dashboard</h1>
      </div>
      <div class="status-pill">research mode</div>
    </header>

    <section class="metrics-grid" aria-label="trap metrics">
      ${metricTile("Trap Fixtures", String(metrics.total), "adjudicated set")}
      ${metricTile("Passing", String(metrics.passing), "current runner")}
      ${metricTile("Overconfident Closure", String(metrics.overconfidentClosure), "allow when unsafe")}
      ${metricTile("Over-cautious Non-closure", String(metrics.overcautiousNonClosure), "block when valid")}
      ${metricTile("False-terminal Detections", String(metrics.falseTerminalDetections), "invalid closure caught")}
    </section>

    <section class="workspace">
      <section class="runs-panel" aria-label="trap runs">
        <h2>Fixture Runs</h2>
        <div class="run-list">
          ${trapRuns.map(runButton).join("")}
        </div>
      </section>
      <section class="detail-panel" id="detail" aria-live="polite"></section>
    </section>

    <section class="review-panel" aria-label="pattern review queue">
      <div class="review-header">
        <div>
          <p class="eyebrow">Pattern Plane</p>
          <h2>Review Queue</h2>
        </div>
        <div class="review-counts">
          ${reviewMetric("Pending", reviewMetrics.pending)}
          ${reviewMetric("Accepted", reviewMetrics.accepted)}
          ${reviewMetric("Rejected", reviewMetrics.rejected)}
        </div>
      </div>
      <div class="review-list">
        ${patternReviewRows.map(reviewRow).join("")}
      </div>
    </section>
  </section>
`;

const detail = document.querySelector<HTMLDivElement>("#detail");
if (detail === null) throw new Error("missing detail panel");

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-run-id]")) {
  button.addEventListener("click", () => {
    const run = trapRuns.find((candidate) => candidate.id === button.dataset.runId);
    if (run !== undefined) renderRun(detail, run);
  });
}

renderRun(detail, trapRuns[0] as TrapRun);

function metricTile(label: string, value: string, caption: string): string {
  return `
    <article class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${caption}</small>
    </article>
  `;
}

function runButton(run: TrapRun): string {
  return `
    <button class="run-button" type="button" data-run-id="${run.id}">
      <span>${run.id}</span>
      <strong>${run.name}</strong>
      <em class="${verdictClass(run.actual.verdict)}">${run.actual.verdict}</em>
    </button>
  `;
}

function reviewMetric(label: string, value: number): string {
  return `<span><strong>${value}</strong>${label}</span>`;
}

function reviewRow(row: PatternReviewRow): string {
  return `
    <article class="review-row">
      <div>
        <span>${row.artifactKind} / ${row.domain}</span>
        <strong>${row.name}</strong>
        <small>${row.id}</small>
      </div>
      <em class="${reviewStateClass(row.state)}">${row.state}</em>
      <small>${row.reviewer ?? "unassigned"}</small>
    </article>
  `;
}

function renderRun(target: HTMLDivElement, run: TrapRun): void {
  target.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">${run.id}</p>
        <h2>${run.name}</h2>
      </div>
      <div class="verdict ${verdictClass(run.actual.verdict)}">${run.actual.verdict}</div>
    </div>

    <div class="summary-row">
      <div><span>terminal validity</span><strong>${run.actual.terminalValidity}</strong></div>
      <div><span>expected verdict</span><strong>${run.expected.verdict}</strong></div>
      <div><span>gaps</span><strong>${run.gaps.length === 0 ? "none" : run.gaps.join(", ")}</strong></div>
    </div>

    <h3>Obligation Ledger</h3>
    <table>
      <thead>
        <tr>
          <th>Obligation</th>
          <th>Type</th>
          <th>Status</th>
          <th>Safe Default</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        ${run.obligations.map(ledgerRow).join("")}
      </tbody>
    </table>

    <h3>Rationale</h3>
    <ul class="rationale">
      ${run.rationale.map((line) => `<li>${line}</li>`).join("")}
    </ul>
  `;
}

function ledgerRow(row: LedgerRow): string {
  return `
    <tr>
      <td>${row.id}</td>
      <td>${row.type}</td>
      <td><span class="chip ${row.status}">${row.status}</span></td>
      <td>${row.safeDefault}</td>
      <td>${row.evidence}</td>
    </tr>
  `;
}
