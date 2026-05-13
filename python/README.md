# Bloom API Quickstart — Python

## Prerequisites

- Python 3.8+
- Bloom API key from [trybloom.ai/developers](https://trybloom.ai/developers)

## Setup

```bash
pip install requests
```

## Configure

```bash
export BLOOM_API_KEY=bloom_sk_...
```

## Run

```bash
python quickstart.py
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

## Environment variables

| Variable | Status | Purpose |
| --- | --- | --- |
| `BLOOM_API_KEY` | ✅ Required | Your Bloom API key |
| `BLOOM_BRAND_URL` | optional | URL to onboard if no brands exist |
