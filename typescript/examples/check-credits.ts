/**
 * check-credits.ts
 *
 * Pre-flight example: read credits, workspaces, and brand summaries before
 * spending credits on generation. Uses the shared `BloomClient` for `/credits`
 * and direct `fetch` calls for list endpoints that return a `data` envelope.
 *
 * Run from the `typescript` directory:
 *   npx ts-node examples/check-credits.ts
 *
 * Environment variables:
 *   BLOOM_API_KEY — required Bloom API key
 */

import "dotenv/config";

import { BloomClient } from "../quickstart";

const API_BASE = "https://www.trybloom.ai/api/v1";

/** A workspace the caller can access. */
interface Workspace {
  /**
   * Workspace identifier, or `null` for the personal workspace.
   */
  id: string | null;
  /** Display name shown in the Bloom UI. */
  name: string;
}

/** Credit balance for the account. */
interface CreditBalance {
  /** Remaining generative credits when not unlimited. */
  balance: number;
  /** When true, credit balance checks do not gate usage. */
  unlimited: boolean;
}

/** Summary of a brand for display purposes. */
interface BrandSummary {
  /** Stable brand identifier. */
  id: string;
  /** Human-readable brand name. */
  name: string;
  /** Source URL used for onboarding and context. */
  url: string;
  /** Lifecycle state of brand analysis and readiness. */
  status: "analyzing" | "ready" | "logo_required";
  /** Number of images generated for this brand (list endpoint). */
  imageCount: number;
  /** ISO timestamp of when the brand record was created. */
  createdAt: string;
}

/** JSON envelope returned by `GET /workspaces`. */
interface WorkspacesResponse {
  data: {
    workspaces: Workspace[];
  };
}

/** JSON envelope returned by `GET /brands?limit=50`. */
interface BrandsListResponse {
  data: {
    brands: BrandSummary[];
  };
}

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
 * Fetches the workspace list from `GET /workspaces`.
 *
 * @param apiKey - Bloom API key used for `x-api-key` authentication.
 * @returns Workspace rows from the `data.workspaces` array.
 */
async function fetchWorkspaces(apiKey: string): Promise<Workspace[]> {
  const url = `${API_BASE}/workspaces`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Bloom API error [${response.status}]: ${text}`);
  }

  if (text.length === 0) {
    throw new Error(`Bloom API error [${response.status}]: empty response body`);
  }

  const payload = JSON.parse(text) as WorkspacesResponse;

  if (
    !payload.data ||
    !Array.isArray(payload.data.workspaces)
  ) {
    throw new Error("Bloom API error: workspaces response missing data.workspaces");
  }

  return payload.data.workspaces;
}

/**
 * Fetches brand summaries from `GET /brands?limit=50`.
 *
 * @param apiKey - Bloom API key used for `x-api-key` authentication.
 * @returns Brand rows from the `data.brands` array, typed as summaries for display.
 */
async function fetchBrandSummaries(apiKey: string): Promise<BrandSummary[]> {
  const url = `${API_BASE}/brands?limit=50`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Bloom API error [${response.status}]: ${text}`);
  }

  if (text.length === 0) {
    throw new Error(`Bloom API error [${response.status}]: empty response body`);
  }

  const payload = JSON.parse(text) as BrandsListResponse;

  if (!payload.data || !Array.isArray(payload.data.brands)) {
    throw new Error("Bloom API error: brands response missing data.brands");
  }

  return payload.data.brands as BrandSummary[];
}

/**
 * Formats a brand status string with a visual indicator.
 *
 * @param status - Brand lifecycle status from the API.
 * @returns A short, human-readable label with a leading symbol.
 */
function formatStatus(status: BrandSummary["status"]): string {
  if (status === "ready") {
    return "● ready";
  }

  if (status === "analyzing") {
    return "◌ analyzing";
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

    const workspaces = await fetchWorkspaces(apiKey);

    console.log(`\n✓ Workspaces (${workspaces.length}):`);

    for (const ws of workspaces) {
      const label = ws.id === null ? " (personal)" : "";
      console.log(`  · ${ws.name}${label}`);
    }

    const brands = await fetchBrandSummaries(apiKey);

    if (brands.length === 0) {
      console.log("\n  No brands yet. Run the quickstart to onboard one.");
    } else {
      console.log(`\n✓ Brands (${brands.length}):`);

      for (const brand of brands) {
        console.log(`  · ${brand.name}`);
        console.log(`    ${formatStatus(brand.status)}`);
        console.log(`    ${brand.imageCount} image(s) generated`);
        console.log(`    ${brand.url}`);
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

checkCredits();
