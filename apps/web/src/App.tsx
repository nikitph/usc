import { AlertTriangle, ArrowRight, Database, FlaskConical, Loader2, Network, Sparkles } from "lucide-react";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import { analyzeCase } from "./lib/api.ts";
import {
  backendStatus,
  canSubmit,
  sampleAnalysis,
  sampleRequest,
  summarizeMotifs,
  type ProductAnalysis,
  type ProductAnalysisRequest,
  type ProductRunState,
} from "./lib/product-analysis.ts";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card.tsx";
import { Textarea } from "./components/ui/textarea.tsx";

const initialRequest: ProductAnalysisRequest = sampleRequest;

export function App(): ReactElement {
  const [request, setRequest] = useState<ProductAnalysisRequest>(initialRequest);
  const [analysis, setAnalysis] = useState<ProductAnalysis>(sampleAnalysis);
  const [runState, setRunState] = useState<ProductRunState>("ready");
  const [error, setError] = useState<string>("");
  const motifs = useMemo(() => summarizeMotifs(analysis.tokens), [analysis]);

  async function runAnalysis(): Promise<void> {
    setRunState("running");
    setError("");
    try {
      const next = await analyzeCase(request);
      setAnalysis(next);
      setRunState(next.extractor.configured ? "ready" : "blocked");
    } catch (caught) {
      setRunState("blocked");
      setError(caught instanceof Error ? caught.message : "analysis failed");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-4">
          <header className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge className="bg-primary/10 text-primary">USC product loop</Badge>
              <Badge>{analysis.mode}</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-normal">Compile a real-world case into structural evidence.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Paste an incident, process, architecture, or organization. The workbench sends it to the extraction backend, stores artifacts, and returns verdicts, gaps, motifs, and candidate interventions.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Case Input</CardTitle>
              <p className="text-sm text-muted-foreground">Default extractor is DeepSeek. The product UI does not silently use keyword extraction.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Case type
                <select
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                  value={request.caseType}
                  onChange={(event) => setRequest({ ...request, caseType: event.target.value })}
                >
                  <option value="incident">Incident</option>
                  <option value="architecture">Architecture</option>
                  <option value="governance">Governance process</option>
                  <option value="organization">Organization</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <Textarea
                value={request.caseText}
                onChange={(event) => setRequest({ ...request, caseText: event.target.value })}
                placeholder="Paste a real system/case description..."
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{request.caseText.trim().length} chars</span>
                <span>extractor: {request.extractor}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => setAnalysis(sampleAnalysis)}>
                  Load golden sample
                </Button>
                <Button type="button" className="flex-1" disabled={!canSubmit(request) || runState === "running"} onClick={() => void runAnalysis()}>
                  {runState === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Run analysis
                </Button>
              </div>
              {error.length > 0 && <StatusBox tone="bad" title="Request failed" body={error} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backend Contract</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Capability icon={<Sparkles className="h-4 w-4" />} label="LLM extraction" value="DeepSeek adapter required" />
              <Capability icon={<Database className="h-4 w-4" />} label="Artifact store" value="Supabase Postgres adapter" />
              <Capability icon={<Network className="h-4 w-4" />} label="Mode" value="research until calibrated" />
            </CardContent>
          </Card>
        </aside>

        <section className="grid min-w-0 content-start gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{analysis.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{backendStatus(analysis)}</p>
              </div>
              <VerdictBadge analysis={analysis} />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Gate" value={analysis.verdict.gate} />
                <Metric label="Terminal validity" value={analysis.verdict.value} />
                <Metric label="Motifs" value={String(motifs.length)} />
                <Metric label="Artifacts" value={String(analysis.artifactIds.length)} />
              </div>
            </CardContent>
          </Card>

          {analysis.gaps.length > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Evidence gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {analysis.gaps.map((gap) => (
                  <div key={`${gap.kind}:${gap.description}`} className="rounded-md border border-warning/30 bg-white p-3 text-sm">
                    <strong>{gap.kind}</strong>
                    <p className="mt-1 text-muted-foreground">{gap.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Motifs</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {analysis.tokens.length === 0 ? (
                  <EmptyState title="No tokens yet" body="Configure the backend and run analysis to produce span-grounded motif tokens." />
                ) : (
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="pb-2">Motif</th>
                        <th className="pb-2">Role</th>
                        <th className="pb-2">Term</th>
                        <th className="pb-2">Confidence</th>
                        <th className="pb-2">Span</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {analysis.tokens.map((token) => (
                        <tr key={token.id}>
                          <td className="py-3 font-semibold">{token.motif}</td>
                          <td className="py-3">{token.role}</td>
                          <td className="py-3 text-muted-foreground">{token.domainTerm}</td>
                          <td className="py-3">{Math.round(token.confidence * 100)}%</td>
                          <td className="py-3 text-muted-foreground">{token.span.start}-{token.span.end}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {analysis.recommendations.length === 0 ? (
                  <EmptyState title="No recommendation" body="Recommendation ranking runs after extraction and verdict artifacts exist." />
                ) : analysis.recommendations.map((recommendation) => (
                  <article key={recommendation.id} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge>{recommendation.status}</Badge>
                      <span className="text-xs font-bold">gain {recommendation.gain}</span>
                    </div>
                    <strong className="text-sm">{recommendation.title}</strong>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{recommendation.id}</p>
                  </article>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusBox({ tone, title, body }: { readonly tone: "bad" | "ok"; readonly title: string; readonly body: string }): ReactElement {
  return (
    <div className={`rounded-md border p-3 text-sm ${tone === "bad" ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
      <strong>{title}</strong>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}

function Capability({ icon, label, value }: { readonly icon: ReactElement; readonly label: string; readonly value: string }): ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}

function VerdictBadge({ analysis }: { readonly analysis: ProductAnalysis }): ReactElement {
  const tone = analysis.verdict.gate === "deny" ? "bg-destructive/10 text-destructive" : analysis.verdict.gate === "allow" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning-foreground";
  return <Badge className={tone}>{analysis.verdict.gate}</Badge>;
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ title, body }: { readonly title: string; readonly body: string }): ReactElement {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-border p-8 text-center">
      <FlaskConical className="mb-3 h-7 w-7 text-muted-foreground" />
      <strong>{title}</strong>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
