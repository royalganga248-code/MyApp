'use strict';

// ─── Constants ───────────────────────────────────────────────
const RUS_MONTHS = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
  5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
  9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
};

const STORAGE_KEY = 'work_hours';

// ─── State ───────────────────────────────────────────────────
let data = {};
try {
  data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
} catch (e) {
  console.warn('Failed to load data from localStorage:', e);
  data = {};
}

// BUG FIX: Date().year is undefined; use getFullYear() and getMonth()
const now = new Date();
let currentYear  = now.getFullYear();
let currentMonth = now.getMonth() + 1; // 1–12
let selectedDate = null;

// ─── DOM Refs ────────────────────────────────────────────────
const monthName    = document.getElementById('month-name');
const yearName     = document.getElementById('year-name');
const calendarEl   = document.getElementById('calendar');
const statDays     = document.getElementById('stat-days');
const statHours    = document.getElementById('stat-hours');
const statAvg      = document.getElementById('stat-avg');
const hoursInput   = document.getElementById('hours');
const inputPanel   = document.getElementById('input-panel');
const panelDateLbl = document.getElementById('panel-date-label');
const statsOverlay = document.getElementById('stats-overlay');
const statsContent = document.getElementById('stats-content');

// ─── Navigation ──────────────────────────────────────────────
document.getElementById('prev').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth === 0) { currentMonth = 12; currentYear--; }
  selectedDate = null;
  closePanel();
  render();
});

document.getElementById('next').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth === 13) { currentMonth = 1; currentYear++; }
  selectedDate = null;
  closePanel();
  render();
});

// ─── Panel Controls ──────────────────────────────────────────
document.getElementById('panel-close').addEventListener('click', () => {
  selectedDate = null;
  closePanel();
  render();
});

document.getElementById('btn-save').addEventListener('click', saveHours);
document.getElementById('btn-clear').addEventListener('click', clearHours);

hoursInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveHours();
});

// ─── Stats ───────────────────────────────────────────────────
document.getElementById('btn-stats').addEventListener('click', () => {
  buildStats();
  statsOverlay.classList.remove('overlay-hidden');
});

document.getElementById('stats-close').addEventListener('click', () => {
  statsOverlay.classList.add('overlay-hidden');
});

statsOverlay.addEventListener('click', e => {
  if (e.target === statsOverlay) statsOverlay.classList.add('overlay-hidden');
});

// ─── Core Actions ────────────────────────────────────────────
function saveHours() {
  if (!selectedDate) return;
  const h = parseInt(hoursInput.value, 10);
  if (!isNaN(h) && h > 0) {
    data[selectedDate] = Math.min(h, 24);
  } else {
    delete data[selectedDate];
  }
  persistData();
  closePanel();
  selectedDate = null;
  render();
}

function clearHours() {
  if (!selectedDate) return;
  delete data[selectedDate];
  persistData();
  closePanel();
  selectedDate = null;
  render();
}

function persistData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save:', e);
  }
}

// ─── Panel ───────────────────────────────────────────────────
function openPanel(dstr) {
  panelDateLbl.textContent = formatDateLabel(dstr);
  hoursInput.value = data[dstr] || '';
  inputPanel.classList.remove('panel-hidden');
  setTimeout(() => hoursInput.focus(), 350);
}

function closePanel() {
  inputPanel.classList.add('panel-hidden');
  hoursInput.value = '';
}

function formatDateLabel(dstr) {
  const [y, m, d] = dstr.split('-');
  const date = new Date(+y, +m - 1, +d);
  const weekdays = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];
  return `${weekdays[date.getDay()]} ${+d} ${RUS_MONTHS[+m]} ${y}`;
}

// ─── Render ──────────────────────────────────────────────────
function render() {
  monthName.textContent = RUS_MONTHS[currentMonth].toUpperCase();
  yearName.textContent  = currentYear;

  renderCalendar();
  updateSummary();
}

function renderCalendar() {
  calendarEl.innerHTML = '';

  const todayStr = formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const weeks    = getMonthCalendar(currentYear, currentMonth - 1);

  weeks.forEach((week, wi) => {
    const row = document.createElement('div');
    row.className = 'week-row';

    week.forEach((day, di) => {
      const cell = document.createElement('div');

      if (day === 0) {
        cell.className = 'day-cell empty';
      } else {
        const dstr   = formatDate(currentYear, currentMonth, day);
        const isToday   = dstr === todayStr;
        const hasData   = !!data[dstr];
        const isSelected = dstr === selectedDate;
        const isWeekend = di >= 5; // col 5=Sat, 6=Sun

        cell.className = 'day-cell'
          + (isToday    ? ' today'    : '')
          + (hasData    ? ' has-data' : '')
          + (isSelected ? ' selected' : '')
          + (isWeekend  ? ' weekend-day' : '');

        cell.style.animationDelay = `${(wi * 7 + di) * 15}ms`;

        const numEl = document.createElement('span');
        numEl.className = 'day-num';
        numEl.textContent = day;
        cell.appendChild(numEl);

        if (hasData) {
          const hrsEl = document.createElement('span');
          hrsEl.className = 'day-hours';
          hrsEl.textContent = data[dstr] + 'ч';
          cell.appendChild(hrsEl);
        }

        cell.addEventListener('click', () => {
          selectedDate = dstr;
          render();
          openPanel(dstr);
        });
      }

      row.appendChild(cell);
    });

    calendarEl.appendChild(row);
  });
}

function updateSummary() {
  const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  let totalHours = 0, totalDays = 0;

  for (const k in data) {
    if (k.startsWith(prefix) && data[k] > 0) {
      totalHours += data[k];
      totalDays++;
    }
  }

  statDays.textContent  = totalDays;
  statHours.textContent = totalHours;
  statAvg.textContent   = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '—';
}

// ─── Stats overlay content ───────────────────────────────────
function buildStats() {
  statsContent.innerHTML = '';

  // Compute per-month totals for all recorded data
  const monthMap = {};
  for (const k in data) {
    const [y, m] = k.split('-');
    const key = `${y}-${m}`;
    if (!monthMap[key]) monthMap[key] = { hours: 0, days: 0, y: +y, m: +m };
    monthMap[key].hours += data[k];
    monthMap[key].days++;
  }

  const sorted = Object.values(monthMap).sort((a, b) =>
    b.y !== a.y ? b.y - a.y : b.m - a.m
  );

  if (sorted.length === 0) {
    statsContent.innerHTML = '<p style="color:var(--text-3);text-align:center;padding:20px;font-size:14px;">Нет данных</p>';
    return;
  }

  // All-time totals
  const allHours = sorted.reduce((s, x) => s + x.hours, 0);
  const allDays  = sorted.reduce((s, x) => s + x.days,  0);

  const totalRow = document.createElement('div');
  totalRow.className = 'stats-row';
  totalRow.innerHTML = `
    <span class="stats-row-label">Всего часов</span>
    <span class="stats-row-value accent">${allHours}</span>
  `;
  statsContent.appendChild(totalRow);

  const daysRow = document.createElement('div');
  daysRow.className = 'stats-row';
  daysRow.innerHTML = `
    <span class="stats-row-label">Всего рабочих дней</span>
    <span class="stats-row-value green">${allDays}</span>
  `;
  statsContent.appendChild(daysRow);

  // Divider label
  const divLabel = document.createElement('p');
  divLabel.style.cssText = 'font-family:var(--font-mono);font-size:10px;letter-spacing:.15em;color:var(--text-3);padding:8px 4px 2px;font-weight:700;';
  divLabel.textContent = 'ПО МЕСЯЦАМ';
  statsContent.appendChild(divLabel);

  // Per-month breakdown
  sorted.forEach(item => {
    const row = document.createElement('div');
    row.className = 'stats-row';
    row.innerHTML = `
      <span class="stats-row-label">${RUS_MONTHS[item.m]} ${item.y}</span>
      <span class="stats-row-value">${item.hours}ч / ${item.days}д</span>
    `;
    statsContent.appendChild(row);
  });
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMonthCalendar(year, month) {
  // month: 0-indexed (JS)
  const first   = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks   = [];
  let week      = [];

  // Monday-first: (getDay()+6)%7  → Mon=0 … Sun=6
  const startOffset = (first.getDay() + 6) % 7;
  for (let i = 0; i < startOffset; i++) week.push(0);

  for (let d = 1; d <= lastDay; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(0);
    weeks.push(week);
  }

  return weeks;
}

// ─── Init ────────────────────────────────────────────────────
render();
