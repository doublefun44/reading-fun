// ===== DOM 引用 =====
const listView = document.getElementById('listView');
const timerView = document.getElementById('timerView');

const sessionListEl = document.getElementById('sessionList');

const currentBookTitleEl = document.getElementById('currentBookTitle');
const stopBtn = document.getElementById('stopBtn');
const sandTopEl = document.getElementById('sandTop');
const sandBottomEl = document.getElementById('sandBottom');

const addBookModal = document.getElementById('addBookModal');
const bookTitleInput = document.getElementById('bookTitle');
const bookAuthorInput = document.getElementById('bookAuthor');
const bookTranslatorInput = document.getElementById('bookTranslator');
const bookPercentInput = document.getElementById('bookPercent');
const saveBookBtn = document.getElementById('saveBookBtn');
const cancelBookBtn = document.getElementById('cancelBookBtn');

const progressView = document.getElementById('progressView');
const recapDurationEl = document.getElementById('recapDuration');
const recapBookEl = document.getElementById('recapBook');
const recapPercentBeforeEl = document.getElementById('recapPercentBefore');
const recapPercentAfterInput = document.getElementById('recapPercentAfter');
const recapTodayLayer = document.getElementById('recapTodayLayer');
const recapTodayTextEl = document.getElementById('recapTodayText');
const recapTodayMilestoneEl = document.getElementById('recapTodayMilestone');
const recapStreakLayer = document.getElementById('recapStreakLayer');
const recapStreakIcon = document.getElementById('recapStreakIcon');
const recapStreakMain = document.getElementById('recapStreakMain');
const recapStreakSub = document.getElementById('recapStreakSub');
const recapFinishLayer = document.getElementById('recapFinishLayer');
const recapFinishBookEl = document.getElementById('recapFinishBook');
const saveProgressBtn = document.getElementById('saveProgressBtn');
const skipProgressBtn = document.getElementById('skipProgressBtn');

const finishCelebration = document.getElementById('finishCelebration');
const finishCelebrationBookEl = document.getElementById('finishCelebrationBook');
const finishCelebrationOkBtn = document.getElementById('finishCelebrationOkBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

const streakRingEl = document.getElementById('streakRing');
const streakRingNumberEl = document.getElementById('streakRingNumber');
const streakRingLabelEl = document.getElementById('streakRingLabel');
const streakRingHintEl = document.getElementById('streakRingHint');
const startReadingBtn = document.getElementById('startReadingBtn');
const manageBooksBtn = document.getElementById('manageBooksBtn');

const bookPickerSheet = document.getElementById('bookPickerSheet');
const bookPickerListEl = document.getElementById('bookPickerList');
const manageBooksView = document.getElementById('manageBooksView');
const manageBooksListEl = document.getElementById('manageBooksList');
const manageBackBtn = document.getElementById('manageBackBtn');
const manageAddBtn = document.getElementById('manageAddBtn');

const abandonSheet = document.getElementById('abandonSheet');
const abandonReasonListEl = document.getElementById('abandonReasonList');
const abandonOtherWrap = document.getElementById('abandonOtherWrap');
const abandonOtherInput = document.getElementById('abandonOtherInput');
const abandonCancelBtn = document.getElementById('abandonCancelBtn');
const abandonConfirmBtn = document.getElementById('abandonConfirmBtn');

const bookDetailView = document.getElementById('bookDetailView');
const detailBackBtn = document.getElementById('detailBackBtn');
const detailTitleEl = document.getElementById('detailTitle');
const detailBylineEl = document.getElementById('detailByline');
const detailPercentEl = document.getElementById('detailPercent');
const detailTotalTimeEl = document.getElementById('detailTotalTime');
const detailSessionCountEl = document.getElementById('detailSessionCount');
const detailAbandonReasonEl = document.getElementById('detailAbandonReason');
const detailActionsEl = document.getElementById('detailActions');
const detailSessionsEl = document.getElementById('detailSessions');

// ===== 计时状态 =====
let currentSession = null;  // { bookId, startTime } | null
let intervalId = null;
let pendingProgressBookId = null;
let currentDetailBookId = null;  // 详情页正在看的书 id
// 弃读 sheet 的临时状态:正在为哪本书选弃读原因 + 当前选中哪个原因
let pendingAbandonBookId = null;
let selectedAbandonReason = null;
// 结算页用:进 stopSession 时快照下来,saveProgress 时用
let pendingRecap = null;  // { session, todayMsBefore, percentBefore }



// ===== 选书 sheet =====
function renderBookPicker() {
  const allBooks = storage.getBooks();
  // 只显示在读的书。老数据没有 status 字段时兜底成 reading。
  const books = allBooks.filter(b => (b.status || 'reading') === 'reading');

  // 空状态分两种:
  //  a) 库里一本书都没有:引导加第一本
  //  b) 库里有书,但没有在读的(全完读 / 全弃读):引导加新书
  if (books.length === 0) {
    if (allBooks.length === 0) {
      bookPickerListEl.innerHTML = `
        <div class="book-picker-empty">
          <p>还没有书</p>
          <button class="btn btn-primary" id="pickerAddFirstBtn">添加第一本</button>
        </div>
      `;
    } else {
      bookPickerListEl.innerHTML = `
        <div class="book-picker-empty book-picker-empty-quiet">
          <p>没有在读的书</p>
          <span class="empty-sub">手头的都告一段落了</span>
          <button class="btn btn-primary" id="pickerAddFirstBtn">添加新书</button>
        </div>
      `;
    }
    document.getElementById('pickerAddFirstBtn').addEventListener('click', () => {
      closeBookPicker();
      openModal();
    });
    return;
  }

  // 按 createdAt 倒序,新加的在上
  const sorted = [...books].sort((a, b) => b.createdAt - a.createdAt);

  bookPickerListEl.innerHTML = sorted.map(book => `
    <button class="book-picker-item" data-book-id="${book.id}">
      <span class="book-picker-title">${book.title}</span>
      <span class="book-picker-percent">${book.percent}%</span>
    </button>
  `).join('');

  bookPickerListEl.querySelectorAll('.book-picker-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.bookId;
      closeBookPicker();
      startSession(id);
    });
  });
}

function openBookPicker() {
  renderBookPicker();
  bookPickerSheet.classList.remove('hidden');
  // 下一帧加 active,触发 transition
  requestAnimationFrame(() => {
    bookPickerSheet.classList.add('active');
  });
}

function closeBookPicker() {
  bookPickerSheet.classList.remove('active');
  bookPickerSheet.addEventListener('transitionend', function onEnd(e) {
    // 只认 sheet-panel 的 transform 结束，别被 backdrop 的 background 触发两次
    if (e.target.classList.contains('sheet-panel') && e.propertyName === 'transform') {
      bookPickerSheet.classList.add('hidden');
      bookPickerSheet.removeEventListener('transitionend', onEnd);
    }
  });
}

// ===== 弃读 sheet =====
function openAbandonSheet(bookId) {
  pendingAbandonBookId = bookId;
  selectedAbandonReason = null;

  // 清空所有选项的选中态(可能上一次留下的)
  abandonReasonListEl.querySelectorAll('.abandon-reason-item').forEach(el => {
    el.classList.remove('selected');
  });

  // "其他"输入框先收起。注意 value 不清,保留上次填的内容。
  abandonOtherWrap.classList.add('hidden');
  // 但如果用户彻底取消上次又重开,这次 value 还在也算合理 —— 
  // 反正只有选了"其他"才会被读到。

  // 确认按钮置灰,等用户选了原因再亮
  abandonConfirmBtn.disabled = true;

  abandonSheet.classList.remove('hidden');
  requestAnimationFrame(() => {
    abandonSheet.classList.add('active');
  });
}

function closeAbandonSheet() {
  abandonSheet.classList.remove('active');
  abandonSheet.addEventListener('transitionend', function onEnd(e) {
    if (e.target.classList.contains('sheet-panel') && e.propertyName === 'transform') {
      abandonSheet.classList.add('hidden');
      abandonSheet.removeEventListener('transitionend', onEnd);
    }
  });
}

// 用户在 sheet 里点了某个原因
function selectAbandonReason(reason) {
  selectedAbandonReason = reason;

  // 视觉:清掉别的,标记自己
  abandonReasonListEl.querySelectorAll('.abandon-reason-item').forEach(el => {
    if (el.dataset.reason === reason) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });

  // 选了"其他"才出现输入框。不自动 focus,跟结算页风格一致。
  if (reason === '其他') {
    abandonOtherWrap.classList.remove('hidden');
  } else {
    abandonOtherWrap.classList.add('hidden');
    // value 不清,用户可能切回来
  }

  abandonConfirmBtn.disabled = false;
}

// 确认弃读:写入 book,关 sheet,刷新详情页
function confirmAbandon() {
  if (!pendingAbandonBookId || !selectedAbandonReason) return;

  // 决定最终存到 book.abandonReason 的字符串
  let finalReason = selectedAbandonReason;
  if (selectedAbandonReason === '其他') {
    const extra = abandonOtherInput.value.trim();
    // 留空允许:就只记录"其他"两个字
    finalReason = extra ? `其他:${extra}` : '其他';
  }

  const books = storage.getBooks();
  const book = books.find(b => b.id === pendingAbandonBookId);
  if (!book) {
    closeAbandonSheet();
    return;
  }

  book.status = 'abandoned';
  book.abandonReason = finalReason;
  // percent 故意不动:留着以便"重新开始读"时能保留进度

  storage.saveBooks(books);

  // 清状态,关 sheet,刷新详情页
  pendingAbandonBookId = null;
  selectedAbandonReason = null;
  closeAbandonSheet();

  if (currentDetailBookId) {
    renderBookDetail();
  }
}

// ===== 首页 streak 环 =====
// 三状态:
//   empty  - 今天还没读(todayMs < 60000)
//   short  - 今天读了一些但还不够 10 分钟
//   done   - 今天已经读够 10 分钟
function renderStreakRing() {
  const streak = calcStreak();
  const todayMs = getTodayMs(currentSession);
  const threshold = 10 * 60000;

  // 清掉之前的状态 class
  streakRingEl.classList.remove('is-empty', 'is-short', 'is-done', 'has-flame');

  if (todayMs >= threshold) {
    // done:环走满,中间是 streak 天数
    streakRingEl.classList.add('is-done');
    streakRingEl.style.setProperty('--progress', '360deg');
    streakRingNumberEl.textContent = streak;
    streakRingLabelEl.textContent = '连续';
    streakRingLabelEl.style.display = '';
    streakRingHintEl.textContent = `今天 ${formatDuration(todayMs)} ✓`;
    return;
  }

  if (todayMs >= 60000) {
    // short:今天读了但还没到门槛
    streakRingEl.classList.add('is-short');
    const ratio = todayMs / threshold;
    streakRingEl.style.setProperty('--progress', `${ratio * 360}deg`);
    const minsShort = Math.ceil((threshold - todayMs) / 60000);

    if (streak > 0) {
      // 历史火苗在续命:中间显示 streak 数字,提示突出 streak
      streakRingNumberEl.textContent = streak;
      streakRingLabelEl.textContent = '连续';
      streakRingLabelEl.style.display = '';
      streakRingHintEl.textContent = `连续 ${streak} 天 · 今天还差 ${minsShort} 分钟`;
    } else {
      // 火还没点燃过:继续显示木桩
      streakRingNumberEl.textContent = '🪵';
      streakRingLabelEl.style.display = 'none';
      streakRingHintEl.textContent = `今天 ${formatDuration(todayMs)} · 还差 ${minsShort} 分钟`;
    }
    return;
  }

  // empty:今天还没读(<1 分钟)
  streakRingEl.classList.add('is-empty');
  streakRingEl.style.setProperty('--progress', '0deg');
  streakRingLabelEl.style.display = 'none';

  if (streak > 0) {
    // 暗火:有 streak 但今天还没开始,火苗暗着等今天点
    streakRingEl.classList.add('has-flame');
    streakRingNumberEl.textContent = '🔥';
    streakRingHintEl.textContent = `连续 ${streak} 天 · 今天还没开始`;
  } else {
    // 木桩:火从来没点过
    streakRingNumberEl.textContent = '🪵';
    streakRingHintEl.textContent = '读 10 分钟点燃今天';
  }
}


// ===== 历史列表 =====
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


// ===== 顶层渲染 =====
function renderBooks() {
  renderStreakRing();
  renderSessionHistory();
}

// ===== 管理书籍页 =====
function openManageBooks() {
  listView.classList.add('hidden');
  manageBooksView.classList.remove('hidden');
  renderManageBooks();
}

function closeManageBooks() {
  manageBooksView.classList.add('hidden');
  listView.classList.remove('hidden');
  renderBooks();  // 回到首页时刷新一下,以防数据变了
}

function renderManageBooks() {
  const books = storage.getBooks();
  const sessions = storage.getSessions();

  // 算每本书的总时长和 session 数,渲染时一起显示
  const statsByBook = {};
  for (const s of sessions) {
    if (!statsByBook[s.bookId]) statsByBook[s.bookId] = { totalMs: 0, count: 0 };
    statsByBook[s.bookId].totalMs += s.duration;
    statsByBook[s.bookId].count += 1;
  }

  // 按 status 分组
  const groups = {
    reading: [],
    finished: [],
    abandoned: [],
  };
  for (const b of books) {
    const status = b.status || 'reading';  // 兜底,以防有老数据漏字段
    if (groups[status]) groups[status].push(b);
    else groups.reading.push(b);  // 未知 status 也归到在读,不丢书
  }

  // 每组里按 createdAt 倒序
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => b.createdAt - a.createdAt);
  }

  if (books.length === 0) {
    manageBooksListEl.innerHTML = `
      <div class="manage-empty">
        <p>还没有书</p>
        <button class="btn btn-primary" id="manageEmptyAddBtn">添加第一本</button>
      </div>
    `;
    document.getElementById('manageEmptyAddBtn').addEventListener('click', openModal);
    return;
  }

  manageBooksListEl.innerHTML = `
    ${renderManageGroup('在读', groups.reading, statsByBook)}
    ${renderManageGroup('已完读', groups.finished, statsByBook)}
    ${renderManageGroup('已弃读', groups.abandoned, statsByBook)}
  `;

  // 绑点击事件:每条书 → 详情页(下一刀做,先留空)
  manageBooksListEl.querySelectorAll('.manage-book-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.bookId;
      openBookDetail(id);
    });
  });
}

function renderManageGroup(title, books, statsByBook) {
  if (books.length === 0) return '';

  return `
    <div class="manage-group">
      <h3 class="manage-group-title">${title} · ${books.length}</h3>
      ${books.map(b => {
        const stats = statsByBook[b.id] || { totalMs: 0, count: 0 };
        const timeText = stats.count === 0
          ? '还没读过'
          : `${formatDuration(stats.totalMs)} · ${stats.count} 次`;
        // 作者和时长都显示;作者没填就只显示时长
        const subText = b.author
          ? `${b.author} · ${timeText}`
          : timeText;
        return `
          <div class="manage-book-item" data-book-id="${b.id}">
            <div class="manage-book-main">
              <span class="manage-book-title">${b.title}</span>
              <span class="manage-book-stats">${subText}</span>
            </div>
            <span class="manage-book-percent">${b.percent}%</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ===== 书籍详情页 =====
function openBookDetail(bookId) {
  currentDetailBookId = bookId;
  manageBooksView.classList.add('hidden');
  bookDetailView.classList.remove('hidden');
  renderBookDetail();
  // 从顶部开始看,免得长列表停在中间
  window.scrollTo(0, 0);
}

function closeBookDetail() {
  currentDetailBookId = null;
  bookDetailView.classList.add('hidden');
  manageBooksView.classList.remove('hidden');
  renderManageBooks();  // 回去时刷新,数据可能变了
}

function renderBookDetail() {
  const book = storage.getBooks().find(b => b.id === currentDetailBookId);
  if (!book) {
    // 书没了(被别处删了),回管理页
    closeBookDetail();
    return;
  }

  // 头部
  detailTitleEl.textContent = `《${book.title}》`;
  // byline:作者 / 译者,谁有显示谁
  const bylineParts = [];
  if (book.author) bylineParts.push(book.author);
  if (book.translator) bylineParts.push(`${book.translator} 译`);
  detailBylineEl.textContent = bylineParts.join(' · ');

  // session 统计
  const sessions = storage.getSessions()
    .filter(s => s.bookId === book.id)
    .sort((a, b) => b.startTime - a.startTime);
  const totalMs = sessions.reduce((sum, s) => sum + s.duration, 0);

  detailPercentEl.textContent = `${book.percent}%`;
  detailTotalTimeEl.textContent = totalMs > 0 ? formatDuration(totalMs) : '—';
  detailSessionCountEl.textContent = sessions.length;

  // 弃读原因
  if (book.status === 'abandoned' && book.abandonReason) {
    detailAbandonReasonEl.classList.remove('hidden');
    detailAbandonReasonEl.innerHTML = `
      <span class="detail-abandon-reason-label">弃读原因:</span>${book.abandonReason}
    `;
  } else {
    detailAbandonReasonEl.classList.add('hidden');
  }

  // 操作按钮
  renderDetailActions(book);

  // session 列表
  renderDetailSessions(sessions);
}

function renderDetailActions(book) {
  const status = book.status || 'reading';

  if (status === 'reading') {
    detailActionsEl.innerHTML = `
      <button class="btn btn-primary" id="detailFinishBtn">完读</button>
      <button class="btn btn-warning" id="detailAbandonBtn">弃读</button>
      <button class="btn btn-danger" id="detailDeleteBtn">删除</button>
    `;
    document.getElementById('detailFinishBtn').addEventListener('click', () => {
      handleFinishFromDetail(book.id);
    });
    document.getElementById('detailAbandonBtn').addEventListener('click', () => {
      openAbandonSheet(book.id);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
      handleDeleteFromDetail(book.id);
    });
  } else {
    // finished 或 abandoned
    detailActionsEl.innerHTML = `
      <button class="btn btn-secondary" id="detailRestartBtn">重新开始读</button>
      <button class="btn btn-danger" id="detailDeleteBtn">删除</button>
    `;
    document.getElementById('detailRestartBtn').addEventListener('click', () => {
      handleRestartReading(book.id);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
      handleDeleteFromDetail(book.id);
    });
  }
}

function renderDetailSessions(sessions) {
  if (sessions.length === 0) {
    detailSessionsEl.innerHTML = `<div class="detail-sessions-empty">还没读过</div>`;
    return;
  }

  detailSessionsEl.innerHTML = sessions.map(s => `
    <div class="detail-session-item">
      <span class="detail-session-date">${formatSessionTime(s.startTime)}</span>
      <span class="detail-session-duration">${formatDuration(s.duration)}</span>
    </div>
  `).join('');
}

// 详情页"完读"按钮:盖 finishedAt + status,percent 拉到 100,弹庆祝遮罩
function handleFinishFromDetail(bookId) {
  const books = storage.getBooks();
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  book.status = 'finished';
  book.finishedAt = book.finishedAt || Date.now();  // 已经有就别覆盖
  // 详情页按钮 = 用户明确说"读完了",拉到 100
  // 即便用户之前停在 87%,现在按完读就是 100%
  if (book.percent < 100) book.percent = 100;
  // 如果之前是弃读,清掉弃读原因
  book.abandonReason = null;

  storage.saveBooks(books);

  showFinishCelebration(book.title);
}

// 重新开始读:把状态改回 reading,清掉完读/弃读痕迹,percent 保留
function handleRestartReading(bookId) {
  const books = storage.getBooks();
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  book.status = 'reading';
  book.finishedAt = null;
  book.abandonReason = null;
  // percent 故意不动:60% 弃读的,重启后还是 60%

  storage.saveBooks(books);
  renderBookDetail();  // 当场刷新,按钮变了
}

// 详情页里删除:删完直接退回管理页
function handleDeleteFromDetail(bookId) {
  const book = storage.getBooks().find(b => b.id === bookId);
  if (!book) return;

  const ok = confirm(`确定删除《${book.title}》吗?这本书的阅读记录也会一起删掉。`);
  if (!ok) return;

  // 先删 sessions(孤儿数据防御),再删 book
  const sessions = storage.getSessions().filter(s => s.bookId !== bookId);
  storage.saveSessions(sessions);

  const books = storage.getBooks().filter(b => b.id !== bookId);
  storage.saveBooks(books);

  closeBookDetail();
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

// ===== 沙漏档位 =====
// 每 10 分钟一档,30 分钟一循环
// 上沙范围:y=40 到 y=150 (高度 110)
// 下沙范围:y=170 到 y=280 (高度 110,从底往上堆)
const HOURGLASS_STAGES = [
  // 0-10 分钟:上满下空
  { topY: 40, topH: 110, botY: 280, botH: 0   },
  // 10-20 分钟:上 2/3,下 1/3
  { topY: 40, topH: 73,  botY: 243, botH: 37  },
  // 20-30 分钟:上 1/3,下 2/3
  { topY: 40, topH: 37,  botY: 207, botH: 73  },
];
let currentStageIndex = -1;  // -1 表示还没渲染过,首次必更新

function getStageIndex(elapsedMs) {
  return Math.floor(elapsedMs / 600000) % 3;
}

function renderHourglass() {
  if (!currentSession) return;
  const elapsed = Date.now() - currentSession.startTime;
  const stage = getStageIndex(elapsed);

  if (stage === currentStageIndex) return;  // 没换档,啥都不做
  currentStageIndex = stage;

  const s = HOURGLASS_STAGES[stage];
  sandTopEl.setAttribute('y', s.topY);
  sandTopEl.setAttribute('height', s.topH);
  sandBottomEl.setAttribute('y', s.botY);
  sandBottomEl.setAttribute('height', s.botH);
}


// ===== Session =====
  function startSession(bookId) {
  const book = storage.getBooks().find(b => b.id === bookId);
  if (!book) return;

  currentSession = { bookId, startTime: Date.now() };

  currentBookTitleEl.textContent = `📖 ${book.title}`;

  listView.classList.add('hidden');
  timerView.classList.remove('hidden');

  // ↓↓↓ 新加这三行 ↓↓↓
  currentStageIndex = -1;
  renderHourglass();
  intervalId = setInterval(renderHourglass, 1000);
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

  // 进入结算页之前先把按钮恢复成"跳过/完成"
  // (上一次结算结束后可能停在"继续"状态)
  resetRecapButtons();

  // 快照结算需要的状态(注意 todayMsBefore 不含本次)
  const todayMsBefore = getTodayMs() - duration;
  pendingRecap = {
    session: newSession,
    todayMsBefore,
    percentBefore: book.percent,
  };

  recapDurationEl.textContent = formatDuration(duration);
  recapBookEl.textContent = `《${book.title}》`;
  recapPercentBeforeEl.textContent = `${book.percent}`;
  recapPercentAfterInput.value = book.percent;
  recapPercentAfterInput.disabled = false;

  timerView.classList.add('hidden');
  progressView.classList.remove('hidden');

  // 不自动 focus,免得键盘把整个结算页挤上去
  // 用户想改进度自己点输入框
}


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


// ===== 添加书 Modal =====
function openModal() {
  addBookModal.classList.remove('hidden');
  bookTitleInput.focus();
}

function closeModal() {
  addBookModal.classList.add('hidden');
  bookTitleInput.value = '';
  bookAuthorInput.value = '';
  bookTranslatorInput.value = '';
  bookPercentInput.value = '0';
  // 如果管理页正开着,刷新一下;否则保持原行为(saveBook 那边会调 renderBooks)
  if (!manageBooksView.classList.contains('hidden')) {
    renderManageBooks();
  }
}

function saveBook() {
  const title = bookTitleInput.value.trim();
  if (!title) {
    alert('请输入书名');
    return;
  }

const initialPercent = Number(bookPercentInput.value) || 0;
const newBook = {
  id: uuid(),
  title,
  author: bookAuthorInput.value.trim(),
  translator: bookTranslatorInput.value.trim(),
  percent: initialPercent,
  status: initialPercent >= 100 ? 'finished' : 'reading',
  finishedAt: initialPercent >= 100 ? Date.now() : null,
  createdAt: Date.now(),
};

  const books = storage.getBooks();
  books.push(newBook);
  storage.saveBooks(books);

  closeModal();
  renderBooks();
}


// ===== 结算页 =====
function finishProgress() {
  pendingProgressBookId = null;
  pendingRecap = null;

  // 隐藏并重置第二层(today)
  recapTodayLayer.classList.add('hidden');
  recapTodayLayer.style.animation = '';
  recapTodayTextEl.textContent = '';
  recapTodayMilestoneEl.textContent = '';
  recapTodayMilestoneEl.classList.add('hidden');

  // 隐藏并重置第三层(streak)
  recapStreakLayer.classList.add('hidden');
  recapStreakLayer.style.animation = '';
  recapStreakIcon.classList.remove('flicker', 'dim');
  recapStreakMain.textContent = '';
  recapStreakSub.textContent = '';

  // 隐藏并重置第四层(finish)
  recapFinishLayer.classList.add('hidden');
  recapFinishBookEl.textContent = '';

  // 解锁第一层输入
  recapPercentAfterInput.disabled = false;
  // 按钮恢复
  resetRecapButtons();

  progressView.classList.add('hidden');
  listView.classList.remove('hidden');
  renderBooks();
}

function saveProgress() {
  if (!pendingRecap) return;

  const raw = recapPercentAfterInput.value.trim();

  let percentAfter;
  if (raw === '') {
    percentAfter = pendingRecap.percentBefore;
  } else {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      alert('请输入 0-100 之间的数字');
      return;
    }
    percentAfter = n;
  }

  // 写入 book(只在变了的时候写)
  const books = storage.getBooks();
  const book = books.find(b => b.id === pendingProgressBookId);
  let justFinished = false;

  if (book && percentAfter !== book.percent) {
    const wasFinished = book.percent >= 100;
    const nowFinished = percentAfter >= 100;

    book.percent = percentAfter;

    // 首次完读:盖时间戳 + 改状态
    if (!wasFinished && nowFinished) {
      book.finishedAt = Date.now();
      book.status = 'finished';
      justFinished = true;
    }

    storage.saveBooks(books);
  }

  playRecapSequence({ justFinished, bookTitle: book ? book.title : '' });
}

function skipProgress() {
  if (!pendingRecap) return;
  // 跳过 = 不更新进度,完读不可能在这条路径上发生
  playRecapSequence({ justFinished: false, bookTitle: '' });
}

// 播放结算页后续层(today → streak → finish?)的依次淡入
function playRecapSequence({ justFinished, bookTitle }) {
  // 切换底部按钮:跳过/完成 → 单个"继续"
  setRecapButtonsToContinue();
  // 锁住进度输入,免得展示期间被改
  recapPercentAfterInput.disabled = true;

  // 第二层:today + milestone(立刻淡入)
  showTodayLayer();

  // 第三层:streak,700ms 后淡入,留个呼吸
  setTimeout(showStreakLayer, 700);

  // 第四层:只在跨过 100% 完读时出
  if (justFinished) {
    setTimeout(() => showFinishLayer(bookTitle), 1500);
  }
}

function showTodayLayer() {
  if (!pendingRecap) return;
  const { todayText, milestone } = getRecapMilestones({
    session: pendingRecap.session,
    todayMsBefore: pendingRecap.todayMsBefore,
  });

  recapTodayTextEl.textContent = todayText;

  if (milestone) {
    recapTodayMilestoneEl.textContent = milestone;
    recapTodayMilestoneEl.classList.remove('hidden');
  } else {
    recapTodayMilestoneEl.classList.add('hidden');
  }

  recapTodayLayer.classList.remove('hidden');
  recapTodayLayer.style.animation = 'recapFadeIn 0.5s ease-out';
}

// 渲染第三层:Streak 火苗
function showStreakLayer() {
  if (!pendingRecap) return;  // 用户已经点了继续,丢弃这次回调

  const state = getRecapStreakState({
    todayMsBefore: pendingRecap.todayMsBefore,
    sessionDuration: pendingRecap.session.duration,
  });

  // 重置 class
  recapStreakIcon.classList.remove('flicker', 'dim');

  if (state.status === 'short') {
    const minsShort = Math.ceil(state.shortBy / 60000);
    recapStreakIcon.textContent = '🪵';
    recapStreakIcon.classList.add('dim');
    recapStreakMain.textContent = `还差 ${minsShort} 分钟`;
    recapStreakSub.textContent = '凑够 10 分钟今天就算';
  } else if (state.status === 'crossed') {
    recapStreakIcon.textContent = '🔥';
    recapStreakIcon.classList.add('flicker');
    recapStreakMain.textContent = `连续 ${state.streak} 天`;
    recapStreakSub.textContent = state.streak === 1
      ? '一段关系开始了'
      : '今天的火苗保住了';
  } else {
    // maintained
    recapStreakIcon.textContent = '🔥';
    recapStreakIcon.classList.add('flicker');
    recapStreakMain.textContent = `连续 ${state.streak} 天`;
    recapStreakSub.textContent = '已经稳了';
  }

  recapStreakLayer.classList.remove('hidden');
  recapStreakLayer.style.animation = 'recapFadeIn 0.5s ease-out';
}

// 第四层:完读庆祝
function showFinishLayer(bookTitle) {
  if (!pendingRecap) return;
  recapFinishBookEl.textContent = bookTitle ? `《${bookTitle}》` : '';
  recapFinishLayer.classList.remove('hidden');
  recapFinishLayer.style.animation = 'recapFadeIn 0.6s ease-out';
}

// 把底部两个按钮(跳过/完成)换成单个"继续"
function setRecapButtonsToContinue() {
  skipProgressBtn.classList.add('hidden');
  saveProgressBtn.textContent = '继续';
  saveProgressBtn.removeEventListener('click', saveProgress);
  saveProgressBtn.addEventListener('click', finishProgress);
}

// 进入结算页时,把按钮恢复成初始的"跳过/完成"
function resetRecapButtons() {
  skipProgressBtn.classList.remove('hidden');
  saveProgressBtn.textContent = '完成';
  saveProgressBtn.removeEventListener('click', finishProgress);
  saveProgressBtn.addEventListener('click', saveProgress);
}

// ===== 完读庆祝遮罩(详情页"完读"按钮入口) =====
function showFinishCelebration(bookTitle) {
  finishCelebrationBookEl.textContent = bookTitle ? `《${bookTitle}》` : '';
  finishCelebration.classList.remove('hidden');
}

function closeFinishCelebration() {
  finishCelebration.classList.add('hidden');
}


// ===== 事件绑定 =====
cancelBookBtn.addEventListener('click', closeModal);
saveBookBtn.addEventListener('click', saveBook);
stopBtn.addEventListener('click', stopSession);

// 结算页两个按钮的初始绑定(saveProgress 还会被 resetRecapButtons 重新绑,这里先保证首次能用)
saveProgressBtn.addEventListener('click', saveProgress);
skipProgressBtn.addEventListener('click', skipProgress);

startReadingBtn.addEventListener('click', () => {
  openBookPicker();
});

manageBooksBtn.addEventListener('click', openManageBooks);
manageBackBtn.addEventListener('click', closeManageBooks);
manageAddBtn.addEventListener('click', openModal);
detailBackBtn.addEventListener('click', closeBookDetail);

addBookModal.addEventListener('click', (e) => {
  if (e.target === addBookModal) closeModal();
});

// 完读庆祝遮罩:点继续按钮关闭并刷新详情页
finishCelebrationOkBtn.addEventListener('click', () => {
  closeFinishCelebration();
  // 详情页此时还在背景里(没切走过),刷新一下让按钮组从"完读/弃读/删除"
  // 切到"重新开始读/删除"
  if (currentDetailBookId) {
    renderBookDetail();
  }
});

bookPickerSheet.addEventListener('click', (e) => {
  // 点 backdrop(就是 sheet 容器本身或那个半透明遮罩)关闭
  if (e.target === bookPickerSheet || e.target.classList.contains('sheet-backdrop')) {
    closeBookPicker();
  }
});

// 弃读 sheet:点选项 / 取消 / 确认 / backdrop 关闭
abandonReasonListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.abandon-reason-item');
  if (!btn) return;
  selectAbandonReason(btn.dataset.reason);
});

abandonCancelBtn.addEventListener('click', closeAbandonSheet);
abandonConfirmBtn.addEventListener('click', confirmAbandon);

abandonSheet.addEventListener('click', (e) => {
  if (e.target === abandonSheet || e.target.classList.contains('sheet-backdrop')) {
    closeAbandonSheet();
  }
});

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

// 回车 = 保存
recapPercentAfterInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveProgress();
});


// ===== 启动 =====
renderBooks();