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
const bookTitleHint = document.getElementById('bookTitleHint');
const bookGoRestartBtn = document.getElementById('bookGoRestartBtn');

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
const exportHintEl = document.getElementById('exportHint');

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

// 顶部 header(只在首页可见时显示)
const appHeader = document.querySelector('.app-header');
const openMonthSummaryBtn = document.getElementById('openMonthSummaryBtn');

// 月总结页
const monthSummaryView = document.getElementById('monthSummaryView');
const monthBackBtn = document.getElementById('monthBackBtn');
const monthPrevBtn = document.getElementById('monthPrevBtn');
const monthNextBtn = document.getElementById('monthNextBtn');
const monthLabelEl = document.getElementById('monthLabel');
const monthHeroTextEl = document.getElementById('monthHeroText');
const monthBookListEl = document.getElementById('monthBookList');
const monthRecordsSection = document.getElementById('monthRecordsSection');
const monthLongestSessionEl = document.getElementById('monthLongestSession');
const monthFocusedDayEl = document.getElementById('monthFocusedDay');
const monthHeatmapEl = document.getElementById('monthHeatmap');
const monthStreakDaysEl = document.getElementById('monthStreakDays');
const monthLongestStreakEl = document.getElementById('monthLongestStreak');
const monthComparisonEl = document.getElementById('monthComparison');

// ===== 计时状态 =====
let currentSession = null;  // { bookId, startTime } | null
let intervalId = null;
let pendingProgressBookId = null;
let currentDetailBookId = null;  // 详情页正在看的书 id
// 月总结页:当前看的是哪个月
let currentMonthKey = null;
// 详情页"返回"应该回到哪:'manage' | 'monthSummary'
let detailReturnTo = 'manage';
// 弃读 sheet 的临时状态:正在为哪本书选弃读原因 + 当前选中哪个原因
let pendingAbandonBookId = null;
let selectedAbandonReason = null;
// 结算页用:进 stopSession 时快照下来,saveProgress 时用
let pendingRecap = null;  // { session, todayMsBefore, percentBefore }

// ===== View 切换收口 =====
// 5 个 section + 顶部 header 的显隐统一走这里,免得各处散写 .hidden
// header 只在 list 视图可见
const VIEW_NAMES = ['list', 'timer', 'progress', 'manage', 'detail', 'monthSummary', 'abandonedReview'];
const VIEW_ELS = {
  list: listView,
  timer: timerView,
  progress: progressView,
  manage: manageBooksView,
  detail: bookDetailView,
  monthSummary: monthSummaryView,
  abandonedReview: document.getElementById('abandonedReviewView'),
};

function setActiveView(name) {
  if (!VIEW_NAMES.includes(name)) return;
  for (const v of VIEW_NAMES) {
    VIEW_ELS[v].classList.toggle('hidden', v !== name);
  }
  // header 只跟着 list 出现
  appHeader.classList.toggle('hidden', name !== 'list');
}


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
  // done:今天达标,木桩点燃成火焰。streak 数字挪到 hint 里
  streakRingEl.classList.add('is-done');
  streakRingEl.style.setProperty('--progress', '360deg');
  streakRingNumberEl.textContent = '🔥';
  streakRingLabelEl.style.display = 'none';
  // streak >= 1(因为今天已达标,calcStreak 至少返回 1),直接显示
  streakRingHintEl.textContent = `连续 ${streak} 天 · 今天 ${formatDuration(todayMs)} ✓`;
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
    .slice(0, 3);

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
  renderExportHint();
}

// 上次导出 > 14 天才提示一次,克制即可,不打扰
// 没导出过且已经积累了一些 session 时也提示
function renderExportHint() {
  const lastExportAt = Number(localStorage.getItem('rpg.lastExportAt')) || 0;
  const sessionCount = storage.getSessions().length;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // 还没攒下东西就别催
  if (sessionCount < 5) {
    exportHintEl.classList.add('hidden');
    return;
  }

  if (lastExportAt === 0) {
    exportHintEl.textContent = '还没备份过,建议导出一份';
    exportHintEl.classList.remove('hidden');
    return;
  }

  const daysAgo = Math.floor((now - lastExportAt) / day);
  if (daysAgo >= 14) {
    exportHintEl.textContent = `上次备份是 ${daysAgo} 天前`;
    exportHintEl.classList.remove('hidden');
  } else {
    exportHintEl.classList.add('hidden');
  }
}

// ===== 管理书籍页 =====
function openManageBooks() {
  setActiveView('manage');
  renderManageBooks();
}

function closeManageBooks() {
  setActiveView('list');
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
    ${renderAbandonedReviewEntry(groups.abandoned.length)}
    ${renderManageGroup('在读', groups.reading, statsByBook)}
    ${renderManageGroup('已完读', groups.finished, statsByBook)}
    ${renderManageGroup('已弃读', groups.abandoned, statsByBook)}
  `;

  // 入口的点击事件
  const entryEl = manageBooksListEl.querySelector('#manageAbandonedEntry');
  if (entryEl) {
    entryEl.addEventListener('click', openAbandonedReview);
  }

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

// 管理页顶部的"放下的书"入口。弃读 < 3 本时不显示。
function renderAbandonedReviewEntry(abandonedCount) {
  if (abandonedCount < 3) return '';
  return `
    <button id="manageAbandonedEntry" class="abandoned-entry">
      <span class="abandoned-entry-text">放下的书 · 看看它们之间有什么共同点</span>
      <span class="abandoned-entry-arrow">→</span>
    </button>
  `;
}

// ===== 放下的书 · 弃读分析页 =====
function openAbandonedReview() {
  setActiveView('abandonedReview');
  renderAbandonedReview();
  window.scrollTo(0, 0);
}

function closeAbandonedReview() {
  setActiveView('manage');
  renderManageBooks();
}

function renderAbandonedReview() {
  const stats = getAbandonedStats();
  renderAbandonedSummary(stats);
  renderAbandonedTopInvested(stats);
  renderAbandonedRecurring(stats);
}

function renderAbandonedSummary(stats) {
  const el = document.getElementById('abandonedSummary');
  const dur = formatHeroDuration(stats.totalAbandonedMs);
  // 一句话:放下了多少 / 投了多少时间 / 对照完读了多少
  el.innerHTML = `
    你放下过 <span class="abandoned-num">${stats.abandonedCount} 本书</span>,
    在它们身上花了 <span class="abandoned-num">${dur}</span>。
    读完了 <span class="abandoned-num-quiet">${stats.finishedCount} 本</span>。
  `;
}

function renderAbandonedTopInvested(stats) {
  const el = document.getElementById('abandonedTopInvested');
  if (!stats.topInvested || stats.topInvested.length === 0) {
    el.innerHTML = `
      <div class="abandoned-empty">
        放下的书里,还没有投入超过 1 小时的<br>
        <span class="abandoned-empty-sub">短暂尝试就放下,不算太亏</span>
      </div>
    `;
    return;
  }

  el.innerHTML = stats.topInvested.map(b => {
    // byline:作者 / 译者 译,各自有就显示
    const bylineParts = [];
    if (b.author) bylineParts.push(b.author);
    if (b.translator) bylineParts.push(`${b.translator} 译`);
    const byline = bylineParts.join(' · ');

    // 第二行的元数据:时长 · 进度 · 弃读原因
    const metaParts = [
      formatDuration(b.totalMs),
      `读到 ${b.percent}%`,
    ];
    if (b.abandonReason) metaParts.push(b.abandonReason);
    const meta = metaParts.join(' · ');

    return `
      <button class="abandoned-top-item" data-book-id="${b.bookId}">
        <div class="abandoned-top-title">《${b.title}》</div>
        ${byline ? `<div class="abandoned-top-byline">${byline}</div>` : ''}
        <div class="abandoned-top-meta">${meta}</div>
      </button>
    `;
  }).join('');

  el.querySelectorAll('.abandoned-top-item').forEach(item => {
    item.addEventListener('click', () => {
      openBookDetail(item.dataset.bookId, 'abandonedReview');
    });
  });
}

function renderAbandonedRecurring(stats) {
  const section = document.getElementById('abandonedRecurringSection');
  const authorsBlock = document.getElementById('abandonedAuthorsBlock');
  const translatorsBlock = document.getElementById('abandonedTranslatorsBlock');
  const authorsList = document.getElementById('abandonedAuthorsList');
  const translatorsList = document.getElementById('abandonedTranslatorsList');

  const hasAuthors = stats.recurringAuthors.length > 0;
  const hasTranslators = stats.recurringTranslators.length > 0;

  // 两边都没有:整个 section 隐藏,免得空骨架
  if (!hasAuthors && !hasTranslators) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  // 作者
  if (hasAuthors) {
    authorsBlock.classList.remove('hidden');
    authorsList.innerHTML = stats.recurringAuthors.map(a => `
      <div class="abandoned-recurring-item">
        <span class="abandoned-recurring-name">${a.name}</span>
        <span class="abandoned-recurring-stats">${a.count} 次 · ${formatHeroDuration(a.totalMs)}</span>
      </div>
    `).join('');
  } else {
    authorsBlock.classList.add('hidden');
  }

  // 译者
  if (hasTranslators) {
    translatorsBlock.classList.remove('hidden');
    translatorsList.innerHTML = stats.recurringTranslators.map(t => `
      <div class="abandoned-recurring-item">
        <span class="abandoned-recurring-name">${t.name}</span>
        <span class="abandoned-recurring-stats">${t.count} 次 · ${formatHeroDuration(t.totalMs)}</span>
      </div>
    `).join('');
  } else {
    translatorsBlock.classList.add('hidden');
  }
}

// ===== 书籍详情页 =====
// returnTo: 'manage'(默认,从管理页进来) | 'monthSummary'(从月总结进来) | 'list'(从添加书 modal 的"已弃读重复"提示跳进来)
function openBookDetail(bookId, returnTo = 'manage') {
  currentDetailBookId = bookId;
  detailReturnTo = returnTo;
  setActiveView('detail');
  renderBookDetail();
  // 从顶部开始看,免得长列表停在中间
  window.scrollTo(0, 0);
}

function closeBookDetail() {
  const back = detailReturnTo;
  currentDetailBookId = null;
  if (back === 'monthSummary') {
    setActiveView('monthSummary');
    renderMonthSummary();
  } else if (back === 'abandonedReview') {
    setActiveView('abandonedReview');
    renderAbandonedReview();
  } else if (back === 'list') {
    setActiveView('list');
    renderBooks();
  } else {
    setActiveView('manage');
    renderManageBooks();
  }
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

// ===== 月总结页 =====
function openMonthSummary() {
  currentMonthKey = getCurrentMonthKey();
  setActiveView('monthSummary');
  renderMonthSummary();
  window.scrollTo(0, 0);
}

function closeMonthSummary() {
  setActiveView('list');
  renderBooks();
}

function navigateMonth(delta) {
  if (!currentMonthKey) return;
  const targetKey = delta < 0
    ? getPrevMonthKey(currentMonthKey)
    : getNextMonthKey(currentMonthKey);
  if (!canNavigateToMonth(targetKey)) return;
  currentMonthKey = targetKey;
  renderMonthSummary();
  window.scrollTo(0, 0);
}

function renderMonthSummary() {
  if (!currentMonthKey) return;
  const stats = getMonthStats(currentMonthKey);
  const comparison = getMonthComparison(currentMonthKey);

  renderMonthHeader(currentMonthKey);
  renderMonthHero(stats);
  renderMonthBooks(stats);
  renderMonthRecords(stats);
  renderMonthHeatmap(stats);
  renderMonthStreak(stats);
  renderMonthComparison(comparison);
}

// ----- 子渲染:头部(月份 + 左右箭头) -----
function renderMonthHeader(monthKey) {
  monthLabelEl.textContent = formatMonthLabel(monthKey);
  monthPrevBtn.disabled = !canNavigateToMonth(getPrevMonthKey(monthKey));
  monthNextBtn.disabled = !canNavigateToMonth(getNextMonthKey(monthKey));
}

// ----- 子渲染:Hero 文案 -----
function renderMonthHero(stats) {
  const monthName = formatMonthLabel(stats.monthKey);  // "2026 年 4 月"
  // 取月名里的"X 月",简短点
  const shortMonth = monthName.match(/(\d+)\s*月/);
  const monthShort = shortMonth ? `${shortMonth[1]} 月` : monthName;

  if (stats.sessionCount === 0 || stats.totalMs === 0) {
    monthHeroTextEl.innerHTML =
      `<span class="hero-empty">${monthShort}还没读过书</span>`;
    return;
  }

  const dur = formatHeroDuration(stats.totalMs);
  const bookN = stats.bookCount;

  if (bookN === 0) {
    // 极少见:有 session 但书都被删了
    monthHeroTextEl.innerHTML =
      `${monthShort},一共读了 <span class="hero-highlight">${dur}</span>`;
    return;
  }

  monthHeroTextEl.innerHTML =
    `${monthShort},你和 <span class="hero-highlight">${bookN} 本书</span>` +
    `共度了 <span class="hero-highlight">${dur}</span>`;
}

// ----- 子渲染:书列表 -----
function renderMonthBooks(stats) {
  if (!stats.books || stats.books.length === 0) {
    monthBookListEl.innerHTML =
      `<div class="month-empty">这个月还没读过书</div>`;
    return;
  }

  monthBookListEl.innerHTML = stats.books.map(b => `
    <button class="month-book-item" data-book-id="${b.bookId}">
      <span class="month-book-title">${b.title}</span>
      <span class="month-book-duration">${formatDuration(b.totalMs)}</span>
    </button>
  `).join('');

  monthBookListEl.querySelectorAll('.month-book-item').forEach(el => {
    el.addEventListener('click', () => {
      openBookDetail(el.dataset.bookId, 'monthSummary');
    });
  });
}

// ----- 子渲染:记录(最长 session + 最专注的一天) -----
function renderMonthRecords(stats) {
  // 两条都没有就把整个 section 藏掉,避免空骨架
  if (!stats.longestSession && !stats.focusedDay) {
    monthRecordsSection.classList.add('hidden');
    return;
  }
  monthRecordsSection.classList.remove('hidden');

  // 最长 session
  if (stats.longestSession) {
    const ls = stats.longestSession;
    const d = new Date(ls.startTime);
    const dateText = `${d.getMonth() + 1}/${d.getDate()}`;
    const titleText = ls.bookTitle || '(已删除)';
    monthLongestSessionEl.innerHTML = `
      <div class="month-record-label">最长一次</div>
      <div class="month-record-value">${formatDuration(ls.duration)}</div>
      <div class="month-record-detail">《${titleText}》· ${dateText}</div>
    `;
  } else {
    monthLongestSessionEl.innerHTML = `
      <div class="month-record-label">最长一次</div>
      <div class="month-record-empty">—</div>
    `;
  }

  // 最专注的一天
  if (stats.focusedDay) {
    const fd = stats.focusedDay;
    // dateKey: "YYYY-MM-DD"
    const parts = fd.dateKey.split('-');
    const dateText = `${Number(parts[1])}/${Number(parts[2])}`;
    // 那天读了几次 session
    const dayStart = new Date(fd.dateKey + 'T00:00:00').getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const sessionCount = storage.getSessions()
      .filter(s => s.startTime >= dayStart && s.startTime < dayEnd)
      .length;
    monthFocusedDayEl.innerHTML = `
      <div class="month-record-label">最专注的一天</div>
      <div class="month-record-value">${formatDuration(fd.totalMs)}</div>
      <div class="month-record-detail">${dateText} · 共 ${sessionCount} 次</div>
    `;
  } else {
    monthFocusedDayEl.innerHTML = `
      <div class="month-record-label">最专注的一天</div>
      <div class="month-record-empty">—</div>
    `;
  }
}

// ----- 子渲染:热力图 -----
// 周一开头:把 JS 默认的 Sunday=0 转成 Monday=0
function renderMonthHeatmap(stats) {
  const heatmap = stats.heatmap || [];
  if (heatmap.length === 0) {
    monthHeatmapEl.innerHTML = '';
    return;
  }

  const monthKey = stats.monthKey;
  const [year, month] = monthKey.split('-').map(Number);
  // 当月 1 号是星期几(JS: Sunday=0...Saturday=6)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  // 转成"周一开头":Mon=0, Tue=1, ..., Sun=6
  const leadingBlanks = (firstDayOfMonth + 6) % 7;

  // 判断"未来日子":只对当月有意义
  const todayKey = getMonthKey(new Date());  // "YYYY-MM"
  const isCurrentMonth = monthKey === todayKey;
  const today = new Date();
  const todayDay = today.getDate();

  const cells = [];
  // 月初前的占位
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(`<div class="heatmap-cell heatmap-cell-blank"></div>`);
  }
  // 当月每一天
  for (const item of heatmap) {
    const isFuture = isCurrentMonth && item.day > todayDay;
    let cls = 'heatmap-cell';
    if (isFuture) {
      cls += ' heatmap-cell-future';
    } else if (item.qualified) {
      cls += ' heatmap-cell-lit';
    } else {
      cls += ' heatmap-cell-empty';
    }
    cells.push(`<div class="${cls}">${item.day}</div>`);
  }

  monthHeatmapEl.innerHTML = cells.join('');
}

// ----- 子渲染:Streak 两个数字 -----
function renderMonthStreak(stats) {
  monthStreakDaysEl.textContent = stats.monthStreak || 0;
  monthLongestStreakEl.textContent = stats.longestStreak || 0;
}

// ----- 子渲染:环比 -----
function renderMonthComparison(comparison) {
  const rows = [
    { key: 'bookCount', label: '读过的书', isDuration: false, unit: ' 本' },
    { key: 'activeDays', label: '阅读天数', isDuration: false, unit: ' 天' },
    { key: 'totalMs',    label: '总时长',   isDuration: true,  unit: ''   },
  ];

  monthComparisonEl.innerHTML = rows.map(r => {
    const c = comparison[r.key];
    const currText = r.isDuration
      ? formatHeroDuration(c.curr || 0)
      : `${c.curr || 0}${r.unit}`;
    const prevText = r.isDuration
      ? formatHeroDuration(c.prev || 0)
      : `${c.prev || 0}${r.unit}`;

    let deltaText, deltaCls;
    if (c.delta === 0 || c.delta == null) {
      deltaText = '持平';
      deltaCls = 'zero';
    } else if (c.delta > 0) {
      deltaText = r.isDuration
        ? `+${formatHeroDuration(c.delta)}`
        : `+${c.delta}${r.unit}`;
      deltaCls = 'positive';
    } else {
      // c.delta < 0,formatHeroDuration 不接受负数,取绝对值再加负号
      deltaText = r.isDuration
        ? `-${formatHeroDuration(Math.abs(c.delta))}`
        : `${c.delta}${r.unit}`;  // 数字本身有 -
      deltaCls = 'negative';
    }

    return `
      <div class="month-compare-row">
        <span class="month-compare-label">${r.label}</span>
        <span class="month-compare-values">
          <span class="month-compare-curr">${currText}</span>
          <span class="month-compare-delta ${deltaCls}">${deltaText}</span>
          <span class="month-compare-prev">上月 ${prevText}</span>
        </span>
      </div>
    `;
  }).join('');
}

// ===== 导出 / 导入 =====
function doExport() {
  // 计时中导出会漏掉本次还没保存的 session
  if (currentSession) {
    const ok = confirm('当前正在阅读,本次记录还没保存到导出文件里。确定继续导出吗?');
    if (!ok) return;
  }

  const json = exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // "2026-04-24"
  const a = document.createElement('a');
  a.href = url;
  a.download = `pageember-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 记一下"上次导出时间",用于"X 天没导出了"的提示
  localStorage.setItem('rpg.lastExportAt', String(Date.now()));
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = importData(e.target.result);
    if (!result.ok) {
      alert(`导入失败:${result.error}`);
      return;
    }
    let msg = `导入成功:${result.bookCount} 本书,${result.sessionCount} 条记录`;
    if (result.warning) msg += `\n\n注意:${result.warning}`;
    alert(msg);
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

setActiveView('timer');

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
    setActiveView('list');
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
  recapPercentAfterInput.value = '';
  recapPercentAfterInput.placeholder = book.percent;
  recapPercentAfterInput.disabled = false;

  setActiveView('progress');

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
  hideTitleHint();
  hideRestartAction();
  // 如果管理页正开着,刷新一下;否则保持原行为(saveBook 那边会调 renderBooks)
  if (!manageBooksView.classList.contains('hidden')) {
    renderManageBooks();
  }
}

function saveBook() {
  const title = bookTitleInput.value.trim();
  if (!title) {
    showTitleHint('请输入书名', 'block');
    return;
  }

  // 查重:书名忽略大小写和首尾空格
  // 中文没大小写,但顺手统一一下,将来加英文书也兼容
  const normalized = title.toLowerCase();
  const existing = storage.getBooks().find(
    b => b.title.trim().toLowerCase() === normalized
  );

  if (existing) {
    const status = existing.status || 'reading';
    if (status === 'abandoned') {
      // 已弃读:温和引导,显示提示 + 露出"去重新开始读"按钮
      showTitleHint(`《${existing.title}》之前弃读了`, 'soft');
      showRestartAction(existing.id);
      return;
    }
    // 在读 / 已完读:挡住保存,提示存在
    const statusText = status === 'finished' ? '已完读' : '在读';
    showTitleHint(`《${existing.title}》已经在书架里了(${statusText})`, 'block');
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

// 显示书名输入框下方的提示
// kind: 'block'(琥珀色,挡住保存) | 'soft'(灰色,引导)
function showTitleHint(text, kind) {
  bookTitleHint.textContent = text;
  bookTitleHint.classList.remove('is-block', 'is-soft');
  bookTitleHint.classList.add(kind === 'block' ? 'is-block' : 'is-soft');
  bookTitleHint.classList.remove('hidden');
}

function hideTitleHint() {
  bookTitleHint.classList.add('hidden');
  bookTitleHint.textContent = '';
}

// 露出/收起"去重新开始读"按钮,顺便挂上目标 bookId
function showRestartAction(bookId) {
  bookGoRestartBtn.dataset.bookId = bookId;
  bookGoRestartBtn.classList.remove('hidden');
}

function hideRestartAction() {
  bookGoRestartBtn.classList.add('hidden');
  delete bookGoRestartBtn.dataset.bookId;
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

  setActiveView('list');
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
// 用户改书名时,清掉之前的提示和"去重新开始读"按钮
bookTitleInput.addEventListener('input', () => {
  hideTitleHint();
  hideRestartAction();
});

// "去重新开始读":关 modal,跳那本书的详情页
bookGoRestartBtn.addEventListener('click', () => {
  const bookId = bookGoRestartBtn.dataset.bookId;
  if (!bookId) return;
  closeModal();
  // 'list' = 从详情页返回时回首页(用户本来就是从首页开 modal 的)
  openBookDetail(bookId, 'list');
});

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
document.getElementById('abandonedBackBtn').addEventListener('click', closeAbandonedReview);

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

// 月总结入口
openMonthSummaryBtn.addEventListener('click', openMonthSummary);
monthBackBtn.addEventListener('click', closeMonthSummary);
monthPrevBtn.addEventListener('click', () => navigateMonth(-1));
monthNextBtn.addEventListener('click', () => navigateMonth(1));

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
migrateOnLoad();
setActiveView('list');
renderBooks();