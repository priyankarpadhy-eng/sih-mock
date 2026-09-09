"""
VectorNet External Services & Data Access
=========================================
Dynamic skills loading, Firestore/Firebase integration,
and syslog telemetry aggregator.
"""

from backend.app.services.skills_service import AgenticSkillsEngine, skills_engine
from backend.app.services.firestore_service import FirestoreStore, firestore_store
from backend.app.services.telemetry_service import CentralizedLogAggregator, AssetInventoryEngine, log_aggregator_engine, inventory_engine

__all__ = [
    "AgenticSkillsEngine",
    "skills_engine",
    "FirestoreStore",
    "firestore_store",
    "CentralizedLogAggregator",
    "AssetInventoryEngine",
    "log_aggregator_engine",
    "inventory_engine"
]
