#!/usr/bin/env python3
"""Regenerate favicon formats from each game's committed 256px source artwork."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def render(directory):
    with Image.open(directory / 'source.png') as source:
        image = source.convert('RGB')
        if image.width != image.height:
            raise ValueError(f'{directory.name}: icon artwork must be square')
        image.resize((96, 96), Image.Resampling.LANCZOS).save(directory / 'favicon.png', optimize=True)
        image.resize((180, 180), Image.Resampling.LANCZOS).save(directory / 'apple-touch-icon.png', optimize=True)
        image.resize((64, 64), Image.Resampling.LANCZOS).save(
            directory / 'favicon.ico', sizes=[(n, n) for n in (16, 32, 48, 64)])


if __name__ == '__main__':
    for source in sorted((ROOT / 'game-icons').glob('*/source.png')):
        render(source.parent)
        print(source.parent.name)
