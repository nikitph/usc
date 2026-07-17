from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol, cast

import httpx


class LlmJsonAdapter(Protocol):
    @property
    def name(self) -> str:
        """Stable backend name stored with extraction artifacts."""

    @property
    def extractor_version(self) -> str:
        """Version string participating in artifact provenance."""

    async def complete_json(self, system: str, user: str) -> dict[str, object]:
        """Return one parsed JSON object or raise a typed adapter error."""


class LlmAdapterError(Exception):
    pass


@dataclass(frozen=True)
class DeepSeekConfig:
    api_key: str
    model: str = "deepseek-chat"
    base_url: str = "https://api.deepseek.com"
    timeout_seconds: float = 30.0
    max_tokens: int = 8000
    temperature: float = 0.1

    @classmethod
    def from_env(cls) -> "DeepSeekConfig":
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        if len(api_key) == 0:
            raise LlmAdapterError("DEEPSEEK_API_KEY is required for DeepSeek extraction")
        return cls(
            api_key=api_key,
            model=os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
            base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        )


class DeepSeekJsonAdapter:
    name = "deepseek"
    extractor_version = "deepseek-motif-extractor-v0"

    def __init__(self, config: DeepSeekConfig) -> None:
        self._config = config

    async def complete_json(self, system: str, user: str) -> dict[str, object]:
        url = f"{self._config.base_url.rstrip('/')}/chat/completions"
        payload: dict[str, object] = {
            "model": self._config.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": self._config.temperature,
            "max_tokens": self._config.max_tokens,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(timeout=self._config.timeout_seconds) as client:
            response = await client.post(
                url,
                headers={
                    "authorization": f"Bearer {self._config.api_key}",
                    "content-type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            raise LlmAdapterError(f"DeepSeek returned HTTP {response.status_code}: {response.text}")
        body = cast(dict[str, object], response.json())
        choices = body.get("choices")
        if not isinstance(choices, list) or len(choices) == 0:
            raise LlmAdapterError("DeepSeek response did not include choices")
        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise LlmAdapterError("DeepSeek choice was not an object")
        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise LlmAdapterError("DeepSeek choice did not include message")
        content = message.get("content")
        if not isinstance(content, str) or len(content.strip()) == 0:
            raise LlmAdapterError("DeepSeek returned empty content")
        parsed = httpx.Response(200, content=content).json()
        if not isinstance(parsed, dict):
            raise LlmAdapterError("DeepSeek content was not a JSON object")
        return cast(dict[str, object], parsed)
