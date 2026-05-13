/**
 * quickstart.ts
 *
 * Bloom API quickstart — full generation flow in TypeScript.
 *
 * Demonstrates: API key validation → brand onboarding → image
 * generation → polling for results.
 *
 * The BloomClient class and all interfaces are exported so the
 * examples in examples/ can import them directly.
 *
 * Usage:
 *   npx ts-node quickstart.ts
 *
 * Environment variables:
 *   BLOOM_API_KEY    (required) — your Bloom API key
 *   BLOOM_BRAND_URL  (optional) — URL to onboard if no brands exist
 */

import "dotenv/config";

/** Credit balance for the account. */
export interface CreditBalance {
  /** Remaining generative credits when not unlimited. */
  balance: number;
  /** When true, credit balance checks do not gate usage. */
  unlimited: boolean;
}

/** A brand in the account. */
export interface Brand {
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
  /** Number of images associated with this brand (list endpoint). */
  imageCount?: number;
  /** Owning workspace identifier when applicable. */
  workspaceId?: string;
  /** Owning workspace display name when applicable. */
  workspaceName?: string;
  /** ISO timestamp of when the brand record was created. */
  createdAt: string;
}

/** A workspace the caller can access. */
export interface Workspace {
  /**
   * Workspace identifier, or `null` for the personal workspace.
   */
  id: string | null;
  /** Display name shown in the Bloom UI. */
  name: string;
}

/** Options for image generation. */
export interface GenerateOptions {
  /** Target aspect ratio for generated images. */
  aspectRatio?:
    | "1:1"
    | "2:3"
    | "3:2"
    | "3:4"
    | "4:3"
    | "4:5"
    | "5:4"
    | "9:16"
    | "16:9"
    | "21:9";
  /** Output resolution preset. */
  imageSize?: "2K" | "4K";
  /** Model tier controlling quality and latency. */
  model?: "fast" | "standard" | "pro";
  /** Number of creative variants to return from one request (1–5). */
  variantCount?: number;
  /** Optional reference images to condition the generation. */
  referenceImageIds?: string[];
}

/** A generated (or uploaded) image. */
export interface Image {
  /** Unique image identifier. */
  id: string;
  /** Generation pipeline status for this image. */
  status: "pending" | "generating" | "completed" | "failed";
  /** Public URL when generation completed and URLs are included. */
  imageUrl?: string;
  /** Aspect ratio label such as `16:9`. */
  aspectRatio?: string;
  /** Prompt text used for this image. */
  prompt?: string;
  /** How this asset was produced. */
  actionType?: "generation" | "edit" | "resize" | "variant";
  /** Groups variants generated from the same request. */
  variantGroupId?: string;
  /** ISO timestamp of when the image record was created. */
  createdAt?: string;
}

/** Standard JSON envelope for Bloom API success payloads. */
interface ApiEnvelope<T> {
  data: T;
}

/**
 * Typed HTTP client for the Bloom Brand OS REST API (Node 18+ `fetch`).
 */
export class BloomClient {
  private readonly apiKey: string;

  private readonly baseUrl = "https://www.trybloom.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Internal fetch wrapper. Sets auth headers, parses JSON,
   * and throws a descriptive error on non-2xx responses.
   *
   * @param path - Absolute path beginning with `/`, appended to the API base URL.
   * @param options - Optional `fetch` init; caller headers override the defaults.
   * @returns The parsed JSON `data` payload typed as `T`.
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { headers: optionHeaders, ...restOptions } = options ?? {};
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("x-api-key", this.apiKey);

    if (optionHeaders !== undefined) {
      const incoming = new Headers(optionHeaders);
      incoming.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const response = await fetch(url, {
      ...restOptions,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bloom API error [${response.status}]: ${text}`);
    }

    const payload = (await response.json()) as ApiEnvelope<T>;

    if (payload.data === undefined) {
      throw new Error(`Bloom API error [${response.status}]: missing 'data' envelope`);
    }

    return payload.data;
  }

  /**
   * Validates the API key by fetching the credit balance.
   * Throws if the key is invalid or the request fails.
   */
  async validateKey(): Promise<CreditBalance> {
    return this.request<CreditBalance>("/credits", { method: "GET" });
  }

  /**
   * Lists all brands in the account (up to 50).
   * Use the returned brand's id as brandSessionId when generating images.
   */
  async listBrands(): Promise<Brand[]> {
    const envelope = await this.request<{ brands: Brand[] }>(
      "/brands?limit=50",
      { method: "GET" },
    );
    return envelope.brands;
  }

  /**
   * Lists all workspaces the caller can access.
   * Personal workspace always comes first with id: null.
   */
  async listWorkspaces(): Promise<Workspace[]> {
    const envelope = await this.request<{ workspaces: Workspace[] }>(
      "/workspaces",
      { method: "GET" },
    );
    return envelope.workspaces;
  }

  /**
   * Starts brand onboarding for a website or Instagram URL.
   * Returns immediately with the new brand ID — status will be "analyzing".
   * Call waitForBrand() to poll until ready.
   */
  async onboardBrand(url: string): Promise<{ id: string }> {
    const envelope = await this.request<{ id: string }>("/brands", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    return { id: envelope.id };
  }

  /**
   * Polls GET /brands/:id with wait=true until a terminal status is reached.
   * Throws if the brand requires a logo to proceed.
   */
  async waitForBrand(id: string): Promise<Brand> {
    const path = `/brands/${encodeURIComponent(id)}?wait=true&timeout=120`;
    const brand = await this.request<Brand>(path, { method: "GET" });

    if (brand.status === "logo_required") {
      throw new Error(
        "Brand requires a logo. Upload one at trybloom.ai or via PUT /brands/:id/logo",
      );
    }

    return brand;
  }

  /**
   * Starts generating images for a brand.
   * Returns immediately with an array of image IDs — generation runs asynchronously.
   * Call waitForImages() to poll until complete.
   *
   * @param brandSessionId - The brand's ID (from Brand.brandSessionId ?? Brand.id)
   * @param prompt - Description of the image to generate (max 2000 chars)
   * @param options - Optional: aspectRatio, imageSize, model, variantCount, referenceImageIds
   */
  async generateImages(
    brandSessionId: string,
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<string[]> {
    const {
      aspectRatio = "16:9",
      imageSize = "2K",
      model = "fast",
      variantCount = 1,
      referenceImageIds = [],
    } = options;

    const envelope = await this.request<{ ids: string[] }>("/images/generations", {
      method: "POST",
      body: JSON.stringify({
        brandSessionId,
        prompt,
        aspectRatio,
        imageSize,
        model,
        variantCount,
        referenceImageIds,
      }),
    });

    return envelope.ids;
  }

  /**
   * Polls GET /images until all given IDs reach a terminal status.
   * Throws if any image fails generation.
   *
   * @param ids - Array of image IDs returned from generateImages()
   */
  async waitForImages(ids: string[]): Promise<Image[]> {
    if (ids.length === 0) {
      return [];
    }

    const idList = ids.join(",");
    const path = `/images?ids=${idList}&wait=true&timeout=120&includeUrls=true`;
    const envelope = await this.request<{ images: Image[] }>(path, {
      method: "GET",
    });

    for (const image of envelope.images) {
      if (image.status === "failed") {
        throw new Error(`Image generation failed for ID: ${image.id}`);
      }
    }

    return envelope.images;
  }
}

/**
 * Entry point. Demonstrates the full Bloom API generation flow:
 * 1. Validate API key
 * 2. List brands — onboard one if none exist
 * 3. Generate 2 images at 16:9
 * 4. Print the image URLs
 *
 * Run with: npx ts-node quickstart.ts
 *
 * Environment variables:
 *   BLOOM_API_KEY     — required
 *   BLOOM_BRAND_URL   — optional, used to onboard if no brands exist
 */
async function main(): Promise<void> {
  try {
    const apiKey = process.env.BLOOM_API_KEY;

    if (!apiKey) {
      console.error("✗ Missing BLOOM_API_KEY environment variable");
      console.error("  Add it to .env or run: export BLOOM_API_KEY=bloom_sk_...");
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
        console.error(
          "  Example: BLOOM_BRAND_URL=https://acme.com npx ts-node quickstart.ts",
        );
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
      {
        aspectRatio: "16:9",
        variantCount: 2,
      },
    );

    const images = await client.waitForImages(ids);

    console.log("✓ Images ready:");

    for (const img of images) {
      console.log(`  → ${img.imageUrl}`);
    }
  } catch (err) {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
