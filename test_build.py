"""Checks for catalogue input and generated search-engine output."""
import copy
import json
import unittest
from pathlib import Path

import build


class CatalogueBuildTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((Path(__file__).parent / "site.config.json").read_text())

    def test_unique_catalogue_and_sitemap_scope(self):
        games = build.validate_config(self.config)
        urls = build.sitemap_urls(self.config, games)
        self.assertEqual(len(urls), len(set(urls)))
        self.assertIn("https://donair.funapps.ca/", urls)
        self.assertIn("https://clams.funapps.ca/", urls)
        self.assertIn("https://funapps.ca/packet-trace/", urls)
        self.assertTrue(all("netlify.app" not in url for url in urls))
        expected_play = sum(bool(game.get("include_play_url_in_sitemap")) for game in games)
        self.assertEqual(len(games) + 2 + expected_play, len(urls))

    def test_duplicate_game_rejected(self):
        self.config["games"].append(copy.deepcopy(self.config["games"][0]))
        with self.assertRaisesRegex(ValueError, "Duplicate game slug"):
            build.validate_config(self.config)

    def test_duplicate_play_url_rejected(self):
        self.config["games"][1]["url"] = self.config["games"][0]["url"]
        with self.assertRaisesRegex(ValueError, "Duplicate game URL"):
            build.validate_config(self.config)

    def test_unsafe_url_and_slug_rejected(self):
        for url in ("javascript:alert(1)", "https://user:password@example.com/", "http://example.com/"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                build.validate_url(url, "game")
        self.config["games"][0]["slug"] = "../../outside"
        with self.assertRaisesRegex(ValueError, "Invalid game slug"):
            build.validate_config(self.config)

    def test_html_and_structured_data_escaped(self):
        game = copy.deepcopy(self.config["games"][0])
        game["name"] = 'Name <script>alert("x")</script>'
        game["description"] = '</script><img src=x onerror="alert(1)">'
        page = build.detail_page(self.config, game, [game])
        self.assertNotIn('<img src=x', page)
        self.assertIn('&lt;script&gt;', page)
        self.assertIn('\\u003c/script\\u003e', page)

    def test_draft_game_excluded(self):
        self.config["games"][0]["published"] = False
        games = build.validate_config(self.config)
        self.assertNotIn("donair-dash", [game["slug"] for game in games])


if __name__ == "__main__":
    unittest.main()
