"""
quickstart.py

Bloom API quickstart — full generation flow in Python.

Demonstrates: API key validation → brand onboarding → image
generation → polling for results.

The BloomClient class is importable so the examples in examples/
can use it directly without redefining API logic.

Usage:
  python quickstart.py

Environment variables:
  BLOOM_API_KEY    (required) — your Bloom API key
  BLOOM_BRAND_URL  (optional) — URL to onboard if no brands exist
"""

# Response shape reference (plain dicts/lists from the API `data` object; see
# trybloom.ai/api/v1/docs). Keys are camelCase in JSON; Python code uses the
# same keys when reading responses.
#
# Brand:
#   id, name, url, status, brandSessionId (optional),
#   colors (optional list), fonts (optional list),
#   aesthetic (optional), summary (optional),
#   imageCount (optional), workspaceId (optional),
#   workspaceName (optional), createdAt
#
# CreditBalance:
#   balance (int), unlimited (bool)
#
# Workspace:
#   id (str | None — None = personal workspace), name
#
# Image:
#   id, status, imageUrl (optional), aspectRatio (optional),
#   prompt (optional), actionType (optional),
#   variantGroupId (optional), width (optional),
#   height (optional), createdAt (optional)
#
# UploadedImage:
#   id, imageUrl, width, height, mimeType
#
# SearchCandidate:
#   id, url, description (optional), width, height,
#   aspectRatio, distance (float)

import os
import sys

import requests


class BloomClient:
    """
    A lightweight client for the Bloom Brand OS REST API.

    Wraps every endpoint used across the quickstart and examples.
    All methods return plain dicts matching the API response shapes
    documented at trybloom.ai/api/v1/docs.

    Usage:
      client = BloomClient(os.environ["BLOOM_API_KEY"])
      credits = client.validate_key()
      brands  = client.list_brands()
    """

    def __init__(self, api_key: str) -> None:
        self.base_url = "https://www.trybloom.ai/api/v1"
        self._session = requests.Session()
        self._session.headers.update(
            {
                "x-api-key": api_key,
                "Content-Type": "application/json",
            }
        )

    def _request(self, method: str, path: str, **kwargs) -> dict:
        """
        Internal request helper. Raises RuntimeError on non-2xx responses
        with the format: "Bloom API error [STATUS]: <body>"
        Returns response.json()["data"].
        """
        url = f"{self.base_url}{path}"
        response = self._session.request(method, url, **kwargs)

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
        """
        Validates the API key by fetching the credit balance.
        Returns: { balance: int, unlimited: bool }
        Raises RuntimeError if the key is invalid.
        """
        return self._request("GET", "/credits")

    def list_brands(self) -> list:
        """
        Lists all brands (up to 50) across all workspaces.
        Returns list of brand dicts.
        """
        envelope = self._request("GET", "/brands?limit=50")
        brands = envelope.get("brands")
        if not isinstance(brands, list):
            raise RuntimeError("Bloom API error: 'brands' is not a list")
        return brands

    def list_workspaces(self) -> list:
        """
        Lists all workspaces the caller can access.
        Personal workspace always comes first with id: None.
        Returns list of workspace dicts.
        """
        envelope = self._request("GET", "/workspaces")
        workspaces = envelope.get("workspaces")
        if not isinstance(workspaces, list):
            raise RuntimeError("Bloom API error: 'workspaces' is not a list")
        return workspaces

    def onboard_brand(self, url: str) -> str:
        """
        Starts brand onboarding for a website or Instagram URL.
        Returns the new brand ID immediately (status will be "analyzing").
        Call wait_for_brand() to poll until ready.
        """
        envelope = self._request("POST", "/brands", json={"url": url})
        brand_id = envelope.get("id")
        if not isinstance(brand_id, str):
            raise RuntimeError("Bloom API error: missing brand id in onboard response")
        return brand_id

    def wait_for_brand(self, brand_id: str) -> dict:
        """
        Polls GET /brands/{id} with wait=true until a terminal status.
        Raises RuntimeError if status is "logo_required".
        Returns the brand dict when status is "ready".
        """
        path = f"/brands/{requests.utils.quote(str(brand_id), safe='')}"
        brand = self._request(
            "GET",
            path,
            params={"wait": "true", "timeout": 120},
        )

        if brand.get("status") == "logo_required":
            raise RuntimeError(
                "Brand requires a logo. Upload one at trybloom.ai "
                "or use PUT /brands/{id}/logo"
            )

        return brand

    def generate_images(
        self,
        brand_session_id: str,
        prompt: str,
        aspect_ratio: str = "16:9",
        image_size: str = "2K",
        model: str = "fast",
        variant_count: int = 1,
        reference_image_ids=None,
    ) -> list:
        """
        Starts generating images for a brand.
        Returns a list of image IDs immediately (generation is async).
        Call wait_for_images() to poll until complete.

        Args:
          brand_session_id:   Brand ID from list_brands() or wait_for_brand()
          prompt:             Image description (max 2000 chars)
          aspect_ratio:       One of "1:1","2:3","3:2","3:4","4:3","4:5",
                              "5:4","9:16","16:9","21:9" (default "16:9")
          image_size:         "2K" (1 credit) or "4K" (2 credits) (default "2K")
          model:              "fast", "standard", or "pro" (default "fast")
          variant_count:      Number of variants 1-5 (default 1)
          reference_image_ids: Image IDs for style/content guidance (max 10)
        """
        ref_ids = reference_image_ids or []
        body = {
            "brandSessionId": brand_session_id,
            "prompt": prompt,
            "aspectRatio": aspect_ratio,
            "imageSize": image_size,
            "model": model,
            "variantCount": variant_count,
            "referenceImageIds": ref_ids,
        }
        envelope = self._request("POST", "/images/generations", json=body)
        ids = envelope.get("ids")
        if not isinstance(ids, list):
            raise RuntimeError("Bloom API error: 'ids' is not a list")
        return ids

    def wait_for_images(self, ids: list) -> list:
        """
        Polls GET /images until all IDs reach a terminal status.
        Raises RuntimeError if any image fails generation.
        Returns list of image dicts with imageUrl populated.

        Args:
          ids: List of image IDs from generate_images()
        """
        if not ids:
            return []

        ids_param = ",".join(str(image_id) for image_id in ids)
        envelope = self._request(
            "GET",
            "/images",
            params={
                "ids": ids_param,
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

    def edit_image(
        self,
        image_id: str,
        brand_session_id: str,
        prompt: str,
        image_size: str = "2K",
        model: str = "fast",
        reference_image_ids=None,
    ) -> str:
        """
        Edits a previously generated or uploaded image.
        Aspect ratio is locked to the original image's ratio.
        Returns a new image ID immediately (edit is async).
        Call wait_for_images([new_id]) to poll until complete.

        Args:
          image_id:           ID of the completed image to edit
          brand_session_id:   Brand session ID
          prompt:             Description of what to change
          image_size:         "2K" or "4K" (default "2K")
          model:              "fast", "standard", or "pro" (default "fast")
          reference_image_ids: Optional reference image IDs (max 9)
        """
        path = f"/images/{requests.utils.quote(str(image_id), safe='')}/edit"
        ref_ids = reference_image_ids or []
        body = {
            "brandSessionId": brand_session_id,
            "prompt": prompt,
            "imageSize": image_size,
            "model": model,
            "referenceImageIds": ref_ids,
        }
        envelope = self._request("POST", path, json=body)
        new_id = envelope.get("id")
        if not isinstance(new_id, str):
            raise RuntimeError("Bloom API error: missing image id in edit response")
        return new_id

    def resize_image(
        self,
        image_id: str,
        brand_session_id: str,
        target_aspect_ratio: str,
    ) -> str:
        """
        Resizes a completed image to a different aspect ratio.
        Returns a new image ID immediately (resize is async).
        Call wait_for_images([new_id]) to poll until complete.

        Args:
          image_id:             ID of the completed image to resize
          brand_session_id:     Brand session ID
          target_aspect_ratio:  One of "1:1","2:3","3:2","3:4","4:3",
                                "4:5","5:4","9:16","16:9","21:9"
        """
        path = f"/images/{requests.utils.quote(str(image_id), safe='')}/resize"
        body = {
            "brandSessionId": brand_session_id,
            "targetAspectRatio": target_aspect_ratio,
        }
        envelope = self._request("POST", path, json=body)
        new_id = envelope.get("id")
        if not isinstance(new_id, str):
            raise RuntimeError("Bloom API error: missing image id in resize response")
        return new_id

    def upload_image_url(self, image_url: str, brand_session_id=None) -> dict:
        """
        Uploads an image by URL for use as a reference or edit subject.
        The server downloads, validates, and stores it.
        Returns the uploaded image dict with id, imageUrl, width, height, mimeType.

        Args:
          image_url:        Public URL of the image (PNG, JPG, WebP)
          brand_session_id: Optional brand session to scope the upload to
        """
        body = {"imageUrl": image_url}
        if brand_session_id is not None:
            body["brandSessionId"] = brand_session_id
        return self._request("POST", "/images/uploads", json=body)

    def search_images(
        self,
        brand_session_id: str,
        query: str,
        limit: int = 10,
        max_distance: float = 0.7,
    ) -> list:
        """
        Semantic search over the brand's library images (uploaded + scraped).
        Generated images are excluded from search results.
        Returns candidates ranked nearest-first by visual similarity.

        Args:
          brand_session_id: Brand session UUID to search within
          query:            Plain noun phrase, e.g. "product on white background"
          limit:            Max results (1-50, default 10)
          max_distance:     Cosine-distance cutoff 0-2 (default 0.7, lower = stricter)
        """
        body = {
            "brandSessionId": brand_session_id,
            "query": query,
            "limit": limit,
            "maxDistance": max_distance,
        }
        envelope = self._request("POST", "/images/search", json=body)
        candidates = envelope.get("candidates")
        if not isinstance(candidates, list):
            raise RuntimeError("Bloom API error: 'candidates' is not a list")
        return candidates


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
            aspect_ratio="16:9",
            variant_count=2,
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
