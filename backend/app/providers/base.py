"""
VectorNet Provider Abstraction Layer
=====================================
Abstract base class and shared data structures for all LLM providers.
Every provider must implement this interface — no provider-specific logic
should exist outside of provider adapters.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ProviderStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    RATE_LIMITED = "rate_limited"
    UNAVAILABLE = "unavailable"
    AUTH_ERROR = "authentication_error"
    QUOTA_EXHAUSTED = "quota_exhausted"
    DISABLED = "disabled"


class CircuitState(str, Enum):
    CLOSED = "closed"       # Normal — requests flow through
    OPEN = "open"           # Tripped — no requests sent
    HALF_OPEN = "half_open" # Testing recovery — one probe request allowed


@dataclass
class ProviderCapabilities:
    reasoning: bool = False
    json_output: bool = True
    vision: bool = False
    large_context: bool = False
    streaming: bool = False
    structured_output: bool = False
    context_window: int = 4096


@dataclass
class ProviderLimits:
    rpm: int = 0          # Requests per minute (0 = unknown/unlimited)
    rpd: int = 0          # Requests per day
    tpm: int = 0          # Tokens per minute
    tpd: int = 0          # Tokens per day
    max_input_tokens: int = 4096
    max_output_tokens: int = 2048


@dataclass
class ProviderUsage:
    requests_today: int = 0
    tokens_today: int = 0
    requests_this_minute: int = 0
    tokens_this_minute: int = 0
    total_successes: int = 0
    total_failures: int = 0
    total_retries: int = 0
    total_fallbacks: int = 0
    last_latency_ms: float = 0.0


@dataclass
class ProviderHealth:
    provider_id: str = ""
    status: ProviderStatus = ProviderStatus.HEALTHY
    circuit_state: CircuitState = CircuitState.CLOSED
    consecutive_failures: int = 0
    last_success_ts: Optional[str] = None
    last_failure_ts: Optional[str] = None
    last_error: Optional[str] = None
    retry_after_ts: Optional[str] = None
    latency_ms: float = 0.0
    # Circuit breaker thresholds
    failure_threshold: int = 3       # Failures before OPEN
    recovery_timeout_s: int = 30     # Seconds before HALF_OPEN


@dataclass
class LLMRequest:
    prompt: str
    system_instruction: str = "You are VectorNet AI Security Auditor."
    task_type: str = "complex_reasoning"
    sensitivity: str = "medium"       # low | medium | high | critical
    max_tokens: int = 1024
    temperature: float = 0.2
    require_json: bool = False
    estimated_input_tokens: int = 0
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMResponse:
    success: bool
    content: str
    provider_id: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    failover_log: List[str] = field(default_factory=list)
    error: Optional[str] = None
    validation_passed: bool = True


class LLMProvider(ABC):
    """
    Abstract base class for all LLM providers.
    Provider-specific SDK details must remain inside implementations.
    Application code must only call this interface.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for this provider (e.g., 'local_ollama', 'openrouter')."""
        ...

    @abstractmethod
    def generate(self, request: LLMRequest) -> LLMResponse:
        """Execute a synchronous generation request."""
        ...

    @abstractmethod
    def health_check(self) -> ProviderHealth:
        """Check provider health and update internal circuit breaker state."""
        ...

    @abstractmethod
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for given text (approximate)."""
        ...

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        """Return the capabilities of this provider/model."""
        ...

    @abstractmethod
    def get_limits(self) -> ProviderLimits:
        """Return the rate/quota limits for this provider."""
        ...

    @abstractmethod
    def get_usage(self) -> ProviderUsage:
        """Return current usage counters."""
        ...

    def is_available(self) -> bool:
        """Quick availability check — can be overridden for efficiency."""
        health = self.health_check()
        return health.circuit_state != CircuitState.OPEN and health.status not in [
            ProviderStatus.UNAVAILABLE,
            ProviderStatus.AUTH_ERROR,
            ProviderStatus.DISABLED,
        ]

    def cloud_allowed_for(self, sensitivity: str) -> bool:
        """
        Override in subclasses that are cloud providers.
        Local providers always return True (sensitivity doesn't restrict local).
        Cloud providers return False for high/critical sensitivity.
        """
        return True  # Default: allow (local providers)
