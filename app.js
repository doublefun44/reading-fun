// ===== DOM 引用 =====
const listView = document.getElementById('listView');
const timerView = document.getElementById('timerView');

const bookListEl = document.getElementById('bookList');
const addBookBtn = document.getElementById('addBookBtn');

const currentBookTitleEl = document.getElementById('currentBookTitle');
const timerEl = document.getElementById('timer');
const stopBtn = document.getElementById('stopBtn');

const addBookModal = document.getElementById('addBookModal');
const bookTitleInput = document.getElementById('bookTitle');
const bookCoverInput = document.getElementById('bookCover');
const bookPercentInput = document.getElementById('bookPercent');
const saveBookBtn = document.getElementById('saveBookBtn');
const cancelBookBtn = document.getElementById('cancelBookBtn');

// ===== 计时状态 =====
let currentSession = null;  // { bookId, startTime } | null
let intervalId = null;

// ===== 渲染 =====
function renderBooks() {
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
      </div>
    </div>
  `).join('');

  // 给所有"开始"按钮绑事件
  bookListEl.querySelectorAll('.btn-small').forEach(btn => {
    btn.addEventListener('click', () => startSession(btn.dataset.bookId));
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
  const newSession = {
    id: uuid(),
    bookId: currentSession.bookId,
    startTime: currentSession.startTime,
    endTime,
    duration: endTime - currentSession.startTime,
  };

  const sessions = storage.getSessions();
  sessions.push(newSession);
  storage.saveSessions(sessions);

  currentSession = null;

  timerView.classList.add('hidden');
  listView.classList.remove('hidden');
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

// ===== 事件绑定 =====
addBookBtn.addEventListener('click', openModal);
cancelBookBtn.addEventListener('click', closeModal);
saveBookBtn.addEventListener('click', saveBook);
stopBtn.addEventListener('click', stopSession);

addBookModal.addEventListener('click', (e) => {
  if (e.target === addBookModal) closeModal();
});

// ===== 启动 =====
renderBooks();