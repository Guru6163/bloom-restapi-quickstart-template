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

import { AspectRatio, BloomClient } from "../quickstart";

/** A platform target for batch generation. */
interface Platform {
  name: string;
  aspectRatio: AspectRatio;
}

const PLATFORMS: Platform[] = [
  { name: "Instagram Feed", aspectRatio: "1:1" },
  { name: "Instagram Story", aspectRatio: "9:16" },
  { name: "Meta Ad", aspectRatio: "4:5" },
  { name: "Website Hero", aspectRatio: "16:9" },
];

const PROMPT = "A clean product lifestyle shot with soft natural lighting";

/**
 * Starts generation for one platform via {@link BloomClient.generateImages}.
 */
async function startGeneration(
  client: BloomClient,
  brandSessionId: string,
  platform: Platform,
): Promise<{ platform: Platform; ids: string[] }> {
  const { ids } = await client.generateImages(brandSessionId, PROMPT, {
    aspectRatio: platform.aspectRatio,
    imageSize: "2K",
    model: "fast",
    variantCount: 1,
  });
  return { platform, ids };
}

/**
 * Generates images for all platforms in parallel and prints
 * results grouped by platform name.
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

    const { brands } = await client.listBrands();

    if (brands.length === 0) {
      console.error("✗ No brands found. Run the quickstart first.");
      process.exit(1);
    }

    const brandSessionId = brands[0].id;

    console.log(`✓ Using brand: ${brands[0].name}`);

    console.log(`\n⏳ Starting generation for ${PLATFORMS.length} platforms...`);

    const generations = await Promise.all(
      PLATFORMS.map((platform) =>
        startGeneration(client, brandSessionId, platform),
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
