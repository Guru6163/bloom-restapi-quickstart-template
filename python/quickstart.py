"""
Bloom API quickstart: validates the API key, resolves a brand (listing or onboarding),
generates two 16:9 images, waits until they finish, and prints their URLs.

Run from the ``python`` directory::

    python quickstart.py

Environment variables:

- ``BLOOM_API_KEY`` — required Bloom API key
- ``BLOOM_BRAND_URL`` — optional site URL used when the account has no brands yet
"""

import os
import sys

import requests


class BloomClient:
    """
    Typed HTTP client for the Bloom Brand OS REST API using ``requests.Session``.

    All successful responses unwrap the JSON ``data`` envelope before returning.
    """

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.base_url = "https://www.trybloom.ai/api/v1"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "x-api-key": api_key,
                "Content-Type": "application/json",
            }
        )

    def _request(self, method: str, path: str, **kwargs) -> dict:
        """
        Execute an HTTP request against the Bloom API and return the ``data`` payload.

        :param method: HTTP verb (e.g. ``GET``, ``POST``).
        :param path: Path beginning with ``/``, appended to the configured base URL.
        :param kwargs: Additional arguments forwarded to ``requests.Session.request``.
        :return: Parsed JSON object stored under the top-level ``data`` key.
        :raises RuntimeError: When the response status is not successful or JSON is invalid.
        """
        url = f"{self.base_url}{path}"
        response = self.session.request(method, url, **kwargs)

        if not response.ok:
            raise RuntimeError(
                f"Bloom API error [{response.status_code}]: {response.text}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RuntimeError(
                f"Bloom API error [{response.status_code}]: invalid JSON body"
            ) from exc

        if "data" not in payload:
            raise RuntimeError(
                f"Bloom API error [{response.status_code}]: missing 'data' envelope"
            )

        data = payload["data"]
        if not isinstance(data, dict):
            raise RuntimeError(
                f"Bloom API error [{response.status_code}]: 'data' must be an object"
            )

        return data

    def validate_key(self) -> dict:
        """Validates the API key by checking the credit balance."""
        return self._request("GET", "/credits")

    def list_brands(self) -> list:
        """Lists all brands in the account (up to 50)."""
        envelope = self._request("GET", "/brands?limit=50")
        brands = envelope.get("brands")
        if not isinstance(brands, list):
            raise RuntimeError("Bloom API error: 'brands' is not a list")
        return brands

    def onboard_brand(self, url: str) -> str:
        """
        Starts brand onboarding for a given URL.
        Returns the new brand ID. Call wait_for_brand() to poll until ready.
        """
        envelope = self._request("POST", "/brands", json={"url": url})
        brand_id = envelope.get("id")
        if not isinstance(brand_id, str):
            raise RuntimeError("Bloom API error: missing brand id in onboard response")
        return brand_id

    def wait_for_brand(self, brand_id: str) -> dict:
        """
        Polls GET /brands/{id} with wait=true until status is ready.
        Raises if status is logo_required.
        """
        path = f"/brands/{requests.utils.quote(str(brand_id), safe='')}"
        brand = self._request(
            "GET",
            path,
            params={"wait": "true", "timeout": 120},
        )

        if brand.get("status") == "logo_required":
            raise RuntimeError(
                "Brand requires a logo. Upload one at trybloom.ai or use PUT /brands/{id}/logo"
            )

        return brand

    def generate_images(self, brand_session_id: str, prompt: str) -> list:
        """
        Starts generating 2 images at 16:9 with the given prompt.
        Returns a list of image IDs. Call wait_for_images() to poll until complete.
        """
        body = {
            "brandSessionId": brand_session_id,
            "prompt": prompt,
            "aspectRatio": "16:9",
            "imageSize": "2K",
            "model": "fast",
            "variantCount": 2,
        }
        envelope = self._request("POST", "/images/generations", json=body)
        ids = envelope.get("ids")
        if not isinstance(ids, list):
            raise RuntimeError("Bloom API error: 'ids' is not a list")
        return ids

    def wait_for_images(self, ids: list) -> list:
        """
        Polls GET /images until all IDs reach a terminal status.
        Raises if any image fails.
        """
        if not ids:
            return []

        id_param = ",".join(str(image_id) for image_id in ids)
        envelope = self._request(
            "GET",
            "/images",
            params={
                "ids": id_param,
                "wait": "true",
                "timeout": 120,
                "includeUrls": "true",
            },
        )
        images = envelope.get("images")
        if not isinstance(images, list):
            raise RuntimeError("Bloom API error: 'images' is not a list")

        for image in images:
            if image.get("status") == "failed":
                raise RuntimeError(
                    f"Image generation failed for ID: {image['id']}"
                )

        return images


def main() -> None:
    """
    Entry point. Runs the full Bloom API quickstart flow:

    1. Validate API key
    2. List brands (onboard one if none exist)
    3. Generate 2 images at 16:9
    4. Print the image URLs
    """
    try:
        api_key = os.environ.get("BLOOM_API_KEY")

        if not api_key:
            print("✗ Missing BLOOM_API_KEY environment variable")
            print("  Set it with: export BLOOM_API_KEY=bloom_sk_...")
            sys.exit(1)

        client = BloomClient(api_key)

        credits = client.validate_key()

        if credits.get("unlimited"):
            print("✓ API key valid (unlimited credits)")
        else:
            balance = credits.get("balance")
            print(f"✓ API key valid ({balance} credits remaining)")

        brands = client.list_brands()

        if brands:
            print(f"✓ Found {len(brands)} brand(s)")
            brand = brands[0]
            print(f"✓ Using brand: {brand['name']}")
        else:
            brand_url = os.environ.get("BLOOM_BRAND_URL")

            if not brand_url:
                print("✗ No brands found. Set BLOOM_BRAND_URL to onboard one.")
                print("  Example: export BLOOM_BRAND_URL=https://acme.com")
                sys.exit(1)

            print(f"⏳ No brands found. Onboarding from {brand_url}...")

            brand_id = client.onboard_brand(brand_url)

            print("⏳ Analyzing brand (this takes ~60 seconds)...")

            brand = client.wait_for_brand(brand_id)

            print(f"✓ Brand ready: {brand['name']}")

        brand_session_id = brand.get("brandSessionId") or brand["id"]

        print("\n⏳ Generating 2 images (16:9)...")

        ids = client.generate_images(
            brand_session_id,
            "A bold product hero image with clean composition",
        )

        images = client.wait_for_images(ids)

        print("✓ Images ready:")

        for img in images:
            print(f"  → {img['imageUrl']}")

    except Exception as exc:
        print(f"\n✗ {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
