# Bloom API Quickstart

> Get up and running with the Bloom API in 5 minutes.

---

## What you'll build

A script that:
- Connects to your Bloom account and validates your API key
- Onboards a brand from any website URL (if you don't have one yet)
- Generates on-brand images using your brand's visual DNA
- Returns download-ready image URLs

---

## Prerequisites

| Requirement   | Version                                                  |
| ------------- | -------------------------------------------------------- |
| Bloom API key | [trybloom.ai/developers](https://trybloom.ai/developers) |
| Node.js       | 18+ (for TypeScript)                                     |
| Python        | 3.8+ (for Python)                                        |

---

## TypeScript Quickstart

### 1. Install

```bash
cd typescript
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Open `.env` and add your key:

```env
BLOOM_API_KEY=bloom_sk_your_key_here

# Optional: only needed if you have no brands yet
BLOOM_BRAND_URL=https://yourbrand.com
```

### 3. Run

```bash
npx ts-node quickstart.ts
```

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

## Python Quickstart

### 1. Install

```bash
cd python
pip install requests
```

### 2. Configure

```bash
export BLOOM_API_KEY=bloom_sk_your_key_here

# Optional: only needed if you have no brands yet
export BLOOM_BRAND_URL=https://yourbrand.com
```

### 3. Run

```bash
python quickstart.py
```

Output is identical to the TypeScript version above.

---

## Examples

TypeScript examples live in `typescript/examples/` (run from `typescript/`). Python mirrors the same three flows in `python/examples/` (run from `python/`).

**Python:** `python examples/generate_variants.py` · `python examples/batch_generate.py` · `python examples/check_credits.py`

### generate-variants.ts — Multiple creative options

Generate 4 variants of a single prompt in one API call.
Useful for A/B testing ad creatives or presenting options to a client.

```bash
npm run variants
```

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

### batch-generate.ts — All platforms at once

Generate images for every major platform in parallel using Promise.all.
One brand, four formats, one command.

```bash
npm run batch
```

```text
✓ Using brand: Acme Corp
⏳ Starting generation for 4 platforms...
✓ All generations started — waiting for images...

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

### check-credits.ts — Pre-flight check

Inspect your account before spending credits.
Shows balance, workspaces, brand statuses, and cost estimates.

```bash
npm run credits
```

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

## How it works

```text
Your code
   │
   ▼
POST /brands          ←  Onboard any website URL
   │                      Bloom extracts colors, fonts, visual DNA
   ▼
GET  /brands/:id      ←  Poll until status = "ready"
   │
   ▼
POST /images/generations  ←  Send a prompt + brandSessionId
   │                          Returns image IDs immediately
   ▼
GET  /images?ids=...  ←  Poll until status = "completed"
   │
   ▼
imageUrl              ←  Download-ready image URL
```

---

## API Reference

| Endpoint                   | What it does                       |
| -------------------------- | ---------------------------------- |
| `GET /credits`             | Check credit balance               |
| `GET /workspaces`          | List workspaces                    |
| `GET /brands`              | List brands                        |
| `POST /brands`             | Onboard a brand from a URL         |
| `GET /brands/:id`          | Poll brand status                  |
| `POST /images/generations` | Start image generation             |
| `GET /images`              | Poll image status + get URLs       |

Full docs: [trybloom.ai/api/v1/docs](https://trybloom.ai/api/v1/docs)

---

## Project structure

```text
bloom-api-quickstart/
├── typescript/
│   ├── quickstart.ts              ← main example (BloomClient + full flow)
│   ├── examples/
│   │   ├── generate-variants.ts   ← 4 variants in one call
│   │   ├── batch-generate.ts      ← all platforms in parallel
│   │   └── check-credits.ts       ← pre-flight account check
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── python/
│   ├── quickstart.py              ← same flow in Python (BloomClient)
│   ├── examples/
│   │   ├── generate_variants.py   ← 4 variants in one call
│   │   ├── batch_generate.py      ← all platforms in parallel
│   │   └── check_credits.py       ← pre-flight account check
│   └── README.md
├── .gitignore
└── README.md                      ← you are here
```

---

## Environment variables

| Variable          | Required | Description                                        |
| ----------------- | -------- | -------------------------------------------------- |
| `BLOOM_API_KEY`   | ✅       | Your Bloom API key                                 |
| `BLOOM_BRAND_URL` | optional | Website URL to onboard if you have no brands yet |

---

## Other templates

| Template                                                             | What it builds                                     |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| [bloom-slack-bot](https://github.com/Guru6163/bloom-slack-bot)       | Slack bot with slash commands for image generation |
| [bloom-figma](https://github.com/Guru6163/bloom-figma)               | Figma plugin to generate brand images in-canvas    |
| [canva-bloom-plugin](https://github.com/Guru6163/canva-bloom-plugin) | Canva app for on-brand image generation            |

---

Built with ❤️ for [Bloom](https://trybloom.ai) — the Brand OS for AI-native teams.
