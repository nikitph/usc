import {
  blockedAnalysis,
  type ProductAnalysis,
  type ProductAnalysisRequest,
} from "./product-analysis.ts";

export class ProductApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductApiError";
  }
}

export async function analyzeCase(request: ProductAnalysisRequest): Promise<ProductAnalysis> {
  const apiBase = import.meta.env.VITE_USC_API_BASE as string | undefined;
  if (apiBase === undefined || apiBase.trim().length === 0) {
    return blockedAnalysis("Set VITE_USC_API_BASE to the USC API that runs the DeepSeek extraction worker.");
  }
  const response = await fetch(`${apiBase.replace(/\/$/, "")}/v1/cases/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new ProductApiError(`analysis request failed: ${response.status} ${body}`);
  }
  return await response.json() as ProductAnalysis;
}
