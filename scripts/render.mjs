#!/usr/bin/env node
// code-function — render.mjs
// Merge analysis + features + facets + meta into one self-contained HTML viewer.
// Original work. Reads analysis.json (from analyze.mjs), injects a single JSON
// payload into assets/viewer.html, and writes the final offline map.
//
// usage: node render.mjs <map-config.json>
//
// map-config.json:
//   { "repo": "/abs/path", "title": "...", "subtitle": "...", "out": "x.html",
//     "analysis": "analysis.json", "features": "features.json",
//     "facets": "facets.json", "meta": "meta.json" }
// Paths for analysis/features/facets/meta are relative to the config's directory.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(process.argv[2] ?? "map-config.json");
if (!fs.existsSync(configPath)) { console.error(`render: config not found: ${configPath}`); process.exit(2); }
const workDir = path.dirname(configPath);
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const REPO = path.resolve(cfg.repo || ".");
if (!fs.existsSync(REPO)) { console.error(`render: repo not found: ${REPO}`); process.exit(2); }

const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

/* --------------------------------------------------- analysis (scan if needed) */
const analysisPath = path.resolve(workDir, cfg.analysis || "analysis.json");
if (!fs.existsSync(analysisPath)) {
  console.error("render: analysis.json missing — running analyze.mjs …");
  execFileSync(process.execPath, [path.join(here, "analyze.mjs"), REPO, "--out", analysisPath, "--config", configPath], { stdio: "inherit" });
}
const analysis = readJSON(analysisPath);
if (!analysis) { console.error("render: failed to read analysis.json"); process.exit(1); }

/* ------------------------------------------------------------ understanding layer */
const features = readJSON(path.resolve(workDir, cfg.features || "features.json"));
const facets = readJSON(path.resolve(workDir, cfg.facets || "facets.json"));
const meta = readJSON(path.resolve(workDir, cfg.meta || "meta.json"));

/* ------------------------------------------------------------------- git stamp */
let commit = analysis.git?.commit || "", commitDate = analysis.git?.date || "";
if (!commit) {
  try { commit = execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* not git */ }
}

// The viewer only needs a small slice of the analysis. The full file lists,
// per-purpose buckets and entry points are for the agent, not the HTML — embedding
// them ballooned output to multiple MB on large repos (slow to open). Keep the
// artifact lean: totals, languages, modules (with LOC trees) and edges.
const scan = {
  totals: analysis.totals,
  languages: analysis.languages,
  stacks: analysis.stacks,
  modules: (analysis.modules || []).map((m) => ({
    id: m.id, path: m.path, kind: m.kind, loc: m.loc, files: m.files,
    deps: m.deps, dependedBy: m.dependedBy, tree: m.tree,
  })),
  edges: analysis.edges || [],
};

const embed = {
  schema: "codefunction/embed@1",
  title: cfg.title || path.basename(REPO),
  subtitle: cfg.subtitle || "",
  generated: new Date().toISOString().slice(0, 10),
  commit,
  commitDate,
  branch: cfg.branch || analysis.git?.branch || "",
  repoRoot: REPO,
  scan,
  meta: meta || {},
  facets: facets?.facets ?? [],
  features: features?.features ?? [],
};

const tplPath = path.join(here, "..", "assets", "viewer.html");
const template = fs.readFileSync(tplPath, "utf8");
if (!template.includes("__CODEFUNCTION_DATA__")) { console.error("render: viewer template missing __CODEFUNCTION_DATA__ placeholder"); process.exit(1); }
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const html = template.replace("__CODEFUNCTION_DATA__", () => safe(JSON.stringify(embed)));
const outPath = path.resolve(workDir, cfg.out || `${embed.title}-map.html`);
fs.writeFileSync(outPath, html);
console.error(`render: ${outPath} (${Math.round(html.length / 1024)}KB${commit ? `, ${commit} @ ${commitDate}` : ""}, ${embed.features.length} features, ${((analysis.modules) || []).length} modules)`);
