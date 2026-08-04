from dataclasses import dataclass
from pathlib import Path
import os


def _integer(name: str, default: int, minimum: int = 0) -> int:
    value = int(os.getenv(name, str(default)))
    if value < minimum:
        raise ValueError(f"{name} must be >= {minimum}")
    return value


def _chat_ids(value: str) -> frozenset[str]:
    normalized = value.replace("，", ",").replace("\n", ",")
    return frozenset(item.strip() for item in normalized.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    bot_token: str
    rules_api_url: str
    internal_api_secret: str
    allowed_chat_ids: frozenset[str]
    ocr_lang: str
    ocr_max_file_bytes: int
    rule_refresh_seconds: int
    poll_timeout_seconds: int
    worker_data_dir: Path
    reset_webhook_on_start: bool

    @classmethod
    def from_env(cls) -> "Settings":
        bot_token = os.getenv("BOT_TOKEN", "").strip()
        internal_api_secret = os.getenv("INTERNAL_API_SECRET", "").strip()
        if not bot_token:
            raise ValueError("BOT_TOKEN is required")
        if len(internal_api_secret) < 32:
            raise ValueError("INTERNAL_API_SECRET must be at least 32 characters")
        data_dir = Path(os.getenv("WORKER_DATA_DIR", "/app/data/worker"))
        data_dir.mkdir(parents=True, exist_ok=True)
        return cls(
            bot_token=bot_token,
            rules_api_url=os.getenv("RULES_API_URL", "http://web:3000/api/internal/auto-replies/rules"),
            internal_api_secret=internal_api_secret,
            allowed_chat_ids=_chat_ids(os.getenv("ALLOWED_CHAT_IDS", "")),
            ocr_lang=os.getenv("OCR_LANG", "ch"),
            ocr_max_file_bytes=_integer("OCR_MAX_FILE_MB", 10, 1) * 1024 * 1024,
            rule_refresh_seconds=_integer("RULE_REFRESH_SECONDS", 15, 1),
            poll_timeout_seconds=_integer("POLL_TIMEOUT_SECONDS", 30, 1),
            worker_data_dir=data_dir,
            reset_webhook_on_start=os.getenv("RESET_WEBHOOK_ON_START", "true").lower() in {"1", "true", "yes"},
        )
