// ===== DOM 引用 =====
const listView = document.getElementById('listView');
const timerView = document.getElementById('timerView');

const bookListEl = document.getElementById('bookList');
const todayStatsEl = document.getElementById('todayStats');
const addBookBtn = document.getElementById('addBookBtn');
const sessionListEl = document.getElementById('sessionList');

const currentBookTitleEl = document.getElementById('currentBookTitle');
const timerEl = document.getElementById('timer');
const stopBtn = document.getElementById('stopBtn');

const addBookModal = document.getElementById('addBookModal');
const bookTitleInput = document.getElementById('bookTitle');
const bookCoverInput = document.getElementById('bookCover');
const bookPercentInput = document.getElementById('bookPercent');
const saveBookBtn = document.getElementById('saveBookBtn');
const cancelBookBtn = document.getElementById('cancelBookBtn');

const progressView = document.getElementById('progressView');
const progressBookTitleEl = document.getElementById('progressBookTitle');
const progressDurationEl = document.getElementById('progressDuration');
const progressPercentInput = document.getElementById('progressPercent');
const saveProgressBtn = document.getElementById('saveProgressBtn');
const skipProgressBtn = document.getElementById('skipProgressBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
// ===== 计时状态 =====
let currentSession = null;  // { bookId, startTime } | null
let intervalId = null;
let pendingProgressBookId = null;

// ===== 渲染 =====
function renderTodayStats(currentSession = null) {
  const ms = getTodayMs(currentSession);
  if (ms === 0) {
    todayStatsEl.textContent = '今天还没开始 · 0 分钟';
  } else {
    todayStatsEl.textContent = `📖 今日 ${formatDuration(ms)}`;
  }
}

function renderSessionHistory() {
  const sessions = storage.getSessions()
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 10);

  if (sessions.length === 0) {
    sessionListEl.innerHTML = '';
    return;
  }

  const books = storage.getBooks();
  const bookMap = Object.fromEntries(books.map(b => [b.id, b]));

  sessionListEl.innerHTML = `
    <h3 class="section-title">最近</h3>
    ${sessions.map(s => {
      const book = bookMap[s.bookId];
      const titleClass = book ? 'session-book' : 'session-book deleted';
      const title = book ? book.title : '(已删除)';
      const time = formatSessionTime(s.startTime);
      return `
        <div class="session-item">
          <span class="${titleClass}">${title}</span>
          <span class="session-duration">${formatDuration(s.duration)}</span>
          <span class="session-time">${time}</span>
        </div>
      `;
    }).join('')}
  `;
}

// 今天的 session 只显示时分,更早的加月日
function formatSessionTime(ts) {
  const d = new Date(ts);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const hm = d.toTimeString().slice(0, 5); // "14:30"
  if (ts >= todayStart) return hm;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}


// ===== 导出 / 导入 =====
function doExport() {
  const json = exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // "2026-04-24"
  const a = document.createElement('a');
  a.href = url;
  a.download = `reading-rpg-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = importData(e.target.result);
    if (!result.ok) {
      alert(`导入失败:${result.error}`);
      return;
    }
    alert(`导入成功:${result.bookCount} 本书,${result.sessionCount} 条记录`);
    renderBooks();
  };
  reader.onerror = () => alert('读取文件失败');
  reader.readAsText(file);
}

exportBtn.addEventListener('click', doExport);

importBtn.addEventListener('click', () => {
  const ok = confirm('导入会覆盖现在所有的书和记录,确定继续吗?');
  if (!ok) return;
  importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) doImport(file);
  // 清空 input,这样下次选同一个文件也能触发 change
  e.target.value = '';
});

function renderBooks() {
  renderTodayStats(currentSession);
  renderSessionHistory();
  const books = storage.getBooks();

  if (books.length === 0) {
    bookListEl.innerHTML = '<p style="opacity: 0.5; text-align: center;">还没有书,点下面按钮添加一本</p>';
    return;
  }

  bookListEl.innerHTML = books.map(book => `
  <div class="book-item">
    <div class="book-title">${book.title}</div>
    <div class="book-meta">
      <span class="book-percent">${book.percent}%</span>
      <button class="btn-small" data-book-id="${book.id}">开始</button>
      <button class="btn-delete" data-book-id="${book.id}" aria-label="删除">🗑️</button>
    </div>
  </div>
`).join('');

// 给所有"开始"按钮绑事件
bookListEl.querySelectorAll('.btn-small').forEach(btn => {
  btn.addEventListener('click', () => startSession(btn.dataset.bookId));
});

// 给所有"删除"按钮绑事件
bookListEl.querySelectorAll('.btn-delete').forEach(btn => {
  btn.addEventListener('click', () => deleteBook(btn.dataset.bookId));
});
}

function format(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  if (!currentSession) return;
  const elapsed = Date.now() - currentSession.startTime;
  timerEl.textContent = format(elapsed);
}

// ===== Session =====
function startSession(bookId) {
  const book = storage.getBooks().find(b => b.id === bookId);
  if (!book) return;

  currentSession = { bookId, startTime: Date.now() };

  currentBookTitleEl.textContent = `📖 ${book.title}`;
  timerEl.textContent = '00:00';

  listView.classList.add('hidden');
  timerView.classList.remove('hidden');

  intervalId = setInterval(renderTimer, 250);
}

function stopSession() {
  if (!currentSession) return;

  clearInterval(intervalId);
  intervalId = null;

  const endTime = Date.now();
  const duration = endTime - currentSession.startTime;
  const bookId = currentSession.bookId;

  const newSession = {
    id: uuid(),
    bookId,
    startTime: currentSession.startTime,
    endTime,
    duration,
  };

 

  const sessions = storage.getSessions();
  sessions.push(newSession);
  storage.saveSessions(sessions);

  currentSession = null;

  // 切到进度输入面板
  const book = storage.getBooks().find(b => b.id === bookId);
  if (!book) {
    // 理论上不会发生(除非读到一半书被别处删了)
    timerView.classList.add('hidden');
    listView.classList.remove('hidden');
    renderBooks();
    return;
  }

  pendingProgressBookId = bookId;
  progressBookTitleEl.textContent = `📖 ${book.title}`;
  progressDurationEl.textContent = `刚读了 ${formatDuration(duration)} · 当前 ${book.percent}%`;
  progressPercentInput.value = '';
  progressPercentInput.placeholder = `现在是 ${book.percent}%,留空 = 不更新`;

  timerView.classList.add('hidden');
  progressView.classList.remove('hidden');

  // 自动聚焦(iPad 上会弹数字键盘)
  setTimeout(() => progressPercentInput.focus(), 100);
};

function deleteBook(bookId) {
  const book = storage.getBooks().find(b => b.id === bookId);
  if (!book) return;

  const ok = confirm(`确定删除《${book.title}》吗?这本书的阅读记录也会一起删掉。`);
  if (!ok) return;

  // 先删 sessions(孤儿数据防御),再删 book
  const sessions = storage.getSessions().filter(s => s.bookId !== bookId);
  storage.saveSessions(sessions);

  const books = storage.getBooks().filter(b => b.id !== bookId);
  storage.saveBooks(books);

  renderBooks();
}

// ===== Modal =====
function openModal() {
  addBookModal.classList.remove('hidden');
  bookTitleInput.focus();
}

function closeModal() {
  addBookModal.classList.add('hidden');
  bookTitleInput.value = '';
  bookCoverInput.value = '';
  bookPercentInput.value = '0';
}

function saveBook() {
  const title = bookTitleInput.value.trim();
  if (!title) {
    alert('请输入书名');
    return;
  }

const newBook = {
  id: uuid(),
  title,
  coverUrl: bookCoverInput.value.trim(),
  percent: Number(bookPercentInput.value) || 0,
  status: 'reading',        // ← 新增这行
  createdAt: Date.now(),
};

  const books = storage.getBooks();
  books.push(newBook);
  storage.saveBooks(books);

  closeModal();
  renderBooks();
}


 function saveProgress() {
  const raw = progressPercentInput.value.trim();

  // 留空 = 跳过更新
  if (raw === '') {
    finishProgress();
    return;
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    alert('请输入 0-100 之间的数字,或留空跳过');
    return;
  }

  const books = storage.getBooks();
  const book = books.find(b => b.id === pendingProgressBookId);
  if (book) {
    book.percent = n;
    storage.saveBooks(books);
  }

  finishProgress();
}

function skipProgress() {
  finishProgress();
}

function finishProgress() {
  pendingProgressBookId = null;
  progressPercentInput.value = '';
  progressView.classList.add('hidden');
  listView.classList.remove('hidden');
  renderBooks();
};

// ===== 事件绑定 =====
addBookBtn.addEventListener('click', openModal);
cancelBookBtn.addEventListener('click', closeModal);
saveBookBtn.addEventListener('click', saveBook);
stopBtn.addEventListener('click', stopSession);

addBookModal.addEventListener('click', (e) => {
  if (e.target === addBookModal) closeModal();
});

saveProgressBtn.addEventListener('click', saveProgress);
skipProgressBtn.addEventListener('click', skipProgress);

// 回车 = 保存
progressPercentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveProgress();
});

// ===== 启动 =====
renderBooks();