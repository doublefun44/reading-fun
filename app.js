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
const bookCoverInput = document.getElementById('bookCover');
const bookPercentInput = document.getElementById('bookPercent');
const saveBookBtn = document.getElementById('saveBookBtn');
const cancelBookBtn = document.getElementById('cancelBookBtn');

const progressView = document.getElementById('progressView');
const recapDurationEl = document.getElementById('recapDuration');
const recapBookEl = document.getElementById('recapBook');
const recapPercentBeforeEl = document.getElementById('recapPercentBefore');
const recapPercentAfterInput = document.getElementById('recapPercentAfter');
const recapXpLayer = document.getElementById('recapXpLayer');
const recapXpList = document.getElementById('recapXpList');
const recapXpTotal = document.getElementById('recapXpTotal');
const recapXpTotalValue = document.getElementById('recapXpTotalValue');
const recapStreakLayer = document.getElementById('recapStreakLayer');
const recapStreakIcon = document.getElementById('recapStreakIcon');
const recapStreakMain = document.getElementById('recapStreakMain');
const recapStreakSub = document.getElementById('recapStreakSub');
const saveProgressBtn = document.getElementById('saveProgressBtn');
const skipProgressBtn = document.getElementById('skipProgressBtn');

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

// ===== 计时状态 =====
let currentSession = null;  // { bookId, startTime } | null
let intervalId = null;
let pendingProgressBookId = null;
// 结算页用:进 stopSession 时快照下来,saveProgress 时算 XP 用
let pendingRecap = null;  // { session, todayMsBefore, percentBefore }


// ===== 选书 sheet =====
function renderBookPicker() {
  const books = storage.getBooks();

  if (books.length === 0) {
    bookPickerListEl.innerHTML = `
      <div class="book-picker-empty">
        <p>还没有书</p>
        <button class="btn btn-primary" id="pickerAddFirstBtn">添加第一本</button>
      </div>
    `;
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
  bookCoverInput.value = '';
  bookPercentInput.value = '0';
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
  coverUrl: bookCoverInput.value.trim(),
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
  // 隐藏并重置第二层
  recapXpLayer.classList.add('hidden');
  recapXpList.innerHTML = '';
  recapXpTotal.classList.add('hidden');
  // 隐藏并重置第三层
  recapStreakLayer.classList.add('hidden');
  recapStreakLayer.style.animation = '';
  recapStreakIcon.classList.remove('flicker', 'dim');
  recapStreakMain.textContent = '';
  recapStreakSub.textContent = '';
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
if (book && percentAfter !== book.percent) {
  const wasFinished = book.percent >= 100;
  const nowFinished = percentAfter >= 100;

  book.percent = percentAfter;

  // 首次完读:盖时间戳 + 改状态
  if (!wasFinished && nowFinished) {
    book.finishedAt = Date.now();
    book.status = 'finished';
  }

  storage.saveBooks(books);
}

  // 算 XP 明细,准备播放
  const xpItems = calcSessionXp({
    session: pendingRecap.session,
    todayMsBefore: pendingRecap.todayMsBefore,
    percentBefore: pendingRecap.percentBefore,
    percentAfter,
  });

  playXpAnimation(xpItems);
}

function skipProgress() {
  if (!pendingRecap) return;
  // 跳过 = 不更新进度,但仍然算 XP
  const xpItems = calcSessionXp({
    session: pendingRecap.session,
    todayMsBefore: pendingRecap.todayMsBefore,
    percentBefore: pendingRecap.percentBefore,
    percentAfter: pendingRecap.percentBefore,
  });
  playXpAnimation(xpItems);
}

// 渲染第三层:Streak 火苗
// 节奏:在 XP 总数显示完之后调用,自己负责淡入
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
  // 给一点淡入感(借用 recapFadeIn,要先挪掉 animation:none)
  recapStreakLayer.style.animation = 'recapFadeIn 0.5s ease-out';
}

// 播放 XP 跳动动画
// 节奏:每 400ms 出一条,数字从 0 跳到目标用 500ms
function playXpAnimation(items) {
  // 切换底部按钮:跳过/完成 → 单个"继续"
  setRecapButtonsToContinue();

  // 锁住第一层的输入,免得动画期间用户改数字
  recapPercentAfterInput.disabled = true;

  recapXpList.innerHTML = '';
  recapXpTotal.classList.add('hidden');
  recapXpLayer.classList.remove('hidden');

  items.forEach((item, i) => {
    setTimeout(() => {
      const li = document.createElement('li');
      li.className = 'recap-xp-item';
      li.innerHTML = `
        <span class="recap-xp-label">${item.label}</span>
        <span class="recap-xp-value" data-target="${item.xp}">+0</span>
      `;
      recapXpList.appendChild(li);
      animateNumber(li.querySelector('.recap-xp-value'), 0, item.xp, 500);
    }, i * 400);
  });

  // 全部播完后,显示总数,然后再亮 streak 层
  const totalDelay = items.length * 400 + 500;
  setTimeout(() => {
    const total = items.reduce((s, x) => s + x.xp, 0);
    recapXpTotalValue.textContent = `+${total}`;
    recapXpTotal.classList.remove('hidden');
  }, totalDelay);

  // streak 层在 XP 总数之后再 600ms 出来,留个呼吸
  setTimeout(showStreakLayer, totalDelay + 600);
}

// 数字从 from 跳到 to,用 requestAnimationFrame
function animateNumber(el, from, to, durationMs) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / durationMs);
    // easeOutCubic,前快后慢,数字落地有"稳住"的感觉
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = `+${value}`;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
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

manageBooksBtn.addEventListener('click', () => {
  alert('管理书籍页(下一步做)');
});

addBookModal.addEventListener('click', (e) => {
  if (e.target === addBookModal) closeModal();
});

bookPickerSheet.addEventListener('click', (e) => {
  // 点 backdrop(就是 sheet 容器本身或那个半透明遮罩)关闭
  if (e.target === bookPickerSheet || e.target.classList.contains('sheet-backdrop')) {
    closeBookPicker();
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