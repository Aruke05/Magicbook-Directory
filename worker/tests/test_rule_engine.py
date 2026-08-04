import unittest

from app.rule_engine import chat_is_allowed, matches_rule, normalize_text


class RuleEngineTest(unittest.TestCase):
    def test_normalizes_full_width_case_spaces_and_punctuation(self) -> None:
        self.assertEqual(
            normalize_text("ＰＡＹ ment，成功", ignore_case=True, ignore_whitespace=True, ignore_punctuation=True),
            "payment成功",
        )

    def test_contains_any_keyword(self) -> None:
        rule = {"keywords": ["支付成功", "payment successful"], "matchType": "contains", "keywordMode": "any", "ignoreCase": True}
        self.assertTrue(matches_rule(rule, "Status: PAYMENT SUCCESSFUL"))

    def test_requires_all_keywords(self) -> None:
        rule = {"keywords": ["success", "12345"], "matchType": "contains", "keywordMode": "all", "ignoreCase": True}
        self.assertFalse(matches_rule(rule, "payment success"))
        self.assertTrue(matches_rule(rule, "payment success, order 12345"))

    def test_regex(self) -> None:
        rule = {"keywords": [r"order\s+#?\d+"], "matchType": "regex", "keywordMode": "any", "ignoreCase": True}
        self.assertTrue(matches_rule(rule, "ORDER #123456"))

    def test_rule_chat_ids_override_global_ids(self) -> None:
        self.assertTrue(chat_is_allowed({"allowedChatIds": ["-2"]}, "-2", frozenset({"-1"})))
        self.assertFalse(chat_is_allowed({"allowedChatIds": ["-2"]}, "-1", frozenset({"-1"})))


if __name__ == "__main__":
    unittest.main()
