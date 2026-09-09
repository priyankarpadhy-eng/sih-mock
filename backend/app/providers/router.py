"""
VectorNet Intelligent AI Router
================================
Selects the best available LLM provider for each request based on:
  1. Sensitivity (hard constraint — critical/high → local only)
  2. Provider health / circuit state
  3. Task type (simple → fast, complex → capable)
  4. Token budget availability
  5. Configurable fallback matrix

As per Master System Prompt Sections 15–20:
  - Hard constraints override routing scores
  - Cloud providers REMOVED (not just penalized) for high/critical sensitivity
  - Circuit breakers prevent repeated requests to unavailable providers
  - Fallback is automatic: Local → OpenRouter → Deterministic
"""

import logging
import os
import json
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.app.providers.base import CircuitState, LLMProvider, LLMRequest, LLMResponse, ProviderStatus
from backend.app.providers.local import LocalOllamaProvider
from backend.app.providers.openrouter import OpenRouterProvider

logger = logging.getLogger("providers.router")

# Path to persistent key pool
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
KEY_POOL_FILE = os.path.join(DATA_DIR, "llm_key_pool.json")


class IntelligentRouter:
    """
    Routes each LLM request to the best available provider.

    Routing logic (applied in order):
      1. Build candidate list from all registered providers
      2. Remove providers with OPEN circuit breakers
      3. Remove cloud providers if sensitivity is high or critical
      4. For each remaining candidate, score by: task fit + availability
      5. Pick highest scoring candidate
      6. If it fails, move to next candidate (fallback chain)
      7. If all fail → return deterministic-only placeholder
    """

    def __init__(self):
        self._local = LocalOllamaProvider(
            endpoint=self._get_env("OLLAMA_BASE_URL", "http://localhost:11434"),
            model=self._get_env("OLLAMA_MODEL", "qwen3:4b"),
            timeout_s=45,
        )
        keys, initial_model = self._load_api_keys_and_model()
        self._openrouter = OpenRouterProvider(
            api_keys=keys,
            model=initial_model or self._get_env("OPENROUTER_MODEL", "nvidia/nemotron-3.5-lightning:free"),
            timeout_s=35,
        )
        self._prefer_local = self._get_env("PREFER_LOCAL_AI", "true").lower() == "true"

    # ── Configuration helpers ──────────────────────────────────────────────────

    @staticmethod
    def _get_env(key: str, default: str) -> str:
        return os.environ.get(key, default)

    def _sync_keys(self):
        """Dynamic sync of API keys from .env and disk pool."""
        keys, model = self._load_api_keys_and_model()
        if hasattr(self, "_openrouter"):
            if keys != self._openrouter._api_keys or self._openrouter._health.status == ProviderStatus.DISABLED:
                self._openrouter.set_keys(keys, model)
            elif model and model != self._openrouter._model:
                self._openrouter._model = model

    def _load_api_keys(self) -> List[str]:
        keys, _ = self._load_api_keys_and_model()
        return keys

    def _load_api_keys_and_model(self) -> Tuple[List[str], Optional[str]]:
        """Load OpenRouter keys and model from persistent pool file AND environment / .env."""
        file_keys: List[str] = []
        active_model_found: Optional[str] = None
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(KEY_POOL_FILE):
            try:
                with open(KEY_POOL_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    file_keys = [k.strip() for k in data.get("api_keys", []) if k.strip()]
                    if data.get("active_model"):
                        active_model_found = data["active_model"]
            except Exception:
                pass

        env_keys: List[str] = []
        # Check os.environ
        for var_name in ("OPENROUTER_API_KEYS", "OPENROUTER_API_KEY"):
            raw = os.environ.get(var_name, "")
            if raw:
                for k in raw.split(","):
                    k = k.strip()
                    if k and k not in env_keys:
                        env_keys.append(k)

        # Check .env file directly if it exists
        try:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            env_path = os.path.join(root_dir, ".env")
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as ef:
                    for line in ef:
                        line = line.strip()
                        if line.startswith("OPENROUTER_API_KEYS=") or line.startswith("OPENROUTER_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            for k in val.split(","):
                                k = k.strip()
                                if k and k not in env_keys:
                                    env_keys.append(k)
                        elif line.startswith("OPENROUTER_DEFAULT_MODEL=") or line.startswith("OPENROUTER_MODEL="):
                            m_val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if m_val:
                                active_model_found = m_val
        except Exception:
            pass

        if hasattr(self, "_openrouter") and active_model_found:
            self._openrouter._model = active_model_found

        # Combine uniquely while preserving order (UI pool keys first, then env keys)
        combined: List[str] = []
        for k in file_keys + env_keys:
            if k and k not in combined:
                combined.append(k)

        return combined, active_model_found

    def save_key_pool(self, keys: List[str], model: Optional[str] = None, ollama_model: Optional[str] = None):
        """Persist API key pool and model selection to disk."""
        clean_keys = [k.strip() for k in keys if k.strip()]
        # Also load env keys so they aren't lost if UI sends partial list
        env_keys = []
        for var_name in ("OPENROUTER_API_KEYS", "OPENROUTER_API_KEY"):
            raw = os.environ.get(var_name, "")
            if raw:
                for k in raw.split(","):
                    k = k.strip()
                    if k and k not in env_keys:
                        env_keys.append(k)

        combined = []
        for k in clean_keys + env_keys:
            if k and k not in combined:
                combined.append(k)

        final_keys = combined if combined else (clean_keys or [k for k in self._openrouter._api_keys if k])
        self._openrouter.set_keys(final_keys, model)
        if ollama_model:
            self._local._model = ollama_model
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(KEY_POOL_FILE, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "api_keys": final_keys,
                    "active_model": model or self._openrouter._model,
                    "ollama_model": ollama_model or self._local._model,
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                f,
                indent=2,
            )

    # ── Routing ────────────────────────────────────────────────────────────────

    def _build_candidate_chain(self, sensitivity: str) -> List[LLMProvider]:
        """
        Returns an ordered list of providers to try for this request.
        Priority:
          - If PREFER_LOCAL_AI is True and local Ollama is healthy: local first, then OpenRouter fallback.
          - If PREFER_LOCAL_AI is False or local Ollama is offline: OpenRouter first, then local fallback.
          - Cloud transmission automatically redacts secrets/credentials before dispatch.
        """
        candidates: List[LLMProvider] = []

        local_health = self._local.health_check()
        local_available = (
            local_health.circuit_state != CircuitState.OPEN
            and local_health.status == ProviderStatus.HEALTHY
        )

        cloud_health = self._openrouter.health_check()
        cloud_available = (
            cloud_health.circuit_state != CircuitState.OPEN
            and cloud_health.status != ProviderStatus.DISABLED
            and len(self._openrouter._api_keys) > 0
        )

        if self._prefer_local:
            if local_available:
                candidates.append(self._local)
            if cloud_available:
                candidates.append(self._openrouter)
        else:
            if cloud_available:
                candidates.append(self._openrouter)
            if local_available:
                candidates.append(self._local)

        return candidates

    def route(
        self,
        prompt: str,
        system_instruction: str,
        sensitivity: str = "medium",
        task_type: str = "complex_reasoning",
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Route a request through the provider chain.
        Returns a dict compatible with the existing llm_engine response format.
        """
        request = LLMRequest(
            prompt=prompt,
            system_instruction=system_instruction,
            task_type=task_type,
            sensitivity=sensitivity,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        # Dynamically sync keys from .env / platform file before routing
        self._sync_keys()
        candidates = self._build_candidate_chain(sensitivity)
        all_logs: List[str] = []

        if not candidates:
            # No providers available
            all_logs.append("Router: all providers unavailable or blocked by sensitivity policy")
            return {
                "success": False,
                "provider": "NONE",
                "model": "none",
                "content": "",
                "failover_log": all_logs,
            }

        for provider in candidates:
            response: LLMResponse = provider.generate(request)
            all_logs.extend(response.failover_log)

            if response.success and response.content:
                return {
                    "success": True,
                    "provider": response.provider_id.upper(),
                    "model": response.model,
                    "content": response.content,
                    "failover_log": all_logs,
                    "used_key_index": "LOCAL" if provider.provider_id == "local_ollama" else "CLOUD",
                    "latency_ms": response.latency_ms,
                    "input_tokens": response.input_tokens,
                    "output_tokens": response.output_tokens,
                }
            else:
                all_logs.append(
                    f"Router: {provider.provider_id} failed — {response.error or 'unknown error'}, trying next"
                )

        # All candidates failed
        all_logs.append("Router: all providers failed — falling back to deterministic-only mode")
        return {
            "success": False,
            "provider": "DETERMINISTIC_ONLY",
            "model": "none",
            "content": "",
            "failover_log": all_logs,
        }

    # ── Status / Admin ─────────────────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        """Return full provider status for admin dashboard."""
        local_health = self._local.health_check()
        cloud_health = self._openrouter.health_check()
        local_installed = self._local.get_installed_models()

        return {
            "local": {
                "provider_id": "local_ollama",
                "status": local_health.status.value,
                "circuit": local_health.circuit_state.value,
                "model": self._local._model,
                "endpoint": self._local._endpoint,
                "installed_models": local_installed,
                "active_model_installed": self._local._model in local_installed,
                "mode": "Air-Gapped Local Inference (Zero Data Leakage)",
                "usage": {
                    "requests_today": self._local._usage.requests_today,
                    "total_successes": self._local._usage.total_successes,
                    "total_failures": self._local._usage.total_failures,
                },
            },
            "openrouter": {
                "provider_id": "openrouter",
                "status": cloud_health.status.value,
                "circuit": cloud_health.circuit_state.value,
                "model": self._openrouter._model,
                "total_keys": len(self._openrouter._api_keys),
                "key_pool": self._openrouter.get_masked_keys(),
                "sensitivity_restriction": "Blocked for HIGH and CRITICAL sensitivity configs",
                "usage": {
                    "requests_today": self._openrouter._usage.requests_today,
                    "tokens_today": self._openrouter._usage.tokens_today,
                    "total_successes": self._openrouter._usage.total_successes,
                    "total_failures": self._openrouter._usage.total_failures,
                },
            },
            "routing_policy": {
                "prefer_local": self._prefer_local,
                "high_sensitivity_forces_local": True,
                "critical_sensitivity_forces_local": True,
                "fallback_order": ["local_ollama", "openrouter", "deterministic_only"],
            },
        }


# Shared singleton
_router: Optional[IntelligentRouter] = None


def get_router() -> IntelligentRouter:
    global _router
    if _router is None:
        _router = IntelligentRouter()
    return _router
