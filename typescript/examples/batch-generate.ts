/**
 * batch-generate.ts
 *
 * Example: Generate on-brand images for multiple platforms in parallel.
 *
 * Fires one generation request per platform simultaneously using
 * Promise.all, then waits for all images to complete. This is the
 * recommended pattern when you need creatives across several formats
 * at once — it's much faster than generating sequentially.
 *
 * Platforms covered:
 *   - Instagram Feed  (1:1)
 *   - Instagram Story (9:16)
 *   - Meta Ad         (4:5)
 *   - Website Hero    (16:9)
 *
 * Usage:
 *   npx ts-node examples/batch-generate.ts
 *
 * Environment variables:
 *   BLOOM_API_KEY     — required
 */

import "dotenv/config";

import { BloomClient, Brand, Image } from "../quickstart";

const API_BASE = "https://www.trybloom.ai/api/v1";

/** A platform target for batch generation. */
interface Platform {
  /** Human-readable label shown in grouped output. */
  name: string;
  /** Aspect ratio token sent to the image generation API. */
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
}

/** The generation result for a single platform. */
interface PlatformResult {
  /** Platform metadata from the batch definition. */
  platform: Platform;
  /** Finished image records for this platform after polling. */
  images: Image[];
}

const PLATFORMS: Platform[] = [
  { name: "Instagram Feed", aspectRatio: "1:1" },
  { name: "Instagram Story", aspectRatio: "9:16" },
  { name: "Meta Ad", aspectRatio: "4:5" },
  { name: "Website Hero", aspectRatio: "16:9" },
];

const PROMPT = "A clean product lifestyle shot with soft natural lighting";

/** Parsed JSON body from a successful `POST /images/generations` response. */
interface GenerationAck {
  /** Image job identifiers returned for this request. */
  ids: string[];
}

/**
 * Fires a single generation request for one platform.
 * Returns the platform paired with its image IDs.
 *
 * @param apiKey - Bloom API key used for `x-api-key` authentication.
 * @param brandSessionId - Brand session used to anchor on-brand generation.
 * @param platform - Target platform (name and aspect ratio).
 * @returns The platform plus the image IDs created for that request.
 */
async function startGeneration(
  apiKey: string,
  brandSessionId: string,
  platform: Platform,
): Promise<{ platform: Platform; ids: string[] }> {
  const url = `${API_BASE}/images/generations`;
  const body = JSON.stringify({
    brandSessionId,
    prompt: PROMPT,
    aspectRatio: platform.aspectRatio,
    imageSize: "2K",
    model: "fast",
    variantCount: 1,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Bloom API error [${response.status}]: ${text}`);
  }

  if (text.length === 0) {
    throw new Error(`Bloom API error [${response.status}]: empty response body`);
  }

  const data = JSON.parse(text) as GenerationAck;

  if (!Array.isArray(data.ids)) {
    throw new Error("Bloom API error: generation response missing ids array");
  }

  return { platform, ids: data.ids };
}

/**
 * Generates images for all platforms in parallel and prints
 * results grouped by platform name.
 *
 * @remarks Each printed block corresponds to one {@link PlatformResult}
 * (platform metadata plus the image URLs resolved for that platform).
 */
async function batchGenerate(): Promise<void> {
  try {
    const apiKey = process.env.BLOOM_API_KEY;

    if (!apiKey) {
      console.error("✗ Missing BLOOM_API_KEY environment variable");
      console.error("  Set it in .env or export BLOOM_API_KEY=bloom_sk_...");
      process.exit(1);
    }

    const client = new BloomClient(apiKey);

    const brands = await client.listBrands();

    if (brands.length === 0) {
      console.error("✗ No brands found. Run the quickstart first.");
      process.exit(1);
    }

    const brand: Brand = brands[0];
    const brandSessionId = brand.brandSessionId ?? brand.id;

    console.log(`✓ Using brand: ${brand.name}`);

    console.log(`\n⏳ Starting generation for ${PLATFORMS.length} platforms...`);

    const generations = await Promise.all(
      PLATFORMS.map((platform) =>
        startGeneration(apiKey, brandSessionId, platform),
      ),
    );

    console.log("✓ All generations started — waiting for images...");

    const allIds = generations.flatMap((g) => g.ids);

    const allImages = await client.waitForImages(allIds);

    const imageMap = new Map(allImages.map((img) => [img.id, img]));

    console.log("\n✓ Results:\n");

    for (const { platform, ids } of generations) {
      console.log(`  ${platform.name} (${platform.aspectRatio})`);

      for (const id of ids) {
        const img = imageMap.get(id);
        console.log(`    → ${img?.imageUrl ?? "URL unavailable"}`);
      }

      console.log("");
    }
  } catch (err) {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

batchGenerate();
