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


- percent 是 source of truth,将来加纸质书页数模式时:
  加 mode/totalPages/currentPage 字段,页数模式下用 
  currentPage/totalPages 算出 percent 存回去,
  这样统计和列表逻辑不用动