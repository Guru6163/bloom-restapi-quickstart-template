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

/** Query options for {@link BloomClient.validateKey}. */
export interface ValidateKeyOptions {
  /** Team workspace ID; omit for the caller's personal workspace balance. */
  workspaceId?: string;
}

/** Query options for {@link BloomClient.listBrands}. */
export interface ListBrandsOptions {
  /** Team workspace ID; omit to list across all workspaces the caller can see. */
  workspaceId?: string;
  /** Pagination cursor from a previous response's `nextCursor`. */
  cursor?: string;
  /** Results per page (1–100, default 50). */
  limit?: number;
}

/** Optional body fields for {@link BloomClient.onboardBrand}. */
export interface OnboardBrandOptions {
  /** Explicit logo URL; skips automatic logo extraction when set. */
  logoUrl?: string;
  /** Team workspace ID; omit to create in the caller's personal workspace. */
  workspaceId?: string;
}

/** A brand in the account (list + detail fields per OpenAPI). */
export interface Brand {
  /** Stable brand / session identifier (use as `brandSessionId` for generation). */
  id: string;
  /** Human-readable brand name (present when available). */
  name?: string;
  /** Source URL used for onboarding and context. */
  url?: string;
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
  createdAt?: string;
  /** Logo URL from detail responses. */
  logoUrl?: string;
  /** Error message when automatic logo extraction fails. */
  logoError?: string;
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

/** Options for image generation (`POST /images/generations`). */
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
  /** Output resolution preset (`2K` default per API). */
  imageSize?: "2K" | "4K";
  /**
   * Model tier. API default is `pro`; pass `fast` for lower cost in demos.
   */
  model?: "fast" | "standard" | "pro";
  /** Number of creative variants to return from one request (1–5). */
  variantCount?: number;
  /** Reference images for style/content guidance (max 10). */
  referenceImageIds?: string[];
}

/** Options for {@link BloomClient.editImage}. */
export interface EditImageOptions {
  imageSize?: "2K" | "4K";
  model?: "fast" | "standard" | "pro";
  referenceImageIds?: string[];
}

/** Options for {@link BloomClient.getImage}. */
export interface GetImageOptions {
  /** When true, long-poll until a terminal status. */
  wait?: boolean;
  /** Max seconds to wait (1–295, default 120). */
  timeout?: number;
}

/** Options for {@link BloomClient.searchImages}. */
export interface SearchImagesOptions {
  /** Max results (1–50, default 10). */
  limit?: number;
  /** Cosine-distance cutoff 0–2 (default 0.7). */
  maxDistance?: number;
  /** Pagination cursor from a previous `nextCursor`. */
  cursor?: string;
}

/** A generated, uploaded, or scraped image record. */
export interface Image {
  id: string;
  source?: "generated" | "uploaded" | "scraped";
  status: "pending" | "generating" | "completed" | "failed";
  imageUrl?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  prompt?: string;
  description?: string;
  actionType?: "generation" | "edit" | "resize" | "variant";
  variantGroupId?: string;
  brandSessionId?: string;
  workspaceId?: string;
  workspaceName?: string;
  createdAt?: string;
}

/** Response from `POST /images/uploads` (URL upload). */
export interface UploadedImage {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  mimeType: string;
}

/** One row from `POST /images/search` `candidates`. */
export interface SearchCandidate {
  id: string;
  url: string;
  description?: string;
  width: number;
  height: number;
  aspectRatio: string;
  distance: number;
}

/** Standard JSON envelope for Bloom API success payloads. */
interface ApiEnvelope<T> {
  data: T;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
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
   * @param path - Absolute path beginning with `/`, appended to the API base URL (may include query).
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
  async validateKey(options: ValidateKeyOptions = {}): Promise<CreditBalance> {
    const query = buildQuery({ workspaceId: options.workspaceId });
    return this.request<CreditBalance>(`/credits${query}`, { method: "GET" });
  }

  /**
   * Lists brand sessions with cursor-based pagination.
   * Use returned `id` values as `brandSessionId` when generating images.
   */
  async listBrands(options: ListBrandsOptions = {}): Promise<Brand[]> {
    const query = buildQuery({
      workspaceId: options.workspaceId,
      cursor: options.cursor,
      limit: options.limit ?? 50,
    });
    const envelope = await this.request<{ brands: Brand[] }>(`/brands${query}`, {
      method: "GET",
    });
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
   * Starts brand onboarding for a website or Instagram profile URL.
   * Returns immediately with the new brand ID — status will be "analyzing".
   * Call waitForBrand() to poll until ready.
   */
  async onboardBrand(
    url: string,
    options: OnboardBrandOptions = {},
  ): Promise<{ id: string }> {
    const body: Record<string, string> = { url };
    if (options.logoUrl !== undefined) {
      body.logoUrl = options.logoUrl;
    }
    if (options.workspaceId !== undefined) {
      body.workspaceId = options.workspaceId;
    }
    const envelope = await this.request<{ id: string }>("/brands", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { id: envelope.id };
  }

  /**
   * Polls GET /brands/:id with wait=true until a terminal status is reached.
   * Throws if the brand requires a logo to proceed.
   */
  async waitForBrand(id: string): Promise<Brand> {
    const path = `/brands/${encodeURIComponent(id)}${buildQuery({
      wait: true,
      timeout: 120,
    })}`;
    const brand = await this.request<Brand>(path, { method: "GET" });

    if (brand.status === "logo_required") {
      throw new Error(
        "Brand requires a logo. Upload one at trybloom.ai or via PUT /brands/{id}/logo",
      );
    }

    return brand;
  }

  /**
   * Starts generating images for a brand.
   * Returns immediately with an array of image IDs — generation runs asynchronously.
   * Call waitForImages() to poll until complete.
   *
   * @param brandSessionId - Brand session ID from `GET /brands` (`Brand.id` or `brandSessionId`)
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
      model = "pro",
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

    const query = buildQuery({
      ids: ids.join(","),
      wait: true,
      timeout: 120,
      includeUrls: true,
    });
    const envelope = await this.request<{ images: Image[] }>(`/images${query}`, {
      method: "GET",
    });

    for (const image of envelope.images) {
      if (image.status === "failed") {
        throw new Error(`Image generation failed for ID: ${image.id}`);
      }
    }

    return envelope.images;
  }

  /**
   * Fetches a single image by ID. Use `wait` to long-poll until a terminal status.
   */
  async getImage(id: string, options: GetImageOptions = {}): Promise<Image> {
    const query = buildQuery({
      wait: options.wait,
      timeout: options.timeout,
    });
    const path = `/images/${encodeURIComponent(id)}${query}`;
    return this.request<Image>(path, { method: "GET" });
  }

  /**
   * Edits a completed or uploaded image (`POST /images/{id}/edit`).
   * Returns a new image ID; poll with {@link waitForImages}.
   */
  async editImage(
    imageId: string,
    brandSessionId: string,
    prompt: string,
    options: EditImageOptions = {},
  ): Promise<string> {
    const {
      imageSize = "2K",
      model = "pro",
      referenceImageIds = [],
    } = options;
    const path = `/images/${encodeURIComponent(imageId)}/edit`;
    const envelope = await this.request<{ id: string }>(path, {
      method: "POST",
      body: JSON.stringify({
        brandSessionId,
        prompt,
        imageSize,
        model,
        referenceImageIds,
      }),
    });
    return envelope.id;
  }

  /**
   * Resizes a completed image (`POST /images/{id}/resize`).
   * Returns a new image ID; poll with {@link waitForImages}.
   */
  async resizeImage(
    imageId: string,
    brandSessionId: string,
    targetAspectRatio: GenerateOptions["aspectRatio"] & string,
  ): Promise<string> {
    const path = `/images/${encodeURIComponent(imageId)}/resize`;
    const envelope = await this.request<{ id: string }>(path, {
      method: "POST",
      body: JSON.stringify({
        brandSessionId,
        targetAspectRatio,
      }),
    });
    return envelope.id;
  }

  /**
   * Uploads an image by URL (`POST /images/uploads`).
   */
  async uploadImageUrl(
    imageUrl: string,
    brandSessionId?: string,
  ): Promise<UploadedImage> {
    const body: Record<string, string> = { imageUrl };
    if (brandSessionId !== undefined) {
      body.brandSessionId = brandSessionId;
    }
    return this.request<UploadedImage>("/images/uploads", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Semantic search over library images (`POST /images/search`).
   */
  async searchImages(
    brandSessionId: string,
    query: string,
    options: SearchImagesOptions = {},
  ): Promise<SearchCandidate[]> {
    const { limit = 10, maxDistance = 0.7, cursor } = options;
    const body: Record<string, string | number> = {
      brandSessionId,
      query,
      limit,
      maxDistance,
    };
    if (cursor !== undefined) {
      body.cursor = cursor;
    }
    const envelope = await this.request<{ candidates: SearchCandidate[] }>(
      "/images/search",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    return envelope.candidates;
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
      console.log(`✓ Using brand: ${brand.name ?? brand.id}`);
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

      console.log(`✓ Brand ready: ${brand.name ?? brand.id}`);
    }

    const brandSessionId = brand.brandSessionId ?? brand.id;

    console.log("\n⏳ Generating 2 images (16:9)...");

    const ids = await client.generateImages(
      brandSessionId,
      "A bold product hero image with clean composition",
      {
        aspectRatio: "16:9",
        variantCount: 2,
        model: "fast",
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
