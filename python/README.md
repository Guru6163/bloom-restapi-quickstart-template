# Bloom API Quickstart — Python

> Generate on-brand images with the Bloom API in under 5 minutes.

## Prerequisites

- Python 3.8+ (on macOS the command is usually `python3`, not `python`)
- A Bloom API key — [trybloom.ai/developers](https://trybloom.ai/developers)

---

## Setup

### 1. Install dependencies

```bash
python3 -m pip install -r requirements.txt
```

This installs `requests` and `python-dotenv`. On some systems `pip` or `pip3` work in place of `python3 -m pip`.

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

`quickstart.py` calls `load_dotenv()` automatically, so the `.env` file is picked up without any extra steps.

---

## Run the quickstart

```bash
python3 quickstart.py
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

Run from the `python/` directory (same `BLOOM_API_KEY` as the quickstart). Use `python3` on macOS if `python` is not found.

### `examples/generate_variants.py` — four variants, one call

```bash
python3 examples/generate_variants.py
```

Uses `BloomClient.generate_images` with `variant_count=4`, then `wait_for_images`.

### `examples/batch_generate.py` — four platforms in parallel

```bash
python3 examples/batch_generate.py
```

Uses a thread pool to start four `POST /images/generations` calls (one aspect ratio each),
then a single `wait_for_images` over all returned IDs.

### `examples/check_credits.py` — pre-flight account check

```bash
python3 examples/check_credits.py
```

Uses `BloomClient` for credits, workspaces, and brands, then prints the same style of
cost estimate table as the TypeScript `check-credits` example.

Equivalent scripts also live under `../typescript/examples/` if you want the Node versions.

---

## Environment variables

| Variable          | Required | Description                                      |
| ----------------- | -------- | ------------------------------------------------ |
| `BLOOM_API_KEY`   | ✅       | Your Bloom API key                               |
| `BLOOM_BRAND_URL` | optional | Website to onboard if you have no brands yet   |

---

## Project structure

```text
python/
├── quickstart.py
├── examples/
│   ├── generate_variants.py   ← 4 variants in one generation call
│   ├── batch_generate.py      ← parallel generations + single poll
│   └── check_credits.py       ← credits, workspaces, brands, cost table
└── README.md
```

---

## API Reference

Full docs: [trybloom.ai/api/v1/docs](https://trybloom.ai/api/v1/docs)
