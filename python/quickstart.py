"""
quickstart.py

Bloom API quickstart — full generation flow in Python.

Demonstrates: API key validation → brand onboarding → image
generation → polling for results.

The BloomClient class is importable so the examples in examples/
can use it directly without redefining API logic.

Usage:
  python3 quickstart.py

Environment variables:
  BLOOM_API_KEY    (required) — your Bloom API key
  BLOOM_BRAND_URL  (optional) — URL to onboard if no brands exist
"""

# Response shape reference (plain dicts/lists from the API `data` object; see
# https://www.trybloom.ai/api/v1/spec.json). Keys are camelCase in JSON.
#
# BrandListItem (GET /brands):
#   id, name, url, status (analyzing|ready|logo_required|failed),
#   imageCount, workspaceId (str|null), workspaceName, createdAt
#
# Brand (GET /brands/{id}):
#   id, status, name, url, logoUrl (str|null), logoError (optional),
#   colors, fonts, aesthetic (str|null), summary (str|null),
#   workspaceId (str|null), workspaceName, createdAt
#
# CreditBalance (GET /credits):
#   balance (int), unlimited (bool)
#
# Workspace (GET /workspaces):
#   id (str | None — None = personal workspace), name
#
# Image (GET /images, GET /images/{id}):
#   id, source (generated|uploaded|scraped), brandSessionId (list only),
#   prompt (str|null), description (str|null), aspectRatio (str|null),
#   width (number|null), height (number|null),
#   actionType (generation|edit|resize|variant|recreate|null),
#   variantGroupId (str|null), status (pending|generating|completed|failed|null),
#   imageUrl (str|null), workspaceId (str|null), workspaceName, createdAt
#
# UploadedImage (POST /images/uploads):
#   id, imageUrl, width, height, mimeType
#
# SearchCandidate (POST /images/search):
#   id, url, description, width (number|null), height (number|null),
#   aspectRatio (str|null), distance (float)

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
        Returns response.json()["data"] per the OpenAPI spec.
        """
        url = f"{self.base_url}{path}"
        response = self._session.request(method, url, **kwargs)

        if not response.ok:
            raise RuntimeError(
                f"Bloom API error [{response.status_code}]: {response.text}"
            )

        payload = response.json()
        return payload["data"]

    def validate_key(self, workspace_id=None) -> dict:
        """
        Validates the API key by fetching the credit balance.
        Returns: { balance: int, unlimited: bool }
        Raises RuntimeError if the key is invalid.

        Args:
          workspace_id: Optional team workspace ID (omit for personal balance).
        """
        params = {}
        if workspace_id is not None:
            params["workspaceId"] = workspace_id
        return self._request("GET", "/credits", params=params or None)

    def list_brands(self, workspace_id=None, cursor=None, limit=None) -> list:
        """
        Lists brand sessions with cursor-based pagination (GET /brands).

        Args:
          workspace_id: Optional team workspace scope.
          cursor: Pagination cursor from a previous ``nextCursor``.
          limit: Results per page (1–100, default 50 when omitted).

        Returns:
          List of brand dicts (``data.brands``).
        """
        params = {}
        if workspace_id is not None:
            params["workspaceId"] = workspace_id
        if cursor is not None:
            params["cursor"] = cursor
        if limit is not None:
            params["limit"] = limit
        else:
            params["limit"] = 50
        envelope = self._request("GET", "/brands", params=params)
        return envelope["brands"]

    def list_workspaces(self) -> list:
        """
        Lists all workspaces the caller can access.
        Personal workspace always comes first with id: None.
        Returns list of workspace dicts.
        """
        envelope = self._request("GET", "/workspaces")
        return envelope["workspaces"]

    def onboard_brand(self, url: str, logo_url=None, workspace_id=None) -> str:
        """
        Starts brand onboarding for a website or Instagram profile URL.

        Args:
          url: Target site or Instagram profile URL.
          logo_url: Optional explicit logo URL (skips automatic extraction).
          workspace_id: Optional team workspace to create the brand in.

        Returns:
          New brand id (``data.id``); status will be ``analyzing``.
        """
        body = {"url": url}
        if logo_url is not None:
            body["logoUrl"] = logo_url
        if workspace_id is not None:
            body["workspaceId"] = workspace_id
        envelope = self._request("POST", "/brands", json=body)
        return envelope["id"]

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

    def get_image(self, image_id: str, wait=False, timeout=None) -> dict:
        """
        Fetches a single image by ID (GET /images/{id}).

        Args:
          image_id: Image UUID.
          wait: When True, long-poll until a terminal status.
          timeout: Max seconds to wait (1–295; default 120 on the server).
        """
        path = f"/images/{requests.utils.quote(str(image_id), safe='')}"
        params = {}
        if wait:
            params["wait"] = "true"
        if timeout is not None:
            params["timeout"] = timeout
        return self._request("GET", path, params=params or None)

    def generate_images(
        self,
        brand_session_id: str,
        prompt: str,
        aspect_ratio: str = "16:9",
        image_size: str = "2K",
        model: str = "pro",
        variant_count: int = 1,
        reference_image_ids=None,
    ) -> list:
        """
        Starts generating images for a brand (POST /images/generations).

        Args:
          brand_session_id:   Brand session ID from list_brands / wait_for_brand
          prompt:             Image description (max 2000 chars)
          aspect_ratio:       One of "1:1","2:3","3:2","3:4","4:3","4:5",
                              "5:4","9:16","16:9","21:9" (default "16:9")
          image_size:         "2K" or "4K" (default "2K")
          model:              "fast", "standard", or "pro" (API default "pro")
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
        return envelope["ids"]

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
        images = envelope["images"]

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
        model: str = "pro",
        reference_image_ids=None,
    ) -> str:
        """
        Edits a previously generated or uploaded image (POST /images/{id}/edit).

        Args:
          image_id:           ID of the completed image to edit
          brand_session_id:   Brand session ID
          prompt:             Description of what to change
          image_size:         "2K" or "4K" (default "2K")
          model:              "fast", "standard", or "pro" (API default "pro")
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
        return envelope["id"]

    def resize_image(
        self,
        image_id: str,
        brand_session_id: str,
        target_aspect_ratio: str,
    ) -> str:
        """
        Resizes a completed image (POST /images/{id}/resize).

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
        return envelope["id"]

    def upload_image_url(self, image_url: str, brand_session_id=None) -> dict:
        """
        Uploads an image by URL (POST /images/uploads).

        Args:
          image_url:        Public URL of the image (PNG, JPG, WebP)
          brand_session_id: Optional brand session to associate the upload with
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
        cursor=None,
    ) -> list:
        """
        Semantic search over library images (POST /images/search).

        Args:
          brand_session_id: Brand session UUID to search within
          query:            Plain noun phrase, e.g. "product on white background"
          limit:            Max results (1-50, default 10)
          max_distance:     Cosine-distance cutoff 0-2 (default 0.7)
          cursor:           Pagination cursor from a previous ``nextCursor``
        """
        body = {
            "brandSessionId": brand_session_id,
            "query": query,
            "limit": limit,
            "maxDistance": max_distance,
        }
        if cursor is not None:
            body["cursor"] = cursor
        envelope = self._request("POST", "/images/search", json=body)
        return envelope["candidates"]


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
            display_name = brand.get("name") or brand.get("id")
            print(f"✓ Using brand: {display_name}")
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

            ready_name = brand.get("name") or brand.get("id")
            print(f"✓ Brand ready: {ready_name}")

        brand_session_id = brand["id"]

        print("\n⏳ Generating 2 images (16:9)...")

        ids = client.generate_images(
            brand_session_id,
            "A bold product hero image with clean composition",
            aspect_ratio="16:9",
            variant_count=2,
            model="fast",
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
