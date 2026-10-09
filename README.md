# code-function

Turn any project into **one self-contained, offline HTML file** that answers:
*which code implements this feature?*

The front page lists every **feature / page** of the project as a card. Each card shows the files
and line numbers that implement it across the whole stack — frontend, backend, database, workers,
tests — and every entry is **clickable to open in your editor at the exact line**
(VS Code, Cursor, Windsurf, Trae, JetBrains, Sublime, or the OS default).

It also includes an **architecture** view (module dependency graph), a **file explorer**
(lines-of-code treemap), and optional stack-specific tabs (routes, DB schema, jobs…).

This is an original implementation. It is packaged as an [Agent Skill](https://opencode.ai/docs/skills)
(SKILL.md) so it works with opencode, Claude Code, Codex, Cursor, Gemini CLI and any agent that
supports the format.

## How it works

```
repo ─► scripts/analyze.mjs ─► analysis.json   (files, LOC, languages, stacks, modules,
                    │                          dependency edges, entry points, git, coverage)
config ─────────────┤
features.json ──────┼─► scripts/render.mjs ─► <name>-map.html   (self-contained, offline)
facets.json ────────┤
meta.json ──────────┘
```

Requires Node.js 18+. No dependencies.

## Use

1. Copy this directory into your agent's skills folder, e.g.
   `~/.config/opencode/skills/code-function/` or `~/.claude/skills/code-function/`.
2. Ask your agent to run **code-function** on a repository, or run the scripts directly:

```bash
mkdir -p code-function-out
cat > code-function-out/map-config.json <<'EOF'
{ "repo": "/abs/path/to/repo", "title": "my-repo", "out": "my-repo-map.html" }
EOF

node scripts/analyze.mjs /abs/path/to/repo --out code-function-out/analysis.json
# author code-function-out/features.json  (see references/features-schema.md)
node scripts/render.mjs code-function-out/map-config.json
```

Open `code-function-out/my-repo-map.html` in a browser.

## Output

- **功能 / Features** — feature → cross-stack code cards. Collapsed by default; click a card to
  expand, then click any code line to open it in your editor.
- **架构 / Architecture** — module dependency graph layered by dependency depth.
- **文件 / Explorer** — squarified lines-of-code treemap with directory drill-down.
- **Facet tabs** — optional, declared in `facets.json`.

## Notes

- Click-to-open relies on the absolute `repo` path in `map-config.json`; moving the repo requires
  re-rendering.
- `features.json` line numbers are a snapshot and drift as code changes.

## License

MIT © 2026 lyp1278471473. See [LICENSE](LICENSE).
