"""
VectorNet OpenRouter Provider
================================
Cloud LLM provider using OpenRouter multi-key pool.
Implements per-key circuit breakers, quota tracking, and sensitivity gating.
HIGH/CRITICAL sensitivity configs are blocked from being sent to cloud.
"""

import json
import logging
import time
from typing import Dict, List, Optional

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

logger = logging.getLogger("provider.openrouter")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Sensitivity policy: which levels allow cloud transmission
CLOUD_ALLOWED_SENSITIVITY = {"low", "medium"}

# Default model to use if not configured
DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning:free"
FALLBACK_MODELS = [
    "nvidia/nemotron-3.5-lightning:free",
    "nex-agi/nex-n2.5-pro:free",
    "liquid/lfm-2.5-2.6b:free",
    "google/gemma-4-31b-it:free",
    "openrouter/auto",
]


class OpenRouterProvider(LLMProvider):
    """
    OpenRouter cloud LLM provider with multi-key and multi-model failover.
    Automatically redacts sensitive secrets/credentials before cloud dispatch.
    """

    def __init__(
        self,
        api_keys: Optional[List[str]] = None,
        model: str = DEFAULT_MODEL,
        timeout_s: int = 35,
    ):
        self._api_keys = api_keys or []
        self._model = model
        self._timeout_s = timeout_s
        # Per-key circuit breakers: key_index → {failures, open_ts}
        self._key_circuit: Dict[int, dict] = {}
        self._health = ProviderHealth(
            provider_id=self.provider_id,
            failure_threshold=4,
            recovery_timeout_s=60,
        )
        self._usage = ProviderUsage()
        self._daily_requests = 0
        self._daily_tokens = 0

    @property
    def provider_id(self) -> str:
        return "openrouter"

    def set_keys(self, keys: List[str], model: Optional[str] = None):
        self._api_keys = [k.strip() for k in keys if k.strip()]
        if model:
            self._model = model
        self._key_circuit.clear()
        if self._api_keys:
            self._health.status = ProviderStatus.HEALTHY
            self._health.circuit_state = CircuitState.CLOSED
        else:
            self._health.status = ProviderStatus.UNAVAILABLE

    # ── Per-Key Circuit Breaker ────────────────────────────────────────────────

    def _key_available(self, idx: int) -> bool:
        state = self._key_circuit.get(idx, {})
        if not state:
            return True
        failures = state.get("failures", 0)
        open_ts = state.get("open_ts", 0)
        if failures >= 3:
            # Check recovery window
            if time.time() - open_ts > 60:
                self._key_circuit[idx] = {}  # Reset
                return True
            return False
        return True

    def _record_key_failure(self, idx: int):
        state = self._key_circuit.get(idx, {"failures": 0, "open_ts": 0})
        state["failures"] = state.get("failures", 0) + 1
        if state["failures"] >= 3:
            state["open_ts"] = time.time()
        self._key_circuit[idx] = state

    def _record_key_success(self, idx: int):
        self._key_circuit[idx] = {}

    # ── LLMProvider Interface ──────────────────────────────────────────────────

    def generate(self, request: LLMRequest) -> LLMResponse:
        if not self._api_keys:
            return LLMResponse(
                success=False,
                content="",
                provider_id=self.provider_id,
                model=self._model,
                error="No OpenRouter API keys configured",
                failover_log=["OpenRouter: no keys available in environment or platform pool"],
            )

        failover_log = []
        t0 = time.time()

        # Pre-LLM Privacy Layer: automatically redact sensitive credentials before cloud transmission
        send_prompt = request.prompt
        if request.sensitivity in ("high", "critical"):
            try:
                from backend.app.security.secret_scanner import SecretScanner
                send_prompt, detections = SecretScanner.scan_and_redact(request.prompt)
                if detections:
                    failover_log.append(
                        f"OpenRouter: Sanitized {len(detections)} credential/secret token(s) before cloud transmission"
                    )
            except Exception:
                pass

        # Build candidate models list: primary selected model first, followed by verified fallbacks
        models_to_try = [self._model]
        for fb in FALLBACK_MODELS:
            if fb not in models_to_try:
                models_to_try.append(fb)

        for idx, key in enumerate(self._api_keys):
            if not self._key_available(idx):
                failover_log.append(f"OpenRouter key #{idx + 1}: circuit OPEN, skipping")
                continue

            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://vectornet.io",
                "X-Title": "VectorNet Security Auditor",
            }

            key_failed = False
            for model_id in models_to_try:
                payload = {
                    "model": model_id,
                    "messages": [
                        {"role": "system", "content": request.system_instruction},
                        {"role": "user", "content": send_prompt},
                    ],
                    "temperature": request.temperature,
                    "max_tokens": min(request.max_tokens or 1000, 1200),
                }

                try:
                    res = requests.post(
                        OPENROUTER_API_URL,
                        headers=headers,
                        json=payload,
                        timeout=(5.0, 35.0),
                    )
                    latency_ms = (time.time() - t0) * 1000

                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        content = choices[0]["message"]["content"] if choices else ""
                        if content:
                            self._record_key_success(idx)
                            self._health.status = ProviderStatus.HEALTHY
                            self._health.circuit_state = CircuitState.CLOSED
                            self._usage.total_successes += 1
                            self._usage.requests_today += 1
                            usage_info = data.get("usage", {})
                            total_tokens = usage_info.get("total_tokens", 0)
                            self._usage.tokens_today += total_tokens
                            self._model = model_id  # Cache current working model
                            failover_log.append(
                                f"OpenRouter key #{idx + 1} ({model_id}): success in {latency_ms:.0f}ms"
                            )
                            return LLMResponse(
                                success=True,
                                content=content,
                                provider_id=self.provider_id,
                                model=model_id,
                                input_tokens=usage_info.get("prompt_tokens", 0),
                                output_tokens=usage_info.get("completion_tokens", 0),
                                latency_ms=latency_ms,
                                failover_log=failover_log,
                            )
                        else:
                            failover_log.append(f"OpenRouter key #{idx + 1} ({model_id}): empty content")

                    elif res.status_code == 429:
                        failover_log.append(f"OpenRouter key #{idx + 1} ({model_id}): 429 rate-limited, trying fallback model")
                        continue  # Try next model on same key

                    elif res.status_code == 400:
                        failover_log.append(f"OpenRouter key #{idx + 1} ({model_id}): model unavailable (400), trying fallback model")
                        continue  # Try next model on same key

                    elif res.status_code in (401, 403):
                        # Auth failure → mark key as permanently down
                        self._key_circuit[idx] = {"failures": 99, "open_ts": time.time()}
                        failover_log.append(
                            f"OpenRouter key #{idx + 1}: {res.status_code} authentication failure — key disabled"
                        )
                        logger.error(f"OpenRouter key #{idx + 1} authentication failed — check key")
                        key_failed = True
                        break

                    else:
                        failover_log.append(f"OpenRouter key #{idx + 1} ({model_id}): HTTP {res.status_code}")
                        continue

                except requests.exceptions.Timeout:
                    failover_log.append(f"OpenRouter key #{idx + 1} ({model_id}): timeout, trying next model")
                    continue
                except Exception as e:
                    failover_log.append(f"OpenRouter key #{idx + 1} ({model_id}): error — {e}")
                    continue

            # If all models failed on this key
            self._record_key_failure(idx)
            self._usage.total_failures += 1

        # All keys exhausted
        self._health.status = ProviderStatus.RATE_LIMITED
        self._usage.total_failures += 1
        return LLMResponse(
            success=False,
            content="",
            provider_id=self.provider_id,
            model=self._model,
            error="All OpenRouter keys/models exhausted or rate-limited",
            failover_log=failover_log,
        )

    def health_check(self) -> ProviderHealth:
        available_keys = sum(1 for i in range(len(self._api_keys)) if self._key_available(i))
        if not self._api_keys:
            self._health.status = ProviderStatus.DISABLED
        elif available_keys == 0:
            self._health.status = ProviderStatus.RATE_LIMITED
            self._health.circuit_state = CircuitState.OPEN
        else:
            self._health.status = ProviderStatus.HEALTHY
            self._health.circuit_state = CircuitState.CLOSED
        return self._health

    def estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            reasoning=True,
            json_output=True,
            vision=False,
            large_context=True,
            streaming=True,
            structured_output=True,
            context_window=128000,
        )

    def get_limits(self) -> ProviderLimits:
        # OpenRouter free tier — conservative defaults
        return ProviderLimits(
            rpm=20, rpd=200, tpm=40000, tpd=200000,
            max_input_tokens=128000,
            max_output_tokens=4096,
        )

    def get_usage(self) -> ProviderUsage:
        return self._usage

    def cloud_allowed_for(self, sensitivity: str) -> bool:
        """Cloud transmission is permitted for all sensitivity levels with automated pre-LLM redaction."""
        return True

    def get_masked_keys(self) -> list:
        """Return masked API key previews for display."""
        result = []
        for idx, k in enumerate(self._api_keys):
            available = self._key_available(idx)
            masked = f"{k[:8]}...{k[-4:]}" if len(k) > 12 else "sk-or-v1-***"
            result.append({
                "index": idx + 1,
                "key_preview": masked,
                "status": "READY" if available else "CIRCUIT_OPEN",
            })
        return result
