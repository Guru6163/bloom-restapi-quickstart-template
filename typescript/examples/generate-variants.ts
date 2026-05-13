/**
 * generate-variants.ts
 *
 * Example: Generate 4 variants of a single prompt.
 *
 * Shows how to use variantCount to get multiple creative
 * options from one API call — useful for A/B testing ad creatives
 * or presenting options to a client.
 *
 * Usage:
 *   npx ts-node examples/generate-variants.ts
 *
 * Environment variables:
 *   BLOOM_API_KEY     — required
 */

import "dotenv/config";

import { BloomClient, Brand, Image } from "../quickstart";

const VARIANT_PROMPT =
  "A bold product hero image with clean composition";

/**
 * Generates 4 variants of a single prompt and prints all URLs.
 */
async function generateVariants(): Promise<void> {
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
      console.error(
        "✗ No brands found. Run the quickstart first or set BLOOM_BRAND_URL.",
      );
      process.exit(1);
    }

    const brand: Brand = brands[0];

    console.log(`✓ Using brand: ${brand.name}`);

    const brandSessionId = brand.brandSessionId ?? brand.id;

    console.log("⏳ Generating 4 variants...");

    const ids = await client.generateImages(brandSessionId, VARIANT_PROMPT, {
      variantCount: 4,
    });

    const images: Image[] = await client.waitForImages(ids);

    console.log("✓ Variants ready:");

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

generateVariants();
