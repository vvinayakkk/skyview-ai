"""
Centralized Configuration Management

Loads and validates all environment variables in one place.
Supports comma-separated GROQ_API_KEYS for multi-key load balancing.

Root cause of the old bug: class-level attributes (e.g. GROQ_API_KEYS = [...])
are evaluated at class *definition* time, not instantiation time. If any other
module imported Settings before load_dotenv() had run, the env vars would be
empty. Moved everything into __init__ so all os.getenv() calls happen at
instantiation time, guaranteed after load_dotenv().
"""

import os
from pathlib import Path
from functools import lru_cache
from typing import List, Optional

from dotenv import load_dotenv

# Strictly load the skyview/.env file.
_CONFIG_DIR = Path(__file__).resolve().parent
_SKYVIEW_DIR = _CONFIG_DIR.parent

_env_path = _SKYVIEW_DIR / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=True)


class Settings:
    """Configuration settings loaded from environment variables."""

    def __init__(self):
        # ==================== API ====================
        self.API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
        self.API_PORT: int = int(os.getenv("API_PORT", "8000"))
        self.API_WORKERS: int = int(os.getenv("API_WORKERS", "4"))
        self.DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

        # ==================== DATABASE ====================
        self.DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
        self.DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))
        self.DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        self.DB_POOL_PRE_PING: bool = os.getenv("DB_POOL_PRE_PING", "True").lower() == "true"
        self.DB_ECHO: bool = os.getenv("DB_ECHO", "False").lower() == "true"
        self.DB_FALLBACK_SQLITE: str = os.getenv("DB_FALLBACK_SQLITE", "sqlite:///sensor_data.db")

        # ==================== MQTT ====================
        self.MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
        self.MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
        self.MQTT_USERNAME: Optional[str] = os.getenv("MQTT_USERNAME")
        self.MQTT_PASSWORD: Optional[str] = os.getenv("MQTT_PASSWORD")
        self.MQTT_KEEPALIVE: int = int(os.getenv("MQTT_KEEPALIVE", "60"))
        self.MQTT_RECONNECT_DELAY: int = int(os.getenv("MQTT_RECONNECT_DELAY", "5"))

        # ==================== SENSORS ====================
        self.STATION_ID: str = os.getenv("STATION_ID", "WS01")
        self.SENSOR_DATA_MIN_INTERVAL: int = int(os.getenv("SENSOR_DATA_MIN_INTERVAL", "8"))

        # ==================== LLM & WORKFLOW ====================
        # Accepts GROQ_API_KEYS="key1,key2,key3" or single GROQ_API_KEY
        _groq_raw: str = os.getenv("GROQ_API_KEYS", "") or os.getenv("GROQ_API_KEY", "")
        # Strip surrounding quotes that some dotenv implementations leave in
        _groq_raw = _groq_raw.strip().strip('"').strip("'")
        self.GROQ_API_KEYS: List[str] = [k.strip() for k in _groq_raw.split(",") if k.strip()]
        self.GROQ_API_KEY: Optional[str] = self.GROQ_API_KEYS[0] if self.GROQ_API_KEYS else None
        self.LLM_MODEL: str = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
        self.LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "30"))
        self.GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
        self.GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        # ==================== TWILIO / WHATSAPP ====================
        self.TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
        self.TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
        self.TWILIO_WHATSAPP_NUMBER: Optional[str] = os.getenv("TWILIO_WHATSAPP_NUMBER")
        self.TWILIO_ALERT_RECIPIENT: str = os.getenv("TWILIO_ALERT_RECIPIENT", "")

        # ==================== EXTERNAL APIS ====================
        self.DATAGOV_API_KEY: str = os.getenv("DATAGOV_API_KEY", "")
        self.MANDI_RESOURCE_ID: str = os.getenv(
            "MANDI_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070"
        )
        self.VAPI_AI_API_KEY: Optional[str] = os.getenv("VAPI_AI_API_KEY")
        self.VAPI_ASSISTANT_ID: str = os.getenv("VAPI_ASSISTANT_ID", "default_assistant_id")
        self.SARVAM_AI_API_KEY: Optional[str] = os.getenv("SARVAM_AI_API_KEY")

        # ==================== FRONTEND ====================
        self.FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
        _cors_raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,https://vvinayakkk.github.io"
        )
        self.CORS_ORIGINS: List[str] = [
            o.strip() for o in _cors_raw.split(",") if o.strip() and o.strip() != "*"
        ]

        # ==================== LOGGING ====================
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
        self.LOG_FORMAT: str = os.getenv(
            "LOG_FORMAT", "%(asctime)s [%(name)s] %(levelname)s: %(message)s"
        )

        # ==================== FEATURES ====================
        self.ENABLE_MQTT: bool = os.getenv("ENABLE_MQTT", "True").lower() == "true"
        self.ENABLE_FPGA: bool = os.getenv("ENABLE_FPGA", "False").lower() == "true"
        self.FPGA_PORT: str = os.getenv("FPGA_PORT", "COM4")
        self.ENABLE_LLM_WORKFLOW: bool = os.getenv("ENABLE_LLM_WORKFLOW", "True").lower() == "true"

    def get_database_url(self) -> str:
        """Get the database URL, with fallback to SQLite if PostgreSQL is not configured."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if "neon.tech" in url and "sslmode" not in url:
                url += ("&" if "?" in url else "?") + "sslmode=require"
            return url
        return self.DB_FALLBACK_SQLITE

    def validate(self) -> List[str]:
        """Validate required config. Returns list of warnings (empty = all good)."""
        errors = []
        if not self.DATABASE_URL and not self.DEBUG:
            errors.append(
                "DATABASE_URL not set; using SQLite fallback (not recommended for production)"
            )
        if self.ENABLE_MQTT and not self.MQTT_BROKER:
            errors.append("MQTT_BROKER required when ENABLE_MQTT=True")
        if self.ENABLE_LLM_WORKFLOW and not self.GROQ_API_KEY:
            errors.append("GROQ_API_KEY required when ENABLE_LLM_WORKFLOW=True")
        if self.TWILIO_ACCOUNT_SID and not self.TWILIO_AUTH_TOKEN:
            errors.append("TWILIO_AUTH_TOKEN required if TWILIO_ACCOUNT_SID is set")
        return errors

    def print_config(self, mask_secrets: bool = True) -> None:
        """Print current configuration (masks secrets by default)."""
        print("\n" + "=" * 60)
        print("📋 CONFIGURATION")
        print("=" * 60)
        config_vars = [
            ("API_HOST", self.API_HOST),
            ("API_PORT", self.API_PORT),
            ("DATABASE_URL", f"...{self.DATABASE_URL[-30:]}" if self.DATABASE_URL and mask_secrets else self.DATABASE_URL),
            ("GROQ_KEYS_COUNT", len(self.GROQ_API_KEYS)),
            ("MQTT_BROKER", self.MQTT_BROKER),
            ("STATION_ID", self.STATION_ID),
            ("ENABLE_MQTT", self.ENABLE_MQTT),
            ("ENABLE_LLM", self.ENABLE_LLM_WORKFLOW),
            ("DEBUG", self.DEBUG),
            ("LOG_LEVEL", self.LOG_LEVEL),
        ]
        for key, value in config_vars:
            print(f"  {key:20} = {value}")
        print("=" * 60 + "\n")


@lru_cache()
def get_settings() -> Settings:
    """Get settings instance (cached singleton). Called after load_dotenv()."""
    return Settings()