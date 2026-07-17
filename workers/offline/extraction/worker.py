from __future__ import annotations

from dataclasses import dataclass

from pydantic import ValidationError

from generated.motif_token import MotifToken

from .adapters import LlmJsonAdapter


class ExtractionWorkerError(Exception):
    pass


@dataclass(frozen=True)
class MotifExtractionResult:
    extractor_name: str
    extractor_version: str
    raw_json: dict[str, object]
    tokens: tuple[MotifToken, ...]


class ExtractionWorker:
    def __init__(self, adapter: LlmJsonAdapter) -> None:
        self._adapter = adapter

    async def extract(self, source_text: str, source_artifact_id: str) -> MotifExtractionResult:
        raw_json = await self._adapter.complete_json(
            system=system_prompt(),
            user=user_prompt(source_text, source_artifact_id, self._adapter.extractor_version),
        )
        raw_tokens = raw_json.get("tokens")
        if not isinstance(raw_tokens, list):
            raise ExtractionWorkerError("motif extraction response must contain a tokens array")
        tokens: list[MotifToken] = []
        for raw_token in raw_tokens:
            try:
                tokens.append(MotifToken.model_validate(raw_token))
            except ValidationError as exc:
                raise ExtractionWorkerError(f"motif token failed schema validation: {exc}") from exc
        return MotifExtractionResult(
            extractor_name=self._adapter.name,
            extractor_version=self._adapter.extractor_version,
            raw_json=raw_json,
            tokens=tuple(tokens),
        )


def system_prompt() -> str:
    return (
        "You are the USC motif extraction worker. Return only JSON matching "
        '{"tokens":[MotifToken...]}. Every token must be span-grounded against '
        "the exact source text. Do not invent evidence. If uncertain, use "
        'role="candidate" with lower confidence rather than omitting uncertainty.'
    )


def user_prompt(source_text: str, source_artifact_id: str, extractor_version: str) -> str:
    return (
        f"sourceArtifactId: {source_artifact_id}\n"
        f"extractorVersion: {extractor_version}\n"
        "Allowed motifs are the generated schema enum. Boundary tokens require "
        'boundaryRole="scope_delimiter" or "concept_reference". Spans are '
        "zero-based UTF-16-like character offsets over the provided text.\n\n"
        f"SOURCE TEXT:\n{source_text}"
    )
