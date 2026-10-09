# features.json — schema and writing guide

The Features page is the point of code-map. Its content is `features.json` in the map workspace.

## Shape

```json
{
  "features": [
    {
      "name": "支付结算 Checkout",     // required — the name a user recognizes
      "domain": "交易",                  // optional — grouping caption
      "desc": "选择商品→创建订单→支付→回调。", // optional — 1-2 plain sentences from reading the code
      "tags": ["checkout", "payment", "支付"], // optional — extra search keywords/synonyms
      "paths": [                         // the cross-stack implementation
        { "layer": "frontend", "file": "client/src/pages/Checkout.tsx", "lines": "1-240", "note": "结算页" },
        { "layer": "backend",  "file": "server/routes/orders.ts", "lines": "40-120", "note": "POST /api/orders" },
        { "layer": "backend",  "file": "server/services/payment.ts", "lines": "1-180", "note": "支付网关" },
        { "layer": "database", "file": "server/db/schema.ts", "lines": "60-88", "note": "orders / payments 表" },
        { "layer": "worker",   "file": "server/jobs/payment-webhook.ts", "lines": "1-90", "note": "回调处理" }
      ]
    }
  ]
}
```

## Field rules

- `name` (required) — displayed as the card title. Use the project's own vocabulary.
- `domain` — small caption above the title; group related features with the same value.
- `desc` — one or two sentences on **what it does and how**, based on files actually read.
- `tags` — extra search terms. The search box matches name + domain + desc + tags + file paths.
- `paths[]` (each):
  - `layer` — free string. Known values get a colored chip:
    `frontend, ui, web, component` (blue) · `backend, api, server, service` (teal) ·
    `database, db, model, schema, migration` (violet) · `worker, job, queue, event, cron` (amber) ·
    `cli` (pink) · `test` (red) · `config` (orange). Anything else renders grey.
  - `file` — repo-relative path with forward slashes.
  - `lines` — `"start-end"` or a single number, **1-based**. Omit if unknown (the editor opens at
    line 1).
  - `note` — short purpose caption.

## Writing guidance

- Start from `analysis.json`'s `entryPoints` and `filesByPurpose`; do not guess structure from
  documentation alone.
- One feature card should usually span multiple layers. A single-layer card often means tracing
  stopped too early.
- After writing, re-run `analyze.mjs` and read `coverage.uncovered`: attach each remaining
  non-test file to a feature or classify it as infrastructure. Aim to account for the codebase,
  not just the obvious entry points.
- Line numbers are snapshots. They drift as code changes; re-verify on each refresh.
