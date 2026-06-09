"""Regenerate app/favicon.ico, app/icon.png, and app/apple-icon.png from public/brand/logo.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "brand" / "logo.png"
APP = ROOT / "app"


def main() -> None:
    img = Image.open(SRC).convert("RGBA")

    img.resize((32, 32), Image.Resampling.LANCZOS).save(
        APP / "icon.png", format="PNG", optimize=True
    )
    img.resize((180, 180), Image.Resampling.LANCZOS).save(
        APP / "apple-icon.png", format="PNG", optimize=True
    )

    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = [img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_images[0].save(
        APP / "favicon.ico",
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:],
    )

    print(f"Synced icons from {SRC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
