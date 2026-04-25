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

// 导出:把所有数据打成一个 JSON 字符串
function exportData() {
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    books: storage.getBooks(),
    sessions: storage.getSessions(),
  }, null, 2);
}

// 导入:校验 + 覆盖写入
// 返回 { ok: true, bookCount, sessionCount } 或 { ok: false, error }
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

  storage.saveBooks(data.books);
  storage.saveSessions(data.sessions);

  return { ok: true, bookCount: data.books.length, sessionCount: data.sessions.length };
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