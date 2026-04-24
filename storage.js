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