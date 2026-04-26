# 页焰 · PageEmber

iPad 读书追踪 PWA。

## 本地运行
VS Code 打开,Live Server 启动。

## Stage 进度
- [x] Stage 1: 计时器原型 + PWA 链路
## Notes(给未来的自己)
- Live Server 要让 iPad 访问:`settings.json` 加 `"liveServer.settings.host": "0.0.0.0"`
- 配置改了一定要 Stop → Go Live 重启,不然不生效
- iPad 主屏图标改了 meta 后,要先从主屏移除再重新添加才更新
- 计时用 Date.now() 差值,别用计数器
- [x] Stage 2: 书 + session 数据模型,今日统计,历史列表,进度更新
GitHub Pages 部署

## 部署 Notes
- GitHub Free 账号的 Private 仓库没有 Pages,要么改 Public 要么升 Pro
- localStorage 绑 origin:Live Server 的 IP 和 Pages 的 HTTPS 是不同 origin,数据不互通
- iPad 加到主屏后是独立 PWA 环境,它的 localStorage 和 Safari 里的也是分开的
## Data Notes
- localStorage 可能被 iOS 清,定期用"导出"按钮存一份 JSON 到 iCloud
- [x] Stage 3: 结算页(三层) + XP 系统 + Streak

## XP / Streak Notes
- XP 规则:1 分钟 2XP,单次 ≥25 +20,当日累计 60 +50,完读 +500
- 完读 XP 通过 book.finishedAt 字段记录,只在首次完读时盖
- percent 从 100 退回不撤销 finishedAt(读完了就是读完了)
- Streak 门槛:一天 ≥10 分钟才算,昨天读了今天没读不算断
- calcTotalXp 暂时是孤儿函数,UI 不显示总 XP(怕稀释"和书的关系")

- [x] Stage 4-a: 计时态沙漏(木框+曲线玻璃+档位沙子)

## 沙漏 Notes
- 30 分钟一循环,每 10 分钟切一档(满/2:1/1:2)
- 30 分钟整时直接归位回"满",不做翻转
- 档位由 1 秒 interval 检查,只在变化时改 DOM,CSS transition 柔化
- 调试改 getStageIndex 里 600000 → 10000(10 秒一档),测完记得改回
- 颜色/比例之后想调:SVG defs 里的 woodGradient / pillarGradient / glassHighlight
## Stage 4 决策 Notes
原计划:沙漏 + 每分钟时长 + 30秒变暗 + 1秒沉底 + 切出检测
实际只做了沙漏。理由:
- 每分钟时长/沉底动画:体验加分有限,沙漏档位切换已经够反馈
- 30 秒变暗:Web 改不了系统亮度,只能盖 opacity,iPad 阅读时
  反而干扰看时长,弊大于利
- 切出检测:实际场景是 Kindle 读书 + iPad PWA 常驻,不会切出。
  以后真用 iPad 读书再加(用 Page Visibility API,5 分钟阈值,
  回来时让用户决定算/不算)

- [x] Stage 5: 管理书籍页 + 详情页 + 完读/弃读流程 + 拔掉 XP

## Stage 5 Notes
- 字段:coverUrl 拿掉,加了 author / translator / status / finishedAt / abandonReason
- 三种 status:reading / finished / abandoned。老数据没字段时默认 reading
- 完读两个入口:详情页"完读"按钮 + 结算页跨 100% 自动完读,都走"📖 读完了"层
- 弃读:详情页按钮 → sheet 选原因(5 选 1)→ 写 abandonReason → 关 sheet 刷详情
  - "其他"选了才出现输入框,留空可提交;切走再切回 value 还在
  - 不做反馈层:弃读不该被庆祝,选完直接静默回详情页就是反馈
  - percent 故意不动,跟"重新开始读"对称
- 选书 sheet 只列 status='reading' 的书。全告一段落时给"没有在读的书 / 添加新书"
- 拔掉 XP 系统:理由是 XP 把"和书的关系"稀释成数字游戏。
  结算页第二层现在是"今天累计 X" + 可选里程碑,不计分

- [x] Stage 6-c+d: 导入导出加固 + 备份提醒

## Stage 6 c+d Notes
- SCHEMA_VERSION 字段:改 schema 时 +1,在 normalizeBook/Session 里加迁移
- normalizeBook 是单一入口:导入走它,migrateOnLoad 启动也走它
  迁移后字段干净,UI 代码可以渐进去掉 b.status || 'reading' 这种兜底
- 老数据 finishedAt 兜底为 createdAt:不知道真实完读时间,
  用最早的时间戳总比 null 好(月统计才算得上)
- 计时中导出会漏当前 session,加 confirm 提醒,不强制结束计时
- 一年数据估算 ~100KB,离 5MB 上限两个数量级,不用焦虑容量
- 完读庆祝 modal 故意不绑 backdrop 关闭:仪式感,只能点"继续"

- [x] Stage 6-e: 添加书查重

## 查重 Notes
- 匹配规则:trim + lowercase。中文没大小写,但顺手统一兼容英文书
- 在读 / 已完读重复 → alert 拒绝;modal 不关,允许改名重试
- 已弃读重复 → confirm 引导去详情页,详情页已有"重新开始读"按钮
- detailReturnTo 加了 'list' 分支:从添加 modal 跳详情页时,
  返回应该回首页(用户来自首页),不是管理页也不是月总结


- percent 是 source of truth,将来加纸质书页数模式时:
  加 mode/totalPages/currentPage 字段,页数模式下用 
  currentPage/totalPages 算出 percent 存回去,
  这样统计和列表逻辑不用动

- [x] Stage 7-a: 弃读分析页"放下的书"

## 放下的书 Notes
- 目标不是统计弃读率,是识别"投了不少时间但最终放下"的书的共同特征
  当避雷指南用,所以语气是温和自我观察,不是数据看板
- 弃读 sheet 删了"不适合现在的我":跟"太长了没耐心"功能重叠,简化
  老数据里如果有这个 reason 还能正常显示,不强制迁移
- 入口在管理页"已弃读"分组上方,弃读 ≥3 本才出现(数据少没意义)
- 三块结构:总账(一句话) / 投入最多的几本(≥1h,Top 5) / 反复出现的名字
  反复出现 = 同一作者/译者 ≥2 次,作者和译者各算各的
- 排除"重新开始读"过的书:handleRestartReading 已经把 status 改回 reading,
  getAbandonedStats 只筛 status='abandoned',天然排除
- detailReturnTo 加了 'abandonedReview' 分支:从这页进详情页,返回时回这页

- [x] Stage 7-b: 火焰熄灭动画

## 火焰熄灭 Notes
- 触发时机:用户打开 PWA 那一刻,而不是按时间走
  - 真按时间触发的话,用户压根没打开就看不到,白做
  - 隔几天回来 → 看到火苗塌下去变木桩 + 文案"X 天没读,火灭了" → 有反馈
- 熄灭规则照旧用 calcStreak:今天没达标 + 昨天也没达标 → streak=0 → 该灭
  最早第 2 天打开就会触发(从"上次有火那天"算第 2 天)
- 一次性事件:两个 localStorage key 跟踪
  - rpg.lastFlameDate    上次显示火焰的本地日期
  - rpg.lastFlameStreak  上次显示时的 streak,用于"上次连续 N 天"文案
  有火时盖上今天,没火时清掉。同一天不触发,避免结算页回首页这种短间隔误触发
- 动画:1.6s,CSS keyframes 走完整段,JS 在 ~1.0s 处把 🔥 换成 🪵
  衔接的是 keyframes 里 60→62% 的透明窗口,看不到硬切
- 文案在 hint 里,加 .is-extinguish-msg 类(琥珀色 + 延迟淡入),克制但能看出是个事件