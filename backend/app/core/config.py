"""
VectorNet Application Configuration
===================================
Loads environment variables, service defaults, and feature flags.
"""

import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "VectorNet Agentic Cyber Command API Engine"
    VERSION: str = "2.0.0"
    SIH_PROBLEM_STATEMENT: str = "26155"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # AI OpenRouter Settings
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    DEFAULT_AI_MODEL: str = os.getenv("DEFAULT_AI_MODEL", "google/gemini-2.0-flash-lite-preview-02-05:free")
    
    # Firebase Settings
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "vectornet-sih-26155")
    FIREBASE_CREDENTIALS_JSON: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    SKILLS_DIR: str = os.path.join(BASE_DIR, "skills")
    VENDORS_DIR: str = os.path.join(SKILLS_DIR, "vendors")
    DATA_DIR: str = os.path.join(BASE_DIR, "data")


settings = Settings()
