"""
Backward compatibility proxy for ConfigNormalizer.
Points to canonical implementation in backend.app.engines.normalizer.
"""
from backend.app.engines.normalizer import ConfigNormalizer

__all__ = ["ConfigNormalizer"]
