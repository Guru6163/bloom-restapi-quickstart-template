"""
batch_generate.py

Example: Generate on-brand images for multiple platforms in parallel.

Fires one generation request per platform at the same time using a thread pool,
then waits for all images in a single poll — the same pattern as ``Promise.all``
in the TypeScript example.

Platforms covered:

- Instagram Feed  (1:1)
- Instagram Story (9:16)
- Meta Ad         (4:5)
- Website Hero    (16:9)

Run from the ``python`` directory::

    python3 examples/batch_generate.py

Environment variables:

- ``BLOOM_API_KEY`` — required Bloom API key
"""

from __future__ import annotations

import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from quickstart import BloomClient

PLATFORMS = [
    {"name": "Instagram Feed", "aspectRatio": "1:1"},
    {"name": "Instagram Story", "aspectRatio": "9:16"},
    {"name": "Meta Ad", "aspectRatio": "4:5"},
    {"name": "Website Hero", "aspectRatio": "16:9"},
]

PROMPT = "A clean product lifestyle shot with soft natural lighting"


def start_generation(
    client: BloomClient,
    brand_session_id: str,
    platform: dict,
) -> dict:
    """POST /images/generations for one platform via ``BloomClient``."""
    ids = client.generate_images(
        brand_session_id,
        PROMPT,
        aspect_ratio=platform["aspectRatio"],
        image_size="2K",
        model="fast",
        variant_count=1,
    )
    return {"platform": platform, "ids": ids}


def batch_generate() -> None:
    """Generates images for all platforms in parallel and prints grouped URLs."""
    try:
        api_key = os.environ.get("BLOOM_API_KEY")

        if not api_key:
            print("✗ Missing BLOOM_API_KEY environment variable")
            print("  Set it with: export BLOOM_API_KEY=bloom_sk_...")
            sys.exit(1)

        client = BloomClient(api_key)

        brands = client.list_brands()

        if not brands:
            print("✗ No brands found. Run the quickstart first.")
            sys.exit(1)

        brand = brands[0]
        brand_session_id = brand["id"]
        print(f"✓ Using brand: {brand['name']}")

        print(f"\n⏳ Starting generation for {len(PLATFORMS)} platforms...")

        generations = []
        with ThreadPoolExecutor(max_workers=len(PLATFORMS)) as pool:
            futures = {
                pool.submit(
                    start_generation,
                    client,
                    brand_session_id,
                    platform,
                ): platform
                for platform in PLATFORMS
            }
            for future in as_completed(futures):
                generations.append(future.result())

        print("✓ All generations started — waiting for images...")

        by_name = {row["platform"]["name"]: row for row in generations}
        ordered = [by_name[p["name"]] for p in PLATFORMS]

        all_ids = [image_id for row in ordered for image_id in row["ids"]]

        all_images = client.wait_for_images(all_ids)
        image_map = {img["id"]: img for img in all_images}

        print("\n✓ Results:\n")

        for row in ordered:
            platform = row["platform"]
            print(f"  {platform['name']} ({platform['aspectRatio']})")
            for image_id in row["ids"]:
                img = image_map.get(image_id)
                url = (img or {}).get("imageUrl") or "URL unavailable"
                print(f"    → {url}")
            print("")

    except Exception as exc:
        print(f"\n✗ {exc}")
        sys.exit(1)


if __name__ == "__main__":
    batch_generate()
