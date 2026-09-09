import os
import json
import requests
import time
from typing import List, Dict, Any, Optional

# Top Recommended Free Models on OpenRouter
FREE_AI_MODELS = [
  {
    "id": "google/gemini-2.0-flash-lite-preview-02-05:free",
    "name": "Google Gemini 2.0 Flash Lite (Free)",
    "description": "Fastest & highest performance free AI model for compliance audits"
  },
  {
    "id": "meta-llama/llama-3.3-70b-instruct:free",
    "name": "Meta Llama 3.3 70B Instruct (Free)",
    "description": "High-capacity 70B open-source reasoning model"
  },
  {
    "id": "deepseek/deepseek-r1:free",
    "name": "DeepSeek R1 Reasoning (Free)",
    "description": "State-of-the-art chain-of-thought analysis engine"
  },
  {
    "id": "qwen/qwen-2.5-coder-32b-instruct:free",
    "name": "Qwen 2.5 Coder 32B (Free)",
    "description": "Specialized open-source model for network CLI scripts"
  },
  {
    "id": "mistralai/mistral-7b-instruct:free",
    "name": "Mistral 7B Instruct (Free)",
    "description": "Lightweight open-source instruction follower"
  }
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
KEY_POOL_FILE = os.path.join(DATA_DIR, "llm_key_pool.json")

class MultiKeyAIEngine:
    """
    OpenRouter Multi-Key Failover AI Engine.
    Manages a pool of 5-6 API keys and top free LLM models.
    Supports automatic key failover on rate-limits (HTTP 429), token exhaustion, or errors.
    """

    def __init__(self):
        self.api_keys: List[str] = []
        self.active_model: str = "google/gemini-2.0-flash-lite-preview-02-05:free"
        self._load_keys()

    def _load_keys(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(KEY_POOL_FILE):
            try:
                with open(KEY_POOL_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.api_keys = data.get("api_keys", [])
                    self.active_model = data.get("active_model", self.active_model)
            except Exception:
                self.api_keys = []
        
        # Fallback to env vars if pool is empty
        if not self.api_keys:
            env_keys = os.environ.get("OPENROUTER_API_KEYS", os.environ.get("OPENROUTER_API_KEY", ""))
            if env_keys:
                self.api_keys = [k.strip() for k in env_keys.split(",") if k.strip()]

    def _save_keys(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(KEY_POOL_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "api_keys": self.api_keys,
                "active_model": self.active_model,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }, f, indent=2)

    def set_key_pool(self, keys: List[str], active_model: Optional[str] = None) -> Dict[str, Any]:
        cleaned = [k.strip() for k in keys if k and k.strip()]
        self.api_keys = cleaned
        if active_model:
            self.active_model = active_model
        self._save_keys()
        return self.get_config_status()

    def get_config_status(self) -> Dict[str, Any]:
        masked_keys = []
        for idx, k in enumerate(self.api_keys):
            if len(k) > 12:
                masked = f"{k[:8]}...{k[-4:]}"
            else:
                masked = "sk-or-v1-***"
            masked_keys.append({
                "index": idx + 1,
                "key_preview": masked,
                "status": "READY"
            })

        return {
            "total_keys": len(self.api_keys),
            "active_model": self.active_model,
            "available_free_models": FREE_AI_MODELS,
            "key_pool": masked_keys
        }

    def query_with_failover(self, prompt: str, system_instruction: str = "You are VectorNet AI Security Auditor.") -> Dict[str, Any]:
        """
        Executes query against OpenRouter using multi-key failover.
        If Key #1 hits rate limits or token exhaustion, automatically fails over to Key #2, #3, etc.
        """
        if not self.api_keys:
            return {
                "success": False,
                "failover_log": ["No OpenRouter API keys in pool. Fallback to local rule engine."],
                "used_key_index": None,
                "model": self.active_model,
                "content": "No API keys configured in pool. Operating in offline rule fallback mode."
            }

        failover_logs = []
        url = "https://openrouter.ai/api/v1/chat/completions"

        for idx, key in enumerate(self.api_keys):
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://vectornet.io",
                "X-Title": "VectorNet Agentic Platform"
            }

            payload = {
                "model": self.active_model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2
            }

            try:
                res = requests.post(url, headers=headers, json=payload, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    content = choices[0]["message"]["content"] if choices else "No content returned."
                    failover_logs.append(f"✅ Success on Key #{idx + 1}")
                    return {
                        "success": True,
                        "used_key_index": idx + 1,
                        "failover_log": failover_logs,
                        "model": self.active_model,
                        "content": content
                    }
                else:
                    failover_logs.append(f"⚠️ Key #{idx + 1} returned HTTP {res.status_code} ({res.text[:100]}). Failing over to Key #{idx + 2}...")
            except Exception as e:
                failover_logs.append(f"⚠️ Key #{idx + 1} request error: {str(e)}. Failing over to Key #{idx + 2}...")

        return {
            "success": False,
            "failover_log": failover_logs,
            "used_key_index": None,
            "model": self.active_model,
            "content": f"All {len(self.api_keys)} OpenRouter API keys in pool failed or exhausted quota. Fallback to local rule evaluation."
        }

ai_engine = MultiKeyAIEngine()
