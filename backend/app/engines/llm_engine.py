"""
VectorNet AI LLM Engine (Refactored)
=====================================
Backward-compatible wrapper around the new IntelligentRouter.
All provider-specific logic has been moved to backend/app/providers/.

This module maintains the same external API surface (AILLMEngine class,
ai_engine singleton, query_with_failover method) so existing callers
(orchestrator.py, api/ai_router.py) continue to work without changes.

Provider routing order (governed by IntelligentRouter):
  1. Local Ollama (air-gapped, always for high/critical sensitivity)
  2. OpenRouter multi-key pool (for low/medium sensitivity only)
  3. Deterministic fallback (if all providers fail)
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

from backend.app.providers.router import get_router

logger = logging.getLogger("llm_engine")

# Re-export FREE_AI_MODELS for backward compatibility with API endpoints (Verified Working)
FREE_AI_MODELS = [
    {
        "id": "openrouter/auto",
        "name": "Smart Auto-Select (Recommended)",
        "description": "Automatically routes to the fastest, most reliable free model with instant failover",
    },
    {
        "id": "nvidia/nemotron-3-super-120b-a12b:free",
        "name": "NVIDIA Nemotron 3 Super (120B Free)",
        "description": "1701ms fast response, high accuracy network configuration security analysis",
    },
    {
        "id": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "name": "NVIDIA Nemotron 3 Ultra (550B Free)",
        "description": "1706ms flagship high-capacity reasoning model for multi-vendor compliance",
    },
    {
        "id": "poolside/laguna-xs-2.1:free",
        "name": "Poolside Laguna XS 2.1 (Free)",
        "description": "1618ms ultra-low latency response parser for network CLI audits",
    },
    {
        "id": "cohere/north-mini-code:free",
        "name": "Cohere North Mini Code (Free)",
        "description": "1979ms code-specialized reasoning engine for CLI scripting and regex rules",
    },
    {
        "id": "inclusionai/ling-3.0-flash-fin:free",
        "name": "inclusionAI Ling 3.0 Flash Fin (Free)",
        "description": "1914ms high-throughput compliance analysis engine",
    },
    {
        "id": "inclusionai/ling-3.0-flash-sante:free",
        "name": "inclusionAI Ling 3.0 Flash Sante (Free)",
        "description": "1929ms fast multi-framework policy evaluator",
    },
    {
        "id": "nex-agi/nex-n2.5-mini:free",
        "name": "Nex AGI Nex-N2.5-Mini (Free)",
        "description": "3043ms lightweight multi-vendor compliance rule engine",
    },
]


class AILLMEngine:
    """
    VectorNet AI Engine — backward-compatible facade over IntelligentRouter.

    Exposes the same interface as the original monolithic engine:
      - query_with_failover()
      - set_key_pool()
      - get_config_status()
      - check_ollama()
    """

    def __init__(self):
        self._router = get_router()

    # ── Backward-compatible properties ────────────────────────────────────────

    @property
    def api_keys(self) -> List[str]:
        return self._router._openrouter._api_keys

    @property
    def active_model(self) -> str:
        return self._router._openrouter._model

    @property
    def ollama_model(self) -> str:
        return self._router._local._model

    @property
    def ollama_url(self) -> str:
        return self._router._local._endpoint

    # ── Public API ─────────────────────────────────────────────────────────────

    def check_ollama(self) -> Dict[str, Any]:
        """Check if local Ollama service is reachable."""
        health = self._router._local.health_check()
        installed = self._router._local.get_installed_models()
        return {
            "online": health.status.value == "healthy",
            "models": installed,
            "active_model_installed": self._router._local._model in installed,
        }

    def set_key_pool(
        self,
        keys: List[str],
        active_model: Optional[str] = None,
        ollama_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update API key pool and active models. Persists to disk."""
        self._router.save_key_pool(
            keys=keys,
            model=active_model,
            ollama_model=ollama_model,
        )
        return self.get_config_status()

    def get_config_status(self) -> Dict[str, Any]:
        """Return full provider status for admin UI."""
        status = self._router.get_status()
        # Merge into legacy format for API compatibility
        return {
            "total_keys": status["openrouter"]["total_keys"],
            "active_model": status["openrouter"]["model"],
            "ollama_model": status["local"]["model"],
            "available_free_models": FREE_AI_MODELS,
            "key_pool": status["openrouter"]["key_pool"],
            "local_ai": {
                "status": status["local"]["status"].upper(),
                "endpoint": status["local"]["endpoint"],
                "model": status["local"]["model"],
                "installed_models": status["local"]["installed_models"],
                "mode": status["local"]["mode"],
                "circuit": status["local"]["circuit"],
            },
            "cloud_ai": {
                "status": status["openrouter"]["status"].upper(),
                "model": status["openrouter"]["model"],
                "total_keys": status["openrouter"]["total_keys"],
                "circuit": status["openrouter"]["circuit"],
                "sensitivity_restriction": status["openrouter"]["sensitivity_restriction"],
            },
            "routing_policy": status["routing_policy"],
        }

    def query_with_failover(
        self,
        prompt: str,
        system_instruction: str = "You are VectorNet AI Security Auditor.",
        sensitivity: str = "high",
        task_type: str = "complex_reasoning",
    ) -> Dict[str, Any]:
        """
        Execute AI query with intelligent provider routing and automatic fallback.

        Args:
            prompt: The user/audit prompt
            system_instruction: System-level instruction for the model
            sensitivity: Data sensitivity level (low/medium/high/critical)
                         Defaults to 'high' — configs should be assumed sensitive
            task_type: Type of reasoning needed

        Returns:
            Dict with: success, provider, model, content, failover_log
        """
        result = self._router.route(
            prompt=prompt,
            system_instruction=system_instruction,
            sensitivity=sensitivity,
            task_type=task_type,
            max_tokens=850,
            temperature=0.2,
        )

        # Normalize to legacy format expected by orchestrator.py
        if not result.get("success") or not result.get("content"):
            # All providers failed — return sentinel value that orchestrator detects
            return {
                "success": True,   # Return True so orchestrator uses deterministic fallback
                "provider": result.get("provider", "DETERMINISTIC_ONLY"),
                "model": result.get("model", self.ollama_model),
                "content": "",     # Empty → orchestrator will use deterministic report
                "failover_log": result.get("failover_log", []),
                "used_key_index": None,
            }

        return {
            "success": True,
            "provider": result["provider"],
            "model": result["model"],
            "content": result["content"],
            "failover_log": result.get("failover_log", []),
            "used_key_index": result.get("used_key_index", "LOCAL"),
            "latency_ms": result.get("latency_ms", 0),
            "input_tokens": result.get("input_tokens", 0),
            "output_tokens": result.get("output_tokens", 0),
        }


# Shared singleton — maintains backward compatibility
ai_engine = AILLMEngine()
