# code-function v2 — 设计文档（Clean-room 重写）

目标：**完全原创**（不复制 codebase-map 任何代码/文本）、**保留全部功能**（Features 功能点定位
+ 点击跳转 + Architecture 架构图 + File explorer 树图 + facet 扩展页），可作为独立作品署名。

## 1. 与旧版的边界

| 部分 | 旧版来源 | v2 |
|---|---|---|
| 扫描器 scan.mjs | 复用上游 | **重写为 analyze.mjs**（原创算法与数据结构） |
| 渲染 build.mjs | 复用上游 | **重写为 render.mjs** |
| viewer.html（HTML/CSS/JS） | 上游框架 + 我们的 Features | **完全重写**（原创视觉与交互） |
| discover.mjs | 我们原创 | 保留并整合进 analyze.mjs |
| facets.md 参考 | 复用上游 | **重写为 references/facets.md**（原创文案 + 我们自己的配方） |
| SKILL.md | 我们原创 | 重写 |

产物交付：无上游版权文本，LICENSE 由你署名。

## 2. 架构与数据流

```
repo ──┐
       ├─ analyze.mjs ──► analysis.json   （一次扫描：文件/LOC/语言/模块/依赖/入口/git）
       │                                   （可选读 features.json 做覆盖核对）
config ┘
features.json（人/AI 写的理解层）──┐
facets.json（可选的扩展页）────────┼─ render.mjs ──► <repo>-map.html（自包含，离线）
meta.json（可选模块描述）──────────┘
```

- **单数据文件** `analysis.json`，结构自定（见 §3）。
- render 把 `analysis + features + facets + meta` 合并成 `EMBED` 注入模板。

## 3. 数据模型（原创）

### analysis.json
```jsonc
{
  "schema": "codefunction/analysis@1",
  "generatedAt": "ISO",
  "root": "/abs/repo",
  "git": { "commit": "abc1234", "date": "2026-10-08", "branch": "main" },
  "totals": { "files": 1713, "loc": 1002008 },
  "languages": [ { "ext": ".ts", "files": 464, "loc": 300000 } ],
  "stacks": ["node", "react/next", "python"],
  "modules": [                       // 模块 = 顶层工作区或顶层目录
    { "id": "server", "path": "server", "kind": "service",
      "loc": 500000, "files": 800,
      "deps": ["shared"], "dependedBy": [],
      "tree": { "n": "server", "v": 500000, "f": 800, "c": [ ... ] } } // LOC 树（树图用）
  ],
  "edges": [ { "from": "server", "to": "shared" } ],
  "entryPoints": [ { "kind": "http-route", "file": "server/routes/plans.ts", "name": "GET /api/plans", "line": 103 } ],
  "files": [ { "path": "server/routes/plans.ts", "loc": 582, "purpose": "backend" } ], // 覆盖核对用
  "coverage": { "claimed": 116, "uncovered": [ "..." ] }   // 若提供 features.json
}
```

### features.json（沿用现结构，不变）
```jsonc
{ "features": [
  { "name": "计划看板与调度 Plans", "domain": "规划执行", "desc": "...", "tags": ["plans"],
    "paths": [ { "layer": "backend", "file": "server/services/plan-service.ts", "lines": "1-1172", "note": "计划服务" } ] }
]}
```

### facets.json（沿用现结构，不变）
沿用 kind = tiles / barlist / groups / tree / loclist 的声明式块，viewer 通用渲染。

## 4. 功能清单（全部保留）

1. **Features 页**（默认）— 功能点卡片 → 跨栈代码路径 → **点击在编辑器按行打开**。
2. **Architecture 页** — 模块依赖图，按依赖深度分层，hover 高亮 imports/imported，点击看面板。
3. **File explorer 页** — 按 LOC 的树图（treemap），可下钻 + 面包屑，类型着色。
4. **Facet 页** — 可选的 stack 专属页（路由/DB/jobs…）。
5. 顶部统计、明暗主题、搜索、覆盖核对。
6. 点击跳转：VS Code / Cursor / Windsurf / Trae / JetBrains / Sublime / 系统默认。

## 5. 文件清单

```
code-function/
  SKILL.md
  LICENSE                     # 你的署名
  scripts/analyze.mjs         # 扫描：stats / modules / deps / entries / loc-tree / git / coverage
  scripts/render.mjs          # 合并 + 注入 + 输出
  assets/viewer.html          # 原创单文件查看器
  references/
    features-schema.md        # features.json 字段与写法
    facets.md                 # facet 数据 + 各栈抽取配方
```

## 6. 兼容与迁移

- 命令对齐旧习惯：`node scripts/analyze.mjs <repo> [--out analysis.json]`、
  `node scripts/render.mjs <config.json>`。
- `map-config.json` 沿用：`{ repo, title, subtitle, out, ... }`。
- 现有 zhixu / linghelp 的 `features.json` 直接可用，无需改动。

## 7. 验证标准（沿用）

- Playwright headless：四个 tab 可切换、零 console/page 错误、Features 默认页、搜索过滤、
  点击产出正确编辑器 URL、树图/架构图有内容。
- 至少两个项目：zhixu（大、多栈）+ linghelp（小程序）。
