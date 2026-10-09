#!/usr/bin/env node
// code-function — analyze.mjs
// One-pass static analysis of a repository for the code-function viewer.
// Original work. Emits analysis.json consumed by render.mjs.
//
// usage: node analyze.mjs <repo> [--out analysis.json] [--config map-config.json]
//
// Produces: totals, languages, stacks, modules (with per-file LOC trees),
// dependency edges, candidate entry points, per-file purpose buckets, git
// stamp, and coverage against an existing features.json.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const ROOT = path.resolve(argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--out" && argv[argv.indexOf(a) - 1] !== "--config") || ".");
const OUT = flag("--out", null);
const CONFIG = flag("--config", null);
if (!fs.existsSync(ROOT)) { console.error(`analyze: repo not found: ${ROOT}`); process.exit(2); }

const cfg = CONFIG && fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, "utf8")) : {};

/* --------------------------------------------------------------- config */
const IGNORE_DIRS = new Set([
  "node_modules", "dist", "build", "out", "target", "vendor", "coverage",
  ".git", ".next", ".turbo", ".nuxt", ".output", ".venv", "venv", "__pycache__",
  ".pytest_cache", ".mypy_cache", ".vercel", ".idea", ".vscode", "miniprogram_npm",
  "release", "prebuilds", "graphify-out", "test-results", ".cache",
  ...(cfg.ignoreDirs ?? []),
]);
// Respect .gitignore: pull simple top-level directory patterns so generated
// output (build artifacts, exports, local caches) never pollutes the map.
try {
  const gi = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  for (let line of gi.split("\n")) {
    line = line.trim().replace(/\/$/, "");
    if (!line || line.startsWith("#") || line.startsWith("!") || line.includes("*") || line.includes("/")) continue;
    IGNORE_DIRS.add(line);
  }
} catch { /* no .gitignore */ }
const SOURCE_EXTS = new Set(cfg.extensions ?? [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro",
  ".py", ".go", ".rs", ".java", ".kt", ".kts", ".scala", ".cs", ".rb", ".php",
  ".c", ".cc", ".cpp", ".h", ".hpp", ".swift", ".dart", ".ex", ".exs", ".heex",
  ".erb", ".sh", ".bash", ".sql", ".wxml", ".wxss", ".css", ".scss", ".less",
  ".html", ".graphql", ".proto", ".tf", ".json", ".yaml", ".yml", ".toml",
  ".md", ".mdx", ".rst",
]);
// Files whose text we read for entry-point mining (keep small).
const TEXT_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro",
  ".py", ".go", ".rs", ".java", ".kt", ".cs", ".rb", ".php", ".ex", ".exs",
  ".dart", ".json",
]);
// Pure-styling/markup extensions excluded from the "code files" totals? Keep them,
// but they never carry entry points.
const EXCLUDE_REL = (cfg.excludeRel ?? []).map((r) => new RegExp(r));

const LANG_NAMES = {
  ".ts": "TypeScript", ".tsx": "TypeScript/React", ".js": "JavaScript", ".jsx": "JavaScript/React",
  ".mjs": "JavaScript", ".cjs": "JavaScript", ".vue": "Vue", ".svelte": "Svelte",
  ".astro": "Astro", ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java",
  ".kt": "Kotlin", ".kts": "Kotlin", ".scala": "Scala", ".cs": "C#", ".rb": "Ruby",
  ".php": "PHP", ".c": "C", ".cc": "C++", ".cpp": "C++", ".h": "C/C++ header",
  ".hpp": "C++ header", ".swift": "Swift", ".dart": "Dart", ".ex": "Elixir",
  ".exs": "Elixir", ".heex": "Elixir/HEEx", ".erb": "ERB", ".sh": "Shell",
  ".bash": "Shell", ".sql": "SQL", ".wxml": "WXML", ".wxss": "WXSS", ".css": "CSS",
  ".scss": "SCSS", ".less": "Less", ".html": "HTML", ".graphql": "GraphQL",
  ".proto": "Protobuf", ".tf": "Terraform", ".json": "JSON", ".yaml": "YAML",
  ".yml": "YAML", ".toml": "TOML", ".md": "Markdown", ".mdx": "MDX", ".rst": "reST",
};

/* ------------------------------------------------------------------ walk */
function countLines(abs) {
  try {
    const buf = fs.readFileSync(abs);
    if (buf.includes(0)) return 0; // binary-ish
    let n = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++;
    if (buf.length && buf[buf.length - 1] !== 10) n++;
    return n;
  } catch { return 0; }
}

const files = []; // { path, abs, ext, loc }
function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".github") continue;
    const abs = path.join(dir, e.name);
    const rel = path.relative(ROOT, abs);
    if (EXCLUDE_REL.some((r) => r.test(rel))) continue;
    if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name)) walk(abs); continue; }
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) continue;
    files.push({ path: rel.split(path.sep).join("/"), abs, ext, loc: countLines(abs) });
  }
}
walk(ROOT);

/* ------------------------------------------------------------- language */
const byExt = new Map();
for (const f of files) {
  const cur = byExt.get(f.ext) || { ext: f.ext, lang: LANG_NAMES[f.ext] || f.ext, files: 0, loc: 0 };
  cur.files++; cur.loc += f.loc; byExt.set(f.ext, cur);
}
const languages = [...byExt.values()].sort((a, b) => b.loc - a.loc || b.files - a.files);
const totals = { files: files.length, loc: files.reduce((s, f) => s + f.loc, 0) };

/* ---------------------------------------------------------------- stacks */
const stacks = new Set();
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const anyExt = (e) => files.some((f) => f.ext === e);
if (anyExt(".wxml") && exists("miniprogram")) stacks.add("wechat-miniprogram");
if (exists("app.json") || files.some((f) => f.path.endsWith("app.json"))) stacks.add("wechat-miniprogram");
if (exists("package.json")) stacks.add("node");
if (anyExt(".tsx") || anyExt(".jsx")) stacks.add("react");
if (anyExt(".vue")) stacks.add("vue");
if (anyExt(".svelte")) stacks.add("svelte");
if (exists("go.mod")) stacks.add("go");
if (exists("Cargo.toml")) stacks.add("rust");
if (exists("pubspec.yaml")) stacks.add("flutter");
if (exists("mix.exs")) stacks.add("elixir");
if (exists("manage.py")) stacks.add("django");
if (exists("Gemfile")) stacks.add("ruby");
if (exists("pom.xml") || exists("build.gradle") || exists("build.gradle.kts")) stacks.add(anyExt(".java") ? "java" : "jvm");
if (anyExt(".py")) stacks.add("python");
if (exists("next.config.js") || exists("next.config.mjs") || exists("next.config.ts")) stacks.add("next");

/* --------------------------------------------------------------- modules */
// Module = explicit config, else workspace globs, else top-level dir with code.
function topLevelOf(rel) {
  const i = rel.indexOf("/");
  return i < 0 ? "(root)" : rel.slice(0, i);
}
let moduleDefs = cfg.modules;
if (!moduleDefs || !moduleDefs.length) {
  // workspace detection
  const wsRoots = [];
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    if (Array.isArray(pkg.workspaces)) wsRoots.push(...pkg.workspaces);
    else if (pkg.workspaces?.packages) wsRoots.push(...pkg.workspaces.packages);
  } catch { /* no root package */ }
  if (!wsRoots.length && exists("pnpm-workspace.yaml")) {
    const y = fs.readFileSync(path.join(ROOT, "pnpm-workspace.yaml"), "utf8");
    for (const m of y.matchAll(/-\s*["']?([^"'\n]+)["']?/g)) wsRoots.push(m[1].trim());
  }
  const expanded = [];
  for (const g of wsRoots) {
    const base = g.replace(/\/\*+$/, "");
    if (!exists(base)) continue;
    try {
      for (const d of fs.readdirSync(path.join(ROOT, base), { withFileTypes: true }))
        if (d.isDirectory()) expanded.push(`${base}/${d.name}`);
    } catch { /* ignore */ }
  }
  const known = expanded.filter((p) => files.some((f) => f.path.startsWith(p + "/")));
  moduleDefs = known.length
    ? known.map((p) => ({ id: p, path: p }))
    : [...new Set(files.map((f) => topLevelOf(f.path)))].map((p) => ({ id: p, path: p }));
}

// Build LOC tree + per-module file list.
function buildTree(modPath, moduleFiles) {
  const root = { n: path.basename(modPath) || modPath, v: 0, f: 0, c: [] };
  const dirs = new Map([[ "", root]]);
  const ensureDir = (relDir) => {
    if (dirs.has(relDir)) return dirs.get(relDir);
    const parent = ensureDir(relDir.includes("/") ? relDir.slice(0, relDir.lastIndexOf("/")) : "");
    const node = { n: relDir.slice(relDir.lastIndexOf("/") + 1), v: 0, f: 0, c: [] };
    parent.c.push(node); dirs.set(relDir, node);
    return node;
  };
  const within = (p) => {
    if (modPath === "(root)") return !p.includes("/");
    return p === modPath || p.startsWith(modPath + "/");
  };
  for (const f of moduleFiles) {
    if (!within(f.path)) continue;
    let sub = f.path;
    if (modPath !== "(root)") sub = f.path.slice(modPath.length + 1);
    const dirRel = sub.includes("/") ? sub.slice(0, sub.lastIndexOf("/")) : "";
    const dir = ensureDir(dirRel);
    dir.c.push({ n: sub.slice(sub.lastIndexOf("/") + 1), v: f.loc, e: f.ext });
    // propagate counts up
    let d = dirRel;
    while (true) {
      const node = dirs.get(d); node.v += f.loc; node.f += 1;
      if (!d) break;
      d = d.includes("/") ? d.slice(0, d.lastIndexOf("/")) : "";
    }
  }
  return root;
}

const modules = moduleDefs.map((m) => {
  const mFiles = files.filter((f) => m.path === "(root)" ? !f.path.includes("/") : (f.path === m.path || f.path.startsWith(m.path + "/")));
  return {
    id: m.id, path: m.path, kind: m.kind || "app",
    loc: mFiles.reduce((s, f) => s + f.loc, 0),
    files: mFiles.length,
    deps: [], dependedBy: [],
    tree: buildTree(m.path, files),
  };
});
const modById = new Map(modules.map((m) => [m.id, m]));

/* ----------------------------------------------------------- dependencies */
// Edges from explicit config, else from import/require mentions of other module paths.
function moduleRefsText(text, selfId) {
  const found = new Set();
  for (const m of modules) {
    if (m.id === selfId || m.path === "(root)") continue;
    const esc = m.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`["'./]${esc}(/|["'])`);
    if (re.test(text)) found.add(m.id);
  }
  return found;
}
const edges = [];
if (Array.isArray(cfg.edges)) {
  for (const [from, to] of cfg.edges) edges.push({ from, to });
} else if (modules.length > 1 && modules.length <= 60) {
  const seen = new Set();
  for (const m of modules) {
    const mFiles = files.filter((f) => f.path === m.path || f.path.startsWith(m.path + "/"));
    const texts = [];
    for (const f of mFiles.slice(0, 400)) {
      if (!TEXT_EXTS.has(f.ext)) continue;
      try { texts.push(fs.readFileSync(f.abs, "utf8")); } catch { /* ignore */ }
    }
    const deps = new Set();
    for (const t of texts) for (const id of moduleRefsText(t, m.id)) if (!deps.has(id)) { deps.add(id); }
    for (const id of deps) {
      const key = m.id + "\u0000" + id;
      if (seen.has(key)) continue; seen.add(key);
      edges.push({ from: m.id, to: id });
      m.deps.push(id); (modById.get(id)?.dependedBy || []).push(m.id);
    }
  }
}
for (const m of modules) { m.deps = [...new Set(m.deps)]; m.dependedBy = [...new Set(m.dependedBy)]; }

/* --------------------------------------------------------- entry points */
const entryPoints = [];
const add = (kind, file, name, line) => entryPoints.push({ kind, file, name, line: line ?? null });

const isIndexish = (p) => /(^|\/)(index|main|app|server)\.(t|j)sx?$/.test(p);
const ROUTE_FILE = /(^|\/)(pages|views|screens|routes)\//;
const APP_ROUTER = /(^|\/)(app|src\/app|src\/routes)\/.*(page|route|layout)\.(t|j)sx?$/;
const HTTP_JS = /\.(get|post|put|patch|delete)\(\s*[`"'](\/[^`"')\s]*)/;
const HTTP_PY = /@(app|router|api|bp)\.(get|post|put|patch|delete|route)\(\s*[`"']([^`"']+)/;
const SPRING_FULL = /@(Get|Post|Put|Patch|Delete|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/;
const SPRING_BARE = /@(Get|Post|Put|Patch|Delete)Mapping\b/;
const SPRING_BEAN = /@(RestController|Controller|Service|Repository|Component|Configuration)\b/;
const DOTNET_ATTR = /\[Http(Get|Post|Put|Patch|Delete)\s*\(\s*["']([^"']+)["']/;
const GRAPHQL = /@(Query|Mutation|Subscription)\(/;
const SERVERFN = /createServerFn\(|createServerFileRoute\(/;
const CLI_HINT = /\.command\(\s*[`"']|subcommand|argparse|click\.command|@click\.command|command\s*\(\s*[`"']/;
const JOB_HINT = /(cron|@task\b|perform\(|runStep\(|Worker\b|schedule\(|setInterval\()/;

for (const f of files) {
  const p = f.path;
  if (ROUTE_FILE.test(p)) add("page", p, p, null);
  else if (APP_ROUTER.test(p)) add("route-page", p, p, null);
  else if (isIndexish(p) && !p.includes("/routes/")) add("entry-file", p, p, null);

  if (!TEXT_EXTS.has(f.ext)) continue;
  let text = "";
  try { text = fs.readFileSync(f.abs, "utf8"); } catch { continue; }

  if (p.endsWith("app.json")) {
    for (const m of text.matchAll(/"pages\/([^"]+)"/g)) add("mini-page", p, m[1], null);
  }

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m;
    if ((m = HTTP_JS.exec(l))) add("http", p, `${m[1].toUpperCase()} ${m[2]}`, i + 1);
    if ((m = HTTP_PY.exec(l))) add("http", p, `${m[2].toUpperCase()} ${m[3]}`, i + 1);
    if ((m = SPRING_FULL.exec(l))) add("spring", p, `${m[1].toUpperCase()} ${m[2]}`, i + 1);
    else if ((m = SPRING_BARE.exec(l))) add("spring", p, `${m[1].toUpperCase()}`, i + 1);
    if (SPRING_BEAN.test(l)) add("bean", p, l.trim().slice(0, 64), i + 1);
    if ((m = DOTNET_ATTR.exec(l))) add("http", p, `${m[1].toUpperCase()} ${m[2]}`, i + 1);
    if (GRAPHQL.test(l)) add("graphql", p, l.trim().slice(0, 64), i + 1);
    if (SERVERFN.test(l)) add("server-fn", p, l.trim().slice(0, 64), i + 1);
    else if (CLI_HINT.test(l)) add("cli", p, l.trim().slice(0, 64), i + 1);
    if (JOB_HINT.test(l)) add("job", p, l.trim().slice(0, 64), i + 1);
  }
}

/* -------------------------------------------------------------- purposes */
function purpose(rel) {
  const p = rel;
  if (/(^|\/)(test|tests|spec|__tests__|e2e)\//i.test(p) || /\.(test|spec)\./i.test(p)) return "test";
  if (/(^|\/)(pages|views|screens|components|ui|widgets)\//.test(p) || /\.(tsx|jsx|vue|svelte|wxml|html)$/.test(p)) return "frontend";
  if (/(controller|controllers)\//i.test(p) || /Controller\.(java|cs|kt)$/.test(p)) return "backend";
  if (/(cloudfunctions|services?|backend|\/api\/|handlers?|routers?|usecases?|endpoints?)\//i.test(p)) return "backend";
  if (/(models?|schema|migrations?|entit(y|ies)|dao|repositories?|repos?|\/db\/)/i.test(p) || /\.sql$/.test(p) || /Entity\.(java|kt)$/.test(p)) return "database";
  if (/(jobs?|workers?|queues?|tasks?|cron|schedulers?)/i.test(p)) return "worker";
  if (/(config|settings|env|constants)/i.test(p) || /application\.(yml|yaml|properties)$/.test(p)) return "config";
  if (/(lib|utils?|helpers?|shared|common)/i.test(p)) return "shared-util";
  return "app";
}
const filesForCoverage = files.map((f) => ({ path: f.path, loc: f.loc, purpose: purpose(f.path) }));
const byPurpose = {};
for (const f of filesForCoverage) (byPurpose[f.purpose] ||= []).push(f.path);

/* ---------------------------------------------------------------- git */
let git = {};
try {
  const run = (a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  git = { commit: run(["rev-parse", "--short", "HEAD"]), date: run(["log", "-1", "--format=%ad", "--date=format:%Y-%m-%d"]), branch: run(["rev-parse", "--abbrev-ref", "HEAD"]) };
} catch { git = {}; }

/* ------------------------------------------------------------ coverage */
let coverage = { note: "no features.json found; write one, then re-run analyze to check coverage" };
const featCandidates = [
  cfg.features ? path.resolve(cfg.features) : null,
  path.join(process.cwd(), "features.json"),
  path.join(ROOT, "code-function-out", "features.json"),
].filter(Boolean);
const featPath = featCandidates.find((p) => fs.existsSync(p));
if (featPath) {
  try {
    const feat = JSON.parse(fs.readFileSync(featPath, "utf8"));
    const claimed = new Set();
    for (const ff of feat.features || []) for (const pa of ff.paths || []) claimed.add(pa.file);
    const uncovered = filesForCoverage
      .filter((f) => f.purpose !== "test" && !claimed.has(f.path))
      .map((f) => f.path);
    coverage = { source: featPath, claimedFiles: claimed.size, uncoveredNonTestFiles: uncovered.length, uncovered: uncovered.slice(0, 300) };
  } catch (e) { coverage = { error: String(e.message) }; }
}

/* --------------------------------------------------------------- output */
const analysis = {
  schema: "codefunction/analysis@1",
  generatedAt: new Date().toISOString(),
  root: ROOT,
  git,
  totals,
  languages,
  stacks: [...stacks],
  modules,
  edges,
  entryPoints,
  files: filesForCoverage,
  filesByPurpose: byPurpose,
  coverage,
};

const text = JSON.stringify(analysis, null, 2);
if (OUT) { fs.writeFileSync(path.resolve(OUT), text); console.error(`analyze: ${OUT} (${totals.files} files, ${totals.loc} loc, ${modules.length} modules, ${entryPoints.length} entries)`); }
else console.log(text);
