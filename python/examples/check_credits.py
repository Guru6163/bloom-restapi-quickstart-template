"""
check_credits.py

Pre-flight example: read credits, workspaces, and brand summaries before
spending credits on generation. Uses ``BloomClient`` for all calls.

Run from the ``python`` directory::

    python examples/check_credits.py

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

COST_ESTIMATES = [
    {"job": "Single image (2K, fast)", "credits": 1},
    {"job": "4 variants (2K, fast)", "credits": 4},
    {"job": "Batch — 4 platforms (2K, fast)", "credits": 4},
    {"job": "Single image (4K, pro)", "credits": 2},
]


def format_status(status: str) -> str:
    """Format brand status with a visual indicator."""
    if status == "ready":
        return "● ready"
    if status == "analyzing":
        return "◌ analyzing"
    return "⚠ logo required"


def check_credits() -> None:
    """Inspect credits, workspaces, and brands before running generation."""
    try:
        api_key = os.environ.get("BLOOM_API_KEY")

        if not api_key:
            print("✗ Missing BLOOM_API_KEY environment variable")
            print("  Set it with: export BLOOM_API_KEY=bloom_sk_...")
            sys.exit(1)

        client = BloomClient(api_key)

        credits = client.validate_key()

        if credits.get("unlimited"):
            print("✓ Credits: unlimited")
        elif credits.get("balance") == 0:
            print("✗ Credits: 0 remaining")
            print("  Top up at trybloom.ai/billing before generating.")
            sys.exit(1)
        elif credits.get("balance", 0) < 10:
            print(f"⚠ Credits: {credits.get('balance')} remaining (low)")
        else:
            print(f"✓ Credits: {credits.get('balance')} remaining")

        workspaces = client.list_workspaces()

        print(f"\n✓ Workspaces ({len(workspaces)}):")

        for ws in workspaces:
            label = " (personal)" if ws.get("id") is None else ""
            print(f"  · {ws.get('name', '')}{label}")

        brands = client.list_brands()

        if not brands:
            print("\n  No brands yet. Run the quickstart to onboard one.")
        else:
            print(f"\n✓ Brands ({len(brands)}):")

            for brand in brands:
                name = brand.get("name") or brand.get("id", "")
                status = brand.get("status", "")
                image_count = brand.get("imageCount", 0)
                url = brand.get("url", "")
                print(f"  · {name}")
                print(f"    {format_status(status)}")
                print(f"    {image_count} image(s) generated")
                print(f"    {url}")

        print("\n── Credit cost estimates ──────────────────")

        for row in COST_ESTIMATES:
            affordable = credits.get("unlimited") or credits.get("balance", 0) >= row["credits"]
            indicator = "✓" if affordable else "✗"
            credit_label = "1 credit" if row["credits"] == 1 else f"{row['credits']} credits"
            job = row["job"]
            print(f"  {indicator}  {job.ljust(36)} {credit_label}")

        print("")

    except Exception as exc:
        print(f"\n✗ {exc}")
        sys.exit(1)


if __name__ == "__main__":
    check_credits()
