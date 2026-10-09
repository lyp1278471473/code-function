---
name: code-function
description: "Turn any project into one self-contained interactive HTML map that answers: which code implements this feature/page? Show every feature of the project, and for each, all the code across frontend/backend/database/workers with exact file:line — clickable to open in the user's editor. Use when the user says 'code-function', '功能地图', '这个功能对应哪段代码', '生成功能地图', 'locate the code for <feature>', or asks to map features/pages to their implementation. Also use to refresh a map generated earlier."
metadata:
  version: 2.0.0
  license: MIT
---

# code-function

Turn any project into **one self-contained, offline HTML file** that answers the recurring
question: *"I see a feature — where is the code that implements it?"*

The front page (**功能 / Features**) lists every feature of the project as a card. Each card
shows the files and line ranges that implement that feature across the whole stack — frontend,
backend, database, workers, tests — each tagged by layer, and **clickable to open in the user's
editor at the exact line**.

Everything here is original work (see `LICENSE`); no third-party code is vendored.

## What the generated HTML contains

- **功能 / Features** *(default)* — feature → cross-stack code cards. Cards are **collapsed by
  default and expand on click** (search auto-expands matches; 展开全部/折叠全部 buttons toggle all).
  Each code line is clickable to open in the editor.
- **架构 / Architecture** — module dependency graph layered by dependency depth; hover to trace
  imports/imported-by, click for a module panel.
- **文件 / Explorer** — squarified lines-of-code treemap; drill into directories via breadcrumbs.
- **Facet tabs** *(optional)* — stack-specific pages (API surface, DB schema, routes, jobs…)
  declared in `facets.json`.

## Pipeline

```
repo ─► analyze.mjs ─► analysis.json      (files, LOC, languages, stacks, modules,
                    │                      dependency edges, entry points, git, coverage)
config ─────────────┤
features.json ──────┼─► render.mjs ─► <name>-map.html   (self-contained, offline)
facets.json ────────┤
meta.json ──────────┘
```

Two scripts, two inputs you author, one artifact.

## Procedure

Work in a **map workspace** (default `code-function-out/`).

### 1. Workspace + config
```bash
mkdir -p code-function-out
```
`code-function-out/map-config.json`:
```json
{ "repo": "/abs/path/to/repo", "title": "repo-name", "subtitle": "what it is", "out": "repo-name-map.html" }
```
Optional: `branch`, `extensions`, `ignoreDirs`, `excludeRel`, `modules`, `edges`, `analysis`,
`features`, `facets`, `meta`. `repo` must be **absolute** — it powers click-to-open.

### 2. Enumerate THIS project's features (the core work)
Never reuse example names; derive features from the actual code. First get raw material:
```bash
node <skill-dir>/scripts/analyze.mjs <repo> --out code-function-out/analysis.json --config code-function-out/map-config.json
```
This writes `analysis.json` with stacks, candidate entry points (pages, routes, Spring/Express/
FastAPI handlers, cloud-function actions, CLI commands, jobs), per-file purpose buckets
(`filesByPurpose`), and — if `features.json` exists — a `coverage` block listing files not yet
claimed by any feature.

Read the code and turn that into the project's feature list:
- **Granularity:** a thing a user would name and click (a page, screen, command, API workflow).
  Use the project's own vocabulary (README/docs/menus). Aim for 10–40 features, not one per function.
- **Sources:** routes/pages/screens; backend actions/services; DB schema/migrations; workers/jobs.
- Every entry point from `analysis.json` should map to a feature or be deliberately classified as
  infrastructure.

### 2b. Attribute code → features (coverage)
Re-run `analyze.mjs` after drafting and read `coverage.uncovered`. Attribute each remaining file to
the feature it serves, or consciously mark it infrastructure. A growing uncovered list means the
feature set is incomplete.

Then **trace each feature through every layer**, recording exact 1-based line ranges. If a layer
has no code for a feature, omit it — never invent paths to make a card look complete.

### 3. Write `features.json`
```json
{ "features": [
  { "name": "登录 / Login", "domain": "Auth",
    "desc": "邮箱+密码登录，签发 JWT，写 session 表。",
    "tags": ["auth","login"],
    "paths": [
      { "layer": "frontend", "file": "src/pages/Login.vue", "lines": "1-120", "note": "登录表单" },
      { "layer": "backend",  "file": "server/routes/auth.py", "lines": "55-98", "note": "POST /api/login" },
      { "layer": "database", "file": "db/migrations/003_sessions.sql", "lines": "1-20", "note": "session 表" }
    ] }
]}
```
`layer` is free-form; known layers get colors: frontend/ui/web, backend/api/server/service,
database/db/model/schema/migration, worker/job/queue/event/cron, cli, test, config. `file` is
repo-relative; `lines` is `"start-end"` or a single number (1-based). See
`references/features-schema.md`. (The `登录` card is only a format illustration.)

### 4. Optional: facet tabs and module prose
- `facets.json` — stack-specific pages (routes, DB schema, jobs). See `references/facets.md`.
- `meta.json` — per-module `purpose` / `keyAreas` prose shown in the architecture panel.

### 5. Render
```bash
node <skill-dir>/scripts/render.mjs code-function-out/map-config.json
```
Runs `analyze.mjs` automatically if `analysis.json` is missing, then writes `cfg.out`.

### 6. Verify (mandatory)
Open the HTML (or `python3 -m http.server` in the workspace). Check zero console errors, Features
is the default view, search filters, a code line opens the right editor URL, and the arch/treemap
render. Fix `features.json` and re-render if needed.

### 7. Hand off
Report the artifact path. Refresh after code changes:
`node <skill-dir>/scripts/render.mjs code-function-out/map-config.json` (re-run `analyze.mjs` with the
existing `analysis.json` deleted to rescan). `features.json` line numbers are hand-maintained and
drift as code changes — re-verify the features you care about.

## Rules

- **Every feature comes from the analyzed project.** Never carry over example names.
- **Cover the codebase.** Each functional unit belongs to a feature; use the `coverage` block to
  find files you haven't accounted for. Leave a file out only on purpose (infrastructure).
- **Exact, honest locations.** Repo-relative paths, real 1-based line ranges. Unsure → widen the
  range or drop line numbers; never fabricate.
- **Cross-stack by default.** A card touching only one layer is a sign you stopped tracing early.
- **Clickable locations** rely on the absolute `repo` path in `map-config.json`. Moving/renaming
  the repo breaks the links until re-rendered.
- **Read-only on the target repo.** Write only inside the workspace.
- **Self-contained output.** No CDN, no network; works offline.

## Portability

Standard `SKILL.md`; works with any agent that supports it (opencode, Claude Code, Codex, Cursor,
Gemini CLI…). Install the directory at the agent's skills path, e.g.
`~/.config/opencode/skills/code-function/`, `~/.claude/skills/code-function/`, `~/.agents/skills/code-function/`.
Requires Node.js 18+.
