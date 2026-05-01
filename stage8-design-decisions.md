# Stage 8 设计决策(已敲定部分)

> 本文档记录 PageEmber Stage 8(想读书单 + 完读后"下一本"提示)在动代码之前已经讨论并敲定的设计决策。
> 用作后续对话的参考上下文。

---

## 0. PageEmber 核心价值(贯穿所有决策)

PageEmber 不是"管理书的关系"的工具,是**让人真的去读书**的工具。

读书记录是手段,wishlist 也是手段。所有功能都服务于一个动作:**翻开下一本书**。

豆瓣 wishlist 是博物馆(放进去就是终点),PageEmber 的 wishlist 必须是枪膛
(放进去是为了打出去,如果不打出去,放进去没意义)。

Wishlist 的存在理由只有一个:当用户读完一本书,大脑还在阅读节奏里、
还在"接下来读什么"的状态里——这时 PageEmber 立刻给出下一本,让用户
不脱离这个节奏。

10 本上限是这个理念的具象化——枪膛装太多会卡壳,只装够能立刻打出去的。

---

## 1. 数据模型与迁移

### Schema 升级

`SCHEMA_VERSION` 从 2 升到 3。

### Status 新增第四态

`status` 枚举新增 `'wishlist'`,共四态:`reading | finished | abandoned | wishlist`。

### 新字段:`addedToWishlistAt`

- 类型:`number | null`(timestamp)
- **所有 book 都有这个字段**,非 wishlist 书的值统一为 `null`
- 仅 `status === 'wishlist'` 的书有真实时间戳
- 这和 `finishedAt`、`abandonReason` 是同一种处理方式:字段对所有 book 都存在,
  只是不适用时为 `null`。这样 UI 代码不需要 `if ('addedToWishlistAt' in book)` 兜底

### `normalizeBook` 改造

```javascript
addedToWishlistAt: b.status === 'wishlist'
  ? (typeof b.addedToWishlistAt === 'number'
      ? b.addedToWishlistAt
      : (b.createdAt || Date.now()))
  : null,
```

- 如果 status='wishlist' 但缺 `addedToWishlistAt`(将来导入旧版备份场景):
  用 `createdAt` 兜底(沿用 `finishedAt` 的兜底思路)
- 当前老数据库不会出现 status='wishlist' 的情况,所以现实场景里所有老书都会
  被补上 `addedToWishlistAt: null`

### 老数据迁移行为

`migrateOnLoad` 跑过之后,localStorage 里所有现有 book 都会被补上
`addedToWishlistAt: null`。完全无损,没有任何可见行为变化。

### 状态切换时的字段清理

`handleRestartReading`(已弃读 → 在读 / 想读 → 在读)时,清空 `addedToWishlistAt = null`。
让"`addedToWishlistAt !== null` 严格等价于 `status === 'wishlist'`"成立。
和现有"重启时清掉 `abandonReason`"的思路一致。

### 导入备份的特殊处理

`importData` **不限制 wishlist 数量**。允许导入超过 10 本的旧备份(可能从未来版本来,
也可能是用户刻意改的)。导入是恢复,不是新建。**写入限制(加新 wishlist 时严格)、
读取/导入不限制**——宽进严出。

---

## 2. 添加书 Modal 改造

### 视觉方案:顶部分段控件(Segmented Control)

```
┌─────────────────────────┐
│ [📖 直接读] [📚 先放想读]  │   ← 二选一,默认左边亮
├─────────────────────────┤
│ 书名: ___________        │
│ 作者: ___________        │
│ 译者: ___________        │
│ 当前进度: [0] %          │   ← 选"想读"时这行消失
│ [取消]   [保存]          │
└─────────────────────────┘
```

### 关键交互

- **默认选"📖 直接读"**(高频路径)
- **切换到"📚 先放想读"时,进度字段隐藏并重置为 0**;切回"直接读"时
  字段重新显示,值是 0。**不做记忆**(切来切去太罕见,做记忆是过度设计)
- **意图先于细节**——分段控件放在表单顶部,先决定"现在读"还是"先存",
  再填具体字段
- **保护摩擦感**——明确的二选一比 checkbox 更能让人停顿一拍想"我现在到底
  是要读它,还是先放着"

### Wishlist 满 10 本时的硬卡死

用户选了"📚 先放想读" + 点保存,如果当前 wishlist ≥ 10 本:

- **modal 内显示拦截 hint**(延续现有 hint 系统,不另开 sheet/dialog)
- **"保存"按钮被替换成"看想读"**——直接给一条解决路径
- **跳转目标**:管理页 wishlist section

文案:

> 你已经攒了 10 本想读了
> 它们一直在那等着——要不,从最久那本开始?

理由:具体动作 > 抽象号召。"先读起来"是抽象号召,"从最久那本开始"是
具体行动(明确入口)。用户跳转到 wishlist 后能直接看到"等了你一年多"的
那本书,自然完成召唤闭环。

### 查重逻辑扩展(覆盖 wishlist 状态)

延续现有的查重思路(已在 saveBook 里),但要覆盖新的 wishlist 状态:

| 新加意图 | 已存在书的状态 | 行为 |
|---------|--------------|------|
| reading | reading / finished | block hint:"已经在书架里了" |
| reading | abandoned | soft hint + "去重新开始读"按钮(现有逻辑) |
| reading | wishlist | **soft hint + "开读这本"按钮**(新增,把 wishlist 转 reading,不新建) |
| wishlist | reading / finished / abandoned | block hint:"已经在书架里了"(已经/曾经读过,放想读没意义) |
| wishlist | wishlist | block hint:"已经在想读里了" |

---

## 3. 管理页结构

### 视觉方案:页内分组(方案 A),wishlist 放最上面

```
[← 返回]    书籍    [+ 添加]
─────────────────────────
想读 · K
  (顶部行动召唤,见下文)
  《xxx》  作者  在想读里 X 时间  [📖 开读]
  《yyy》  ...

[📉 放下的书 入口]   ← 弃读 ≥3 本才出现

在读 · N
  ...

已完读 · M
  ...

已弃读 · K
  ...
```

### 为什么不用 tab

最初推 tab 是担心 wishlist 膨胀挤占在读视图。**10 本上限解决了这个担心**,
所以回到更简单的"页内分组"方案。同时:

- wishlist 是行动召唤,放最上面符合"读完了看下一本"的认知动线
- 不增加 tab 的认知负担

### Wishlist Section 顶部的行动召唤

按"待最久"的那本作为具体的召唤对象,触发档位:

| 条件 | 是否显示 | 文案 |
|-----|--------|------|
| 全部 < 30 天 | 不显示 | (蜜月期,不催) |
| 至少 1 本 ≥ 30 天 | 显示 | "《XXX》在你的想读里有一阵了,要不读它?" |
| 至少 1 本 ≥ 365 天 | 显示(升级) | "《XXX》等你一年了。读它?" |

### Wishlist 卡片的时间档位(从中性标签升级到情感呼唤)

| 时间 | 文案 |
|-----|------|
| < 7 天 | "刚加的" |
| 7-29 天 | "在想读里 X 周" |
| 30-89 天 | "在想读里 X 个月了" |
| 90-364 天 | "想读里 X 个月了" |
| ≥ 365 天 | "等了你一年多" |

每一档都是温和的,没有任何一档说"该删了"。**因为 PageEmber 不让你删,它让你读**。
"等了你一年多"这种拟人化把书变成了在等的伙伴,延续"把书当伙伴"的产品语气。

### Wishlist 卡片每条的内容

```
《项塔兰》
格里高利·大卫·罗伯兹
等了你一年多        [📖 开读]
```

要素:书名 / 作者(没填就不显示这一行)/ 时间档位文案 / 开读按钮。

---

## 4. 状态流转(完整状态机)

```
新建(modal "📖 直接读")  ──→  reading
新建(modal "📚 先放想读") ──→  wishlist
wishlist  ──[开读]──→  reading                (清 addedToWishlistAt)
reading   ──[完读]──→  finished
reading   ──[弃读]──→  abandoned
abandoned ──[重新开始读]──→  reading           (清 abandonReason)
finished  ──[重新开始读]──→  reading
```

注意:wishlist → 任何其他状态都会经过 reading(没有"想读 → 直接完读/弃读"
这种路径)。从 wishlist 到 reading 是唯一出口,这强化了"想读=接下来要读的"
这个语义。

---

## 5. 一以贯之的设计原则(贯穿 Stage 8 决策)

1. **PageEmber 不审判用户**,只温柔推动
2. **字段对所有 book 都存在**,不适用时为 `null`(`finishedAt` / `abandonReason` /
   `addedToWishlistAt` 一致处理)
3. **意图先于细节**——分段控件、status 选择、查重路径都遵循这个
4. **没有硬规则,只有 wishlist 10 本上限例外**——这条例外是为了保护"想读"
   这个动作本身的能量,不是为了管理用户行为
5. **召唤行动 > 审视过去**——"读它?"不是"还想读吗?";"等了你一年多"
   不是"已经躺了一年"
6. **具体动作 > 抽象号召**——所有提示都指向"最久那本"这种具体对象
7. **宽进严出**——导入旧备份不限,新建严限
