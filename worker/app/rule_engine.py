from __future__ import annotations

import re
import unicodedata
from typing import Any


def normalize_text(text: str, *, ignore_case: bool, ignore_whitespace: bool, ignore_punctuation: bool) -> str:
    result = unicodedata.normalize("NFKC", text)
    if ignore_case:
        result = result.casefold()
    if ignore_whitespace:
        result = "".join(character for character in result if not character.isspace())
    if ignore_punctuation:
        result = "".join(character for character in result if not unicodedata.category(character).startswith("P"))
    return result.strip()


def matches_rule(rule: dict[str, Any], text: str) -> bool:
    keywords = [str(item) for item in rule.get("keywords", []) if str(item)]
    if not keywords or not text:
        return False
    ignore_case = bool(rule.get("ignoreCase", True))
    candidate = normalize_text(
        text,
        ignore_case=ignore_case,
        ignore_whitespace=bool(rule.get("ignoreWhitespace", False)),
        ignore_punctuation=bool(rule.get("ignorePunctuation", False)),
    )
    match_type = rule.get("matchType", "contains")
    results: list[bool] = []
    for keyword in keywords:
        if match_type == "regex":
            flags = re.IGNORECASE if ignore_case else 0
            try:
                results.append(re.search(keyword, candidate, flags=flags) is not None)
            except re.error:
                results.append(False)
            continue
        normalized_keyword = normalize_text(
            keyword,
            ignore_case=ignore_case,
            ignore_whitespace=bool(rule.get("ignoreWhitespace", False)),
            ignore_punctuation=bool(rule.get("ignorePunctuation", False)),
        )
        results.append(candidate == normalized_keyword if match_type == "exact" else normalized_keyword in candidate)
    return all(results) if rule.get("keywordMode") == "all" else any(results)


def chat_is_allowed(rule: dict[str, Any], chat_id: str, global_allowed: frozenset[str]) -> bool:
    rule_allowed = frozenset(str(item) for item in rule.get("allowedChatIds", []) if str(item))
    effective = rule_allowed or global_allowed
    return not effective or chat_id in effective
