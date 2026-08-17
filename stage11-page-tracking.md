# Stage 11：纸质书页数追踪 · 设计决策与实现计划

> 本文档是本 Stage 的真相源。所有设计决策已确认，不要重新发起设计讨论，不要扩展范围。
> 按步骤实现，每步完成后停下，给出验证方法，等我在本地验证通过后再进行下一步。

## 项目背景（给 Claude Code 的最小上下文）

PageEmber（页焰）是一个纯 vanilla HTML/CSS/JS + localStorage 的 iPad 读书追踪 PWA。
文件：`index.html` / `app.js` / `storage.js` / `style.css`。localStorage 主 key 为 `rpg.books`（历史名，保留）。

产品哲学：书是陪伴，不是任务。禁止游戏化语言、责怪性文案、强行煽情。

现有进度模型：所有书的进度用 `percent`（0–100）表示，面向 Kindle 用户设计——Kindle 可以直接显示阅读百分比。纸质书用户无法直接获得百分比，需要通过页数换算。

## 工作规则（必须遵守）

1. **不用行号定位代码**。用函数名和可搜索的字符串锚点。
2. **一步一停**。每个 Step 做完就停，等确认后再继续。
3. **不扩展范围**。只实现本文档写明的内容。
4. **不提交代码**。我会在 VS Code + Live Server 本地测试后自己 commit。
5. **`percent` 仍然是唯一的内部进度表示**。页数只是输入/显示层的皮。所有下游逻辑（完读判断、streak、月报、告别信、normalizeBook 的 status 自动纠正）零改动。

## 设计决策（已全部确认）

### 核心概念

- 添加书时可选填"总页数"。填了 → 这本书进入**页数模式**；不填 → 保持现有的 **Kindle 模式**（百分比）。
- 页数模式下，结算页输入的是"已读到第几页"，app 自动算出 percent 写入。
- **只管新书。** 已有的书不能补填总页数，不做迁移。

### 数据模型

给 book 加两个可选字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalPages` | `number \| null` | 总页数。有值 = 页数模式，null = Kindle 模式 |
| `currentPage` | `number \| null` | 当前已读页码（绝对页码，不是本次读了几页） |

判断模式的方式：`book.totalPages > 0`。不需要额外的 `trackingMode` 字段。

`normalizeBook` 中对这两个字段做兜底：
```js
totalPages: (typeof b.totalPages === 'number' && b.totalPages > 0) ? b.totalPages : null,
currentPage: (typeof b.currentPage === 'number' && b.currentPage >= 0) ? b.currentPage : null,
```

### 添加书 modal

在现有"当前进度(%)"（`bookPercentField`）的**上方**，加一个可选输入框：

```
总页数
[输入框，placeholder="选填，纸质书用"]
```

交互逻辑：
- "总页数"输入框留空 → "当前进度(%)"正常显示，保持 Kindle 模式。
- "总页数"填了有效数字（>0）→ "当前进度(%)"的 label 变成"当前页码"，input 的 max 变成总页数值，placeholder 变成 `0`。
- 保存时：如果有 totalPages，`percent = Math.round(currentPage / totalPages * 100)`；如果 percent >= 100，走已有的完读逻辑。
- 意图为"📚 先放想读"时，"总页数"和"当前进度/页码"都隐藏（与现有行为一致——想读的书不需要进度）。

### 结算页（recap）

现有结算页第一层显示：
```
[时长]
《书名》
旧percent → [新percent输入] %
```

页数模式的书改为：
```
[时长]
《书名》
旧页码 → [新页码输入] / 500页
```

具体改动点（在 `stopSession` 函数设置结算页状态的地方）：
- 如果 `book.totalPages`：
  - `recapPercentBeforeEl` 显示 `book.currentPage`（而非 `book.percent`）
  - `recapPercentAfterInput` 的 placeholder 设为 `book.currentPage`，max 设为 `book.totalPages`
  - 百分号单位文字（`recap-percent-unit`）改为 `/ {totalPages}页`
- 如果没有 `totalPages`：一切不变。

保存逻辑（`saveProgress` 函数）：
- 页数模式：用户输入的值 = 新的 `currentPage`，校验范围 `0 ~ totalPages`。`percent = Math.round(currentPage / totalPages * 100)`。同时写入 `book.currentPage` 和 `book.percent`。
- Kindle 模式：不变，直接写 `book.percent`。

### 显示层

以下位置目前显示 `XX%`，页数模式的书改为显示 `第X页/共Y页`：

| 位置 | 定位锚点 | 现有格式 | 页数模式格式 |
|------|----------|----------|-------------|
| 选书列表 | `renderBookPicker` 中 `book-picker-percent` | `35%` | `第105页/共500页` |
| 管理页书籍列表 | `renderManageBooks` 中 `manage-book-percent` | `35%` | `第105页/共500页` |
| 书籍详情页 | `renderBookDetail` 中 `detailPercentEl` | `35%` | `第105页/共500页` |

## 实现步骤

### Step 1：数据层

在 `storage.js` 的 `normalizeBook` 函数中加入 `totalPages` 和 `currentPage` 的兜底。

**验证**：控制台执行 `normalizeBook({ id:'test', title:'t', totalPages: 300, currentPage: 50 })` 确认两个字段保留；执行 `normalizeBook({ id:'test', title:'t' })` 确认两个字段为 null。

### Step 2：添加书 modal

- `index.html`：在 `bookPercentField` 上方加"总页数"输入框。
- `app.js`：
  - 监听总页数输入变化，动态切换"当前进度(%)"和"当前页码"的 label/max/placeholder。
  - `saveBook` 函数中，有 totalPages 时计算 percent 并写入 `totalPages` 和 `currentPage`。
  - 意图切换为 wishlist 时隐藏总页数输入框（同 bookPercentField 的现有行为）。
  - `closeModal` / `openModal` 时清空总页数输入框。

**验证**：
1. 添加一本书，不填总页数 → 确认行为与之前完全一致。
2. 添加一本书，填总页数 300，当前页码 90 → 保存后检查 localStorage，确认 totalPages=300, currentPage=90, percent=30。
3. 切到"先放想读"→ 总页数和进度行都隐藏；切回"直接读"→ 恢复。

### Step 3：结算页

修改 `stopSession` 中设置结算页状态的逻辑和 `saveProgress` 中的保存逻辑，支持页数模式。

**验证**：
1. 对一本页数模式的书计时 → 结算页显示 `旧页码 → [输入] / 500页` → 输入新页码 → 保存 → 检查 localStorage 中 currentPage 和 percent 都正确。
2. 对一本 Kindle 模式的书计时 → 结算页行为与之前完全一致。
3. 页数模式的书，输入的页码 = totalPages → 触发完读流程（percent=100，status 变 finished，第四层完读庆祝出现）。
4. 跳过按钮行为不变（页码不更新）。

### Step 4：显示层

修改 `renderBookPicker`、管理页列表渲染、`renderBookDetail` 中的进度显示，页数模式的书显示 `第X页/共Y页`。

**验证**：
1. 选书列表中，页数模式的书显示 `第X页/共Y页`，Kindle 模式的书显示 `XX%`。
2. 管理页同上。
3. 详情页同上。

### Step 5：回归

- Kindle 模式的书全流程无异常（添加、计时、结算、完读）。
- 页数模式的书全流程无异常（添加、计时、结算、完读、告别信）。
- 导入旧备份（没有 totalPages/currentPage 字段的数据）正常工作，所有书保持 Kindle 模式。
- 提醒：部署后 iPad PWA 需移除再重新添加主屏图标；`sw.js` 缓存版本号要更新。
