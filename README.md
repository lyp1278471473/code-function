# code-function

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](#)
[![LINUX DO](https://img.shields.io/badge/community-LINUX%20DO-39ff14)](https://linux.do)

> **功能点 → 代码。** 把一个项目变成**单文件、离线、可交互的 HTML 地图**：列出项目里的每个功能点，
> 点开即可看到它横跨前端 / 后端 / 数据库 / worker 的全部代码，并**点击直接用编辑器打开对应文件行号**。

An **Agent Skill** that maps every feature of a project to the code implementing it — one
self-contained, offline HTML file. Works with opencode, Claude Code, Codex, Cursor, Gemini CLI and
any agent supporting the [SKILL.md](https://opencode.ai/docs/skills) format.

---

## 它解决什么问题

让 AI 写了一堆代码，过阵子想改某个功能（比如「登录」「结算」），却不知道代码散落在哪些文件里——
前端在哪个页面、后端在哪个接口、数据库动了哪张表。翻 grep、翻目录，很慢。

`code-function` 生成一份地图：**先看功能点清单，点开就是跨栈的全部代码行号，点行号直接在编辑器里打开。**

## 效果

- **功能 / Features**（首页）— 每个功能点一张卡，默认折叠成一行；点击展开，显示该功能在
  前端 / 后端 / 数据库 / worker / 测试各层的 `文件:行号`，每个都**可点击用编辑器打开**
  （VS Code / Cursor / Windsurf / Trae / JetBrains / Sublime / 系统默认）。
- **架构 / Architecture** — 模块依赖图（力导向，节点可拖动，悬停追踪 imports / imported-by）。
- **文件 / Explorer** — 代码量冰柱图（icicle），按目录层级下钻。
- **Facet 页**（可选）— 路由、数据库 schema、后台任务等按技术栈生成的额外页。

整个产物是**一个 HTML 文件**：无 CDN、无网络请求，双击即可离线打开。大仓上也保持轻量
（1.6 万文件的项目生成约 1.2 MB）。

## 工作方式

```
repo ─► scripts/analyze.mjs ─► analysis-summary.json  (小，给 AI 读)
                    └► analysis.json                  (全量；嵌入前会裁剪)
config ─────────────┤
features.json ──────┼─► scripts/render.mjs ─► <name>-map.html   (自包含、离线)
facets.json ────────┤
meta.json ──────────┘
```

`analyze.mjs` 扫描一次（约 0.3s / 千文件），`render.mjs` 把数据合并进模板输出 HTML。
需要 Node.js 18+，**零依赖**。

## 使用

1. 把这个目录放进 agent 的 skills 目录，例如
   `~/.config/opencode/skills/code-function/` 或 `~/.claude/skills/code-function/`。
2. 让 agent 对这个仓库运行 **code-function**，或直接跑脚本：

```bash
mkdir -p code-function-out
cat > code-function-out/map-config.json <<'EOF'
{ "repo": "/abs/path/to/repo", "title": "my-repo", "out": "my-repo-map.html" }
EOF

node scripts/analyze.mjs /abs/path/to/repo --out code-function-out/analysis.json
# 作者/AI 编写 code-function-out/features.json（见 references/features-schema.md）
node scripts/render.mjs code-function-out/map-config.json
```

浏览器打开 `code-function-out/my-repo-map.html`。

## 兼容性

标准 `SKILL.md`，任何支持该格式的 agent 都能用：**opencode、Claude Code、Codex、Cursor、
Gemini CLI** 等。安装到对应 skills 路径即可。

## 说明

- 「点击打开」依赖 `map-config.json` 里的绝对 `repo` 路径；仓库移动后需重新渲染。
- `features.json` 里的行号是快照，代码变动后会漂移，重建时需复核。

## 认可 LINUX DO 社区

本项目认可并感谢 [LINUX DO](https://linux.do) 社区。「Where possible begins.」

This project recognizes and thanks the [LINUX DO](https://linux.do) community.

## License

MIT © 2026 lyp1278471473. See [LICENSE](LICENSE). 完整开源，无未开源部分。
