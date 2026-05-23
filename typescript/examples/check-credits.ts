/**
 * check-credits.ts
 *
 * Pre-flight example: read credits, workspaces, and brand summaries before
 * spending credits on generation. Uses the shared `BloomClient` for all calls.
 *
 * Run from the `typescript` directory:
 *   npx ts-node examples/check-credits.ts
 *
 * Environment variables:
 *   BLOOM_API_KEY — required Bloom API key
 */

import "dotenv/config";

import {
  BloomClient,
  BrandListItem,
  BrandStatus,
  CreditBalance,
  Workspace,
} from "../quickstart";

/**
 * Example credit costs for common jobs (illustrative; adjust if your plan differs).
 */
const COST_ESTIMATES = [
  { job: "Single image (2K, fast)", credits: 1 },
  { job: "4 variants (2K, fast)", credits: 4 },
  { job: "Batch — 4 platforms (2K, fast)", credits: 4 },
  { job: "Single image (4K, pro)", credits: 2 },
] as const;

/**
 * Formats a brand status string with a visual indicator.
 */
function formatStatus(status: BrandStatus): string {
  if (status === "ready") {
    return "● ready";
  }

  if (status === "analyzing") {
    return "◌ analyzing";
  }

  if (status === "failed") {
    return "✗ failed";
  }

  return "⚠ logo required";
}

/**
 * Pre-flight check: inspect credits, workspaces, and brands
 * before running a generation job.
 *
 * Exits with a warning if balance is zero and account is not unlimited.
 */
async function checkCredits(): Promise<void> {
  try {
    const apiKey = process.env.BLOOM_API_KEY;

    if (!apiKey) {
      console.error("✗ Missing BLOOM_API_KEY environment variable");
      console.error("  Set it in .env or export BLOOM_API_KEY=bloom_sk_...");
      process.exit(1);
    }

    const client = new BloomClient(apiKey);

    const creditsRaw = await client.validateKey();
    const credits: CreditBalance = {
      balance: creditsRaw.balance,
      unlimited: creditsRaw.unlimited,
    };

    if (credits.unlimited) {
      console.log("✓ Credits: unlimited");
    } else if (credits.balance === 0) {
      console.log("✗ Credits: 0 remaining");
      console.log("  Top up at trybloom.ai/billing before generating.");
      process.exit(1);
    } else if (credits.balance < 10) {
      console.log(`⚠ Credits: ${credits.balance} remaining (low)`);
    } else {
      console.log(`✓ Credits: ${credits.balance} remaining`);
    }

    const workspaces: Workspace[] = await client.listWorkspaces();

    console.log(`\n✓ Workspaces (${workspaces.length}):`);

    for (const ws of workspaces) {
      const label = ws.id === null ? " (personal)" : "";
      console.log(`  · ${ws.name}${label}`);
    }

    const { brands } = await client.listBrands({ limit: 50 });

    if (brands.length === 0) {
      console.log("\n  No brands yet. Run the quickstart to onboard one.");
    } else {
      console.log(`\n✓ Brands (${brands.length}):`);

      for (const brand of brands) {
        printBrandSummary(brand);
      }
    }

    console.log("\n── Credit cost estimates ──────────────────");

    for (const row of COST_ESTIMATES) {
      const affordable = credits.unlimited || credits.balance >= row.credits;
      const indicator = affordable ? "✓" : "✗";
      const creditLabel =
        row.credits === 1 ? "1 credit" : `${row.credits} credits`;

      console.log(
        `  ${indicator}  ${row.job.padEnd(36)} ${creditLabel}`,
      );
    }

    console.log("");
  } catch (err) {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function printBrandSummary(brand: BrandListItem): void {
  console.log(`  · ${brand.name}`);
  console.log(`    ${formatStatus(brand.status)}`);
  console.log(`    ${brand.imageCount} image(s) generated`);
  console.log(`    ${brand.url}`);
}

checkCredits();
