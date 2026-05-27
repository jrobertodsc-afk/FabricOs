import secrets
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "FabricOS API"
    APP_VERSION: str = "2026.05"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(64)  # Gerado automaticamente como fallback seguro
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./fabricos.db"

    # CORS — lista separada por vírgula no .env
    # Ex: CORS_ORIGINS=http://localhost:5173,https://meusite.com.br
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Trello Integration
    TRELLO_API_KEY: str = ""
    TRELLO_TOKEN: str = ""
    TRELLO_BOARD_URL: str = ""
    TRELLO_WEBHOOK_URL: str = ""
    # Telegram Integration
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
