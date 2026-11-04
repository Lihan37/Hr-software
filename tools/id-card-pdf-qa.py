"""Inspect rendered synthetic QA PDFs, not just HTML corner CSS.

Uses the existing ignored QA-only PyMuPDF installation; no production data.
"""
import sys
from pathlib import Path

qa = Path(__file__).resolve().parent / '.dashboard-qa'
sys.path.insert(0, str(qa / 'python'))
import pymupdf  # noqa: E402


def close(actual, expected):
    return all(abs(a - b) <= 8 for a, b in zip(actual, expected))


for name in ['id-card-output.pdf', 'id-card-output-no-background.pdf']:
    with pymupdf.open(qa / name) as document:
        assert len(document) == 2, (name, 'Expected front/back only')
        assert 'Ayesha Rahman' in document[0].get_text()
        for index, page in enumerate(document):
            assert abs(page.rect.width * 25.4 / 72 - 54.11) < .3
            assert abs(page.rect.height * 25.4 / 72 - 86.13) < .3
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(3, 3), alpha=False)
            points = [(2, 2), (pixmap.width - 3, 2),
                      (2, pixmap.height - 3), (pixmap.width - 3, pixmap.height - 3)]
            colors = [pixmap.pixel(x, y)[:3] for x, y in points]
            red = (153, 27, 63)
            white = (255, 255, 255)
            expected = [red] * 4 if index == 0 else [white, white, red, red]
            assert all(close(a, b) for a, b in zip(colors, expected)), (name, index, colors)
            if index == 1:
                # The back footer stays at its original height, not a 4 mm tab.
                y = pixmap.height - round(3.5 / 25.4 * 72 * 3)
                assert close(pixmap.pixel(2, y)[:3], white)
            print(name, 'front' if index == 0 else 'back', 'corner pixels OK:', colors)
