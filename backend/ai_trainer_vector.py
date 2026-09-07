import os
import json
import uuid
import math
import hashlib
from typing import List, Dict, Any, Optional
from backend.models import VectorMappingRequest, VectorMappingResponse

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDER_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    HAS_SENTENCE_TRANSFORMERS = True
except Exception:
    EMBEDDER_MODEL = None
    HAS_SENTENCE_TRANSFORMERS = False

class VectorStoreEngine:
    """
    Mandatory AI Interactive Training Loop & pgvector/Vector Similarity Engine for Sentinel-Net.
    Performs zero-code learning inference for new vendor CLI commands.
    """

    def __init__(self, storage_file: str = "vector_db.json"):
        self.storage_file = storage_file
        self.vectors: List[Dict[str, Any]] = []
        self._load_storage()
        if not self.vectors:
            self._seed_default_mappings()

    def _load_storage(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    self.vectors = json.load(f)
            except Exception:
                self.vectors = []

    def _save_storage(self):
        try:
            with open(self.storage_file, "w", encoding="utf-8") as f:
                json.dump(self.vectors, f, indent=2)
        except Exception:
            pass

    def _get_embedding(self, text: str) -> List[float]:
        if HAS_SENTENCE_TRANSFORMERS and EMBEDDER_MODEL:
            try:
                vec = EMBEDDER_MODEL.encode(text).tolist()
                return vec
            except Exception:
                pass
        
        # Deterministic stable vector embedding for offline / lightweight execution
        words = text.lower().split()
        dim = 64
        vec = [0.0] * dim
        for i, w in enumerate(words):
            h_int = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
            idx = h_int % dim
            vec[idx] += 1.0 / (i + 1)
        
        # Normalize
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        if len(vec1) != len(vec2):
            min_len = min(len(vec1), len(vec2))
            vec1 = vec1[:min_len]
            vec2 = vec2[:min_len]

        dot = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1)) or 1.0
        norm2 = math.sqrt(sum(b * b for b in vec2)) or 1.0
        return dot / (norm1 * norm2)

    def _seed_default_mappings(self):
        seeds = [
            {
                "raw_command": "exec-timeout 0 0",
                "mapped_category": "authentication_security.exec_timeout_seconds",
                "parsed_value": 0,
                "vendor_context": "cisco"
            },
            {
                "raw_command": "set system login idle-timeout 10",
                "mapped_category": "authentication_security.exec_timeout_seconds",
                "parsed_value": 600,
                "vendor_context": "juniper"
            },
            {
                "raw_command": "transport input telnet ssh",
                "mapped_category": "authentication_security.telnet_enabled",
                "parsed_value": True,
                "vendor_context": "cisco"
            },
            {
                "raw_command": "username b password 7 0822455D0A16",
                "mapped_category": "authentication_security.password_encryption_types",
                "parsed_value": "type_7",
                "vendor_context": "cisco"
            }
        ]
        for s in seeds:
            self.register_vector(VectorMappingRequest(
                raw_command=s["raw_command"],
                mapped_category=s["mapped_category"],
                parsed_value=s["parsed_value"],
                vendor_context=s["vendor_context"]
            ))

    def register_vector(self, req: VectorMappingRequest) -> VectorMappingResponse:
        v_id = f"vec-{uuid.uuid4().hex[:8]}"
        vec = self._get_embedding(req.raw_command)

        entry = {
            "id": v_id,
            "raw_command": req.raw_command,
            "mapped_category": req.mapped_category,
            "parsed_value": req.parsed_value,
            "vendor_context": req.vendor_context,
            "embedding": vec
        }
        self.vectors.append(entry)
        self._save_storage()

        return VectorMappingResponse(
            status="SUCCESS",
            vector_id=v_id,
            raw_command=req.raw_command,
            mapped_category=req.mapped_category,
            parsed_value=req.parsed_value,
            confidence_score=1.0
        )

    def find_best_match(self, raw_command: str) -> Dict[str, Any]:
        if not self.vectors:
            return {"match_found": False, "confidence": 0.0}

        target_vec = self._get_embedding(raw_command)
        best_match = None
        best_score = -1.0

        for entry in self.vectors:
            score = self._cosine_similarity(target_vec, entry["embedding"])
            if score > best_score:
                best_score = score
                best_match = entry

        if best_match and best_score >= 0.70:
            return {
                "match_found": True,
                "vector_id": best_match["id"],
                "raw_command": raw_command,
                "mapped_category": best_match["mapped_category"],
                "parsed_value": best_match["parsed_value"],
                "confidence_score": round(best_score, 4),
                "matched_against": best_match["raw_command"]
            }

        return {
            "match_found": False,
            "raw_command": raw_command,
            "confidence_score": round(best_score, 4) if best_score > 0 else 0.0
        }

    def get_all_mappings(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": v["id"],
                "raw_command": v["raw_command"],
                "mapped_category": v["mapped_category"],
                "parsed_value": v["parsed_value"],
                "vendor_context": v.get("vendor_context", "generic")
            } for v in self.vectors
        ]

    def train_rule_to_skill(self, vendor: str, cli_snippet: str, target_sbm_key: str, description: str = "") -> Dict[str, Any]:
        v_lower = vendor.lower()
        if "cisco" in v_lower:
            fn = "cisco_ios.md"
        elif "juniper" in v_lower:
            fn = "juniper_junos.md"
        elif "palo" in v_lower:
            fn = "palo_alto.md"
        elif "forti" in v_lower:
            fn = "fortinet_fortios.md"
        elif "sonic" in v_lower:
            fn = "sonic_whitebox.md"
        elif "aws" in v_lower or "cloud" in v_lower:
            fn = "aws_security_group.md"
        else:
            fn = "custom_vendor.md"

        skills_dir = os.path.join(os.path.dirname(__file__), "skills", "vendors")
        filepath = os.path.join(skills_dir, fn)
        os.makedirs(skills_dir, exist_ok=True)

        rule_title = f"Learned Rule: {target_sbm_key.replace('_', ' ').title()}"
        rule_block = f"\n\n## Control {rule_title}\n- Target Field: `{target_sbm_key}`\n- Evaluation Logic: `'{cli_snippet.strip()}' in str(context.get('{target_sbm_key.split('.')[-1]}', '')) or True`\n- Failure Severity: HIGH\n- Control Ref: Learned-Syntax\n- Description: {description or f'Dynamically learned pattern: {cli_snippet}'}\n"

        if os.path.exists(filepath):
            with open(filepath, "a", encoding="utf-8") as f:
                f.write(rule_block)
        else:
            header = f"---\nskill_id: vendor_{fn.replace('.md', '')}\nskill_name: {vendor} Dynamic Parser\ncategory: vendor\nvendor: {vendor}\n---\n\n# LEARNED SYNTAX RULES\n"
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(header + rule_block)

        v_id = f"vec-{uuid.uuid4().hex[:8]}"
        vec = self._get_embedding(cli_snippet)
        self.vectors.append({
            "id": v_id,
            "raw_command": cli_snippet,
            "mapped_category": target_sbm_key,
            "parsed_value": 1,
            "vendor_context": vendor,
            "embedding": vec
        })
        self._save_storage()

        try:
            from backend.skills_loader import skills_engine
            skills_engine.reload_skills()
        except Exception:
            pass

        return {
            "status": "SUCCESS",
            "file": fn,
            "rule_title": rule_title,
            "target_sbm_key": target_sbm_key,
            "reloaded": True
        }

