# Bloom API Quickstart — TypeScript

## Prerequisites

- Node.js 18+
- Bloom API key from [trybloom.ai/developers](https://trybloom.ai/developers)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `BLOOM_API_KEY`.

## Run

```bash
npx ts-node quickstart.ts
```

## Expected output

```
✓ API key valid
✓ Using brand: Your Brand Name
⏳ Generating 2 images (16:9)...
✓ Images ready:
  → https://www.trybloom.ai/img/...
  → https://www.trybloom.ai/img/...
```

## Examples

| Script | Description |
| --- | --- |
| `generate-variants.ts` | Generate 4 variants of a single prompt |
| `batch-generate.ts` | Generate for all platforms in parallel |
| `check-credits.ts` | Check balance before generating |

## Environment variables

| Variable | Status | Purpose |
| --- | --- | --- |
| `BLOOM_API_KEY` | ✅ Required | Your Bloom API key |
| `BLOOM_BRAND_URL` | optional | URL to onboard if no brands exist |
