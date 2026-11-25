// =============================================
//   MY MESS TRACKER — app.js
//   LocalStorage-based Personal Mess Attendance
// =============================================

// ---- State ----
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ---- Helpers ----
function getKey(year, month) {
  return `mess_${year}_${month}`;
}

function getSettings(year, month) {
  const key = `settings_${year}_${month}`;
  const saved = localStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  // defaults
  return { startDay: 1, rateFullMess: 120, rateHalfMess: 60 };
}

function saveSettingsData(year, month, data) {
  localStorage.setItem(`settings_${year}_${month}`, JSON.stringify(data));
}

function getAttendance(year, month) {
  const saved = localStorage.getItem(getKey(year, month));
  return saved ? JSON.parse(saved) : {};
}

function saveAttendance(year, month, data) {
  localStorage.setItem(getKey(year, month), JSON.stringify(data));
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isToday(year, month, day) {
  const t = new Date();
  return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
}

// ---- Bill Logic ----
function calcDayBill(lunch, dinner, leave, settings) {
  if (leave) return 0;
  const present = (lunch ? 1 : 0) + (dinner ? 1 : 0);
  if (present === 2) return settings.rateFullMess;
  if (present === 1) return settings.rateHalfMess;
  return 0;
}

function getDayType(lunch, dinner, leave) {
  if (leave) return 'leave';
  const present = (lunch ? 1 : 0) + (dinner ? 1 : 0);
  if (present === 2) return 'full';
  if (present === 1) return 'half';
  return 'absent'; // both absent but NOT leave
}

// ---- Toggle Meal ----
function toggleMeal(day, meal) {
  const att  = getAttendance(currentYear, currentMonth);
  const dKey = `d${day}`;
  if (!att[dKey]) att[dKey] = { lunch: false, dinner: false, leave: false };
  if (att[dKey].leave) return; // blocked if leave is on
  att[dKey][meal] = !att[dKey][meal];
  saveAttendance(currentYear, currentMonth, att);
  renderApp();
  const val = att[dKey][meal] ? '✅ Present' : '❌ Absent';
  showToast(`${meal === 'lunch' ? '🌞 Lunch' : '🌙 Dinner'} — ${val}`);
}

// ---- Toggle Leave ----
function toggleLeave(day) {
  const att  = getAttendance(currentYear, currentMonth);
  const dKey = `d${day}`;
  if (!att[dKey]) att[dKey] = { lunch: false, dinner: false, leave: false };
  att[dKey].leave = !att[dKey].leave;
  if (att[dKey].leave) {
    att[dKey].lunch  = false;
    att[dKey].dinner = false;
  }
  saveAttendance(currentYear, currentMonth, att);
  renderApp();
  showToast(att[dKey].leave ? '🏖️ Full Leave marked!' : '↩️ Leave removed');
}

// ---- Render ----
function renderApp() {
  const settings = getSettings(currentYear, currentMonth);
  const att      = getAttendance(currentYear, currentMonth);
  const totalDays = daysInMonth(currentYear, currentMonth);
  const start     = settings.startDay || 1;

  document.getElementById('monthLabel').textContent =
    `${MONTHS[currentMonth]} ${currentYear}`;
  document.getElementById('billMonth').textContent =
    `${MONTHS[currentMonth]} ${currentYear}`;

  let fullCount = 0, halfCount = 0, leaveCount = 0, totalBill = 0;
  let html = '';

  for (let d = start; d <= totalDays; d++) {
    const dKey   = `d${d}`;
    const entry  = att[dKey] || { lunch: false, dinner: false, leave: false };
    const lunch  = entry.lunch;
    const dinner = entry.dinner;
    const leave  = entry.leave || false;
    const bill   = calcDayBill(lunch, dinner, leave, settings);
    const type   = getDayType(lunch, dinner, leave);
    const today  = isToday(currentYear, currentMonth, d);

    if (type === 'full')   fullCount++;
    else if (type === 'half')  halfCount++;
    else if (type === 'leave') leaveCount++;
    totalBill += bill;

    const dayName = DAYS[new Date(currentYear, currentMonth, d).getDay()];
    const dateStr = `${d} ${MONTHS[currentMonth]}`;
    const todayBadge = today ? `<span class="day-today-badge">TODAY</span>` : '';

    html += `
      <div class="day-card ${type} ${today ? 'today' : ''}" id="card-${d}">
        <div class="day-header">
          <div>
            <span class="day-date">${dateStr}</span>
            <span class="day-name">${dayName}</span>
            ${todayBadge}
          </div>
          <span class="day-bill">₹${bill}</span>
        </div>
        ${leave ? `
          <div class="leave-banner">🏖️ Full Leave — घरी गेलो / सुट्टी</div>
          <button class="leave-undo-btn" onclick="toggleLeave(${d})">↩️ Remove Leave</button>
        ` : `
        <div class="meal-row">
          <button class="meal-btn ${lunch ? 'present' : 'absent'}"
                  onclick="toggleMeal(${d}, 'lunch')">
            <span class="meal-icon">🌞</span>
            <span class="meal-label">Lunch</span>
            <span class="meal-status">${lunch ? 'Present' : 'Absent'}</span>
          </button>
          <button class="meal-btn ${dinner ? 'present' : 'absent'}"
                  onclick="toggleMeal(${d}, 'dinner')">
            <span class="meal-icon">🌙</span>
            <span class="meal-label">Dinner</span>
            <span class="meal-status">${dinner ? 'Present' : 'Absent'}</span>
          </button>
        </div>
        <button class="leave-btn" onclick="toggleLeave(${d})">🏖️ Mark Full Leave</button>
        `}
      </div>`;
  }

  if (start > totalDays) {
    html = `<div class="empty-state">
      <div class="e-icon">📅</div>
      <p>No days to show.<br>Please set a valid start date in Settings (⚙️).</p>
    </div>`;
  }

  document.getElementById('attendanceList').innerHTML = html;

  // Summary
  document.getElementById('sumFull').textContent  = fullCount;
  document.getElementById('sumHalf').textContent  = halfCount;
  document.getElementById('sumLeave').textContent = leaveCount;
  document.getElementById('sumFullAmt').textContent  = `₹${fullCount * settings.rateFullMess}`;
  document.getElementById('sumHalfAmt').textContent  = `₹${halfCount * settings.rateHalfMess}`;
  document.getElementById('billAmount').textContent  = `₹${totalBill.toLocaleString('en-IN')}`;

  // Scroll to today
  if (document.querySelector('.day-card.today')) {
    setTimeout(() => {
      document.querySelector('.day-card.today')
        .scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

// ---- Month Navigation ----
function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  renderApp();
}

// ---- Settings Modal ----
function openSettings() {
  const s = getSettings(currentYear, currentMonth);
  document.getElementById('startDay').value     = s.startDay || '';
  document.getElementById('rateFullMess').value = s.rateFullMess;
  document.getElementById('rateHalfMess').value = s.rateHalfMess;
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettingsBtn() {
  document.getElementById('settingsModal').classList.remove('open');
}

function closeSettings(e) {
  if (e.target.id === 'settingsModal')
    document.getElementById('settingsModal').classList.remove('open');
}

function saveSettings() {
  const startDay     = parseInt(document.getElementById('startDay').value) || 1;
  const rateFullMess = parseInt(document.getElementById('rateFullMess').value) || 120;
  const rateHalfMess = parseInt(document.getElementById('rateHalfMess').value) || 60;

  if (startDay < 1 || startDay > 31) {
    showToast('⚠️ Invalid start date!'); return;
  }

  saveSettingsData(currentYear, currentMonth, { startDay, rateFullMess, rateHalfMess });
  closeSettingsBtn();
  renderApp();
  showToast('✅ Settings saved!');
}

// ---- Toast ----
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---- Init ----
renderApp();
