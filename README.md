# MerchantOS

MerchantOS is a WebMCP-enabled storefront co-pilot.

A human and an AI agent work together on the same dashboard:
the agent searches inventory, applies discounts, and drafts promo copy,
while the human reviews and approves every change on screen.

## WebMCP Tools

- `search_inventory` — search products by keyword and minimum stock (read-only)
- `apply_bulk_discount` — discount eligible high-stock products (write)
- `generate_promo_copy` — generate short promo copy via an AI endpoint (write)

## Architecture

- **Netlify** — static frontend hosting + serverless function (`/api/promo`)
- **Fireworks AI (DeepSeek v4 flash)** — short promo copy generation

The frontend registers WebMCP tools in the browser.
The `generate_promo_copy` tool calls a Netlify Function,
which calls Fireworks AI with strict token limits.
If AI is unavailable, the app falls back to deterministic mock copy.

## Cost Control

- Only one endpoint uses AI.
- At most 3 products are sent to the model.
- Output is capped (max_tokens: 200).
- Deterministic mock fallback when AI is unavailable.

## Local Testing

Serve the `public` folder with any static server, e.g.:

```bash
npx serve public
```

## WebMCP Testing

Use Chrome with `chrome://flags/#enable-webmcp-testing` enabled,
or any browser that supports the Model Context Protocol for the web.
