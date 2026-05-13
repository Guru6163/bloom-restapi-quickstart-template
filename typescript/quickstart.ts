/**
 * Bloom API quickstart: validates the API key, resolves a brand (listing or onboarding),
 * generates two 16:9 images, waits until they finish, and prints their URLs.
 *
 * Run from the `typescript` directory:
 *   npx ts-node quickstart.ts
 *
 * Environment variables:
 * - BLOOM_API_KEY — required Bloom API key
 * - BLOOM_BRAND_URL — optional site URL used when the account has no brands yet
 */

import "dotenv/config";

/**
 * Credit balance returned by the Bloom API for the authenticated key.
 */
interface CreditBalance {
  /** Remaining generative credits when not unlimited. */
  balance: number;
  /** When true, credit balance checks do not gate usage. */
  unlimited: boolean;
}

/**
 * A brand workspace linked to the Bloom account.
 */
interface Brand {
  /** Stable brand identifier. */
  id: string;
  /** Human-readable brand name. */
  name: string;
  /** Source URL used for onboarding and context. */
  url: string;
  /** Lifecycle state of brand analysis and readiness. */
  status: "analyzing" | "ready" | "logo_required";
  /**
   * Session identifier used for image generation; when omitted, callers should use `id`.
   */
  brandSessionId?: string;
  /** Brand palette extracted from the site or assets. */
  colors?: string[];
  /** Font descriptors inferred for the brand. */
  fonts?: string[];
  /** Short stylistic label for the brand. */
  aesthetic?: string;
  /** Narrative summary of positioning and tone. */
  summary?: string;
  /** ISO timestamp of when the brand record was created. */
  createdAt: string;
}

/**
 * Immediate acknowledgement after requesting image generations.
 */
interface GenerationResult {
  /** Image job identifiers to poll until completion. */
  ids: string[];
  /** Groups variants generated from the same request. */
  variantGroupId: string;
  /** Initial queue state for the generation batch. */
  status: "pending";
}

/**
 * A single generated image record, including optional URL when requested.
 */
interface Image {
  /** Unique image identifier. */
  id: string;
  /** Generation pipeline status for this image. */
  status: "pending" | "generating" | "completed" | "failed";
  /** Public URL when generation completed and URLs are included. */
  imageUrl?: string;
  /** Aspect ratio label such as `16:9`. */
  aspectRatio: string;
  /** Prompt text used for this image. */
  prompt?: string;
}

/**
 * Minimal response shape from brand onboarding.
 */
interface OnboardBrandResponse {
  /** Identifier of the newly created brand record. */
  id: string;
}

/**
 * Typed HTTP client for the Bloom Brand OS REST API (Node 18+ `fetch`).
 */
class BloomClient {
  private readonly apiKey: string;

  private readonly baseUrl = "https://www.trybloom.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Performs an authenticated JSON request against the Bloom API base URL.
   *
   * @param path - Absolute path beginning with `/`, appended to the API base URL.
   * @param options - Optional `fetch` init; method, body, and headers are merged safely.
   * @returns Parsed JSON response body typed as `T`.
   * @throws When the HTTP status is not OK, with status and response body text.
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");
    headers.set("x-api-key", this.apiKey);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Bloom API error [${response.status}]: ${text}`);
    }

    if (text.length === 0) {
      throw new Error(`Bloom API error [${response.status}]: empty response body`);
    }

    return JSON.parse(text) as T;
  }

  /**
   * Validates the API key by checking the credit balance.
   * Throws if the key is invalid or the request fails.
   */
  async validateKey(): Promise<CreditBalance> {
    return this.request<CreditBalance>("/credits", { method: "GET" });
  }

  /**
   * Lists all brands in the account (up to 50).
   */
  async listBrands(): Promise<Brand[]> {
    return this.request<Brand[]>("/brands?limit=50", { method: "GET" });
  }

  /**
   * Starts brand onboarding for a given URL.
   * Returns immediately — brand will be in "analyzing" status.
   * Call waitForBrand() to poll until ready.
   */
  async onboardBrand(url: string): Promise<{ id: string }> {
    const body = JSON.stringify({ url });
    return this.request<OnboardBrandResponse>("/brands", {
      method: "POST",
      body,
    });
  }

  /**
   * Polls GET /brands/:id with wait=true until status is "ready".
   * Throws if status comes back as "logo_required".
   */
  async waitForBrand(id: string): Promise<Brand> {
    const path = `/brands/${encodeURIComponent(id)}?wait=true&timeout=120`;
    const brand = await this.request<Brand>(path, { method: "GET" });

    if (brand.status === "logo_required") {
      throw new Error(
        "Brand requires a logo. Upload one at trybloom.ai or use PUT /brands/:id/logo",
      );
    }

    return brand;
  }

  /**
   * Starts generating 2 images at 16:9 with the given prompt.
   * Returns immediately with an array of image IDs.
   * Call waitForImages() to poll until complete.
   */
  async generateImages(brandSessionId: string, prompt: string): Promise<string[]> {
    const body = JSON.stringify({
      brandSessionId,
      prompt,
      aspectRatio: "16:9",
      imageSize: "2K",
      model: "fast",
      variantCount: 2,
    });

    const result = await this.request<GenerationResult>("/images/generations", {
      method: "POST",
      body,
    });

    return result.ids;
  }

  /**
   * Polls GET /images until all given IDs reach a terminal status.
   * Throws if any image fails.
   */
  async waitForImages(ids: string[]): Promise<Image[]> {
    if (ids.length === 0) {
      return [];
    }

    const idList = ids.map(encodeURIComponent).join(",");
    const path = `/images?ids=${idList}&wait=true&timeout=120&includeUrls=true`;
    const images = await this.request<Image[]>(path, { method: "GET" });

    for (const image of images) {
      if (image.status === "failed") {
        throw new Error(`Image generation failed for ID: ${image.id}`);
      }
    }

    return images;
  }
}

/**
 * Entry point. Runs the full Bloom API quickstart flow:
 * 1. Validate API key
 * 2. List brands (onboard one if none exist)
 * 3. Generate 2 images at 16:9
 * 4. Print the image URLs
 */
async function main(): Promise<void> {
  try {
    const apiKey = process.env.BLOOM_API_KEY;

    if (!apiKey) {
      console.error("✗ Missing BLOOM_API_KEY environment variable");
      console.error("  Set it in .env or export BLOOM_API_KEY=bloom_sk_...");
      process.exit(1);
    }

    const client = new BloomClient(apiKey);

    const credits = await client.validateKey();

    if (credits.unlimited) {
      console.log("✓ API key valid (unlimited credits)");
    } else {
      console.log(`✓ API key valid (${credits.balance} credits remaining)`);
    }

    const brands = await client.listBrands();

    let brand: Brand;

    if (brands.length > 0) {
      console.log(`✓ Found ${brands.length} brand(s)`);
      brand = brands[0];
      console.log(`✓ Using brand: ${brand.name}`);
    } else {
      const brandUrl = process.env.BLOOM_BRAND_URL;

      if (!brandUrl) {
        console.error("✗ No brands found. Set BLOOM_BRAND_URL to onboard one.");
        console.error("  Example: BLOOM_BRAND_URL=https://acme.com");
        process.exit(1);
      }

      console.log(`⏳ No brands found. Onboarding from ${brandUrl}...`);

      const { id } = await client.onboardBrand(brandUrl);

      console.log("⏳ Analyzing brand (this takes ~60 seconds)...");

      brand = await client.waitForBrand(id);

      console.log(`✓ Brand ready: ${brand.name}`);
    }

    const brandSessionId = brand.brandSessionId ?? brand.id;

    console.log("\n⏳ Generating 2 images (16:9)...");

    const ids = await client.generateImages(
      brandSessionId,
      "A bold product hero image with clean composition",
    );

    const images = await client.waitForImages(ids);

    console.log("✓ Images ready:");

    for (const img of images) {
      if (img.imageUrl === undefined || img.imageUrl.length === 0) {
        throw new Error(`Image ${img.id} completed without a URL`);
      }

      console.log(`  → ${img.imageUrl}`);
    }
  } catch (err) {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
