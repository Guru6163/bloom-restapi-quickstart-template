# Bloom API Quickstart — Python

> Generate on-brand images with the Bloom API in under 5 minutes.

## Prerequisites

- Python 3.8+
- A Bloom API key — [trybloom.ai/developers](https://trybloom.ai/developers)

---

## Setup

### 1. Install dependencies

```bash
pip install requests
```

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
python quickstart.py
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

## More patterns in this repo

Variant batches, parallel multi-platform generation, and credit pre-flight checks are
implemented as runnable TypeScript scripts under `../typescript/examples/` (same REST
API — port the HTTP calls to `requests` if you need them in Python).

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
├── quickstart.py    ← BloomClient-style flow with requests.Session
└── README.md
```

---

## API Reference

Full docs: [trybloom.ai/api/v1/docs](https://trybloom.ai/api/v1/docs)
