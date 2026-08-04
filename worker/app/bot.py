from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
import tempfile
import time
from typing import Any
import httpx

from .config import Settings
from .ocr_service import OcrLine, OcrService
from .rule_engine import chat_is_allowed, matches_rule
from .rules_client import RulesClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
# httpx logs the full Telegram Bot API URL at INFO level. The bot token is part
# of that URL, so keep transport logs at WARNING and above.
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("telegram-ocr-worker")


class TelegramOcrBot:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.api_base = f"https://api.telegram.org/bot{settings.bot_token}"
        self.file_base = f"https://api.telegram.org/file/bot{settings.bot_token}"
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=15.0))
        self.rules = RulesClient(self.client, settings.rules_api_url, settings.internal_api_secret, settings.rule_refresh_seconds)
        self.ocr = OcrService(settings.ocr_lang)
        self.offset_path = settings.worker_data_dir / "telegram-offset.json"
        self.offset = self._load_offset()
        self.cooldowns: dict[tuple[str, str], float] = {}

    def _load_offset(self) -> int | None:
        try:
            return int(json.loads(self.offset_path.read_text(encoding="utf-8"))["offset"])
        except (FileNotFoundError, KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None

    def _save_offset(self, offset: int) -> None:
        temporary = self.offset_path.with_suffix(".tmp")
        temporary.write_text(json.dumps({"offset": offset}), encoding="utf-8")
        temporary.replace(self.offset_path)
        self.offset = offset

    async def api(self, method: str, payload: dict[str, Any] | None = None) -> Any:
        response = await self.client.post(f"{self.api_base}/{method}", json=payload or {})
        response.raise_for_status()
        result = response.json()
        if not result.get("ok"):
            raise RuntimeError(result.get("description", f"Telegram {method} failed"))
        return result.get("result")

    async def download_image(self, message: dict[str, Any]) -> Path | None:
        file_info: dict[str, Any] | None = None
        photos = message.get("photo") or []
        if photos:
            file_info = photos[-1]
        document = message.get("document") or {}
        if not file_info and str(document.get("mime_type", "")).startswith("image/"):
            file_info = document
        if not file_info:
            return None
        if int(file_info.get("file_size", 0)) > self.settings.ocr_max_file_bytes:
            logger.warning("image_too_large chat_id=%s message_id=%s", message["chat"]["id"], message["message_id"])
            return None
        remote = await self.api("getFile", {"file_id": file_info["file_id"]})
        file_path = remote.get("file_path")
        if not file_path:
            return None
        suffix = Path(file_path).suffix or ".jpg"
        response = await self.client.get(f"{self.file_base}/{file_path}")
        response.raise_for_status()
        if len(response.content) > self.settings.ocr_max_file_bytes:
            return None
        with tempfile.NamedTemporaryFile(prefix="telegram-ocr-", suffix=suffix, dir=self.settings.worker_data_dir, delete=False) as handle:
            handle.write(response.content)
            return Path(handle.name)

    async def process_message(self, message: dict[str, Any]) -> None:
        sender = message.get("from") or {}
        if sender.get("is_bot"):
            return
        chat_id = str(message.get("chat", {}).get("id", ""))
        if not chat_id or (self.settings.allowed_chat_ids and chat_id not in self.settings.allowed_chat_ids):
            return
        message_id = message.get("message_id")
        plain_text = str(message.get("text") or "").strip()
        caption = str(message.get("caption") or "").strip()
        is_image = bool(message.get("photo")) or str((message.get("document") or {}).get("mime_type", "")).startswith("image/")
        if not plain_text and not is_image:
            return

        ocr_lines: list[OcrLine] = []
        image_path: Path | None = None
        started = time.monotonic()
        try:
            if is_image:
                image_path = await self.download_image(message)
                if image_path:
                    ocr_lines = await asyncio.to_thread(self.ocr.extract, image_path)
            rules = await self.rules.get_rules()
            for rule in rules:
                source = rule.get("source", "both")
                if is_image and source not in {"image", "both"}:
                    continue
                if not is_image and source not in {"text", "both"}:
                    continue
                if not chat_is_allowed(rule, chat_id, self.settings.allowed_chat_ids):
                    continue
                minimum = float(rule.get("minOcrConfidence", 65)) / 100.0
                recognized = "\n".join(line.text for line in ocr_lines if line.confidence >= minimum)
                candidate = plain_text if not is_image else "\n".join(item for item in (caption, recognized) if item)
                if not matches_rule(rule, candidate):
                    continue
                cooldown_key = (chat_id, str(rule["id"]))
                now = time.monotonic()
                if now < self.cooldowns.get(cooldown_key, 0):
                    continue
                await self.api("sendMessage", {
                    "chat_id": chat_id,
                    "text": rule["replyText"],
                    "reply_parameters": {"message_id": message_id},
                })
                self.cooldowns[cooldown_key] = now + int(rule.get("cooldownSeconds", 0))
                logger.info("rule_matched chat_id=%s message_id=%s rule_id=%s ocr_ms=%d", chat_id, message_id, rule["id"], int((time.monotonic() - started) * 1000))
                if rule.get("stopOnMatch", True):
                    break
        finally:
            if image_path:
                image_path.unlink(missing_ok=True)

    async def run(self) -> None:
        if self.settings.reset_webhook_on_start:
            await self.api("deleteWebhook", {"drop_pending_updates": False})
        identity = await self.api("getMe")
        logger.info("worker_started bot=@%s", identity.get("username", "unknown"))
        while True:
            try:
                updates = await self.api("getUpdates", {
                    "offset": self.offset,
                    "timeout": self.settings.poll_timeout_seconds,
                    "allowed_updates": ["message"],
                })
                for update in updates:
                    update_id = int(update["update_id"])
                    try:
                        message = update.get("message")
                        if message:
                            await self.process_message(message)
                    except Exception:
                        logger.exception("update_failed update_id=%s", update_id)
                    self._save_offset(update_id + 1)
            except Exception:
                logger.exception("poll_failed")
                await asyncio.sleep(3)

    async def close(self) -> None:
        await self.client.aclose()


async def main() -> None:
    bot = TelegramOcrBot(Settings.from_env())
    try:
        await bot.run()
    finally:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())
