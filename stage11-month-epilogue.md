# Stage 11:月度总结副句 · 设计决策与实现计划

> 本文档是本 Stage 的真相源。所有设计决策已确认,不要重新发起设计讨论,不要扩展范围。
> 按步骤实现,每步完成后停下,给出验证方法,等我在本地验证通过后再进行下一步。

## 项目背景(给 Claude Code 的最小上下文)

PageEmber(页焰)是一个纯 vanilla HTML/CSS/JS + localStorage 的 iPad 读书追踪 PWA。
文件:`index.html` / `app.js` / `storage.js` / `style.css`。localStorage 主 key 为 `rpg.books`(历史名,保留)。

产品哲学:书是陪伴,不是任务。温暖但不硬凑,没有数据支撑的话绝不说。

## 工作规则(必须遵守)

1. **不用行号定位代码**。用函数名和可搜索的字符串锚点(如 `renderMonthHero`、`monthHeroText`、`getMonthStats`)。
2. **一步一停**。每个 Step 做完就停,等确认后再继续。
3. **不扩展范围**。只做副句区。特别注意:项目里 `design-memo-在读上下文与想读书单.md` 中有一个"月统计卡片式重做"的构想,**本 Stage 与它无关,不要实现其中任何内容**。
4. **不提交代码**。我会在 VS Code + Live Server 本地测试后自己 commit。
5. 现有 hero 主句(`renderMonthHero` 输出的"X 月,你和 N 本书共度了 X 小时")**保持原样不动**,它就是月度总结的主句。

## 设计决策(已全部确认)

### 位置

月度总结页(`monthSummaryView`)顶部 hero 区,现有 `monthHeroText` 的**下方**,新增一个副句区(1–2 行小字)。

### 副句规则

数据范围 = 当前浏览的月份(monthKey),不一定是本月。

**两条数据副句,满足条件就出现,可同时出现,顺序固定:**

1. **完读句**(当月有完读时):按 `book.finishedAt` 落在该月内的书计数。
   - 1 本:`有 1 本书读到了最后一页。`
   - 多本:`有 3 本书读到了最后一页。`
2. **想读句**(当月想读清单有新增时):按 `status === 'wishlist'` 且 `addedToWishlistAt` 落在该月内的书计数。
   - `你添进了 4 本想读的书——往后的日子,有这么多相遇可以期待。`
   - 已知局限(接受,不处理):当月加入 wishlist 又转去 reading 的书,`addedToWishlistAt` 已被清空,不计入。

**平淡月收尾句**(以上两条都没有时,出一条,轮换):

- `不多不少,是踏实的一个月。`
- `书一直在,你也一直在。`
- `安安静静读了一些,这样就很好。`

轮换方式:按 monthKey 确定性选择(如对 monthKey 做简单 hash 取模),**同一个月每次打开看到同一句**,不随机跳。

**空月(当月无任何阅读)**:整个副句区不渲染。现有 hero 的"X 月还没读过书"保持不变。

### 视觉

- 小号文字,低不透明度(参考页面上其他 detail 文字的样式),与 hero 主句之间留一点呼吸间距。
- 不加图标、不加动画。

## 实现步骤

### Step 1:数据层

在 `storage.js` 的月总结派生数据区(`getMonthStats` 附近)增加 `getMonthEpilogue(monthKey)`:
- 计算该月完读书数(`finishedAt` 落在 `getMonthRange(monthKey)` 区间内)和该月 wishlist 新增数(`status === 'wishlist'` 且 `addedToWishlistAt` 在区间内)。
- 按上面的规则返回 `string[]`(0–2 条数据副句,或 1 条平淡句);该月无任何 session 返回空数组。
- 纯函数,不做 DOM 操作。

**验证**:控制台对当前月和历史月调用;用 mock 数据构造 有完读 / 有想读新增 / 两者都有 / 平淡月 / 空月 五种情况,确认输出正确(平淡月多刷几次确认句子不跳),测完还原数据。

### Step 2:UI 渲染

- `index.html` 在 `monthHeroText` 下方增加副句容器;`style.css` 配套样式。
- `app.js` 月度页渲染流程中(渲染 hero 的同级位置)调用 `getMonthEpilogue` 并渲染;空数组时容器不显示。
- 月份前后翻页(`monthPrevBtn` / `monthNextBtn`)时副句跟着刷新。

**验证**:翻看几个真实月份 + mock 出四种情况各看一眼;空月确认副句区完全不出现;翻页切换正常。

### Step 3:回归

- hero 主句、书列表、记录、热力图、streak、环比均不受影响。
- 提醒:部署后 iPad PWA 需移除再重新添加主屏图标;`sw.js` 缓存版本号要更新。
