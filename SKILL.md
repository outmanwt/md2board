---
name: md2board
description: Build, update, or deploy interactive spec-driven project lifecycle and progress workbenches (md2board). This skill should be used when the user wants to visualize project roadmap progress, generate interactive multi-level drilldown PPT-like progress decks from structured Markdown, track milestone acceptance checklists with in-place bidirectional mutation, inspect code diff snapshots and telemetry, produce self-contained presentation-grade progress dashboard HTML files, or render a compact interactive progress board inline in chat when no file is needed.
argument-hint: "[markdown-path-or-topic] [--output file.html]"
license: MIT
metadata:
  version: "3.2.0"
  author: outmanwt
---

# md2board：规范驱动的项目生命周期与进度工作台

把任意结构化 Markdown 规格稳定映射为**汇报级、四级下钻、勾选实时回算**的进度看板。两种渲染路径共用同一套进度契约：百分比只由原子验收项派生，空小节不参与加权。

## 何时激活此技能

- 需要**直观可视化项目进度与研发里程碑**，而非单调的清单或 KPI 列表时。
- 需要把现有 `progress.md`、`roadmap.md`、`prd.md` 或任务清单渲染为**现代化前端交互看板**时。
- 要求**首页只展示大阶段进度**，支持像 PPT 一样逐级下钻并随时回退时。
- 需要在界面上**就地勾选验收清单**、即刻重算完成率时。
- 需要**深浅色主题、全局脉冲仪表盘、Ctrl+K 快捷跳转、增量 diff 快照、遥测观测抽屉**的单文件交付成果时。
- 只想在对话里**快速看一眼进度、不需要文件**时（走内联渲染路径）。

---

## 核心架构

1. **视觉基调**：北欧浅色（Nordic Light）与黑曜石深色（Obsidian Dark），悬浮毛玻璃胶囊顶栏。
2. **全局脉冲圆环**：环形锥形渐变，数字与动画毫秒级联动。
3. **四级空间下钻**：
   - **Level 1** 顶层阶段（Phase）卡片与推进轴。
   - **Level 2** 架构章节（Chapter）卡片。
   - **Level 3** 执行小节（Section）列表，含进度微条。
   - **Level 4** 左右分栏：左侧验收复选清单，右侧代码增量快照（`increment.diff`）。
4. **遥测抽屉**：快捷键 `L`，事件流与架构决策双栏。
5. **快捷指令搜索**：`Ctrl + K` / `Cmd + K` 模糊检索任意层级并直达。
6. **规格编辑器**：快捷键 `M` 呼出 Markdown 编辑器，支持上传、复制、导出。

---

## 工作流

### 步骤 1：准备或规范化 Markdown 规格

按四级规范组织输入（完整语法见 [spec-contract.md](./references/spec-contract.md)）：

````markdown
# 项目标题
> 项目整体愿景与核心目标

## Phase 阶段名称
> 阶段目标说明

### Chapter 章节名称
> 章节职责说明

#### Section 小节名称
> 小节落地目标
- [x] 已完成验收项
- [ ] 待完成验收项

```diff
+ 新增关键逻辑
- 废弃旧代码
```
````

### 步骤 2：生成单文件 md2board 看板

**方式 A（推荐）：CLI 脚本自动生成**。脚本已处理全部转义：

```bash
node scripts/generate_deck.js path/to/progress.md --output dashboard.html
```

**方式 B：代码级嵌入**。读取规格源码，安全转义后替换 [template.html](./assets/template.html) 中的 `__INITIAL_MARKDOWN__` 占位符。手工转义时务必依次处理：`\` → `\\`、`<` → `\u003c`（防止 `</script>` 破坏宿主标签）、`` ` `` → `` \` ``、`$` → `\$`。

### 步骤 3：验证与交付

在浏览器中打开产物（单文件、无外链字体、离线可用），逐项确认：

- Level 1 阶段卡片与全局脉冲仪表盘显示的百分比准确，阶段轴标签带完成率。
- 点击阶段、章节、小节能顺畅下钻；`Esc`、`Backspace` 或面包屑能返回。
- 进入 Level 4 勾选/取消验收框后：当前小节百分比即时变动、全局脉冲圆环与阶段轴同步重算、遥测记录 `mutate` 事件、按 `M` 可看到 `- [x]` / `- [ ]` 已同步更新。
- **落盘闭环**：界面勾选只写浏览器缓存（按规格内容哈希隔离，多个看板互不覆盖）。要把变更同步回磁盘源文件，按 `M` 打开规格编辑器，点「导出 .md」下载并覆盖。
- `Ctrl + K` 模糊跳转可用（macOS 提示为 ⌘K）；深浅色主题均清晰。

**无浏览器自动化时的自证法**（不必装 playwright，产物是同步渲染的，无头 Chrome 就够）：

```bash
# 中文路径先复制到纯 ASCII 临时目录，避免 file:/// 转义问题
cp "docs/路线图看板.html" /tmp/deck.html
chrome --headless=new --disable-gpu --virtual-time-budget=4000 \
       --dump-dom "file:////tmp/deck.html" > dom.html
```

拿到 `dom.html` 后做三项对账，一次覆盖「解析正确 / 模板无注入破碎 / 百分比回算正确」：

1. 源 Markdown 的 `- [x]` 与 `- [ ]` 计数 → 手算期望完成率，看是否出现在产物里的 `>NN%<` 之中；
2. 产物中出现的全部百分比，应与各阶段手算值 + 全局值**恰好吻合**（多一个少一个都说明加权或空小节逻辑有问题）；
3. grep `Uncaught` / `SyntaxError` / `ReferenceError`，必须全为 0。

注意：`--dump-dom` **不等 fetch**，只对同步渲染的产物可信。

### 步骤 4（可选）：内联渲染，零文件交付

只需在对话里看一眼进度、不需要独立文件时，**不要生成文件**——直接内联渲染一块精简看板：

1. 读取 [inline-board.html](./assets/inline-board.html)，它是一段可直接作为 widget 输出的 HTML 片段（无 DOCTYPE/head/body，已按宿主设计系统的 CSS 变量写好）。
2. 把文件里的 `PD` 数据对象替换为真实进度。结构与四级规格一一对应：`phases[].chapters[].sections[].items[]`，`items[].done` 即验收项勾选态。源为 Markdown 规格时按四级结构逐层搬入，**不要**改成别的形状。
3. 同步改写开头 `<h2>` 中给读屏用的摘要句子，填入真实数字。
4. 输出整段作为 widget 代码。

两种形态的取舍：

| | 单文件 HTML（步骤 2） | 内联 widget（步骤 4） |
|---|---|---|
| 适合 | 交付、存档、离线打开、汇报投屏 | 对话内快速过一眼、审阅进度 |
| 下钻 | 4 级独立视图 + 面包屑 + 快捷键 | 卡片折叠展开，层级语义不变 |
| 勾选 | 写缓存 + 导出 `.md` | 仅重算百分比，不落盘 |
| 输入 | Markdown 是事实源，编辑器可改 | 由调用方直接给数据 |

### 解析器行为要点（生成规格时注意）

- 只有 ` ```diff ` 代码块会被解析为增量快照；**其他任何代码块（bash/json/go 等）整体忽略**，块内的 `#`、`##`、`- [ ]` 不会误入层级或验收清单。
- 验收项行首允许缩进（嵌套列表），勾选回写会保留缩进。
- 小节标题的编号前缀（`01.`、`1-1`、`2.3`、`1、` 等）自动清洗，避免与界面序号徽章重复。

---

## 关键资源

- **[references/spec-contract.md](./references/spec-contract.md)**：Markdown 四级结构、验收项与 diff 块的语法契约。
- **[assets/template.html](./assets/template.html)**：单文件自包含（零外链、离线可用）的完整前端模板。
- **[assets/inline-board.html](./assets/inline-board.html)**：内联 widget 片段（步骤 4 用），数据驱动、可折叠下钻、勾选实时重算。
- **[scripts/generate_deck.js](./scripts/generate_deck.js)**：命令行构建工具，已含 `</script>` 注入转义。
- **[scripts/verify.js](./scripts/verify.js)**：回归测试，32 项断言覆盖标题清洗、代码块忽略、diff 解析、缩进回写、模板结构、注入转义、内联片段。**改完模板或生成器后必须跑 `node scripts/verify.js`，全 PASS 再交付。**
- **[assets/sample-progress.md](./assets/sample-progress.md)**：开箱即用的微服务重构示例规格。
