"""
VectorNet Local Ollama Provider
================================
First-class local LLM provider for air-gapped, privacy-first inference.
All sensitive (high/critical) configurations must use this provider.
Supports configurable model and endpoint.
"""

import logging
import re
import time
from typing import Optional

import requests

from backend.app.providers.base import (
    CircuitState,
    LLMProvider,
    LLMRequest,
    LLMResponse,
    ProviderCapabilities,
    ProviderHealth,
    ProviderLimits,
    ProviderStatus,
    ProviderUsage,
)

logger = logging.getLogger("provider.local")

# Default circuit breaker thresholds
_FAILURE_THRESHOLD = 3
_RECOVERY_TIMEOUT_S = 15


class LocalOllamaProvider(LLMProvider):
    """
    Local Ollama LLM provider.
    - Always permitted for any sensitivity level (local inference = no data leaves the machine)
    - Uses circuit breaker to avoid repeatedly hammering an offline Ollama instance
    - Model is configurable (default: qwen3:4b)
    """

    def __init__(
        self,
        endpoint: str = "http://localhost:11434",
        model: str = "qwen3:4b",
        timeout_s: int = 45,
    ):
        self._endpoint = endpoint.rstrip("/")
        self._model = model
        self._timeout_s = timeout_s
        self._health = ProviderHealth(
            provider_id=self.provider_id,
            failure_threshold=_FAILURE_THRESHOLD,
            recovery_timeout_s=_RECOVERY_TIMEOUT_S,
        )
        self._usage = ProviderUsage()
        self._circuit_open_ts: Optional[float] = None

    @property
    def provider_id(self) -> str:
        return "local_ollama"

    # ── Circuit Breaker ────────────────────────────────────────────────────────

    def _check_circuit(self) -> CircuitState:
        if self._health.circuit_state == CircuitState.OPEN:
            elapsed = time.time() - (self._circuit_open_ts or 0)
            if elapsed >= self._health.recovery_timeout_s:
                self._health.circuit_state = CircuitState.HALF_OPEN
                logger.info("LocalOllama circuit → HALF_OPEN (testing recovery)")
        return self._health.circuit_state

    def _record_success(self, latency_ms: float):
        self._health.consecutive_failures = 0
        self._health.circuit_state = CircuitState.CLOSED
        self._circuit_open_ts = None
        self._health.status = ProviderStatus.HEALTHY
        self._health.latency_ms = latency_ms
        self._health.last_error = None
        self._usage.total_successes += 1

    def _record_failure(self, error: str):
        self._health.consecutive_failures += 1
        self._health.last_error = error
        self._usage.total_failures += 1
        if self._health.consecutive_failures >= self._health.failure_threshold:
            self._health.circuit_state = CircuitState.OPEN
            self._health.status = ProviderStatus.UNAVAILABLE
            self._circuit_open_ts = time.time()
            logger.warning(
                f"LocalOllama circuit → OPEN after {self._health.consecutive_failures} failures"
            )

    # ── LLMProvider Interface ──────────────────────────────────────────────────

    def generate(self, request: LLMRequest) -> LLMResponse:
        state = self._check_circuit()
        if state == CircuitState.OPEN:
            return LLMResponse(
                success=False,
                content="",
                provider_id=self.provider_id,
                model=self._model,
                error="Circuit breaker OPEN — local Ollama unavailable",
                failover_log=["LocalOllama: circuit OPEN, skipping"],
            )

        t0 = time.time()
        try:
            payload = {
                "model": self._model,
                "messages": [
                    {"role": "system", "content": request.system_instruction},
                    {"role": "user", "content": request.prompt},
                ],
                "stream": False,
                "options": {
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens,
                },
            }
            res = requests.post(
                f"{self._endpoint}/api/chat",
                json=payload,
                timeout=(3.0, self._timeout_s),
            )

            latency_ms = (time.time() - t0) * 1000

            if res.status_code == 200:
                data = res.json()
                raw = data.get("message", {}).get("content", "").strip()

                # If qwen3 puts output in thinking field, extract it
                if not raw:
                    raw = data.get("message", {}).get("thinking", "").strip()

                # Strip <think>...</think> tokens emitted by qwen3
                if "<think>" in raw:
                    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
                    raw = re.sub(r"<think>.*$", "", raw, flags=re.DOTALL).strip()

                if raw:
                    self._record_success(latency_ms)
                    self._usage.requests_today += 1
                    return LLMResponse(
                        success=True,
                        content=raw,
                        provider_id=self.provider_id,
                        model=self._model,
                        latency_ms=latency_ms,
                        failover_log=[
                            f"LocalOllama ({self._model} @ {self._endpoint}): success in {latency_ms:.0f}ms"
                        ],
                    )
                else:
                    self._record_failure("Empty content in Ollama response")
                    return LLMResponse(
                        success=False,
                        content="",
                        provider_id=self.provider_id,
                        model=self._model,
                        latency_ms=latency_ms,
                        error="Empty content returned by Ollama",
                    )
            else:
                err = f"HTTP {res.status_code}"
                self._record_failure(err)
                return LLMResponse(
                    success=False,
                    content="",
                    provider_id=self.provider_id,
                    model=self._model,
                    error=err,
                )

        except requests.exceptions.Timeout:
            self._record_failure("Request timed out")
            return LLMResponse(
                success=False,
                content="",
                provider_id=self.provider_id,
                model=self._model,
                error=f"Ollama request timed out after {self._timeout_s}s",
                failover_log=[f"LocalOllama: timeout after {self._timeout_s}s"],
            )
        except Exception as e:
            self._record_failure(str(e))
            return LLMResponse(
                success=False,
                content="",
                provider_id=self.provider_id,
                model=self._model,
                error=str(e),
                failover_log=[f"LocalOllama: error — {e}"],
            )

    def health_check(self) -> ProviderHealth:
        state = self._check_circuit()
        if state == CircuitState.OPEN:
            return self._health
        try:
            res = requests.get(f"{self._endpoint}/api/tags", timeout=(1.0, 2.0))
            if res.status_code == 200:
                models = [m.get("name", "") for m in res.json().get("models", [])]
                self._health.status = ProviderStatus.HEALTHY
                self._health.circuit_state = CircuitState.CLOSED
                return self._health
        except Exception:
            self._health.status = ProviderStatus.UNAVAILABLE
            self._health.circuit_state = CircuitState.OPEN
            self._circuit_open_ts = time.time()
            return self._health
        self._health.status = ProviderStatus.UNAVAILABLE
        self._health.circuit_state = CircuitState.OPEN
        self._circuit_open_ts = time.time()
        return self._health

    def estimate_tokens(self, text: str) -> int:
        # Simple approximation: ~4 chars per token
        return max(1, len(text) // 4)

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            reasoning=True,
            json_output=True,
            vision=False,
            large_context=False,
            streaming=True,
            structured_output=False,
            context_window=32768,
        )

    def get_limits(self) -> ProviderLimits:
        # Local = no external quota limits
        return ProviderLimits(
            rpm=0, rpd=0, tpm=0, tpd=0,
            max_input_tokens=32768,
            max_output_tokens=4096,
        )

    def get_usage(self) -> ProviderUsage:
        return self._usage

    def cloud_allowed_for(self, sensitivity: str) -> bool:
        # Local provider: always allowed — no data leaves the machine
        return True

    def get_installed_models(self) -> list:
        try:
            res = requests.get(f"{self._endpoint}/api/tags", timeout=3)
            if res.status_code == 200:
                return [m.get("name", "") for m in res.json().get("models", [])]
        except Exception:
            pass
        return []
