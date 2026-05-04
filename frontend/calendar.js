// calendar.js — Calendar rendering (month + week views)
const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

let currentDate = new Date();
let currentView = 'month';
let cachedAppointments = [];

function renderCalendar(appointments) {
  cachedAppointments = appointments || cachedAppointments;
  if (currentView === 'month') renderMonthView(cachedAppointments);
  else renderWeekView(cachedAppointments);
  updateHeader();
  renderMiniCal(cachedAppointments);
  renderUpcoming(cachedAppointments);
}

function updateHeader() {
  const el = document.getElementById('currentPeriod');
  if (currentView === 'month') {
    el.textContent = `${MONTHS_VI[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  } else {
    const { start, end } = getWeekRange(currentDate);
    el.textContent = `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }
}

// ─── MONTH VIEW ───────────────────────────────────────
function renderMonthView(appointments) {
  const container = document.getElementById('calContainer');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const grid = document.createElement('div');
  grid.className = 'month-grid';

  // Header labels
  DAYS_VI.forEach(d => {
    const el = document.createElement('div');
    el.className = 'month-day-label';
    el.textContent = d;
    grid.appendChild(el);
  });

  const apptMap = buildApptMap(appointments);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let dayNum, isOther = false, cellDate;

    if (i < firstDay) {
      dayNum = daysInPrev - firstDay + i + 1;
      cellDate = new Date(year, month - 1, dayNum);
      isOther = true;
    } else if (i >= firstDay + daysInMonth) {
      dayNum = i - firstDay - daysInMonth + 1;
      cellDate = new Date(year, month + 1, dayNum);
      isOther = true;
    } else {
      dayNum = i - firstDay + 1;
      cellDate = new Date(year, month, dayNum);
    }

    const isToday = isSameDay(cellDate, today);
    const dayEl = document.createElement('div');
    dayEl.className = `month-day${isOther ? ' other-month' : ''}${isToday ? ' today' : ''}`;
    dayEl.dataset.date = cellDate.toISOString().split('T')[0];

    const numEl = document.createElement('div');
    numEl.className = 'day-number';
    numEl.textContent = dayNum;
    dayEl.appendChild(numEl);

    // Appointments for this day
    const dayKey = formatKey(cellDate);
    const dayAppts = apptMap[dayKey] || [];

    const maxShow = 3;
    dayAppts.slice(0, maxShow).forEach(appt => {
      const chip = createChip(appt);
      dayEl.appendChild(chip);
    });

    if (dayAppts.length > maxShow) {
      const more = document.createElement('div');
      more.className = 'more-chip';
      more.textContent = `+${dayAppts.length - maxShow} nữa`;
      more.onclick = e => { e.stopPropagation(); showDayAppts(cellDate, dayAppts); };
      dayEl.appendChild(more);
    }

    dayEl.addEventListener('click', e => {
      if (e.target.classList.contains('appt-chip') || e.target.closest('.appt-chip')) return;
      if (e.target.classList.contains('more-chip')) return;
      openAddDialog(cellDate);
    });

    grid.appendChild(dayEl);
  }

  container.innerHTML = '';
  container.appendChild(grid);
}

function createChip(appt) {
  const chip = document.createElement('div');
  chip.className = 'appt-chip';
  chip.style.background = appt.color || '#3B82F6';
  chip.dataset.id = appt.appointmentId;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'chip-time';
  timeSpan.textContent = formatTime(new Date(appt.startTime));

  const nameSpan = document.createElement('span');
  nameSpan.textContent = appt.name;

  chip.appendChild(timeSpan);
  chip.appendChild(nameSpan);

  chip.addEventListener('click', e => {
    e.stopPropagation();
    showDetailPopup(appt, chip);
  });
  return chip;
}

// ─── WEEK VIEW ────────────────────────────────────────
function renderWeekView(appointments) {
  const container = document.getElementById('calContainer');
  const { start } = getWeekRange(currentDate);
  const today = new Date();

  const grid = document.createElement('div');
  grid.className = 'week-grid';

  // Empty top-left
  const empty = document.createElement('div');
  empty.style.cssText = 'border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:2;';
  grid.appendChild(empty);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);

    const header = document.createElement('div');
    header.className = `week-day-header${isSameDay(d, today) ? ' today' : ''}`;
    const dayLabel = document.createElement('span');
    dayLabel.textContent = DAYS_VI[d.getDay()];
    const numLabel = document.createElement('span');
    numLabel.className = 'wdh-num';
    numLabel.textContent = d.getDate();
    header.appendChild(dayLabel);
    header.appendChild(numLabel);
    grid.appendChild(header);
  }

  // Build per-day appt maps
  const apptByDay = {};
  days.forEach(d => { apptByDay[formatKey(d)] = []; });
  appointments.forEach(appt => {
    const key = formatKey(new Date(appt.startTime));
    if (apptByDay[key]) apptByDay[key].push(appt);
  });

  // Time slots
  for (let h = 0; h < 24; h++) {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'week-time-label';
    timeLabel.textContent = h === 0 ? '' : `${String(h).padStart(2,'0')}:00`;
    grid.appendChild(timeLabel);

    days.forEach(d => {
      const cell = document.createElement('div');
      cell.className = `week-cell${isSameDay(d, today) ? ' today-col' : ''}`;
      const slotDate = new Date(d);
      slotDate.setHours(h, 0, 0, 0);
      cell.addEventListener('click', () => openAddDialog(slotDate));
      grid.appendChild(cell);
    });
  }

  container.innerHTML = '';
  container.appendChild(grid);

  // Overlay appointments
  days.forEach((d, di) => {
    const key = formatKey(d);
    (apptByDay[key] || []).forEach(appt => {
      const start = new Date(appt.startTime);
      const end = new Date(appt.endTime);
      const startH = start.getHours() + start.getMinutes() / 60;
      const dur = (end - start) / 3600000;

      const el = document.createElement('div');
      el.className = 'week-appt';
      el.style.cssText = `
        top: calc(${(startH + 1) * 48}px + 1px);
        height: ${Math.max(dur * 48 - 2, 18)}px;
        background: ${appt.color || '#3B82F6'};
        grid-column: ${di + 2};
        position: absolute;
        left: ${di === 0 ? 56 : 56 + di * ((container.offsetWidth - 56) / 7)}px;
        width: calc(${100 / 7}% - 4px);
      `;
      el.innerHTML = `<div>${formatTime(start)} ${appt.name}</div>`;
      el.addEventListener('click', e => { e.stopPropagation(); showDetailPopup(appt, el); });

      // Append to grid as overlay is complex; use the grid rows instead
      // We re-approach: place inside the correct cell
      const cells = grid.querySelectorAll('.week-cell');
      const cellIdx = Math.floor(startH) * 7 + di;
      if (cells[cellIdx]) {
        const chip = document.createElement('div');
        chip.className = 'week-appt';
        chip.style.cssText = `
          position:absolute;
          top:${(start.getMinutes()/60)*48}px;
          left:1px;right:1px;
          height:${Math.max(dur*48-2,18)}px;
          background:${appt.color||'#3B82F6'};
          border-radius:4px;
          padding:2px 5px;
          font-size:11px;font-weight:500;color:#fff;
          overflow:hidden;cursor:pointer;z-index:1;
          box-shadow:0 1px 3px rgba(0,0,0,.15);
        `;
        chip.textContent = `${formatTime(start)} ${appt.name}`;
        chip.addEventListener('click', e => { e.stopPropagation(); showDetailPopup(appt, chip); });
        cells[cellIdx].style.position = 'relative';
        cells[cellIdx].appendChild(chip);
      }
    });
  });
}

// ─── MINI CALENDAR ────────────────────────────────────
function renderMiniCal(appointments) {
  const nav = document.getElementById('miniCal');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const apptKeys = new Set(appointments.map(a => formatKey(new Date(a.startTime))));

  nav.innerHTML = `
    <div class="mini-cal-header">
      <span>${MONTHS_VI[month].split(' ')[0]} ${year}</span>
    </div>
    <div class="mini-grid">
      ${DAYS_VI.map(d => `<div class="day-label">${d}</div>`).join('')}
    </div>
  `;

  const miniGrid = nav.querySelector('.mini-grid');
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    miniGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = formatKey(date);
    const isToday = isSameDay(date, today);
    const hasEvents = apptKeys.has(key);

    const el = document.createElement('div');
    el.className = `mini-day${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}`;
    el.textContent = d;
    el.onclick = () => { currentDate = date; renderCalendar(); };
    miniGrid.appendChild(el);
  }
}

// ─── UPCOMING ─────────────────────────────────────────
function renderUpcoming(appointments) {
  const list = document.getElementById('upcomingList');
  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.startTime) >= now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  if (!upcoming.length) {
    list.innerHTML = '<div style="color:var(--text3);font-size:12px">Không có lịch sắp tới</div>';
    return;
  }

  list.innerHTML = upcoming.map(a => `
    <div class="upcoming-item" style="border-left-color:${a.color||'#3B82F6'}"
         onclick="showDetailById(${a.appointmentId})">
      <div class="upcoming-item-name">${escHtml(a.name)}</div>
      <div class="upcoming-item-time">${formatDateTime(new Date(a.startTime))}</div>
    </div>
  `).join('');
}

// ─── HELPERS ──────────────────────────────────────────
function buildApptMap(appointments) {
  const map = {};
  appointments.forEach(appt => {
    const key = formatKey(new Date(appt.startTime));
    if (!map[key]) map[key] = [];
    map[key].push(appt);
  });
  return map;
}

function getWeekRange(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatKey(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function formatTime(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date) {
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })
    + ' ' + formatTime(date);
}

function formatShortDate(date) {
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

function formatLocalInput(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function navigate(dir) {
  if (currentView === 'month') {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1);
  } else {
    currentDate.setDate(currentDate.getDate() + dir * 7);
  }
  loadAndRender();
}

function goToToday() {
  currentDate = new Date();
  loadAndRender();
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderCalendar();
}
