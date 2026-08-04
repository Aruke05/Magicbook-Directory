from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class OcrLine:
    text: str
    confidence: float


class OcrService:
    def __init__(self, lang: str) -> None:
        self.lang = lang
        self._engine: Any = None

    def _get_engine(self) -> Any:
        if self._engine is None:
            from paddleocr import PaddleOCR
            self._engine = PaddleOCR(
                lang=self.lang,
                use_doc_orientation_classify=True,
                use_doc_unwarping=False,
                use_textline_orientation=True,
                # PaddlePaddle 3.3.x can fail in the CPU oneDNN/PIR path when
                # running PaddleOCR 3.x models. Use the standard CPU kernels.
                enable_mkldnn=False,
            )
        return self._engine

    def extract(self, image_path: Path) -> list[OcrLine]:
        result = self._get_engine().predict(str(image_path))
        lines: list[OcrLine] = []
        for page in result:
            payload = getattr(page, "json", page)
            if callable(payload):
                payload = payload()
            if isinstance(payload, dict) and isinstance(payload.get("res"), dict):
                payload = payload["res"]
            if isinstance(payload, dict):
                texts = payload.get("rec_texts", [])
                scores = payload.get("rec_scores", [])
                for index, text in enumerate(texts):
                    confidence = float(scores[index]) if index < len(scores) else 1.0
                    if str(text).strip():
                        lines.append(OcrLine(str(text).strip(), confidence))
                continue
            if isinstance(payload, list):
                for item in payload:
                    if isinstance(item, (list, tuple)) and len(item) > 1 and isinstance(item[1], (list, tuple)) and item[1]:
                        text = str(item[1][0]).strip()
                        confidence = float(item[1][1]) if len(item[1]) > 1 else 1.0
                        if text:
                            lines.append(OcrLine(text, confidence))
        return lines
