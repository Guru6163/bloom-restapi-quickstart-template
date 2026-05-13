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

    python examples/batch_generate.py

Environment variables:

- ``BLOOM_API_KEY`` — required Bloom API key
"""

from __future__ import annotations

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from quickstart import BloomClient

API_BASE = "https://www.trybloom.ai/api/v1"

PLATFORMS = [
    {"name": "Instagram Feed", "aspectRatio": "1:1"},
    {"name": "Instagram Story", "aspectRatio": "9:16"},
    {"name": "Meta Ad", "aspectRatio": "4:5"},
    {"name": "Website Hero", "aspectRatio": "16:9"},
]

PROMPT = "A clean product lifestyle shot with soft natural lighting"


def start_generation(
    api_key: str,
    brand_session_id: str,
    platform: dict,
) -> dict:
    """
    POST /images/generations for one platform.

    Returns a dict with keys ``platform`` (the input row) and ``ids`` (list).
    """
    url = f"{API_BASE}/images/generations"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }
    body = {
        "brandSessionId": brand_session_id,
        "prompt": PROMPT,
        "aspectRatio": platform["aspectRatio"],
        "imageSize": "2K",
        "model": "fast",
        "variantCount": 1,
        "referenceImageIds": [],
    }
    response = requests.post(url, headers=headers, json=body, timeout=120)
    text = response.text

    if not response.ok:
        raise RuntimeError(f"Bloom API error [{response.status_code}]: {text}")

    if not text:
        raise RuntimeError(
            f"Bloom API error [{response.status_code}]: empty response body",
        )

    payload = json.loads(text)
    if "data" not in payload or not isinstance(payload["data"], dict):
        raise RuntimeError("Bloom API error: missing data envelope")

    data = payload["data"]
    ids = data.get("ids")
    if not isinstance(ids, list):
        raise RuntimeError("Bloom API error: generation response missing ids array")

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
        brand_session_id = brand.get("brandSessionId") or brand["id"]
        display_name = brand.get("name") or brand.get("id")
        print(f"✓ Using brand: {display_name}")

        print(f"\n⏳ Starting generation for {len(PLATFORMS)} platforms...")

        generations = []
        with ThreadPoolExecutor(max_workers=len(PLATFORMS)) as pool:
            futures = {
                pool.submit(
                    start_generation,
                    api_key,
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
