# facets.json — optional stack-specific tabs

The first three tabs are computed from `analysis.json` and work for any repo. Everything else —
API surface, DB schema, routes, background jobs, CLI commands, GraphQL types — is a **facet**: a
declarative JSON block you generate with a small throwaway extractor for the repo's stack. The
viewer renders facets with generic section renderers; you never edit the HTML.

Write `facets.json` in the map workspace:

```json
{ "facets": [ <facet>, ... ] }
```

## Facet shape

```json
{
  "id": "api",                    // unique; becomes the tab id (#v-facet-api)
  "nav": "API surface",           // tab label (defaults to title)
  "title": "tRPC API surface",    // h2 on the page
  "headline": "28 routers · 307 procedures",  // appended to h2, lighter
  "sub": "one row per router in packages/api/src/router",  // right-aligned caption
  "columns": 2,                   // 2 = render sections side by side (optional)
  "sections": [ <section>, ... ]
}
```

## Section kinds

### `tiles` — stat tile row
```json
{ "kind": "tiles", "tiles": [ { "v": "75", "l": "tables", "s": "60 app · 15 auth" } ] }
```

### `barlist` — ranked stacked bars
For "N things sized by counts" (routers by procedures, controllers by actions, GraphQL types by
fields). Gets a sort toggle and legend automatically.
```json
{ "kind": "barlist", "title": "routers",
  "series": [ { "k": "q", "label": "queries" }, { "k": "m", "label": "mutations" } ],
  "rows": [ { "label": "admin", "values": { "q": 18, "m": 25 }, "meta": "18q 25m", "tip": "router/admin.ts · 2.0k loc" } ] }
```

### `groups` — cards of chips, grouped by domain
For DB tables by domain, env vars by service, events by producer. `accent: true` colors one card.
```json
{ "kind": "groups", "groups": [
  { "title": "Projects", "chips": ["project", "project_member"] },
  { "title": "Auth", "accent": true, "chips": ["user", "session"] } ] }
```

### `tree` — collapsible hierarchy with badges
For route trees, CLI command trees, module namespaces. Badge colors assigned per distinct badge
string in order of first appearance — put the most important badge first.
```json
{ "kind": "tree", "title": "Web routes", "sub": "apps/web/src/app",
  "items": [ { "label": "admin", "badge": "page", "children": [ { "label": "users", "badge": "page" } ] },
             { "label": "api/health", "badge": "api" } ] }
```

### `loclist` — labeled rows with a proportional bar
For background jobs, workflows, migrations, scripts — "name + size/steps". A row of
`{ "section": "…" }` inserts a subheading; `muted: true` greys a row.
```json
{ "kind": "loclist", "title": "Background workflows",
  "rows": [ { "label": "github-sync", "meta": "18 steps · 934 loc", "bar": 934 },
            { "section": "support modules" },
            { "label": "helpers", "meta": "519 loc", "bar": 519, "muted": true } ] }
```

## Extractor recipes

Write one throwaway Node script (`extract-facets.mjs`) that greps the repo and writes
`facets.json`. Keep it regex-based — names and counts, not a parser.

- **Next.js app router:** walk `app/`; a dir with `page.*` → badge `page`, `route.*` → badge `api`;
  strip `(group)` segments; build a nested tree. Don't lose the root `/` route.
- **Express/Fastify/Hono:** `\.(get|post|put|patch|delete)\(\s*["']([^"']+)` → tree or barlist by method.
- **FastAPI/Flask:** `@(app|router)\.(get|post|...)(["'][^"']+)` → tree.
- **Spring:** `@(Get|Post|...)Mapping("...")` and the class-level `@RequestMapping` prefix → tree.
- **Django:** `path\(["']([^"']+)` in `urls.py`, grouped by app → tree.
- **Rails:** parse `config/routes.rb` (`resources :x`, `get "y"`) → tree.
- **Prisma:** `^model (\w+)` in `schema.prisma` → groups by relation/prefix.
- **Drizzle:** `pgTable\(\s*["'](\w+)` → table names; group by domain.
- **GraphQL:** `type (\w+)` / `input (\w+)` in SDL → groups; fields-per-type → barlist.
- **Go:** chi `r\.(Get|Post|...)`, gin/echo `\.(GET|POST|...)`, net/http `HandleFunc` → tree.
- **Rust:** axum `.route("...", get(...))`, actix/Rocket `#[get("...")]` → tree.
- **Elixir/Phoenix:** `(get|post|...)"..."` and `resources "..."` in `router.ex` → tree; Ecto
  `schema "..."` → groups; Oban `use Oban.Worker` → loclist.
- **Jobs/queues/cron:** workflow files → loclist with step counts (Sidekiq `perform`, Celery
  `@task`, Oban `perform/1`, BullMQ processors, `DBOS.runStep`).
- **CLI:** subcommand registrations (`command("...")`, clap derives, cobra `Use:`) → tree.

These are worked examples, not a whitelist. For any stack: find the registration idiom, grep it,
and emit whichever section kind fits. If an idiom is too dynamic to grep, run the framework's own
introspection command (`rails routes`, `mix phx.routes`, `manage.py show_urls`) and parse output —
only if the project already builds, and never install dependencies just for the map.

Build only facets with real signal — 2–3 good ones beat 5 thin. A facet with < ~5 data points
belongs folded into another facet's `tiles`.
