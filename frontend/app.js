// app.js — Main app logic
let editingId = null;
let pendingDto = null;
let selectedColor = '#3B82F6';
let currentDetailAppt = null;

// ─── INIT ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadAndRender();
});

async function loadAndRender() {
  try {
    let from, to;
    if (currentView === 'month') {
      from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    } else {
      const { start, end } = getWeekRange(currentDate);
      from = start; to = end;
    }
    // Load broader range for upcoming + mini cal
    const broadFrom = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const broadTo = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
    const appointments = await api.getAppointments(broadFrom, broadTo);
    renderCalendar(appointments);
  } catch (err) {
    showToast('Không thể tải dữ liệu. Kiểm tra kết nối backend.', 'error');
    renderCalendar([]);
  }
}

// ─── ADD DIALOG ────────────────────────────────────────
function openAddDialog(date) {
  // Nếu click vào ô ngày/giờ trong quá khứ → chặn luôn, không mở form
  if (date) {
    const clickedDate = new Date(date);
    // Với ô ngày (giờ = 0:00), so sánh theo ngày; với ô giờ cụ thể, so sánh theo thời điểm
    const now = new Date();
    const isFullDay = clickedDate.getHours() === 0 && clickedDate.getMinutes() === 0;
    const isPast = isFullDay
      ? clickedDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()) // trước hôm nay
      : clickedDate < now; // trước thời điểm hiện tại

    if (isPast) {
      showToast('⏰ Không thể đặt lịch vào ngày/giờ đã qua', 'error');
      return;
    }
  }

  editingId = null;
  pendingDto = null;
  resetForm();
  document.getElementById('modalTitle').textContent = 'Thêm lịch hẹn';
  document.getElementById('submitBtn').textContent = 'Lưu lịch hẹn';

  if (date) {
    const start = new Date(date);
    if (start.getHours() === 0 && start.getMinutes() === 0) start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    document.getElementById('apptStart').value = formatLocalInput(start);
    document.getElementById('apptEnd').value = formatLocalInput(end);
  }

  openModal('modalOverlay');
}

function openEditDialog(appt) {
  editingId = appt.appointmentId;
  pendingDto = null;
  resetForm();
  document.getElementById('modalTitle').textContent = 'Sửa lịch hẹn';
  document.getElementById('submitBtn').textContent = 'Cập nhật';

  document.getElementById('apptName').value = appt.name || '';
  document.getElementById('apptLocation').value = appt.location || '';
  document.getElementById('apptDesc').value = appt.description || '';
  document.getElementById('apptStart').value = formatLocalInput(new Date(appt.startTime));
  document.getElementById('apptEnd').value = formatLocalInput(new Date(appt.endTime));

  if (appt.reminders?.length) {
    const mins = Math.round((new Date(appt.startTime) - new Date(appt.reminders[0].reminderTime)) / 60000);
    const sel = document.getElementById('apptReminder');
    const opt = [...sel.options].find(o => +o.value === mins);
    if (opt) sel.value = opt.value;
  }

  selectedColor = appt.color || '#3B82F6';
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === selectedColor);
  });

  openModal('modalOverlay');
}

// ─── SUBMIT ────────────────────────────────────────────
async function submitAppointment(e) {
  e.preventDefault();
  clearErrors();

  const name = document.getElementById('apptName').value.trim();
  const start = new Date(document.getElementById('apptStart').value);
  const end = new Date(document.getElementById('apptEnd').value);
  const location = document.getElementById('apptLocation').value.trim();
  const desc = document.getElementById('apptDesc').value.trim();
  const reminder = document.getElementById('apptReminder').value;

  // Client-side validation
  const now = new Date();
  let valid = true;
  if (!name) {
    showFieldError('nameError', 'Tên lịch hẹn không được để trống');
    valid = false;
  }
  if (isNaN(start) || isNaN(end)) {
    showFieldError('timeError', 'Vui lòng nhập thời gian hợp lệ');
    valid = false;
  } else if (!editingId && start < now) {
    showFieldError('timeError', '⏰ Không thể đặt lịch hẹn trong quá khứ. Vui lòng chọn thời gian từ hiện tại trở đi.');
    valid = false;
  } else if (end <= start) {
    showFieldError('timeError', 'Thời gian kết thúc phải sau thời gian bắt đầu');
    valid = false;
  }
  if (!valid) return;

  const dto = {
    name, location: location || null, startTime: start.toISOString(),
    endTime: end.toISOString(), description: desc || null,
    color: selectedColor,
    reminderMinutesBefore: reminder ? parseInt(reminder) : null,
    forceReplace: false, joinGroupMeeting: false
  };

  pendingDto = dto;
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  try {
    if (editingId) {
      await api.update(editingId, dto);
      showToast('✓ Đã cập nhật lịch hẹn');
      closeAllModals();
      loadAndRender();
    } else {
      const result = await api.create(dto);
      await handleCreateResult(result);
    }
  } catch (err) {
    const msg = err?.message || err?.errors?.[0]?.message || 'Có lỗi xảy ra';
    showToast('✕ ' + msg, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Cập nhật' : 'Lưu lịch hẹn';
  }
}

async function handleCreateResult(result) {
  if (result.conflictError) {
    closeModal(null, 'modalOverlay');
    showConflictDialog(result.conflict.conflictingAppointments);
    return;
  }
  if (result.groupDecision) {
    closeModal(null, 'modalOverlay');
    showGroupDialog(result.groupMatch);
    return;
  }
  showToast('✓ Đã thêm lịch hẹn');
  closeAllModals();
  loadAndRender();
}

// ─── CONFLICT DIALOG ───────────────────────────────────
function showConflictDialog(conflicts) {
  const list = document.getElementById('conflictList');
  list.innerHTML = conflicts.map(c => `
    <div class="conflict-item">
      <div class="conflict-item-name">${escHtml(c.name)}</div>
      <div class="conflict-item-time">
        ${formatTime(new Date(c.startTime))} – ${formatTime(new Date(c.endTime))}
      </div>
    </div>
  `).join('');
  openModal('conflictOverlay');
}

async function forceCreate() {
  if (!pendingDto) return;
  pendingDto.forceReplace = true;
  closeAllModals();
  try {
    const result = await api.create(pendingDto);
    if (result.appointmentId) {
      showToast('✓ Đã thay thế và thêm lịch hẹn');
      loadAndRender();
    }
  } catch (err) {
    showToast('Có lỗi xảy ra', 'error');
  }
}

// ─── GROUP MEETING DIALOG ──────────────────────────────
function showGroupDialog(match) {
  const startLocal = match.meetingStart ? new Date(match.meetingStart) : null;
  const endLocal   = match.meetingEnd   ? new Date(match.meetingEnd)   : null;

  const timeStr = (startLocal && endLocal)
    ? `${formatDateTime(startLocal)} – ${formatTime(endLocal)}`
    : '';

  const organizerLine = match.organizerName
    ? `<div class="group-info-row"><span>👤</span><span>Tổ chức bởi: <strong>${escHtml(match.organizerName)}</strong></span></div>`
    : '';

  const timeLine = timeStr
    ? `<div class="group-info-row"><span>🕐</span><span>${escHtml(timeStr)}</span></div>`
    : '';

  const peopleLine = `<div class="group-info-row"><span>👥</span><span>${match.participantCount} người đang tham gia</span></div>`;

  document.getElementById('groupMessage').innerHTML = `
    <div class="group-meeting-card">
      <div class="group-meeting-title">📅 ${escHtml(match.meetingName)}</div>
      ${timeLine}
      ${organizerLine}
      ${peopleLine}
    </div>
    <p class="group-meeting-prompt">Tìm thấy lịch hẹn của người khác trùng khớp hoàn toàn về tên, thời gian và địa điểm.<br>Bạn có muốn tham gia chung vào nhóm này không?</p>
  `;
  openModal('groupOverlay');
}


async function joinGroupMeeting() {
  if (!pendingDto) return;
  pendingDto.joinGroupMeeting = true;
  closeAllModals();
  try {
    await api.create(pendingDto);
    showToast('✓ Đã tham gia cuộc họp nhóm');
    loadAndRender();
  } catch {
    showToast('Có lỗi xảy ra', 'error');
  }
}

async function createPersonalAppt() {
  if (!pendingDto) return;
  pendingDto.joinGroupMeeting = false;
  pendingDto.forceReplace = true; // skip group check
  closeAllModals();
  try {
    await api.create(pendingDto);
    showToast('✓ Đã thêm lịch hẹn cá nhân');
    loadAndRender();
  } catch {
    showToast('Có lỗi xảy ra', 'error');
  }
}

// ─── DETAIL POPUP ──────────────────────────────────────
function showDetailPopup(appt, anchorEl) {
  currentDetailAppt = appt;
  const popup = document.getElementById('detailPopup');

  document.getElementById('detailColor').style.background = appt.color || '#3B82F6';
  document.getElementById('detailName').textContent = appt.name;
  document.getElementById('detailTime').textContent =
    `${formatDateTime(new Date(appt.startTime))} – ${formatTime(new Date(appt.endTime))}`;

  const setRow = (id, icon, text) => {
    const el = document.getElementById(id);
    el.className = `detail-row${text ? ' visible' : ''}`;
    if (text) el.innerHTML = `<span>${icon}</span><span>${escHtml(text)}</span>`;
  };

  setRow('detailLocation', '📍', appt.location);
  setRow('detailDesc', '📝', appt.description);
  setRow('detailReminder', '🔔', appt.reminders?.length
    ? `Nhắc lúc ${formatTime(new Date(appt.reminders[0].reminderTime))}` : null);

  popup.classList.add('open');

  // Position popup near anchor
  const rect = anchorEl.getBoundingClientRect();
  const pw = 280, ph = 200;
  let left = rect.right + 8;
  let top = rect.top;
  if (left + pw > window.innerWidth) left = rect.left - pw - 8;
  if (top + ph > window.innerHeight) top = window.innerHeight - ph - 8;
  if (left < 8) left = 8;
  if (top < 8) top = 8;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closeDetailOutside, { once: true });
  }, 100);
}

function closeDetailOutside(e) {
  const popup = document.getElementById('detailPopup');
  if (!popup.contains(e.target)) closeDetail();
}

function closeDetail() {
  document.getElementById('detailPopup').classList.remove('open');
  currentDetailAppt = null;
}

async function showDetailById(id) {
  const appt = cachedAppointments.find(a => a.appointmentId === id);
  if (appt) {
    const sidebar = document.querySelector('.sidebar');
    showDetailPopup(appt, sidebar);
  }
}

// ─── EDIT / DELETE ─────────────────────────────────────
function editAppointment() {
  console.log("BEFORE:", currentDetailAppt);

  const appt = currentDetailAppt;

  closeDetail();

  console.log("AFTER:", currentDetailAppt);

  openEditDialog(appt);
}

async function deleteAppointment() {
  if (!currentDetailAppt) return;
  const appt = currentDetailAppt;
  closeDetail();
  if (!confirm(`Xóa lịch hẹn "${appt.name}"?`)) return;
  try {
    await api.delete(appt.appointmentId);
    showToast('✓ Đã xóa lịch hẹn');
    loadAndRender();
  } catch {
    showToast('Không thể xóa lịch hẹn', 'error');
  }
}

// ─── FORM HELPERS ──────────────────────────────────────
function resetForm() {
  document.getElementById('apptForm').reset();
  clearErrors();
  selectedColor = '#3B82F6';
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === '#3B82F6');
  });
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
}

function showFieldError(id, msg) {
  document.getElementById(id).textContent = msg;
}

function selectColor(el) {
  selectedColor = el.dataset.color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

function onStartChange() {
  const start = document.getElementById('apptStart').value;
  if (!start) return;
  const startDate = new Date(start);
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 1);
  document.getElementById('apptEnd').value = formatLocalInput(endDate);
  clearErrors();
}

function onEndChange() { clearErrors(); }

// ─── MODAL CONTROL ─────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(e, id) {
  if (e && e.target !== e.currentTarget) return;
  const el = id ? document.getElementById(id) : e?.currentTarget;
  el?.classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// ─── TOAST ─────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? '#DC2626' : '#1A1916';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function showDayAppts(date, appts) {
  // Show all appointments for a day (simplified - click opens detail on first one)
  if (appts.length) showDetailPopup(appts[0], document.querySelector('.month-day.today') || document.body);
}
