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

/** Supported aspect ratios across image endpoints. */
export type AspectRatio =
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

/** Brand lifecycle status (`GET /brands`, `GET /brands/{id}`). */
export type BrandStatus = "analyzing" | "ready" | "logo_required" | "failed";

/** Status returned when creating a brand (`POST /brands`). */
export type OnboardBrandStatus = "analyzing" | "logo_required";

/** Status returned when updating a logo (`PUT /brands/{id}/logo`). */
export type UpdateLogoStatus = "analyzing" | "ready";

/** Image origin (`GET /images`, `GET /images/{id}`). */
export type ImageSource = "generated" | "uploaded" | "scraped";

/** Generation lifecycle status for generated images. */
export type ImageStatus = "pending" | "generating" | "completed" | "failed";

/** Action that produced a generated image. */
export type ImageActionType =
  | "generation"
  | "edit"
  | "resize"
  | "variant"
  | "recreate"
  | "remove-background";

/** Output resolution preset for generation and edit. */
export type ImageSize = "2K" | "4K";

/** Model tier for generation and edit. */
export type ModelTier = "fast" | "standard" | "pro";

/** Authenticated account profile (`GET /account`). */
export interface Account {
  email: string;
  name: string | null;
}

/** Credit balance for a workspace (`GET /credits`). */
export interface CreditBalance {
  balance: number;
  unlimited: boolean;
}

/** A workspace the caller can access (`GET /workspaces`). */
export interface Workspace {
  /** Workspace identifier, or `null` for the personal workspace. */
  id: string | null;
  name: string;
}

/** Brand row from `GET /brands` (list). */
export interface BrandListItem {
  id: string;
  name: string;
  url: string;
  status: BrandStatus;
  imageCount: number;
  workspaceId: string | null;
  workspaceName: string;
  createdAt: string;
}

/** Full brand record from `GET /brands/{id}`. */
export interface Brand {
  id: string;
  status: BrandStatus;
  name: string;
  url: string;
  logoUrl: string | null;
  logoError?: string;
  colors: string[];
  fonts: string[];
  aesthetic: string | null;
  summary: string | null;
  workspaceId: string | null;
  workspaceName: string;
  createdAt: string;
}

/** Cursor-paginated brand list (`GET /brands`). */
export interface PaginatedBrands {
  brands: BrandListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Acknowledgement from `POST /brands`. */
export interface OnboardBrandResponse {
  id: string;
  status: OnboardBrandStatus;
  logoError?: string;
}

/** Acknowledgement from `POST /images/generations`. */
export interface GenerateImagesResponse {
  ids: string[];
  variantGroupId: string | null;
  status: "pending";
}

/** Acknowledgement from async image mutations (edit, resize). */
export interface AsyncImageResponse {
  id: string;
  status: "pending";
}

/** Acknowledgement from logo update endpoints. */
export interface UpdateLogoResponse {
  id: string;
  status: UpdateLogoStatus;
}

/** Image record from list and detail endpoints. */
export interface Image {
  id: string;
  source: ImageSource;
  brandSessionId?: string;
  prompt: string | null;
  description: string | null;
  aspectRatio: AspectRatio | null;
  width: number | null;
  height: number | null;
  actionType: ImageActionType | null;
  variantGroupId: string | null;
  status: ImageStatus | null;
  imageUrl?: string | null;
  workspaceId: string | null;
  workspaceName: string;
  createdAt: string;
}

/** Cursor-paginated image list (`GET /images`). */
export interface PaginatedImages {
  images: Image[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Response from `POST /images/uploads` and file upload endpoints. */
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
  description: string;
  width: number | null;
  height: number | null;
  aspectRatio: AspectRatio | null;
  distance: number;
}

/** Full response from `POST /images/search`. */
export interface SearchImagesResponse {
  query: string;
  candidates: SearchCandidate[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Structured error body returned on non-2xx responses. */
export interface BloomApiError {
  defined: boolean;
  code: string;
  status: number;
  message: string;
  data?: unknown;
}

/** Query options for {@link BloomClient.getCredits}. */
export interface GetCreditsOptions {
  workspaceId?: string;
}

/** Query options for {@link BloomClient.listBrands}. */
export interface ListBrandsOptions {
  workspaceId?: string;
  cursor?: string;
  limit?: number;
}

/** Query options for {@link BloomClient.getBrand}. */
export interface GetBrandOptions {
  wait?: boolean;
  timeout?: number;
}

/** Optional body fields for {@link BloomClient.onboardBrand}. */
export interface OnboardBrandOptions {
  logoUrl?: string;
  workspaceId?: string;
}

/** Options for image generation (`POST /images/generations`). */
export interface GenerateOptions {
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  model?: ModelTier;
  variantCount?: number;
  referenceImageIds?: string[];
}

/** Options for {@link BloomClient.editImage}. */
export interface EditImageOptions {
  imageSize?: ImageSize;
  model?: ModelTier;
  referenceImageIds?: string[];
}

/** Options for {@link BloomClient.getImage}. */
export interface GetImageOptions {
  wait?: boolean;
  timeout?: number;
}

/** Query options for {@link BloomClient.listImages}. */
export interface ListImagesOptions {
  ids?: string[];
  workspaceId?: string;
  brandSessionId?: string;
  cursor?: string;
  limit?: number;
  source?: ImageSource;
  status?: ImageStatus;
  actionType?: Exclude<ImageActionType, "recreate">;
  includeUrls?: boolean;
  wait?: boolean;
  timeout?: number;
}

/** Options for {@link BloomClient.searchImages}. */
export interface SearchImagesOptions {
  limit?: number;
  maxDistance?: number;
  cursor?: string;
}

/** Workspaces list (`GET /workspaces`). */
export interface WorkspacesResponse {
  workspaces: Workspace[];
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

    const { data } = (await response.json()) as ApiEnvelope<T>;
    return data;
  }

  /**
   * Returns the authenticated account profile (`GET /account`).
   */
  async getAccount(): Promise<Account> {
    return this.request<Account>("/account", { method: "GET" });
  }

  /**
   * Fetches credit balance for a workspace (`GET /credits`).
   */
  async getCredits(options: GetCreditsOptions = {}): Promise<CreditBalance> {
    const query = buildQuery({ workspaceId: options.workspaceId });
    return this.request<CreditBalance>(`/credits${query}`, { method: "GET" });
  }

  /**
   * Validates the API key by fetching the credit balance.
   * Throws if the key is invalid or the request fails.
   */
  async validateKey(options: GetCreditsOptions = {}): Promise<CreditBalance> {
    return this.getCredits(options);
  }

  /**
   * Lists brand sessions with cursor-based pagination.
   * Use returned `id` values as `brandSessionId` when generating images.
   */
  async listBrands(options: ListBrandsOptions = {}): Promise<PaginatedBrands> {
    const query = buildQuery({
      workspaceId: options.workspaceId,
      cursor: options.cursor,
      limit: options.limit ?? 50,
    });
    return this.request<PaginatedBrands>(`/brands${query}`, {
      method: "GET",
    });
  }

  /**
   * Lists all workspaces the caller can access.
   * Personal workspace always comes first with id: null.
   */
  async listWorkspaces(): Promise<Workspace[]> {
    const { workspaces } = await this.request<WorkspacesResponse>(
      "/workspaces",
      { method: "GET" },
    );
    return workspaces;
  }

  /**
   * Starts brand onboarding for a website or Instagram profile URL.
   * Returns immediately with the new brand ID — status will be "analyzing".
   * Call waitForBrand() to poll until ready.
   */
  async onboardBrand(
    url: string,
    options: OnboardBrandOptions = {},
  ): Promise<OnboardBrandResponse> {
    const body: Record<string, string> = { url };
    if (options.logoUrl !== undefined) {
      body.logoUrl = options.logoUrl;
    }
    if (options.workspaceId !== undefined) {
      body.workspaceId = options.workspaceId;
    }
    return this.request<OnboardBrandResponse>("/brands", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Fetches a brand by ID (`GET /brands/{id}`).
   */
  async getBrand(id: string, options: GetBrandOptions = {}): Promise<Brand> {
    const path = `/brands/${encodeURIComponent(id)}${buildQuery({
      wait: options.wait,
      timeout: options.timeout,
    })}`;
    return this.request<Brand>(path, { method: "GET" });
  }

  /**
   * Polls GET /brands/:id with wait=true until a terminal status is reached.
   * Throws if the brand requires a logo to proceed.
   */
  async waitForBrand(id: string): Promise<Brand> {
    const brand = await this.getBrand(id, { wait: true, timeout: 120 });

    if (brand.status === "logo_required") {
      throw new Error(
        "Brand requires a logo. Upload one at trybloom.ai or via PUT /brands/{id}/logo",
      );
    }

    return brand;
  }

  /**
   * Starts generating images for a brand.
   * Returns immediately with image IDs — generation runs asynchronously.
   * Call waitForImages() to poll until complete.
   *
   * @param brandSessionId - Brand session ID from `GET /brands` (`BrandListItem.id`)
   * @param prompt - Description of the image to generate (max 2000 chars)
   * @param options - Optional: aspectRatio, imageSize, model, variantCount, referenceImageIds
   */
  async generateImages(
    brandSessionId: string,
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<GenerateImagesResponse> {
    const {
      aspectRatio = "16:9",
      imageSize = "2K",
      model = "pro",
      variantCount = 1,
      referenceImageIds = [],
    } = options;

    return this.request<GenerateImagesResponse>("/images/generations", {
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
  }

  /**
   * Lists images with cursor-based pagination (`GET /images`).
   */
  async listImages(options: ListImagesOptions = {}): Promise<PaginatedImages> {
    const query = buildQuery({
      ids: options.ids?.join(","),
      workspaceId: options.workspaceId,
      brandSessionId: options.brandSessionId,
      cursor: options.cursor,
      limit: options.limit ?? 50,
      source: options.source,
      status: options.status,
      actionType: options.actionType,
      includeUrls: options.includeUrls,
      wait: options.wait,
      timeout: options.timeout,
    });
    return this.request<PaginatedImages>(`/images${query}`, { method: "GET" });
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

    const { images } = await this.listImages({
      ids,
      wait: true,
      timeout: 120,
      includeUrls: true,
    });

    for (const image of images) {
      if (image.status === "failed") {
        throw new Error(`Image generation failed for ID: ${image.id}`);
      }
    }

    return images;
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
  ): Promise<AsyncImageResponse> {
    const {
      imageSize = "2K",
      model = "pro",
      referenceImageIds = [],
    } = options;
    const path = `/images/${encodeURIComponent(imageId)}/edit`;
    return this.request<AsyncImageResponse>(path, {
      method: "POST",
      body: JSON.stringify({
        brandSessionId,
        prompt,
        imageSize,
        model,
        referenceImageIds,
      }),
    });
  }

  /**
   * Resizes a completed image (`POST /images/{id}/resize`).
   * Returns a new image ID; poll with {@link waitForImages}.
   */
  async resizeImage(
    imageId: string,
    brandSessionId: string,
    targetAspectRatio: AspectRatio,
  ): Promise<AsyncImageResponse> {
    const path = `/images/${encodeURIComponent(imageId)}/resize`;
    return this.request<AsyncImageResponse>(path, {
      method: "POST",
      body: JSON.stringify({
        brandSessionId,
        targetAspectRatio,
      }),
    });
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
  ): Promise<SearchImagesResponse> {
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
    return this.request<SearchImagesResponse>("/images/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
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

    const { brands } = await client.listBrands();

    let brandSessionId: string;

    if (brands.length > 0) {
      console.log(`✓ Found ${brands.length} brand(s)`);
      const listItem = brands[0];
      brandSessionId = listItem.id;
      console.log(`✓ Using brand: ${listItem.name}`);
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

      const brand = await client.waitForBrand(id);
      brandSessionId = brand.id;

      console.log(`✓ Brand ready: ${brand.name}`);
    }

    console.log("\n⏳ Generating 2 images (16:9)...");

    const { ids } = await client.generateImages(
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
