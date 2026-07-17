from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from generated.motif_token import MotifToken

from .adapters import DeepSeekConfig, DeepSeekJsonAdapter, LlmAdapterError
from .worker import ExtractionWorker, ExtractionWorkerError


class AnalyzeCaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    caseText: str = Field(..., min_length=40)
    caseType: str = Field(..., min_length=1)
    extractor: Literal["deepseek"]


class SpanView(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    start: int
    end: int


class ProductMotifTokenView(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    motif: str
    role: str
    confidence: float
    domainTerm: str
    span: SpanView


class GapView(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: str
    description: str


class ExtractorView(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    backend: Literal["deepseek"]
    version: str
    configured: bool
    experimental: bool


class VerdictView(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    value: Literal["unknown"]
    gate: Literal["pending"]


class ProductRecommendationView(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    title: str
    gain: float
    status: Literal["candidate", "ready", "blocked"]


class AnalyzeCaseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    caseId: str
    title: str
    mode: Literal["research"]
    extractor: ExtractorView
    verdict: VerdictView
    gaps: tuple[GapView, ...]
    tokens: tuple[ProductMotifTokenView, ...]
    recommendations: tuple[ProductRecommendationView, ...]
    artifactIds: tuple[str, ...]


app = FastAPI(title="USC extraction worker", version="0.1.0")


@app.post("/v1/cases/analyze")
async def analyze_case(request: AnalyzeCaseRequest) -> AnalyzeCaseResponse:
    try:
      worker = ExtractionWorker(DeepSeekJsonAdapter(DeepSeekConfig.from_env()))
      extraction = await worker.extract(request.caseText, source_artifact_id=f"source:{request.caseType}")
    except (LlmAdapterError, ExtractionWorkerError) as exc:
      raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AnalyzeCaseResponse(
        caseId=f"case:{request.caseType}",
        title=f"{request.caseType} analysis",
        mode="research",
        extractor=ExtractorView(
            backend="deepseek",
            version=extraction.extractor_version,
            configured=True,
            experimental=True,
        ),
        verdict=VerdictView(value="unknown", gate="pending"),
        gaps=(
            GapView(
                kind="below_extraction_bar",
                description="DeepSeek extraction is research-mode until the motif extraction benchmark is calibrated.",
            ),
        ),
        tokens=tuple(token_view(token) for token in extraction.tokens),
        recommendations=(),
        artifactIds=(),
    )


def token_view(token: MotifToken) -> ProductMotifTokenView:
    evidence = token.evidence[0]
    return ProductMotifTokenView(
        id=token.id,
        motif=token.motif.value,
        role=token.role.value,
        confidence=token.confidence,
        domainTerm=token.domainTerm,
        span=SpanView(start=evidence.span.start, end=evidence.span.end),
    )
