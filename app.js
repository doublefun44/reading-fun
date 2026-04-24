const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

let intervalId = null;
let startTime = null;      // 本次"开始"按下的时刻
let accumulated = 0;        // 之前累计的毫秒数(允许暂停续计)

function format(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function render() {
  const elapsed = accumulated + (startTime ? Date.now() - startTime : 0);
  timerEl.textContent = format(elapsed);
}

function start() {
  if (intervalId) return;             // 已在跑,忽略
  startTime = Date.now();
  intervalId = setInterval(render, 250);  // 每 250ms 刷新足够流畅
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stop() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
  accumulated += Date.now() - startTime;
  startTime = null;
  render();
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);

stopBtn.disabled = true;  // 初始状态