# Bloom API Quickstart

Get up and running with the Bloom API in 5 minutes.

## What you'll build

- Connects to your Bloom account using your API key
- Generates on-brand images from a prompt
- Returns download-ready image URLs

## Prerequisites

- Bloom API key ([trybloom.ai/developers](https://trybloom.ai/developers))
- Node.js 18+ or Python 3.8+

## TypeScript Quickstart

### Install

```bash
cd typescript && npm install
```

### Configure

```bash
cp .env.example .env
# Add your BLOOM_API_KEY
```

### Run

```bash
npx ts-node quickstart.ts
```

### Expected output

```
✓ API key valid
✓ Using brand: Your Brand Name
⏳ Generating 2 images (16:9)...
✓ Images ready:
  → https://www.trybloom.ai/img/...
  → https://www.trybloom.ai/img/...
```

## Python Quickstart

### Install

```bash
pip install requests
```

### Configure

```bash
export BLOOM_API_KEY=bloom_sk_...
```

### Run

```bash
python quickstart.py
```

## Examples

| Script | Description |
| --- | --- |
| `generate-variants.ts` | Generate 4 variants of a single prompt |
| `batch-generate.ts` | Generate for all platforms in parallel |
| `check-credits.ts` | Check balance before generating |

## API Reference

Full docs: [trybloom.ai/api/v1/docs](https://trybloom.ai/api/v1/docs)

## Project Structure

```
bloom-api-quickstart/
├── typescript/              # Node 18+ workspace: deps, tsconfig, env template
│   ├── package.json         # Scripts for quickstart + example runners
│   ├── tsconfig.json        # Strict ES2020 / CommonJS build settings
│   ├── .env.example         # Copy to .env; holds BLOOM_API_KEY (and optional brand URL)
│   └── README.md            # TypeScript setup and env reference
├── python/                  # Python path (stdlib + requests; no package lock-in yet)
│   └── README.md            # Python setup and env reference
├── .gitignore               # Ignores secrets, build output, caches, logs
└── README.md                # This file: end-to-end quickstart overview
```

Built with ❤️ for Bloom — the Brand OS for AI-native teams.
