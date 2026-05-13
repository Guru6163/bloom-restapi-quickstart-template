# Bloom API Quickstart — Python

> Generate on-brand images with the Bloom API in under 5 minutes.

## Prerequisites

- Python 3.8+ (on macOS the command is usually `python3`, not `python`)
- A Bloom API key — [trybloom.ai/developers](https://trybloom.ai/developers)

---

## Setup

### 1. Install dependencies

```bash
python3 -m pip install requests
```

If `pip3` is on your PATH, `pip3 install requests` is equivalent. On some systems `python` / `pip` work; if you see `command not found`, use `python3` / `python3 -m pip` as above.

### 2. Configure environment

```bash
export BLOOM_API_KEY=bloom_sk_your_key_here

# Optional: only needed if you have no brands yet
export BLOOM_BRAND_URL=https://yourbrand.com
```

Or create a `.env` file:

```env
BLOOM_API_KEY=bloom_sk_your_key_here
BLOOM_BRAND_URL=https://yourbrand.com
```

`quickstart.py` reads `os.environ` only — it does not load `.env` automatically. Export variables in your shell, or load `.env` with your own tooling before running.

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
