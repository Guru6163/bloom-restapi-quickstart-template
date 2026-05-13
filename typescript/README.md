# Bloom API Quickstart — TypeScript

> Generate on-brand images with the Bloom API in under 5 minutes.

## Prerequisites

- Node.js 18+
- A Bloom API key — [trybloom.ai/developers](https://trybloom.ai/developers)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
BLOOM_API_KEY=bloom_sk_your_key_here

# Optional: only needed if you have no brands yet
BLOOM_BRAND_URL=https://yourbrand.com
```

---

## Run the quickstart

```bash
npx ts-node quickstart.ts
```

### What it does

1. Validates your API key against `GET /credits`
2. Lists your brands — onboards one from `BLOOM_BRAND_URL` if none exist
3. Generates 2 images at 16:9 using your brand's visual DNA
4. Prints the download-ready URLs

### Expected output

```text
✓ API key valid (42 credits remaining)
✓ Found 1 brand(s)
✓ Using brand: Acme Corp

⏳ Generating 2 images (16:9)...
✓ Images ready:
  → https://www.trybloom.ai/img/abc123
  → https://www.trybloom.ai/img/def456
```

---

## Examples

### generate-variants — 4 creative options from one prompt

```bash
npm run variants
```

Calls `POST /images/generations` with `variantCount: 4`.
Returns 4 different takes on the same prompt — useful for A/B testing
or presenting options to a client.

```text
✓ Using brand: Acme Corp
⏳ Generating 4 variants...
✓ 4 variants ready:
  Variant 1: https://www.trybloom.ai/img/...
  Variant 2: https://www.trybloom.ai/img/...
  Variant 3: https://www.trybloom.ai/img/...
  Variant 4: https://www.trybloom.ai/img/...
```

---

### batch-generate — All platforms in parallel

```bash
npm run batch
```

Fires 4 generation requests simultaneously with `Promise.all`.
Each platform gets its own aspect ratio.

| Platform          | Aspect Ratio |
| ----------------- | ------------ |
| Instagram Feed    | 1:1          |
| Instagram Story   | 9:16         |
| Meta Ad           | 4:5          |
| Website Hero      | 16:9         |

```text
✓ Results:

  Instagram Feed (1:1)
    → https://www.trybloom.ai/img/...

  Instagram Story (9:16)
    → https://www.trybloom.ai/img/...

  Meta Ad (4:5)
    → https://www.trybloom.ai/img/...

  Website Hero (16:9)
    → https://www.trybloom.ai/img/...
```

---

### check-credits — Pre-flight account check

```bash
npm run credits
```

Inspect your account before spending credits. Shows:

- Credit balance with low-balance warning
- All workspaces
- All brands with status and image count
- Cost estimate table for common jobs

```text
✓ Credits: 42 remaining

✓ Workspaces (2):
  · Personal (personal)
  · Acme Team

✓ Brands (1):
  · Acme Corp
    ● ready
    12 image(s) generated
    https://acme.com

── Credit cost estimates ──────────────────
  ✓  Single image (2K, fast)               1 credit
  ✓  4 variants (2K, fast)                 4 credits
  ✓  Batch — 4 platforms (2K, fast)        4 credits
  ✓  Single image (4K, pro)                2 credits
```

---

## Environment variables

| Variable          | Required | Description                                      |
| ----------------- | -------- | ------------------------------------------------ |
| `BLOOM_API_KEY`   | ✅       | Your Bloom API key                               |
| `BLOOM_BRAND_URL` | optional | Website to onboard if you have no brands yet    |

---

## Project structure

```text
typescript/
├── quickstart.ts              ← BloomClient class + full generation flow
├── examples/
│   ├── generate-variants.ts   ← 4 variants in one API call
│   ├── batch-generate.ts      ← all platforms with Promise.all
│   └── check-credits.ts       ← pre-flight account inspection
├── package.json
├── tsconfig.json
└── .env.example
```

---

## API Reference

Full docs: [trybloom.ai/api/v1/docs](https://trybloom.ai/api/v1/docs)
