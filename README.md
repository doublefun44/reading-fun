# Reading RPG

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


- percent 是 source of truth,将来加纸质书页数模式时:
  加 mode/totalPages/currentPage 字段,页数模式下用 
  currentPage/totalPages 算出 percent 存回去,
  这样统计和列表逻辑不用动