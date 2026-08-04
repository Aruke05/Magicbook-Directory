from __future__ import annotations

import time
from typing import Any
import httpx


class RulesClient:
    def __init__(self, client: httpx.AsyncClient, url: str, secret: str, refresh_seconds: int) -> None:
        self.client = client
        self.url = url
        self.secret = secret
        self.refresh_seconds = refresh_seconds
        self._rules: list[dict[str, Any]] = []
        self._loaded_at = 0.0

    async def get_rules(self) -> list[dict[str, Any]]:
        now = time.monotonic()
        if self._rules and now - self._loaded_at < self.refresh_seconds:
            return self._rules
        response = await self.client.get(self.url, headers={"Authorization": f"Bearer {self.secret}"})
        response.raise_for_status()
        payload = response.json()
        rules = payload.get("rules", [])
        if not isinstance(rules, list):
            raise ValueError("Rules API returned an invalid payload")
        self._rules = sorted(rules, key=lambda item: int(item.get("priority", 0)), reverse=True)
        self._loaded_at = now
        return self._rules
