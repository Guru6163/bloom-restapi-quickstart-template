"""
generate_variants.py

Example: Generate 4 variants of a single prompt.

Shows how to use variant_count to get multiple creative options from one
API call — useful for A/B testing ad creatives or presenting options to a client.

Run from the ``python`` directory::

    python examples/generate_variants.py

Environment variables:

- ``BLOOM_API_KEY`` — required Bloom API key
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from quickstart import BloomClient

VARIANT_PROMPT = "A bold product hero image with clean composition"


def generate_variants() -> None:
    """Generates 4 variants of a single prompt and prints all URLs."""
    try:
        api_key = os.environ.get("BLOOM_API_KEY")

        if not api_key:
            print("✗ Missing BLOOM_API_KEY environment variable")
            print("  Set it with: export BLOOM_API_KEY=bloom_sk_...")
            sys.exit(1)

        client = BloomClient(api_key)

        brands = client.list_brands()

        if not brands:
            print(
                "✗ No brands found. Run the quickstart first or set BLOOM_BRAND_URL.",
            )
            sys.exit(1)

        brand = brands[0]
        display_name = brand.get("name") or brand.get("id")
        print(f"✓ Using brand: {display_name}")

        brand_session_id = brand.get("brandSessionId") or brand["id"]

        print("⏳ Generating 4 variants...")

        ids = client.generate_images(
            brand_session_id,
            VARIANT_PROMPT,
            variant_count=4,
        )

        images = client.wait_for_images(ids)

        print("✓ Variants ready:")

        for img in images:
            url = img.get("imageUrl")
            if not url:
                raise RuntimeError(
                    f"Image {img.get('id', 'unknown')} completed without a URL",
                )
            print(f"  → {url}")

    except Exception as exc:
        print(f"\n✗ {exc}")
        sys.exit(1)


if __name__ == "__main__":
    generate_variants()
