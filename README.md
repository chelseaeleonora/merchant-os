# MerchantOS

MerchantOS is a WebMCP-enabled storefront co-pilot.

A human and an AI agent work together on the same dashboard:
the agent searches inventory, applies discounts, and drafts promo copy,
while the human reviews and approves every change on screen.

## WebMCP Tools

- `search_inventory` — search products by keyword and minimum stock (read-only)
- `apply_bulk_discount` — discount eligible high-stock products (write)
- `generate_promo_copy` — generate short promo copy via a lightweight AI endpoint (write)

## Architecture

- **Netlify** — static frontend hosting (WebMCP tools run in the browser)
- **Render** — lightweight AI proxy API (added in a later step)
- **Fireworks AI (DeepSeek)** — short promo copy generation, with strict token limits and a deterministic mock fallback

## Cost Control

- Only one endpoint uses AI.
- At most 3 products are sent to the model.
- Output is capped at a few lines.
- The app falls back to deterministic mock copy when AI is unavailable.

## Local Testing

Serve the `public` folder with any static server, e.g.:

```bash
npx serve public
