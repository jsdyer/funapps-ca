"""Apply portable, game-specific favicon links to a static game release."""
from html.parser import HTMLParser
from pathlib import Path
import os
import shutil

ROOT = Path(__file__).resolve().parents[1]
ICON_FILES = ('favicon.png', 'favicon.ico', 'apple-touch-icon.png')


class IconLinks(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.lines = text.splitlines(keepends=True)
        self.ranges = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        rel = values.get('rel', '').lower().split()
        if tag == 'link' and ('icon' in rel or any(x.startswith('apple-touch-icon') for x in rel)):
            line, column = self.getpos()
            start = sum(map(len, self.lines[:line - 1])) + column
            self.ranges.append((start, start + len(self.get_starttag_text())))

    handle_startendtag = handle_starttag


def without_icons(text):
    parser = IconLinks(text)
    parser.feed(text)
    for start, end in reversed(parser.ranges):
        text = text[:start] + text[end:]
    return text


def add_icons(text, prefix=''):
    links = (
        f'<link rel="icon" href="{prefix}favicon.ico" sizes="16x16 32x32 48x48 64x64">\n'
        f'<link rel="icon" href="{prefix}favicon.png" type="image/png" sizes="96x96">\n'
        f'<link rel="apple-touch-icon" href="{prefix}apple-touch-icon.png" sizes="180x180">\n'
    )
    parser = IconLinks(text)
    parser.feed(text)
    if len(parser.ranges) == 3 and links + '</head>' in text:
        return text
    text = without_icons(text)
    if '</head>' not in text.lower():
        raise ValueError('Game page has no closing head tag')
    pos = text.lower().index('</head>')
    return text[:pos] + links + text[pos:]


def apply_favicons(slug, directory):
    directory = Path(directory)
    source = ROOT / 'game-icons' / slug
    for name in ICON_FILES:
        if not (source / name).is_file():
            raise ValueError(f'{slug}: missing game-icons/{slug}/{name}')
        shutil.copy2(source / name, directory / name)
    for page in directory.rglob('*.html'):
        relative = os.path.relpath(directory, page.parent)
        prefix = '' if relative == '.' else relative.replace(os.sep, '/') + '/'
        page.write_text(add_icons(page.read_text(encoding='utf-8'), prefix), encoding='utf-8')
