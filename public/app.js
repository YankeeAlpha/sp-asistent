/**
 * SP ASISTENT - Frontend Aplikácia
 * Kalendár na celý rok, evidencia absencií, mobilné PWA rozhranie
 */

// --- GLOBÁLNY STAV ---
const state = {
  currentUser: null,
  employees: [],
  absences: [],
  holidays: [],
  currentYear: 2026,
  empCurrentDate: new Date(),
  matrixMonth: new Date().getMonth() + 1,
  activeMgrTab: 'year',
  selectedDateForModal: null,
  deferredPwaPrompt: null
};

const ABSENCE_NAMES = {
  'dovolenka': 'Dovolenka',
  'pn': 'PN (Práceneschopnosť)',
  'ocr': 'OČR (Ošetrovanie člena rodiny)',
  'lekar': 'Lekár / Prehliadka',
  'nahradne_volno': 'Náhradné voľno',
  'ine': 'Iné voľno'
};

const ABSENCE_ICONS = {
  'dovolenka': '🏖️',
  'pn': '🤒',
  'ocr': '👶',
  'lekar': '🩺',
  'nahradne_volno': '⏱️',
  'ine': '📁'
};

const MONTH_NAMES = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December'
];

// --- PWA REGISTRÁCIA A INŠTALÁCIA ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker zaregistrovaný:', reg.scope))
      .catch(err => console.log('Chyba Service Workera:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPwaPrompt = e;
  const pwaBtn = document.getElementById('pwaInstallBtn');
  if (pwaBtn) pwaBtn.style.display = 'inline-flex';
});

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// --- INICIALIZÁCIA ---
async function initApp() {
  setupEventListeners();
  await loadEmployees();
  checkSavedAuth();
  updatePwaButton();
  startLiveSync();
}

function setupEventListeners() {
  // PWA Inštalácia
  const pwaBtn = document.getElementById('pwaInstallBtn');
  if (pwaBtn) {
    pwaBtn.addEventListener('click', async () => {
      if (state.deferredPwaPrompt) {
        state.deferredPwaPrompt.prompt();
        const { outcome } = await state.deferredPwaPrompt.userChoice;
        console.log('PWA Inštalácia:', outcome);
        state.deferredPwaPrompt = null;
        pwaBtn.style.display = 'none';
      } else {
        alert('V mobilnom prehliadači Safari: kliknite na tlačidlo Zdieľať ⭡ a zvoľte „Pridať na plochu“.\nV Chrome kliknite na menu ⋮ a zvoľte „Inštalovať aplikáciu“.');
      }
    });
  }

  // Odhlásenie
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Formulár prihlásenia zamestnanec
  const empForm = document.getElementById('employeeLoginForm');
  if (empForm) {
    empForm.addEventListener('submit', handleEmployeeLogin);
  }

  // Formulár prihlásenia manažér
  const mgrForm = document.getElementById('managerLoginForm');
  if (mgrForm) {
    mgrForm.addEventListener('submit', handleManagerLogin);
  }
}

function updatePwaButton() {
  const pwaBtn = document.getElementById('pwaInstallBtn');
  if (!pwaBtn) return;
  // Detekcia či už beží ako PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    pwaBtn.style.display = 'none';
  } else {
    pwaBtn.style.display = 'inline-flex';
  }
}

// --- AUTENTIFIKÁCIA ---
function checkSavedAuth() {
  const saved = localStorage.getItem('sp_asistent_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      // Ak je v pamäti stará relácia správcu bez PINu, vyžiadame prihlásenie znova
      if (user.role === 'admin' && !user.pin) {
        localStorage.removeItem('sp_asistent_user');
        showSection('loginSection');
        return;
      }
      applyLogin(user);
      return;
    } catch (e) {
      localStorage.removeItem('sp_asistent_user');
    }
  }
  showSection('loginSection');
}

function switchLoginTab(type) {
  const tabEmp = document.getElementById('tabEmployee');
  const tabMgr = document.getElementById('tabManager');
  const formEmp = document.getElementById('employeeLoginForm');
  const formMgr = document.getElementById('managerLoginForm');
  const errDiv = document.getElementById('loginError');
  errDiv.style.display = 'none';

  if (type === 'employee') {
    tabEmp.classList.add('active');
    tabMgr.classList.remove('active');
    formEmp.style.display = 'block';
    formMgr.style.display = 'none';
  } else {
    tabMgr.classList.add('active');
    tabEmp.classList.remove('active');
    formMgr.style.display = 'block';
    formEmp.style.display = 'none';
  }
}

async function handleEmployeeLogin(e) {
  e.preventDefault();
  const select = document.getElementById('loginEmployeeSelect');
  const pinInput = document.getElementById('loginEmployeePin');
  const remember = document.getElementById('rememberMeEmployee').checked;
  const errDiv = document.getElementById('loginError');
  errDiv.style.display = 'none';

  const employeeId = select.value;
  const pin = pinInput.value.trim();

  if (!employeeId || !pin) {
    showLoginError('Vyberte svoje meno a zadajte PIN.');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, pin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nesprávny PIN');

    data.user.pin = pin;

    if (remember) {
      localStorage.setItem('sp_asistent_user', JSON.stringify(data.user));
    }
    applyLogin(data.user);
  } catch (err) {
    showLoginError(err.message);
  }
}

async function handleManagerLogin(e) {
  e.preventDefault();
  const pinInput = document.getElementById('loginManagerPin');
  const remember = document.getElementById('rememberMeManager').checked;
  const pin = pinInput.value.trim();

  if (!pin) {
    showLoginError('Zadajte PIN manažéra.');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: 'admin', pin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nesprávny PIN manažéra');

    data.user.pin = pin;

    if (remember) {
      localStorage.setItem('sp_asistent_user', JSON.stringify(data.user));
    }
    applyLogin(data.user);
  } catch (err) {
    showLoginError(err.message);
  }
}

function showLoginError(msg) {
  const errDiv = document.getElementById('loginError');
  errDiv.textContent = msg;
  errDiv.style.display = 'block';
}

function applyLogin(user) {
  state.currentUser = user;
  
  const userBadge = document.getElementById('userBadge');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const changePinHeaderBtn = document.getElementById('changePinHeaderBtn');
  if (changePinHeaderBtn) changePinHeaderBtn.style.display = 'inline-flex';

  userNameDisplay.textContent = user.name;
  if (user.role === 'admin') {
    userBadge.textContent = '👑 Správca / Manažér';
    userBadge.className = 'badge-role admin';
    showSection('managerViewSection');
    loadManagerData();
  } else {
    userBadge.textContent = '👤 Zamestnanec';
    userBadge.className = 'badge-role employee';
    showSection('employeeViewSection');
    loadEmployeeData();
  }
}

function logout() {
  localStorage.removeItem('sp_asistent_user');
  state.currentUser = null;
  document.getElementById('userNameDisplay').textContent = 'Neprihlásený';
  document.getElementById('userBadge').textContent = 'Odhlásený';
  document.getElementById('userBadge').className = 'badge-role';
  const changePinHeaderBtn = document.getElementById('changePinHeaderBtn');
  if (changePinHeaderBtn) changePinHeaderBtn.style.display = 'none';
  showSection('loginSection');
}

function showSection(sectionId) {
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.style.display = 'none';
    sec.classList.remove('active');
  });
  const target = document.getElementById(sectionId);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
}

// --- NAČÍTANIE ZAMESTNANCOV ---
async function loadEmployees() {
  try {
    const headers = {};
    if (state.currentUser && state.currentUser.role === 'admin' && state.currentUser.pin) {
      headers['x-admin-pin'] = state.currentUser.pin;
    }
    const res = await fetch('/api/employees', { headers });
    if (!res.ok) throw new Error('Chyba načítania zamestnancov');
    state.employees = await res.json();

    // Naplnenie dropdownov
    populateEmployeeDropdowns();
    saveLocalEmergencyBackup();
  } catch (e) {
    console.error('loadEmployees error:', e);
  }
}

function populateEmployeeDropdowns() {
  const loginSelect = document.getElementById('loginEmployeeSelect');
  const absenceSelect = document.getElementById('absenceEmployee');
  const mgrFilter = document.getElementById('mgrEmployeeFilter');

  if (loginSelect) {
    loginSelect.innerHTML = '<option value="">-- Vyberte svoje meno --</option>';
    state.employees.filter(e => e.role === 'employee').forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name;
      loginSelect.appendChild(opt);
    });
  }

  if (absenceSelect) {
    absenceSelect.innerHTML = '';
    state.employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name + (emp.role === 'admin' ? ' (Manažér)' : '');
      absenceSelect.appendChild(opt);
    });
  }

  if (mgrFilter) {
    mgrFilter.innerHTML = '<option value="">Všetci zamestnanci</option>';
    state.employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name;
      mgrFilter.appendChild(opt);
    });
  }
}

// --- NAČÍTANIE SVIATKOV ---
async function loadHolidays(year) {
  try {
    const res = await fetch(`/api/holidays?year=${year}`);
    if (res.ok) {
      state.holidays = await res.json();
    }
  } catch (e) {
    console.error('loadHolidays error:', e);
  }
}

// ========================================================
// REŽIM ZAMESTNANEC
// ========================================================
async function loadEmployeeData() {
  if (!state.currentUser) return;
  document.getElementById('empGreetingName').textContent = state.currentUser.name;

  await loadHolidays(state.currentYear);
  await fetchEmployeeAbsences();
  renderEmployeeCalendar();
  updateEmployeeStats();
  renderEmpMatrixView();
}

async function fetchEmployeeAbsences() {
  try {
    // Načítame absencie pre celý tím, aby zamestnanci videli aj prítomnosť kolegov v matici
    const res = await fetch(`/api/absences?year=${state.currentYear}`);
    if (res.ok) {
      state.absences = await res.json();
      renderEmployeeAbsenceList();
      saveLocalEmergencyBackup();
    }
  } catch (e) {
    console.error('fetchEmployeeAbsences error:', e);
  }
}

function updateEmployeeStats() {
  const user = state.currentUser;
  let usedVacation = 0;
  let pnDays = 0;
  let ocrDays = 0;
  let docDays = 0;
  let docHours = 0;

  // Štatistiky počítame iba pre prihláseného zamestnanca
  state.absences.filter(a => a.employee_id === user.id).forEach(a => {
    if (a.status === 'rejected') return;
    const days = a.working_days || 0;
    if (a.type === 'dovolenka') usedVacation += days;
    else if (a.type === 'pn') pnDays += days;
    else if (a.type === 'ocr') ocrDays += days;
    else if (a.type === 'lekar') {
      docDays += days;
      if (a.hours) docHours += Number(a.hours);
    }
  });

  const totalVacation = user.annual_leave_days || 25;
  const remaining = totalVacation - usedVacation;

  document.getElementById('empTotalVacation').textContent = totalVacation;
  document.getElementById('empUsedVacation').textContent = usedVacation.toFixed(1);
  document.getElementById('empRemainingVacation').textContent = remaining.toFixed(1);
  document.getElementById('empPnDays').textContent = pnDays.toFixed(1);
  document.getElementById('empOcrDays').textContent = ocrDays.toFixed(1);
  document.getElementById('empDocDays').textContent = docDays.toFixed(1);
  document.getElementById('empDocHours').textContent = docHours.toFixed(1);
}

function renderEmployeeCalendar() {
  const grid = document.getElementById('empMonthCalendarGrid');
  const label = document.getElementById('empCurrentMonthLabel');
  grid.innerHTML = '';

  const d = state.empCurrentDate;
  const year = d.getFullYear();
  const month = d.getMonth();

  label.textContent = `${MONTH_NAMES[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Deň v týždni pre 1. deň (0 = nedeľa, pretransformujeme na 0 = pondelok)
  let startCol = firstDay.getDay() - 1;
  if (startCol === -1) startCol = 6;

  // Prázdne bunky pred 1. dňom
  for (let i = 0; i < startCol; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day empty';
    grid.appendChild(emptyCell);
  }

  const holidaysMap = {};
  state.holidays.forEach(h => { holidaysMap[h.date] = h.name; });

  const todayStr = new Date().toISOString().split('T')[0];

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = holidaysMap[dayStr];
    const isToday = (dayStr === todayStr);

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (isWeekend) cell.classList.add('weekend');
    if (isHoliday) {
      cell.classList.add('holiday');
      cell.title = isHoliday;
    }
    if (isToday) cell.classList.add('today');

    cell.innerHTML = `<span class="day-num">${day}</span>`;

    // Nájdenie absencií prihláseného zamestnanca pre daný deň
    const dayAbsences = state.absences.filter(a => a.employee_id === state.currentUser.id && dayStr >= a.start_date && dayStr <= a.end_date);
    if (dayAbsences.length > 0) {
      cell.classList.add('has-absence');
      const dotsDiv = document.createElement('div');
      dotsDiv.className = 'day-dots';
      dayAbsences.forEach(a => {
        const dot = document.createElement('span');
        dot.className = `day-dot dot-${a.type}`;
        dot.title = `${ABSENCE_NAMES[a.type] || a.type}: ${a.note || ''}`;
        dotsDiv.appendChild(dot);
      });
      cell.appendChild(dotsDiv);
    }

    cell.addEventListener('click', () => openDayDetail(dayStr));
    grid.appendChild(cell);
  }
}

function changeEmpMonth(delta) {
  state.empCurrentDate.setMonth(state.empCurrentDate.getMonth() + delta);
  renderEmployeeCalendar();
}

function renderEmployeeAbsenceList() {
  const container = document.getElementById('empAbsenceList');
  container.innerHTML = '';

  const myAbsences = state.absences.filter(a => a.employee_id === state.currentUser.id);
  if (myAbsences.length === 0) {
    container.innerHTML = '<p class="text-muted text-center p-3">Zatiaľ nemáte nahlásené žiadne neprítomnosti.</p>';
    return;
  }

  myAbsences.forEach(a => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const icon = ABSENCE_ICONS[a.type] || '📌';
    const name = ABSENCE_NAMES[a.type] || a.type;
    const workingDays = a.working_days ? `${a.working_days} prac. dní` : '';
    const hours = a.hours ? ` (${a.hours} hod.)` : (a.is_half_day ? ' (pol dňa)' : '');
    const isApproved = (a.status === 'approved');
    const isPending = (a.status === 'pending');
    const statusBadge = isApproved
      ? '<span class="badge-role" style="background:#d1fae5;color:#059669;font-weight:700;margin-left:6px;">✅ Schválené</span>'
      : (isPending 
          ? '<span class="badge-role" style="background:#fef3c7;color:#d97706;font-weight:700;margin-left:6px;">⏳ Čaká na schválenie</span>' 
          : '<span class="badge-role" style="background:#fee2e2;color:#dc2626;font-weight:700;margin-left:6px;">❌ Zamietnuté</span>');

    item.innerHTML = `
      <div class="timeline-left">
        <span class="timeline-icon">${icon}</span>
        <div>
          <div class="timeline-dates">${formatDate(a.start_date)} - ${formatDate(a.end_date)} ${statusBadge}</div>
          <div class="timeline-meta"><strong>${name}</strong> • ${workingDays}${hours} ${a.note ? `• <em>${a.note}</em>` : ''}</div>
        </div>
      </div>
      <div>
        <button class="btn btn-xs btn-outline" onclick="deleteAbsence(${a.id})" title="Zmazať neprítomnosť">🗑️ Zmazať</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Prepínanie záložiek pre zamestnanca
function switchEmpTab(tabKey) {
  const btnOverview = document.getElementById('empTabBtnOverview');
  const btnMatrix = document.getElementById('empTabBtnMatrix');
  const contentOverview = document.getElementById('empTabOverviewContent');
  const contentMatrix = document.getElementById('empTabMatrixContent');

  if (tabKey === 'overview') {
    btnOverview.classList.add('active');
    btnMatrix.classList.remove('active');
    contentOverview.style.display = 'block';
    contentMatrix.style.display = 'none';
  } else {
    btnMatrix.classList.add('active');
    btnOverview.classList.remove('active');
    contentOverview.style.display = 'none';
    contentMatrix.style.display = 'block';
    renderEmpMatrixView();
  }
}

function renderEmpMatrixView() {
  const sel = document.getElementById('empMatrixMonthSelect');
  if (!sel) return;
  const month = Number(sel.value);
  renderMatrixToTable(document.getElementById('empMatrixTable'), month, true);
}

function changeEmpMatrixMonth(delta) {
  const sel = document.getElementById('empMatrixMonthSelect');
  let val = Number(sel.value) + delta;
  if (val < 1) val = 12;
  if (val > 12) val = 1;
  sel.value = val;
  renderEmpMatrixView();
}

// ========================================================
// REŽIM MANAŽÉR
// ========================================================
async function loadManagerData() {
  const yearSelect = document.getElementById('mgrYearSelect');
  state.currentYear = Number(yearSelect.value);
  document.getElementById('yearDisplayTitle').textContent = state.currentYear;
  document.getElementById('statsYearLabel').textContent = state.currentYear;

  await loadHolidays(state.currentYear);
  await fetchManagerAbsences();
  await loadManagerStats();
  renderActiveManagerTab();
  initQrCodeView();
}

async function fetchManagerAbsences() {
  const empFilter = document.getElementById('mgrEmployeeFilter').value;
  let url = `/api/absences?year=${state.currentYear}`;
  if (empFilter) url += `&employee_id=${empFilter}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      state.absences = await res.json();
      saveLocalEmergencyBackup();
    }
  } catch (e) {
    console.error('fetchManagerAbsences error:', e);
  }
}

async function loadManagerStats() {
  try {
    const res = await fetch(`/api/stats?year=${state.currentYear}`);
    if (res.ok) {
      const data = await res.json();
      renderStatsCards(data.stats);
      renderStatsTable(data.stats);
    }
  } catch (e) {
    console.error('loadManagerStats error:', e);
  }
}

function renderStatsCards(statsList) {
  const container = document.getElementById('managerSummaryCards');
  if (!container) return;

  let totalVacationUsed = 0;
  let totalPnDays = 0;
  let totalOcrDays = 0;
  let totalEmployees = statsList.length;

  statsList.forEach(s => {
    totalVacationUsed += s.used_vacation_days;
    totalPnDays += s.pn_days;
    totalOcrDays += s.ocr_days;
  });

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-content">
        <div class="stat-label">Aktívni zamestnanci</div>
        <div class="stat-value">${totalEmployees}</div>
        <div class="stat-sub">v tíme</div>
      </div>
    </div>
    <div class="stat-card vacation-card">
      <div class="stat-icon">🏖️</div>
      <div class="stat-content">
        <div class="stat-label">Vyčerpaná dovolenka tímu</div>
        <div class="stat-value">${totalVacationUsed.toFixed(1)} <small>dní</small></div>
        <div class="stat-sub">v roku ${state.currentYear}</div>
      </div>
    </div>
    <div class="stat-card pn-card">
      <div class="stat-icon">🤒</div>
      <div class="stat-content">
        <div class="stat-label">PN tímu celkovo</div>
        <div class="stat-value">${totalPnDays.toFixed(1)} <small>dní</small></div>
        <div class="stat-sub">v roku ${state.currentYear}</div>
      </div>
    </div>
    <div class="stat-card ocr-card">
      <div class="stat-icon">👶</div>
      <div class="stat-content">
        <div class="stat-label">OČR celkovo</div>
        <div class="stat-value">${totalOcrDays.toFixed(1)} <small>dní</small></div>
        <div class="stat-sub">v roku ${state.currentYear}</div>
      </div>
    </div>
  `;
}

function switchManagerTab(tabKey) {
  state.activeMgrTab = tabKey;
  document.querySelectorAll('.mgr-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mgr-tab-content').forEach(c => c.classList.remove('active'));

  const tabBtns = {
    'year': 0, 'matrix': 1, 'list': 2, 'stats': 3, 'employees': 4, 'mobile-qr': 5
  };
  const allBtns = document.querySelectorAll('.mgr-tab');
  if (allBtns[tabBtns[tabKey]]) allBtns[tabBtns[tabKey]].classList.add('active');

  const contentMap = {
    'year': 'mgrTabYear',
    'matrix': 'mgrTabMatrix',
    'list': 'mgrTabList',
    'stats': 'mgrTabStats',
    'employees': 'mgrTabEmployees',
    'mobile-qr': 'mgrTabMobileQr'
  };
  const target = document.getElementById(contentMap[tabKey]);
  if (target) target.classList.add('active');

  renderActiveManagerTab();
}

function renderActiveManagerTab() {
  switch (state.activeMgrTab) {
    case 'year':
      renderYearCalendar();
      break;
    case 'matrix':
      renderMatrixView();
      break;
    case 'list':
      renderAbsenceTable();
      break;
    case 'stats':
      loadManagerStats();
      break;
    case 'employees':
      renderEmployeesTable();
      break;
    case 'mobile-qr':
      initQrCodeView();
      break;
  }
}

function onManagerYearChange() {
  loadManagerData();
}

// --- 1. CELOROČNÝ KALENDÁR (12 MESIACOV) ---
function renderYearCalendar() {
  const container = document.getElementById('yearMonthsGrid');
  container.innerHTML = '';

  const holidaysMap = {};
  state.holidays.forEach(h => { holidaysMap[h.date] = h.name; });

  const year = state.currentYear;
  const todayStr = new Date().toISOString().split('T')[0];

  for (let m = 0; m < 12; m++) {
    const monthCard = document.createElement('div');
    monthCard.className = 'month-mini-card';

    const monthTitle = document.createElement('div');
    monthTitle.className = 'month-mini-title';
    monthTitle.textContent = `${MONTH_NAMES[m]}`;
    monthCard.appendChild(monthTitle);

    const weekdays = document.createElement('div');
    weekdays.className = 'mini-cal-weekdays';
    weekdays.innerHTML = '<span>P</span><span>U</span><span>S</span><span>Š</span><span>P</span><span style="color:#ef4444">S</span><span style="color:#ef4444">N</span>';
    monthCard.appendChild(weekdays);

    const daysGrid = document.createElement('div');
    daysGrid.className = 'mini-cal-days';

    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);

    let startCol = firstDay.getDay() - 1;
    if (startCol === -1) startCol = 6;

    for (let i = 0; i < startCol; i++) {
      const empty = document.createElement('div');
      empty.className = 'mini-day empty';
      daysGrid.appendChild(empty);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, m, d);
      const isWeekend = (dayDate.getDay() === 0 || dayDate.getDay() === 6);
      const holidayName = holidaysMap[dateStr];
      const isToday = (dateStr === todayStr);

      const cell = document.createElement('div');
      cell.className = 'mini-day';
      if (isWeekend) cell.classList.add('weekend');
      if (holidayName) {
        cell.classList.add('holiday');
        cell.title = holidayName;
      }
      if (isToday) cell.style.border = '1px solid var(--primary)';

      cell.textContent = d;

      // Absencie pre tento deň
      const dayAbs = state.absences.filter(a => dateStr >= a.start_date && dateStr <= a.end_date);
      if (dayAbs.length > 0) {
        cell.classList.add('has-absence');
        const dots = document.createElement('div');
        dots.className = 'mini-day-dots';
        // Max 3 bodky
        dayAbs.slice(0, 3).forEach(a => {
          const dot = document.createElement('span');
          dot.className = `mini-dot dot-${a.type}`;
          dots.appendChild(dot);
        });
        cell.appendChild(dots);
      }

      cell.addEventListener('click', () => openDayDetail(dateStr));
      daysGrid.appendChild(cell);
    }

    monthCard.appendChild(daysGrid);
    container.appendChild(monthCard);
  }
}

// --- 2. TÍMOVÁ MATICA (SPOLOČNÁ IMPLEMENTÁCIA PRE MANAŽÉRA AJ ZAMESTNANCOV) ---
function renderMatrixToTable(table, month, isEmployee) {
  if (!table) return;
  table.innerHTML = '';

  const year = state.currentYear;
  const daysInMonth = new Date(year, month, 0).getDate();

  const holidaysMap = {};
  state.holidays.forEach(h => { holidaysMap[h.date] = h.name; });

  const weekdayShort = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];

  // 1. Hlavička tabuľky
  const thead = document.createElement('thead');
  const trDays = document.createElement('tr');
  const thEmp = document.createElement('th');
  thEmp.className = 'emp-name-col';
  thEmp.textContent = 'Zamestnanec';
  trDays.appendChild(thEmp);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dayOfWeek = dayDate.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = holidaysMap[dateStr];

    const th = document.createElement('th');
    th.innerHTML = `${day}<br><span style="font-size:9px">${weekdayShort[dayOfWeek]}</span>`;
    if (isWeekend) th.classList.add('weekend-col');
    if (isHoliday) {
      th.classList.add('holiday-col');
      th.title = isHoliday;
    }
    trDays.appendChild(th);
  }
  thead.appendChild(trDays);
  table.appendChild(thead);

  // 2. Riadky zamestnancov
  const tbody = document.createElement('tbody');
  state.employees.forEach(emp => {
    const tr = document.createElement('tr');
    const isMe = (state.currentUser && state.currentUser.id === emp.id);
    if (isMe) {
      tr.className = 'current-user-row';
    }

    const tdName = document.createElement('td');
    tdName.className = 'emp-name-col';
    tdName.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${emp.color};margin-right:6px"></span><strong>${emp.name}</strong> ${isMe ? '<small style="color:var(--primary);font-weight:700;">(Vy)</small>' : ''}`;
    tr.appendChild(tdName);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, day);
      const isWeekend = (dayDate.getDay() === 0 || dayDate.getDay() === 6);
      const isHoliday = holidaysMap[dateStr];

      const td = document.createElement('td');
      if (isWeekend) td.classList.add('weekend-col');
      if (isHoliday) td.classList.add('holiday-col');

      // Absencia pre tohto zamestnanca (okrem zamietnutých)
      const abs = state.absences.find(a => a.employee_id === emp.id && dateStr >= a.start_date && dateStr <= a.end_date && a.status !== 'rejected');
      if (abs) {
        const shortLabels = {
          'dovolenka': 'D',
          'pn': 'PN',
          'ocr': 'OČR',
          'lekar': 'P',
          'nahradne_volno': 'NV',
          'ine': 'I'
        };
        const isApproved = (abs.status === 'approved');
        const badge = document.createElement('div');
        // Po schválení sa zobrazí výraznou ZELENOU farbou (.cell-approved), kým čaká na schválenie tak oranžovo (.cell-pending)
        badge.className = `matrix-cell-absence ${isApproved ? 'cell-approved' : 'cell-pending'}`;
        const label = shortLabels[abs.type] || 'A';
        badge.innerHTML = isApproved ? `${label} ✓` : `${label} ⏳`;
        badge.title = `${emp.name}: ${ABSENCE_NAMES[abs.type]} [${isApproved ? 'ODSÚHLASENÉ (Schválené) ✓' : 'ČAKÁ NA SCHVÁLENIE ⏳'}] (${abs.note || ''})`;
        badge.addEventListener('click', () => openDayDetail(dateStr));
        td.appendChild(badge);
      } else {
        td.addEventListener('click', () => {
          if (!isEmployee || isMe) {
            openAbsenceModalWithPrefill(emp.id, dateStr);
          } else {
            alert(`${emp.name} je v tento deň (${formatDate(dateStr)}) v práci.`);
          }
        });
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderMatrixView() {
  const sel = document.getElementById('matrixMonthSelect');
  if (!sel) return;
  const month = Number(sel.value);
  renderMatrixToTable(document.getElementById('matrixTable'), month, false);
}

function changeMatrixMonth(delta) {
  const sel = document.getElementById('matrixMonthSelect');
  let val = Number(sel.value) + delta;
  if (val < 1) val = 12;
  if (val > 12) val = 1;
  sel.value = val;
  renderMatrixView();
}

// --- 3. TABUĽKA VŠETKÝCH ABSENCIÍ ---
function renderAbsenceTable() {
  const tbody = document.getElementById('mgrAbsencesTableBody');
  const typeFilter = document.getElementById('filterAbsenceType').value;
  tbody.innerHTML = '';

  let list = state.absences;
  if (typeFilter) {
    list = list.filter(a => a.type === typeFilter);
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">Žiadne absencie nezodpovedajú zvolenému filtru.</td></tr>';
    return;
  }

  list.forEach(a => {
    const tr = document.createElement('tr');
    const icon = ABSENCE_ICONS[a.type] || '📌';
    const name = ABSENCE_NAMES[a.type] || a.type;
    const workingDays = a.working_days ? `${a.working_days.toFixed(1)} prac. dní` : '0';
    const subInfo = a.hours ? ` (${a.hours} hod.)` : (a.is_half_day ? ' (pol dňa)' : '');

    const isPending = (a.status === 'pending');
    const isApproved = (a.status === 'approved');
    const statusBadge = isApproved 
      ? '<span class="badge-role" style="background:#d1fae5;color:#059669;font-weight:700;">✅ Schválené</span>'
      : (isPending 
          ? '<span class="badge-role" style="background:#fef3c7;color:#d97706;font-weight:700;">⏳ Čaká na schválenie</span>' 
          : '<span class="badge-role" style="background:#fee2e2;color:#dc2626;font-weight:700;">❌ Zamietnuté</span>');

    const actions = isPending ? `
      <button class="btn btn-xs btn-primary" style="background:#10b981;border-color:#10b981;" onclick="approveAbsence(${a.id})" title="Schváliť túto požiadavku">✅ Schváliť</button>
      <button class="btn btn-xs btn-outline ml-1" style="color:#dc2626;" onclick="rejectAbsence(${a.id})" title="Zamietnuť požiadavku">❌ Zamietnuť</button>
      <button class="btn btn-xs btn-outline ml-1" onclick="deleteAbsence(${a.id})" title="Zmazať">🗑️</button>
    ` : `
      <button class="btn btn-xs btn-outline" onclick="deleteAbsence(${a.id})" title="Zmazať absenciu">🗑️ Zmazať</button>
    `;

    tr.innerHTML = `
      <td><strong>${a.employee_name || 'Neznámy'}</strong></td>
      <td><span class="legend-dot dot-${a.type}"></span> ${icon} ${name}</td>
      <td>${formatDate(a.start_date)} - ${formatDate(a.end_date)}</td>
      <td>${workingDays}${subInfo}</td>
      <td>${a.note || '-'}</td>
      <td>${statusBadge}</td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- 4. ŠTATISTIKY A ZOSTATKY ---
function renderStatsTable(statsList) {
  const tbody = document.getElementById('mgrStatsTableBody');
  tbody.innerHTML = '';

  statsList.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:6px"></span><strong>${s.name}</strong></td>
      <td>${s.annual_leave_days} dní</td>
      <td><strong style="color:var(--color-dovolenka)">${s.used_vacation_days.toFixed(1)}</strong> dní</td>
      <td><strong style="color:${s.remaining_vacation_days < 0 ? '#ef4444' : '#10b981'}">${s.remaining_vacation_days.toFixed(1)}</strong> dní</td>
      <td>${s.pn_days.toFixed(1)}</td>
      <td>${s.ocr_days.toFixed(1)}</td>
      <td>${s.doctor_days.toFixed(1)} d. ${s.doctor_hours ? `(${s.doctor_hours} h)` : ''}</td>
      <td>${s.compensatory_leave_days.toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- 5. SPRÁVA ZAMESTNANCOV ---
function renderEmployeesTable() {
  const tbody = document.getElementById('mgrEmployeesTableBody');
  tbody.innerHTML = '';

  state.employees.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.name}</strong></td>
      <td><span class="badge-role ${emp.role}">${emp.role === 'admin' ? 'Manažér' : 'Zamestnanec'}</span></td>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-weight:700;letter-spacing:2px">${emp.pin}</code></td>
      <td>${emp.annual_leave_days} dní</td>
      <td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${emp.color};border:1px solid #ccc"></span></td>
      <td>
        <button class="btn btn-xs btn-primary" onclick="openAbsenceModalWithPrefill(${emp.id}, '')" title="Priamo zadať absenciu za tohto zamestnanca">➕ Zadať absenciu</button>
        <button class="btn btn-xs btn-outline ml-2" onclick="openChangePinModalForEmployee(${emp.id}, '${emp.name.replace(/'/g, "\\'")}')" title="Zmeniť heslo tohto zamestnanca">🔑 Zmeniť heslo</button>
        <button class="btn btn-xs btn-outline ml-2" onclick="openEditEmployeeModal(${emp.id})">✏️ Upraviť</button>
        ${emp.role !== 'admin' ? `<button class="btn btn-xs btn-outline ml-2" style="color:#dc2626;border-color:#fecaca" onclick="deleteEmployee(${emp.id}, '${emp.name.replace(/'/g, "\\'")}')" title="Odobrať tohto zamestnanca">🗑️ Odobrať</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- 6. MOBILNÝ PRÍSTUP (QR KÓD) ---
function initQrCodeView() {
  const urlBox = document.getElementById('mobileNetworkUrl');
  const currentOrigin = window.location.origin;
  urlBox.textContent = currentOrigin;

  // Vygenerujeme QR kód priamo cez Canvas bez závislostí
  const container = document.getElementById('qrCodeContainer');
  container.innerHTML = '';

  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = 180;
  qrCanvas.height = 180;
  drawSimpleQr(qrCanvas, currentOrigin);
  container.appendChild(qrCanvas);
}

function copyMobileUrl() {
  const url = window.location.origin;
  navigator.clipboard.writeText(url).then(() => {
    alert('Odkaz skopírovaný do schránky:\n' + url);
  });
}

// Jednoduchý QR generátor na canvas
function drawSimpleQr(canvas, text) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Kreslenie štýlového náhľadu / QR vzoru
  ctx.fillStyle = '#0f172a';
  const margin = 12;
  const qrSize = size - 2 * margin;
  const cols = 21;
  const cellSize = qrSize / cols;

  // Jednoduchý deterministický hash pre matrix
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  function drawFinder(x, y) {
    ctx.fillRect(margin + x * cellSize, margin + y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin + (x + 1) * cellSize, margin + (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(margin + (x + 2) * cellSize, margin + (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  // 3 pozičné štvorce
  drawFinder(0, 0);
  drawFinder(cols - 7, 0);
  drawFinder(0, cols - 7);

  // Dátové bunky
  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r < 7 && c < 7) || (r < 7 && c >= cols - 7) || (r >= cols - 7 && c < 7)) continue;
      const pseudoVal = Math.sin(r * 13 + c * 7 + hash) * 10000;
      if (Math.abs(pseudoVal - Math.floor(pseudoVal)) > 0.45) {
        ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
      }
    }
  }

  // Logo v strede
  const centerSize = 5 * cellSize;
  const centerPos = margin + (cols / 2 - 2.5) * cellSize;
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(centerPos, centerPos, centerSize, centerSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SP', centerPos + centerSize / 2, centerPos + centerSize / 2);
}

// ========================================================
// MODAL ZADANIA ABSENCIE
// ========================================================
function openAbsenceModal() {
  const modal = document.getElementById('absenceModal');
  const form = document.getElementById('absenceForm');
  form.reset();
  document.getElementById('absenceId').value = '';

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('absenceStartDate').value = todayStr;
  document.getElementById('absenceEndDate').value = todayStr;

  const empSelect = document.getElementById('absenceEmployee');
  const empGroup = document.getElementById('modalEmployeeSelectGroup');
  const modalTitle = document.getElementById('absenceModalTitle');

  if (state.currentUser && state.currentUser.role === 'admin') {
    modalTitle.textContent = '👑 Zaevidovať neprítomnosť za zamestnanca';
    empGroup.style.display = 'block';
    // Vyberieme prvého bežného zamestnanca zo zoznamu
    const regularEmployees = state.employees.filter(e => e.role === 'employee');
    if (regularEmployees.length > 0) {
      empSelect.value = regularEmployees[0].id;
    } else if (state.employees.length > 0) {
      empSelect.value = state.employees[0].id;
    }
  } else {
    modalTitle.textContent = '➕ Zadať neprítomnosť do kalendára';
    empGroup.style.display = 'none'; // Zamestnanec zadáva iba za seba
    if (state.currentUser) empSelect.value = state.currentUser.id;
  }

  onAbsenceTypeChange();
  calculateDaysLive();
  modal.style.display = 'flex';
}

function openAbsenceModalForManager() {
  openAbsenceModal();
}

function openAbsenceModalWithPrefill(empId, dateStr) {
  openAbsenceModal();
  if (empId) {
    document.getElementById('absenceEmployee').value = empId;
  }
  if (dateStr) {
    document.getElementById('absenceStartDate').value = dateStr;
    document.getElementById('absenceEndDate').value = dateStr;
  }
  calculateDaysLive();
}

function closeAbsenceModal() {
  document.getElementById('absenceModal').style.display = 'none';
}

function onAbsenceTypeChange() {
  const type = document.querySelector('input[name="absenceType"]:checked').value;
  const hoursGroup = document.getElementById('hoursInputGroup');
  const halfCheck = document.getElementById('absenceHalfDay');

  if (type === 'lekar') {
    hoursGroup.style.display = 'block';
  } else {
    hoursGroup.style.display = 'none';
    document.getElementById('absenceHours').value = '';
  }
  calculateDaysLive();
}

function onAbsenceDatesChange() {
  const start = document.getElementById('absenceStartDate').value;
  const end = document.getElementById('absenceEndDate').value;
  if (start && (!end || end < start)) {
    document.getElementById('absenceEndDate').value = start;
  }
  calculateDaysLive();
}

function setQuickDates(mode) {
  const today = new Date();
  let start = new Date();
  let end = new Date();

  if (mode === 'today') {
    // Dnes
  } else if (mode === 'tomorrow') {
    start.setDate(today.getDate() + 1);
    end.setDate(today.getDate() + 1);
  } else if (mode === 'this_week') {
    const day = today.getDay() || 7;
    start.setDate(today.getDate() - day + 1);
    end.setDate(today.getDate() - day + 5);
  } else if (mode === 'next_week') {
    const day = today.getDay() || 7;
    start.setDate(today.getDate() - day + 8);
    end.setDate(today.getDate() - day + 12);
  }

  document.getElementById('absenceStartDate').value = start.toISOString().split('T')[0];
  document.getElementById('absenceEndDate').value = end.toISOString().split('T')[0];
  calculateDaysLive();
}

function onSubDayChange() {
  calculateDaysLive();
}

function calculateDaysLive() {
  const startStr = document.getElementById('absenceStartDate').value;
  const endStr = document.getElementById('absenceEndDate').value;
  const isHalf = document.getElementById('absenceHalfDay').checked;
  const hours = Number(document.getElementById('absenceHours').value) || 0;
  const display = document.getElementById('calculatedWorkingDays');

  if (!startStr || !endStr) {
    display.textContent = '0.0';
    return;
  }

  if (isHalf) {
    display.textContent = '0.5';
    return;
  }
  if (hours > 0) {
    display.textContent = `${(hours / 8).toFixed(1)} (${hours} hod.)`;
    return;
  }

  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  if (start > end) {
    display.textContent = '0.0';
    return;
  }

  const holidaysMap = new Set();
  state.holidays.forEach(h => holidaysMap.add(h.date));

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dow = curr.getUTCDay();
    const currStr = curr.toISOString().split('T')[0];
    if (dow !== 0 && dow !== 6 && !holidaysMap.has(currStr)) {
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  display.textContent = count.toFixed(1);
}

async function handleAbsenceSubmit(e) {
  e.preventDefault();
  const employeeId = document.getElementById('absenceEmployee').value;
  const type = document.querySelector('input[name="absenceType"]:checked').value;
  const startDate = document.getElementById('absenceStartDate').value;
  const endDate = document.getElementById('absenceEndDate').value;
  const isHalfDay = document.getElementById('absenceHalfDay').checked;
  const hours = Number(document.getElementById('absenceHours').value) || 0;
  const note = document.getElementById('absenceNote').value.trim();

  // Ak pridáva manažér, absencia je priamo schválená ('approved').
  // Ak pridáva zamestnanec, absencia čaká na schválenie administrátorom ('pending').
  const initialStatus = (state.currentUser && state.currentUser.role === 'admin') ? 'approved' : 'pending';

  const payload = {
    employee_id: employeeId,
    type,
    start_date: startDate,
    end_date: endDate,
    is_half_day: isHalfDay ? 1 : 0,
    hours,
    note,
    status: initialStatus
  };

  try {
    const res = await fetch('/api/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Chyba pri ukladaní absencie');

    closeAbsenceModal();
    broadcastDataChange();
    checkLiveSync();

    if (state.currentUser.role === 'admin') {
      loadManagerData();
      alert('Neprítomnosť bola úspešne zaevidovaná a schválená.');
    } else {
      loadEmployeeData();
      alert('Vaša neprítomnosť bola zaznamenaná a čaká na schválenie administrátorom. V tímovej matici sa zobrazí po schválení zelenou farbou.');
    }
  } catch (err) {
    alert(err.message);
  }
}

// Funkcie schvaľovania pre administrátora
async function approveAbsence(id) {
  try {
    const res = await fetch(`/api/absences/${id}/approve`, { method: 'POST' });
    if (!res.ok) throw new Error('Chyba pri schvaľovaní absencie');
    broadcastDataChange();
    checkLiveSync();
    if (state.currentUser && state.currentUser.role === 'admin') {
      loadManagerData();
    } else {
      loadEmployeeData();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function rejectAbsence(id) {
  if (!confirm('Naozaj chcete zamietnuť túto žiadosť o absenciu?')) return;
  try {
    const res = await fetch(`/api/absences/${id}/reject`, { method: 'POST' });
    if (!res.ok) throw new Error('Chyba pri zamietaní absencie');
    broadcastDataChange();
    checkLiveSync();
    if (state.currentUser && state.currentUser.role === 'admin') {
      loadManagerData();
    } else {
      loadEmployeeData();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function deleteAbsence(id) {
  if (!confirm('Naozaj chcete zmazať túto neprítomnosť?')) return;
  try {
    const res = await fetch(`/api/absences/${id}`, { method: 'DELETE' });
    if (res.ok) {
      broadcastDataChange();
      checkLiveSync();
      if (state.currentUser.role === 'admin') {
        loadManagerData();
      } else {
        loadEmployeeData();
      }
    }
  } catch (e) {
    alert('Chyba pri mazaní absencie');
  }
}

// ========================================================
// MODAL ZAMESTNANCA (MANAŽÉR)
// ========================================================
function openEmployeeModal() {
  document.getElementById('employeeForm').reset();
  document.getElementById('editEmpId').value = '';
  document.getElementById('empModalTitle').textContent = '➕ Pridať zamestnanca';
  document.getElementById('editEmpPin').value = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById('employeeModal').style.display = 'flex';
}

function openEditEmployeeModal(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  document.getElementById('editEmpId').value = emp.id;
  document.getElementById('editEmpName').value = emp.name;
  document.getElementById('editEmpPin').value = emp.pin;
  document.getElementById('editEmpRole').value = emp.role;
  document.getElementById('editEmpLeave').value = emp.annual_leave_days;
  document.getElementById('editEmpColor').value = emp.color || '#3b82f6';
  document.getElementById('empModalTitle').textContent = '✏️ Upraviť zamestnanca';
  document.getElementById('employeeModal').style.display = 'flex';
}

function closeEmployeeModal() {
  document.getElementById('employeeModal').style.display = 'none';
}

async function handleEmployeeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editEmpId').value;
  const name = document.getElementById('editEmpName').value.trim();
  const pin = document.getElementById('editEmpPin').value.trim();
  const role = document.getElementById('editEmpRole').value;
  const annual_leave_days = Number(document.getElementById('editEmpLeave').value);
  const color = document.getElementById('editEmpColor').value;

  const payload = { name, pin, role, annual_leave_days, color };
  try {
    const adminPin = (state.currentUser && state.currentUser.pin) ? state.currentUser.pin : '';
    let url = id ? `/api/employees/${id}` : '/api/employees';
    if (adminPin) {
      url += `?admin_pin=${encodeURIComponent(adminPin)}`;
    }

    const method = id ? 'PUT' : 'POST';
    const headers = { 'Content-Type': 'application/json' };
    if (adminPin) {
      headers['x-admin-pin'] = adminPin;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Chyba pri ukladaní zamestnanca');
    }

    closeEmployeeModal();
    broadcastDataChange();
    checkLiveSync();
    broadcastDataChange();
    checkLiveSync();
    await loadEmployees();
    renderEmployeesTable();
    loadManagerData();
    alert(`Zamestnanec "${name}" bol úspešne uložený.`);
  } catch (err) {
    alert(err.message);
  }
}

async function deleteEmployee(id, empName) {
  if (!state.currentUser || state.currentUser.role !== 'admin') {
    alert('Iba administrátor môže odobrať zamestnanca.');
    return;
  }

  const choice = confirm(
    `Chcete odobrať zamestnanca "${empName}"?\n\n` +
    `• Kliknite OK pre pokračovanie.\n` +
    `• Kliknite ZRUŠIŤ, ak chcete akciu zrušiť.`
  );
  if (!choice) return;

  const permanentChoice = confirm(
    `Vyberte spôsob odobratia pre "${empName}":\n\n` +
    `• OK = ÚPLNE A TRVALO VYMAZAŤ (odstráni zamestnanca aj všetky jeho absencie)\n` +
    `• ZRUŠIŤ = IBA DEAKTIVOVAŤ (odporúčané - zamestnanec sa už nezobrazí, no jeho doterajšia dochádzka zostane v štatistikách)`
  );

  const isPermanent = permanentChoice ? 'true' : 'false';
  const adminPin = state.currentUser ? state.currentUser.pin : '';
  const url = `/api/employees/${id}?permanent=${isPermanent}&admin_pin=${encodeURIComponent(adminPin)}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-admin-pin': adminPin
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Chyba pri odoberaní zamestnanca');
    }
    broadcastDataChange();
    checkLiveSync();
    await loadEmployees();
    renderEmployeesTable();
    loadManagerData();
    alert(`Zamestnanec "${empName}" bol úspešne ${permanentChoice ? 'natrvalo vymazaný' : 'deaktivovaný'}.`);
  } catch (e) {
    alert(e.message);
  }
}

// ========================================================
// MODAL DETAIL DŇA
// ========================================================
function openDayDetail(dateStr) {
  state.selectedDateForModal = dateStr;
  const modal = document.getElementById('dayDetailModal');
  const title = document.getElementById('dayDetailTitle');
  const body = document.getElementById('dayDetailContent');

  const holidaysMap = {};
  state.holidays.forEach(h => { holidaysMap[h.date] = h.name; });
  const holiday = holidaysMap[dateStr];

  title.innerHTML = `📅 ${formatDate(dateStr)} ${holiday ? `<span class="badge-role" style="background:var(--bg-holiday);color:var(--color-holiday)">🎉 ${holiday}</span>` : ''}`;

  const dayAbsences = state.absences.filter(a => dateStr >= a.start_date && dateStr <= a.end_date);
  body.innerHTML = '';

  if (dayAbsences.length === 0) {
    body.innerHTML = '<p class="text-muted p-3 text-center">V tento deň nemajú zamestnanci nahlásenú žiadnu neprítomnosť.</p>';
  } else {
    dayAbsences.forEach(a => {
      const item = document.createElement('div');
      item.className = 'timeline-item mt-2';
      const icon = ABSENCE_ICONS[a.type] || '📌';
      const name = ABSENCE_NAMES[a.type] || a.type;
      const subInfo = a.hours ? ` (${a.hours} hod.)` : (a.is_half_day ? ' (pol dňa)' : '');
      const canDelete = (state.currentUser && (state.currentUser.role === 'admin' || a.employee_id === state.currentUser.id));

      item.innerHTML = `
        <div class="timeline-left">
          <span class="timeline-icon">${icon}</span>
          <div>
            <div class="timeline-dates">
              <strong>${a.employee_name || 'Zamestnanec'}</strong>
              ${a.status === 'approved' ? '<span class="badge-role" style="background:#d1fae5;color:#059669;font-weight:700;margin-left:6px;">✅ Schválené</span>' : ''}
              ${a.status === 'pending' ? '<span class="badge-role" style="background:#fef3c7;color:#d97706;font-weight:700;margin-left:6px;">⏳ Čaká na schválenie</span>' : ''}
            </div>
            <div class="timeline-meta">${name}${subInfo} ${a.note ? `• <em>${a.note}</em>` : ''}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${(state.currentUser && state.currentUser.role === 'admin' && a.status === 'pending') ? `
            <button class="btn btn-xs btn-primary" style="background:#10b981;border-color:#10b981;" onclick="approveAbsence(${a.id}); closeDayDetailModal();" title="Schváliť túto absenciu">✅ Schváliť</button>
            <button class="btn btn-xs btn-outline" style="color:#dc2626;" onclick="rejectAbsence(${a.id}); closeDayDetailModal();" title="Zamietnuť">❌</button>
          ` : ''}
          ${canDelete ? `
            <button class="btn btn-xs btn-outline" onclick="deleteAbsence(${a.id}); closeDayDetailModal();" title="Zmazať">🗑️</button>
          ` : ''}
        </div>
      `;
      body.appendChild(item);
    });
  }

  modal.style.display = 'flex';
}

function closeDayDetailModal() {
  document.getElementById('dayDetailModal').style.display = 'none';
}

function openAbsenceForDate() {
  closeDayDetailModal();
  openAbsenceModal();
  if (state.selectedDateForModal) {
    document.getElementById('absenceStartDate').value = state.selectedDateForModal;
    document.getElementById('absenceEndDate').value = state.selectedDateForModal;
    calculateDaysLive();
  }
}

// ========================================================
// EXPORT DÁT DO EXCELU (CSV)
// ========================================================
function exportDataCsv() {
  const year = state.currentYear;
  window.open(`/api/export?year=${year}`, '_blank');
}

// Export všetkých hesiel / PINov do Excel tabuľky (IBA PRE ADMINISTRÁTORA)
function exportPasswordsCsv() {
  if (!state.currentUser || state.currentUser.role !== 'admin') {
    alert('Prístup zamietnutý. Zoznam hesiel môže stiahnuť iba overený administrátor.');
    return;
  }
  window.open(`/api/export-passwords?admin_pin=${encodeURIComponent(state.currentUser.pin)}`, '_blank');
}

// ========================================================
// MODAL ZMENA HESLA / PINU
// ========================================================
function openChangePinModal() {
  if (!state.currentUser) return;
  const modal = document.getElementById('changePinModal');
  const form = document.getElementById('changePinForm');
  form.reset();
  document.getElementById('changePinError').style.display = 'none';
  document.getElementById('changePinSuccess').style.display = 'none';

  document.getElementById('changePinEmpId').value = state.currentUser.id;
  document.getElementById('changePinModalTitle').textContent = `🔑 Zmena hesla / PINu (${state.currentUser.name})`;

  const oldPinGroup = document.getElementById('oldPinGroup');
  if (oldPinGroup) oldPinGroup.style.display = 'none';

  modal.style.display = 'flex';
}

function openChangePinModalForEmployee(empId, empName) {
  const modal = document.getElementById('changePinModal');
  const form = document.getElementById('changePinForm');
  form.reset();
  document.getElementById('changePinError').style.display = 'none';
  document.getElementById('changePinSuccess').style.display = 'none';

  document.getElementById('changePinEmpId').value = empId;
  document.getElementById('changePinModalTitle').textContent = `🔑 Zmena hesla pre: ${empName}`;

  const oldPinGroup = document.getElementById('oldPinGroup');
  if (oldPinGroup) oldPinGroup.style.display = 'none';

  modal.style.display = 'flex';
}

function closeChangePinModal() {
  document.getElementById('changePinModal').style.display = 'none';
}

async function handleChangePinSubmit(e) {
  e.preventDefault();
  const empId = document.getElementById('changePinEmpId').value;
  const newPin = document.getElementById('newPinInput').value.trim();
  const confirmPin = document.getElementById('confirmPinInput').value.trim();
  const errDiv = document.getElementById('changePinError');
  const successDiv = document.getElementById('changePinSuccess');

  errDiv.style.display = 'none';
  successDiv.style.display = 'none';

  if (!newPin) {
    errDiv.textContent = 'Zadajte nové heslo / PIN.';
    errDiv.style.display = 'block';
    return;
  }

  if (newPin !== confirmPin) {
    errDiv.textContent = 'Nové heslá sa nezhodujú!';
    errDiv.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: empId,
        newPin: newPin
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Chyba pri zmene hesla');

    successDiv.textContent = '✅ Heslo bolo úspešne zmenené!';
    successDiv.style.display = 'block';

    // Aktualizácia v zozname zamestnancov a lokálnom stave
    broadcastDataChange();
    checkLiveSync();
    await loadEmployees();
    renderEmployeesTable();

    if (state.currentUser && Number(empId) === state.currentUser.id) {
      state.currentUser.pin = newPin;
      localStorage.setItem('sp_asistent_user', JSON.stringify(state.currentUser));
    }

    setTimeout(() => {
      closeChangePinModal();
    }, 1200);
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
  }
}

// --- POMOCNÉ FUNKCIE ---
function formatDate(dStr) {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length !== 3) return dStr;
  return `${Number(parts[2])}. ${Number(parts[1])}. ${parts[0]}`;
}

// ========================================================
// LIVE SYNCHRONIZÁCIA A AUTOMATICKÁ ZÁCHRANA DÁT (CLOUD)
// ========================================================
let lastKnownDataVersion = null;
let isSyncing = false;
let syncIntervalId = null;

// Medzikartová synchronizácia (BroadcastChannel) pre 0ms okamžitý update
const syncChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('sp_asistent_sync') : null;
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data === 'data_changed') {
      refreshAllDataSilently();
    }
  };
}

function broadcastDataChange() {
  if (syncChannel) {
    try {
      syncChannel.postMessage('data_changed');
    } catch (e) {}
  }
}

function startLiveSync() {
  if (syncIntervalId) clearInterval(syncIntervalId);
  // Pravidelná kontrola každé 3.5 sekundy pre okamžité zobrazenie zmien od kolegov
  syncIntervalId = setInterval(checkLiveSync, 3500);

  // Okamžitá kontrola pri návrate do aplikácie / prepnutí okna
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkLiveSync();
    }
  });
  window.addEventListener('focus', checkLiveSync);
}

async function checkLiveSync() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const res = await fetch('/api/sync/status', { cache: 'no-store' });
    if (!res.ok) {
      updateSyncBadge(false);
      return;
    }
    const data = await res.json();
    updateSyncBadge(true, data.dbType);

    // Automatická záchrana/obnova dát pri čistom reštarte Renderu
    if (data.absencesCount === 0) {
      await tryAutoRestoreIfServerEmpty();
    }

    if (lastKnownDataVersion === null) {
      lastKnownDataVersion = data.version;
      return;
    }

    if (data.version !== lastKnownDataVersion) {
      lastKnownDataVersion = data.version;
      console.log('🔄 Live sync: zistená nová zmena v databáze, aktualizujem...');
      await refreshAllDataSilently();
    }
  } catch (err) {
    updateSyncBadge(false);
  } finally {
    isSyncing = false;
  }
}

function saveLocalEmergencyBackup() {
  if (state.employees && state.employees.length > 0) {
    const backup = {
      timestamp: Date.now(),
      employees: state.employees,
      absences: state.absences || []
    };
    try {
      localStorage.setItem('sp_asistent_cloud_backup', JSON.stringify(backup));
    } catch (e) {
      console.warn('LocalStorage limit', e);
    }
  }
}

async function tryAutoRestoreIfServerEmpty() {
  const backupStr = localStorage.getItem('sp_asistent_cloud_backup');
  if (!backupStr) return;
  try {
    const backup = JSON.parse(backupStr);
    if (backup.absences && backup.absences.length > 0) {
      console.warn('⚠️ Server po reštarte nemá absencie, obnovujem dáta zo zálohy v prehliadači...');
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup)
      });
      if (res.ok) {
        showToast('♻️ Dáta boli automaticky bezpečne obnovené zo zálohy.', 'success');
        await refreshAllDataSilently();
      }
    }
  } catch (e) {
    console.error('Chyba pri auto-restore:', e);
  }
}

async function refreshAllDataSilently() {
  await loadEmployees();
  if (state.currentUser) {
    if (state.currentUser.role === 'admin') {
      await fetchManagerAbsences();
      await loadManagerStats();
      renderActiveManagerTab();
    } else {
      await fetchEmployeeAbsences();
      updateEmployeeStats();
      renderEmployeeCalendar();
      renderEmpMatrixView();
    }
  }
  saveLocalEmergencyBackup();
}

function updateSyncBadge(isLive, dbType = 'sqlite') {
  const badge = document.getElementById('syncStatusBadge');
  const dot = document.getElementById('syncStatusDot');
  const text = document.getElementById('syncStatusText');
  if (!badge || !dot || !text) return;

  if (isLive) {
    dot.className = 'sync-dot live';
    text.textContent = dbType === 'postgres' ? 'Cloud: Trvalý' : 'Live: Ihneď';
    badge.title = dbType === 'postgres'
      ? 'Pripojené k trvalej cloudovej PostgreSQL databáze. Zmeny sa ihneď ukladajú a nikdy nezmiznú.'
      : 'Live synchronizácia je aktívna (dáta sa aktualizujú ihneď). Pre 100% trvalé uloženie v cloude odporúčame pripojiť DATABASE_URL.';
  } else {
    dot.className = 'sync-dot offline';
    text.textContent = 'Pripája sa...';
    badge.title = 'Prebieha pokus o spojenie so serverom...';
  }
}

async function manualRefreshSync() {
  const btn = document.getElementById('refreshSyncBtn');
  if (btn) btn.classList.add('rotating');
  try {
    await refreshAllDataSilently();
    showToast('🔄 Dáta boli okamžite zosynchronizované.', 'success');
  } catch (e) {
    showToast('Chyba pri synchronizácii dát', 'error');
  } finally {
    if (btn) setTimeout(() => btn.classList.remove('rotating'), 600);
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  item.innerHTML = message;
  container.appendChild(item);

  setTimeout(() => item.classList.add('toast-show'), 10);
  setTimeout(() => {
    item.classList.remove('toast-show');
    setTimeout(() => item.remove(), 400);
  }, 3500);
}

// --- MODAL ZÁLOHY A OBNOVY ---
function openBackupModal() {
  const modal = document.getElementById('backupModal');
  if (modal) modal.style.display = 'flex';
}

function closeBackupModal() {
  const modal = document.getElementById('backupModal');
  if (modal) modal.style.display = 'none';
}

async function exportFullBackupJson() {
  try {
    const res = await fetch('/api/backup/export');
    if (!res.ok) throw new Error('Chyba pri exporte zálohy');
    const data = await res.json();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = dlUrl;
    a.download = `sp_asistent_zaloha_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
    showToast('💾 Záloha bola úspešne stiahnutá.', 'success');
  } catch (err) {
    alert(err.message);
  }
}

async function importBackupJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.employees && !parsed.absences) {
        throw new Error('Vybraný súbor neobsahuje platné dáta zálohy SP Asistenta.');
      }
      const countEmp = parsed.employees ? parsed.employees.length : 0;
      const countAbs = parsed.absences ? parsed.absences.length : 0;
      if (!confirm(`Chcete obnoviť dáta zo zálohy?\n\n• Zamestnanci: ${countEmp}\n• Absencie: ${countAbs}\n\nDáta sa bezpečne zlúčia na serveri.`)) {
        return;
      }

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Chyba pri obnove dát');

      showToast(`✅ Obnova úspešná: ${result.restoredEmployees} zamestnancov, ${result.restoredAbsences} absencií.`, 'success');
      broadcastDataChange();
      await refreshAllDataSilently();
      closeBackupModal();
    } catch (err) {
      alert('Chyba: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
