// UUID 生成:在非安全上下文(比如用 IP 访问 Live Server)
// crypto.randomUUID 不存在,需要降级
function uuid() {
  // 现代浏览器 + 安全上下文
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降级:用 crypto.getRandomValues 手搓 v4 UUID
  // getRandomValues 在非安全上下文也能用
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }
  // 极端降级:老浏览器,不符合 UUID 规范但能跑
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}
// storage.js
const KEYS = {
  books: 'rpg.books',
  sessions: 'rpg.sessions',
};

const storage = {
  getBooks() {
    const raw = localStorage.getItem(KEYS.books);
    return raw ? JSON.parse(raw) : [];
  },

  saveBooks(books) {
    localStorage.setItem(KEYS.books, JSON.stringify(books));
  },

  getSessions() {
    const raw = localStorage.getItem(KEYS.sessions);
    return raw ? JSON.parse(raw) : [];
  },

  saveSessions(sessions) {
    localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  },
};

// 数据 schema 当前版本号。改字段了就 +1,并在 normalizeBook/Session 里加迁移
const SCHEMA_VERSION = 2;

// 把任何来源(老数据 / 当前数据 / 未来数据)的 book 规整到当前 schema
// 缺的字段补默认,多的字段直接保留(对未来字段宽容)
function normalizeBook(b) {
  return {
    id: b.id,
    title: b.title,
    author: typeof b.author === 'string' ? b.author : '',
    translator: typeof b.translator === 'string' ? b.translator : '',
    percent: typeof b.percent === 'number' ? b.percent : 0,
    status: b.status || (b.percent >= 100 ? 'finished' : 'reading'),
    finishedAt: typeof b.finishedAt === 'number' ? b.finishedAt
                : (b.percent >= 100 ? (b.createdAt || Date.now()) : null),
    abandonReason: b.abandonReason || null,
    createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now(),
  };
}

function normalizeSession(s) {
  return {
    id: s.id,
    bookId: s.bookId,
    startTime: s.startTime,
    endTime: typeof s.endTime === 'number' ? s.endTime : s.startTime + s.duration,
    duration: s.duration,
  };
}

// 导出:把所有数据打成一个 JSON 字符串
function exportData() {
  return JSON.stringify({
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    books: storage.getBooks(),
    sessions: storage.getSessions(),
  }, null, 2);
}

// 导入:校验 + 规整 + 覆盖写入
// 返回 { ok: true, bookCount, sessionCount, warning? } 或 { ok: false, error }
function importData(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { ok: false, error: '文件不是合法的 JSON' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: '数据格式不对' };
  }
  if (!Array.isArray(data.books) || !Array.isArray(data.sessions)) {
    return { ok: false, error: '缺少 books 或 sessions 字段' };
  }

  // 最低限度的字段校验:只检查 books 里每条有 id 和 title,
  // sessions 每条有 id、bookId、startTime、duration
  const booksOk = data.books.every(b =>
    b && typeof b.id === 'string' && typeof b.title === 'string'
  );
  const sessionsOk = data.sessions.every(s =>
    s && typeof s.id === 'string' && typeof s.bookId === 'string'
    && typeof s.startTime === 'number' && typeof s.duration === 'number'
  );
  if (!booksOk || !sessionsOk) {
    return { ok: false, error: '数据里有字段缺失或类型不对' };
  }

  // 跑 normalize:补字段、统一格式
  const normalizedBooks = data.books.map(normalizeBook);
  const normalizedSessions = data.sessions.map(normalizeSession);

  storage.saveBooks(normalizedBooks);
  storage.saveSessions(normalizedSessions);

  // version 不匹配给个 warning,但不阻止导入
  // 只有自己用,严格的版本检查没必要,提醒一下就行
  let warning = null;
  const importedVersion = typeof data.version === 'number' ? data.version : null;
  if (importedVersion !== null && importedVersion > SCHEMA_VERSION) {
    warning = `这份备份来自较新的版本(v${importedVersion}),当前应用是 v${SCHEMA_VERSION},可能有字段没识别`;
  }

  return {
    ok: true,
    bookCount: normalizedBooks.length,
    sessionCount: normalizedSessions.length,
    warning,
  };
}

// 启动时跑一次,把 localStorage 里的老数据补齐字段
// 跨过这道门之后,代码里就不用再到处兜底 b.status || 'reading'
function migrateOnLoad() {
  const books = storage.getBooks();
  const sessions = storage.getSessions();

  let booksChanged = false;
  const migratedBooks = books.map(b => {
    const n = normalizeBook(b);
    // 简单粗暴比一下:任何字段不一样就标 changed
    for (const k of Object.keys(n)) {
      if (b[k] !== n[k]) { booksChanged = true; break; }
    }
    return n;
  });
  if (booksChanged) storage.saveBooks(migratedBooks);

  let sessionsChanged = false;
  const migratedSessions = sessions.map(s => {
    const n = normalizeSession(s);
    for (const k of Object.keys(n)) {
      if (s[k] !== n[k]) { sessionsChanged = true; break; }
    }
    return n;
  });
  if (sessionsChanged) storage.saveSessions(migratedSessions);
}

// 今日已读毫秒数(按 session.startTime 的本地日期归属)
// 包含正在进行的 session(如果 currentSession 传进来)
function getTodayMs(currentSession = null) {
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const historical = storage.getSessions()
    .filter(s => s.startTime >= todayStart)
    .reduce((sum, s) => sum + s.duration, 0);

  const ongoing = currentSession && currentSession.startTime >= todayStart
    ? Date.now() - currentSession.startTime
    : 0;

  return historical + ongoing;
}

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} 分钟`;
  return `${h} 小时 ${m} 分`;
}

const STREAK = {
  MIN_MS_PER_DAY: 10 * 60000, // 一天读够 10 分钟才算 streak +1
};

// ===== 结算页第二层:今日累计 + 里程碑 =====
// 不计分,只用文字反馈"读了多少"和"跨过了什么门槛"
//
// 入参:
//   session         刚结束的 session 对象 { startTime, duration, ... }
//   todayMsBefore   这次 session 之前,今日已读毫秒数(不含本次)
// 出参:
//   {
//     todayText:    "今天累计 1 小时 12 分钟"
//     milestone:    "跨过一小时了" | "专注了 28 分钟" | null
//   }
//
// 规则:
//   - todayText 永远显示
//   - milestone 优先级:今日跨 60 分钟 > 单次 ≥25 分钟 > 无
//     (跨小时是更稀有的事件,优先它)
function getRecapMilestones({ session, todayMsBefore }) {
  const todayMsAfter = todayMsBefore + session.duration;
  const todayText = `今天累计 ${formatDuration(todayMsAfter)}`;

  let milestone = null;

  // 今日累计首次跨过 60 分钟
  if (todayMsBefore < 60 * 60000 && todayMsAfter >= 60 * 60000) {
    milestone = '跨过一小时了';
  } else if (session.duration >= 25 * 60000) {
    // 单次 ≥25 分钟(每次只要够 25 分钟就提一句,不做"每次只奖一次")
    const minutes = Math.floor(session.duration / 60000);
    milestone = `专注了 ${minutes} 分钟`;
  }

  return { todayText, milestone };
}

// ===== Streak 计算 =====
// 规则:
//   一天里只要有任何 session(duration > 0)就算"读了"
//   连续天数 = 从今天往前数,第一个"没读"之前连了多少天
//   今天没读但昨天读了:streak 还是昨天的连数(还没断)
//   今天没读且昨天也没读:streak = 0
// 把 sessions 按本地日期分组,返回每天的累计毫秒数
// 返回 { '2026-04-24': 1234567, ... }
function getDailyMsMap() {
  const map = {};
  for (const s of storage.getSessions()) {
    const key = new Date(s.startTime).toLocaleDateString('sv');
    map[key] = (map[key] || 0) + s.duration;
  }
  return map;
}

// 某一天是否达到 streak 门槛
function dayQualifies(dailyMsMap, dateKey) {
  return (dailyMsMap[dateKey] || 0) >= STREAK.MIN_MS_PER_DAY;
}


function calcStreak() {
  const sessions = storage.getSessions();
  if (sessions.length === 0) return 0;

  const dailyMs = getDailyMsMap();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor = new Date(today);

  // 今天没达标:从昨天开始数(给宽限)
  if (!dayQualifies(dailyMs, cursor.toLocaleDateString('sv'))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dayQualifies(dailyMs, cursor.toLocaleDateString('sv'))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// 今天是否已经达到 streak 门槛
function hasReadToday() {
  const todayKey = new Date().toLocaleDateString('sv');
  return dayQualifies(getDailyMsMap(), todayKey);
}

// 给结算页用:这次阅读对 streak 做了什么
// 入参:
//   todayMsBefore   这次 session 之前,今日已读毫秒数(不含本次)
//   sessionDuration 这次 session 的毫秒数
// 出参:
//   {
//     status: 'crossed' | 'maintained' | 'short',
//     streak: 当前 streak(含今天,如果今天达标了)
//     shortBy: 还差几毫秒到门槛(只在 status='short' 时有意义)
//   }
function getRecapStreakState({ todayMsBefore, sessionDuration }) {
  const threshold = STREAK.MIN_MS_PER_DAY;
  const todayMsAfter = todayMsBefore + sessionDuration;

  // 注意:这函数应该在 session 已经存进 storage 之后调用,
  // 这样 calcStreak() 看到的就是包含本次的最新状态
  const streak = calcStreak();

  if (todayMsAfter < threshold) {
    return {
      status: 'short',
      streak,
      shortBy: threshold - todayMsAfter,
    };
  }

  if (todayMsBefore < threshold) {
    // 今天首次跨过门槛
    return { status: 'crossed', streak, shortBy: 0 };
  }

  // 今天之前就够了,这次是加码
  return { status: 'maintained', streak, shortBy: 0 };
}

// ============================================================
// ===== 月总结：派生数据(纯函数) =====
// ============================================================

// 把 timestamp 转成 "YYYY-MM"(本地时区)
function getMonthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// "YYYY-MM" → { start, end } 毫秒时间戳,左闭右开
// start = 当月 1 号 00:00:00.000
// end   = 下月 1 号 00:00:00.000
function getMonthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
  const end = new Date(y, m, 1, 0, 0, 0, 0).getTime();
  return { start, end };
}

// 当前月 key
function getCurrentMonthKey() {
  return getMonthKey(new Date());
}

// 上一个月 key
function getPrevMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 2, 1);  // m-1 是当月,再 -1 = 上月
  return getMonthKey(d);
}

// 下一个月 key
function getNextMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m, 1);  // m-1 是当月,+1 = 下月
  return getMonthKey(d);
}

// 最早有 session 的那个月。没数据返回当前月。
function getEarliestMonthKey() {
  const sessions = storage.getSessions();
  if (sessions.length === 0) return getCurrentMonthKey();
  const earliest = sessions.reduce((min, s) =>
    s.startTime < min ? s.startTime : min,
    sessions[0].startTime
  );
  return getMonthKey(earliest);
}

// 能不能切到某个月:不能超过当前月,不能早于最早有数据的月
function canNavigateToMonth(monthKey) {
  return monthKey >= getEarliestMonthKey() && monthKey <= getCurrentMonthKey();
}

// 月份显示用:"2026-04" → "2026 年 4 月"
function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${y} 年 ${m} 月`;
}

// ===== 核心:某个月的所有派生数据 =====
//
// 出参:
// {
//   monthKey,
//   sessionCount,      // 这个月 session 总数
//   totalMs,           // 这个月总时长
//   bookCount,         // 这个月读过的不同书的数量
//   activeDays,        // 这个月读过书的天数(>=1 分钟就算)
//   books: [           // 这个月读过的书,按时长倒序
//     { bookId, title, totalMs, sessionCount }
//   ],
//   longestSession: {  // 最长的一次阅读 (可能为 null)
//     duration, startTime, bookId, bookTitle
//   } | null,
//   focusedDay: {      // 最专注的一天:单日累计最长 (可能为 null)
//     dateKey, totalMs
//   } | null,
//   heatmap: [         // 这个月每一天的数据,长度 = 当月天数
//     { day: 1, totalMs, qualified }
//   ],
//   monthStreak,       // 这个月达到门槛的天数
//   longestStreak,     // 这个月里最长的连续天数(连续达到门槛)
// }
function getMonthStats(monthKey) {
  const { start, end } = getMonthRange(monthKey);
  const allSessions = storage.getSessions();
  const monthSessions = allSessions.filter(s =>
    s.startTime >= start && s.startTime < end
  );

  const allBooks = storage.getBooks();
  const bookMap = Object.fromEntries(allBooks.map(b => [b.id, b]));

  // ---- 总数 ----
  const totalMs = monthSessions.reduce((sum, s) => sum + s.duration, 0);
  const sessionCount = monthSessions.length;

  // ---- 按书聚合 ----
  const byBook = {};
  for (const s of monthSessions) {
    if (!byBook[s.bookId]) {
      byBook[s.bookId] = { bookId: s.bookId, totalMs: 0, sessionCount: 0 };
    }
    byBook[s.bookId].totalMs += s.duration;
    byBook[s.bookId].sessionCount += 1;
  }
  const books = Object.values(byBook)
    .map(b => ({
      ...b,
      title: bookMap[b.bookId] ? bookMap[b.bookId].title : '(已删除)',
    }))
    .sort((a, b) => b.totalMs - a.totalMs);
  const bookCount = books.length;

  // ---- 最长 session ----
  let longestSession = null;
  for (const s of monthSessions) {
    if (!longestSession || s.duration > longestSession.duration) {
      longestSession = {
        duration: s.duration,
        startTime: s.startTime,
        bookId: s.bookId,
        bookTitle: bookMap[s.bookId] ? bookMap[s.bookId].title : '(已删除)',
      };
    }
  }

  // ---- 按日聚合(用于热力图、focusedDay、streak) ----
  // dateKey 用 'sv' locale 输出 "YYYY-MM-DD",好排序
  const byDay = {};
  for (const s of monthSessions) {
    const key = new Date(s.startTime).toLocaleDateString('sv');
    byDay[key] = (byDay[key] || 0) + s.duration;
  }

  // ---- 最专注的一天 ----
  let focusedDay = null;
  for (const [dateKey, ms] of Object.entries(byDay)) {
    if (!focusedDay || ms > focusedDay.totalMs) {
      focusedDay = { dateKey, totalMs: ms };
    }
  }

  // ---- 热力图:当月每一天 ----
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();  // 妙用:m 月的第 0 天 = m-1 月的最后一天,用 (y, m, 0) 拿到 m 月的天数
  const threshold = STREAK.MIN_MS_PER_DAY;
  const heatmap = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const ms = byDay[dateKey] || 0;
    heatmap.push({
      day,
      totalMs: ms,
      qualified: ms >= threshold,
    });
  }

  // ---- 月内 streak 统计 ----
  // monthStreak: 这个月有多少天达标
  // longestStreak: 这个月里最长的一段连续达标
  let monthStreak = 0;
  let longestStreak = 0;
  let currentRun = 0;
  for (const cell of heatmap) {
    if (cell.qualified) {
      monthStreak += 1;
      currentRun += 1;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 0;
    }
  }
  // activeDays: 哪怕没到 10 分钟,有读就算
  const activeDays = Object.values(byDay).filter(ms => ms > 0).length;

  return {
    monthKey,
    sessionCount,
    totalMs,
    bookCount,
    activeDays,
    books,
    longestSession,
    focusedDay,
    heatmap,
    monthStreak,
    longestStreak,
  };
}

// ===== 环比上月 =====
// 出参:
// {
//   bookCount: { curr, prev, delta },
//   activeDays: { curr, prev, delta },
//   totalMs: { curr, prev, delta },
// }
function getMonthComparison(monthKey) {
  const curr = getMonthStats(monthKey);
  const prev = getMonthStats(getPrevMonthKey(monthKey));
  return {
    bookCount: {
      curr: curr.bookCount,
      prev: prev.bookCount,
      delta: curr.bookCount - prev.bookCount,
    },
    activeDays: {
      curr: curr.activeDays,
      prev: prev.activeDays,
      delta: curr.activeDays - prev.activeDays,
    },
    totalMs: {
      curr: curr.totalMs,
      prev: prev.totalMs,
      delta: curr.totalMs - prev.totalMs,
    },
  };
}

// ===== 时长格式化(月总结 hero 用,要小时为单位) =====
// 例: 3720000 ms (62 分钟) → "1 小时"
//     7920000 ms (132 分钟) → "2 小时 12 分"
//     1800000 ms (30 分钟) → "30 分钟"
function formatHeroDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} 分钟`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分`;
}