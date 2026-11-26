"""Regression checks for inline SVG replacement and portable nested game pages."""
from html.parser import HTMLParser
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts import game_favicons


class GameFaviconTests(unittest.TestCase):
    def test_inline_svg_attributes_do_not_leave_broken_markup(self):
        page = '''<html><head><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text>🦞</text></svg>"><title>Game</title></head><body><script>const marker = '<link rel="icon">';</script></body></html>'''
        result = game_favicons.add_icons(page)
        self.assertNotIn('data:image', result)
        self.assertIn('<title>Game</title>', result)
        self.assertIn("<script>const marker = '<link rel=\"icon\">';</script>", result)
        self.assertEqual(result.count('href="favicon.png"'), 1)
        # Repeated builds must not accumulate declarations.
        repeated = game_favicons.add_icons(result)
        self.assertEqual(repeated, result)
        self.assertEqual(repeated.count('href="favicon.png"'), 1)
        self.assertEqual(repeated.count('href="favicon.ico"'), 1)

    def test_nested_pages_resolve_icons_in_release_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            assets = root / 'game-icons' / 'sample'
            assets.mkdir(parents=True)
            for name in game_favicons.ICON_FILES:
                (assets / name).write_bytes(name.encode())
            release = root / 'release'
            nested = release / 'modes' / 'classic'
            nested.mkdir(parents=True)
            (release / 'index.html').write_text('<html><head></head></html>')
            (nested / 'index.html').write_text('<html><head></head></html>')
            with patch.object(game_favicons, 'ROOT', root):
                game_favicons.apply_favicons('sample', release)
            self.assertIn('href="../../favicon.png"', (nested / 'index.html').read_text())
            self.assertIn('href="favicon.png"', (release / 'index.html').read_text())
            for name in game_favicons.ICON_FILES:
                self.assertEqual((release / name).read_bytes(), name.encode())

    def test_missing_assets_stop_packaging(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(game_favicons, 'ROOT', Path(directory)):
                with self.assertRaisesRegex(ValueError, 'missing game-icons'):
                    game_favicons.apply_favicons('unknown', Path(directory))


if __name__ == '__main__':
    unittest.main()
