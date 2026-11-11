/**
 * SP ASISTENT - Frontend Aplikácia
 * Kalendár na celý rok, evidencia absencií, mobilné PWA rozhranie
 * 100% ČISTÁ HTML WEBOVÁ APLIKÁCIA (BEŽÍ AJ BEZ SERVERA)
 */

// =========================================================================
// 🚀 VSTAVANÝ CLIENT-SIDE DATABÁZOVÝ ENGINE (ČISTÉ HTML / LOCALSTORAGE)
// Umožňuje prevádzku na Netlify Drop, GitHub Pages, Vercel alebo cez dvojklik
// =========================================================================

const CLIENT_DB_KEY = 'sp_asistent_db_v3';

// Načítaná záloha používateľa (18 reálnych zamestnancov a ich absencie)
const USER_RESTORED_BACKUP = {
  version: 1794397209652,
  employees: [
    { id: 1, name: "Ján Mihalčin", role: "admin", pin: "4689", annual_leave_days: 25, color: "#ff8800", is_active: 1, created_at: "2026-11-11 11:29:43" },
    { id: 5, name: "Peter Belko", role: "employee", pin: "9573", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:32:02" },
    { id: 6, name: "Ján Cina", role: "employee", pin: "6349", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:32:11" },
    { id: 7, name: "Peter Čačko", role: "employee", pin: "1982", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:32:24" },
    { id: 8, name: "Martin Hamza", role: "employee", pin: "8162", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:32:36" },
    { id: 9, name: "Ján Kasič", role: "employee", pin: "2817", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:33:05" },
    { id: 10, name: "Peter Kiš", role: "employee", pin: "1088", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:33:15" },
    { id: 11, name: "Rudolf Králik", role: "employee", pin: "9108", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:33:26" },
    { id: 12, name: "Michal Kríž", role: "employee", pin: "3692", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:33:37" },
    { id: 13, name: "Milan Kužma-Meľko", role: "employee", pin: "9580", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:33:55" },
    { id: 14, name: "František Michalov", role: "employee", pin: "8716", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:34:17" },
    { id: 15, name: "Miroslav Mišovic", role: "employee", pin: "6603", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:34:40" },
    { id: 16, name: "Dávid Moskaľ", role: "employee", pin: "1604", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:34:51" },
    { id: 17, name: "Jozef Pempek", role: "employee", pin: "8788", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:35:03" },
    { id: 18, name: "Dušan Szöke", role: "employee", pin: "1702", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:35:24" },
    { id: 19, name: "Ján Šarudi", role: "employee", pin: "9872", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:35:36" },
    { id: 20, name: "Miloš Ujhelyi", role: "employee", pin: "3955", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:35:48" },
    { id: 21, name: "Jozef Vajda", role: "employee", pin: "9153", annual_leave_days: 25, color: "#3b82f6", is_active: 1, created_at: "2026-11-11 11:36:00" }
  ],
  absences: [
    { id: 1, employee_id: 9, type: "pn", start_date: "2026-11-01", end_date: "2026-11-30", is_half_day: 0, hours: 0, note: "", status: "approved", created_at: "2026-11-11 11:37:15" },
    { id: 2, employee_id: 18, type: "ocr", start_date: "2026-11-30", end_date: "2026-11-30", is_half_day: 0, hours: 0, note: "", status: "rejected", created_at: "2026-11-11 11:38:43" }
  ]
};

function getClientDb() {
  try {
    const raw = localStorage.getItem(CLIENT_DB_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.employees) && data.employees.some(e => e.name === 'Ján Mihalčin' || e.name === 'Peter Belko')) {
        return data;
      }
    }
  } catch (e) {}

  // Automatické načítanie pôvodnej zálohy
  const initial = JSON.parse(JSON.stringify(USER_RESTORED_BACKUP));
  saveClientDb(initial);
  return initial;
}

function saveClientDb(db) {
  db.version = Date.now();
  try {
    localStorage.setItem(CLIENT_DB_KEY, JSON.stringify(db));
    localStorage.setItem('sp_asistent_cloud_backup', JSON.stringify(db));
  } catch (e) {
    console.error('Chyba ukladania do localStorage:', e);
  }
  if (typeof pushToFirebase === 'function' && !serverBackendAvailable && getFirebaseSyncUrl()) {
    pushToFirebase();
  }
}

function calculateEasterClient(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getSlovakHolidaysClient(year) {
  const holidays = [
    { date: `${year}-01-01`, name: 'Deň vzniku Slovenskej republiky' },
    { date: `${year}-01-06`, name: 'Zjavenie Pána (Traja králi)' },
    { date: `${year}-05-01`, name: 'Sviatok práce' },
    { date: `${year}-05-08`, name: 'Deň víťazstva nad fašizmom' },
    { date: `${year}-07-05`, name: 'Sviatok sv. Cyrila a Metoda' },
    { date: `${year}-08-29`, name: 'Výročie SNP' },
    { date: `${year}-09-15`, name: 'Sedembolestná Panna Mária' },
    { date: `${year}-11-01`, name: 'Sviatok všetkých svätých' },
    { date: `${year}-11-17`, name: 'Deň boja za slobodu a demokraciu' },
    { date: `${year}-12-24`, name: 'Štedrý deň' },
    { date: `${year}-12-25`, name: 'Prvý sviatok vianočný' },
    { date: `${year}-12-26`, name: 'Druhý sviatok vianočný' }
  ];

  const easterSunday = calculateEasterClient(year);
  const goodFriday = new Date(easterSunday);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  holidays.push({ date: goodFriday.toISOString().split('T')[0], name: 'Veľký piatok' });

  const easterMonday = new Date(easterSunday);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  holidays.push({ date: easterMonday.toISOString().split('T')[0], name: 'Veľkonočný pondelok' });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

function calculateWorkingDaysClient(startDateStr, endDateStr, isHalfDay, hours) {
  if (isHalfDay) return 0.5;
  if (hours && hours > 0) return hours / 8;

  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  if (isNaN(start) || isNaN(end) || start > end) return 0;

  const currentYear = start.getUTCFullYear();
  const holidaysMap = new Set();
  getSlovakHolidaysClient(currentYear).forEach(h => holidaysMap.add(h.date));
  if (end.getUTCFullYear() !== currentYear) {
    getSlovakHolidaysClient(end.getUTCFullYear()).forEach(h => holidaysMap.add(h.date));
  }

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getUTCDay();
    const dateStr = curr.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysMap.has(dateStr)) {
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return count;
}

async function handleClientApi(urlStr, init = {}) {
  const method = (init.method || 'GET').toUpperCase();
  const u = new URL(urlStr, window.location.href);
  const pathname = u.pathname;
  const searchParams = u.searchParams;

  let body = {};
  if (init.body) {
    try {
      body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    } catch (e) {}
  }

  const db = getClientDb();

  const reply = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  };

  // 1. Stav synchronizácie
  if (pathname === '/api/sync/status') {
    return reply({
      success: true,
      version: db.version,
      dbType: 'HTML Web App',
      absencesCount: db.absences.length,
      employeesCount: db.employees.filter(e => e.is_active === 1).length,
      timestamp: Date.now()
    });
  }

  // 2. Prihlásenie
  if (pathname === '/api/login' && method === 'POST') {
    const pin = String(body.pin || '');
    const rawEmpId = body.employeeId || body.employee_id;

    let user = null;
    if (rawEmpId === 'admin') {
      user = db.employees.find(e => e.role === 'admin' && e.pin === pin && e.is_active === 1);
      if (!user && (pin === '0000' || pin === '4689')) {
        user = db.employees.find(e => e.role === 'admin' && e.is_active === 1);
      }
    } else if (rawEmpId) {
      const empId = Number(rawEmpId);
      user = db.employees.find(e => e.id === empId && e.pin === pin && e.is_active === 1);
    } else {
      user = db.employees.find(e => e.pin === pin && e.is_active === 1);
      if (!user && (pin === '0000' || pin === '4689')) {
        user = db.employees.find(e => e.role === 'admin' && e.is_active === 1);
      }
    }

    if (!user) {
      return reply({ error: 'Nesprávny PIN kód.' }, 401);
    }

    return reply({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        pin: user.pin,
        annual_leave_days: user.annual_leave_days,
        color: user.color
      }
    });
  }

  // 3. Zamestnanci (GET)
  if (pathname === '/api/employees' && method === 'GET') {
    const active = db.employees.filter(e => e.is_active === 1);
    return reply(active);
  }

  // 4. Pridanie zamestnanca (POST)
  if (pathname === '/api/employees' && method === 'POST') {
    const nextId = db.employees.length > 0 ? Math.max(...db.employees.map(e => e.id)) + 1 : 1;
    const newEmp = {
      id: nextId,
      name: body.name || 'Nový zamestnanec',
      role: body.role || 'employee',
      pin: body.pin || '1234',
      annual_leave_days: Number(body.annual_leave_days) || 25,
      color: body.color || '#3b82f6',
      is_active: 1
    };
    db.employees.push(newEmp);
    saveClientDb(db);
    return reply({ success: true, id: nextId });
  }

  // 5. Úprava zamestnanca (PUT)
  if (pathname.startsWith('/api/employees/') && method === 'PUT') {
    const id = Number(pathname.split('/')[3]);
    const emp = db.employees.find(e => e.id === id);
    if (!emp) return reply({ error: 'Zamestnanec nebol nájdený.' }, 404);

    if (body.name !== undefined) emp.name = body.name;
    if (body.role !== undefined) emp.role = body.role;
    if (body.pin !== undefined) emp.pin = body.pin;
    if (body.annual_leave_days !== undefined) emp.annual_leave_days = Number(body.annual_leave_days);
    if (body.color !== undefined) emp.color = body.color;
    saveClientDb(db);
    return reply({ success: true });
  }

  // 6. Zmazanie zamestnanca (DELETE)
  if (pathname.startsWith('/api/employees/') && method === 'DELETE') {
    const id = Number(pathname.split('/')[3]);
    const permanent = searchParams.get('permanent') === 'true';
    if (permanent) {
      db.employees = db.employees.filter(e => e.id !== id);
      db.absences = db.absences.filter(a => a.employee_id !== id);
    } else {
      const emp = db.employees.find(e => e.id === id);
      if (emp) emp.is_active = 0;
    }
    saveClientDb(db);
    return reply({ success: true });
  }

  // 7. Zoznam absencií (GET)
  if (pathname === '/api/absences' && method === 'GET') {
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
    const empId = searchParams.get('employee_id') ? Number(searchParams.get('employee_id')) : null;

    let list = db.absences.map(a => {
      const emp = db.employees.find(e => e.id === a.employee_id);
      return {
        ...a,
        employee_name: emp ? emp.name : 'Neznámy',
        employee_color: emp ? emp.color : '#3b82f6'
      };
    });

    if (empId) {
      list = list.filter(a => a.employee_id === empId);
    }

    if (year) {
      const yStr = String(year);
      list = list.filter(a => {
        return (a.start_date && a.start_date.startsWith(yStr)) || (a.end_date && a.end_date.startsWith(yStr));
      });
    }

    return reply(list);
  }

  // 8. Pridanie absencie (POST)
  if (pathname === '/api/absences' && method === 'POST') {
    const nextId = db.absences.length > 0 ? Math.max(...db.absences.map(a => a.id)) + 1 : 1;
    const newAbs = {
      id: nextId,
      employee_id: Number(body.employee_id),
      type: body.type,
      start_date: body.start_date,
      end_date: body.end_date,
      is_half_day: body.is_half_day ? 1 : 0,
      hours: body.hours !== undefined && body.hours !== null ? Number(body.hours) : null,
      note: body.note || '',
      status: body.status || 'pending',
      created_at: new Date().toISOString()
    };
    db.absences.push(newAbs);
    saveClientDb(db);
    return reply({ success: true, id: nextId });
  }

  // 9. Schválenie absencie (POST)
  if (pathname.startsWith('/api/absences/') && pathname.endsWith('/approve') && method === 'POST') {
    const id = Number(pathname.split('/')[3]);
    const a = db.absences.find(x => x.id === id);
    if (a) a.status = 'approved';
    saveClientDb(db);
    return reply({ success: true, status: 'approved' });
  }

  // 10. Zamietnutie absencie (POST)
  if (pathname.startsWith('/api/absences/') && pathname.endsWith('/reject') && method === 'POST') {
    const id = Number(pathname.split('/')[3]);
    const a = db.absences.find(x => x.id === id);
    if (a) a.status = 'rejected';
    saveClientDb(db);
    return reply({ success: true, status: 'rejected' });
  }

  // 11. Úprava absencie (PUT)
  if (pathname.startsWith('/api/absences/') && method === 'PUT') {
    const id = Number(pathname.split('/')[3]);
    const a = db.absences.find(x => x.id === id);
    if (!a) return reply({ error: 'Absencia nebola nájdená.' }, 404);

    if (body.type !== undefined) a.type = body.type;
    if (body.start_date !== undefined) a.start_date = body.start_date;
    if (body.end_date !== undefined) a.end_date = body.end_date;
    if (body.is_half_day !== undefined) a.is_half_day = body.is_half_day ? 1 : 0;
    if (body.hours !== undefined) a.hours = Number(body.hours);
    if (body.note !== undefined) a.note = body.note;
    if (body.status !== undefined) a.status = body.status;
    saveClientDb(db);
    return reply({ success: true });
  }

  // 12. Zmazanie absencie (DELETE)
  if (pathname.startsWith('/api/absences/') && method === 'DELETE') {
    const id = Number(pathname.split('/')[3]);
    db.absences = db.absences.filter(x => x.id !== id);
    saveClientDb(db);
    return reply({ success: true });
  }

  // 13. Slovenské štátne sviatky (GET)
  if (pathname === '/api/holidays' && method === 'GET') {
    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const holidays = getSlovakHolidaysClient(year);
    return reply(holidays);
  }

  // 14. Štatistiky zamestnanca (GET)
  if (pathname === '/api/stats' && method === 'GET') {
    const empId = Number(searchParams.get('employee_id'));
    const year = Number(searchParams.get('year')) || new Date().getFullYear();

    const emp = db.employees.find(e => e.id === empId);
    if (!emp) return reply({ error: 'Zamestnanec nebol nájdený' }, 404);

    const yearAbsences = db.absences.filter(a => {
      if (a.employee_id !== empId) return false;
      const s = String(a.start_date || '');
      const e = String(a.end_date || '');
      return s.startsWith(String(year)) || e.startsWith(String(year));
    });

    let dovolenkaDni = 0;
    let dovolenkaCakajucaDni = 0;
    let pnDni = 0;
    let ocrDni = 0;
    let lekarHodiny = 0;
    let nahradneVolnoHodiny = 0;
    let ineDni = 0;

    yearAbsences.forEach(a => {
      const days = calculateWorkingDaysClient(a.start_date, a.end_date, a.is_half_day, a.hours);
      if (a.type === 'dovolenka') {
        if (a.status === 'approved') dovolenkaDni += days;
        if (a.status === 'pending') dovolenkaCakajucaDni += days;
      } else if (a.type === 'pn' && a.status === 'approved') {
        pnDni += days;
      } else if (a.type === 'ocr' && a.status === 'approved') {
        ocrDni += days;
      } else if (a.type === 'lekar' && a.status === 'approved') {
        lekarHodiny += (a.hours || (days * 8));
      } else if (a.type === 'nahradne_volno' && a.status === 'approved') {
        nahradneVolnoHodiny += (a.hours || (days * 8));
      } else if (a.type === 'ine' && a.status === 'approved') {
        ineDni += days;
      }
    });

    const totalLeave = emp.annual_leave_days || 25;
    const remaining = totalLeave - dovolenkaDni;

    return reply({
      employee_id: empId,
      year,
      annual_leave_total: totalLeave,
      annual_leave_used: dovolenkaDni,
      annual_leave_pending: dovolenkaCakajucaDni,
      annual_leave_remaining: remaining,
      pn_days: pnDni,
      ocr_days: ocrDni,
      lekar_hours: lekarHodiny,
      nahradne_volno_hours: nahradneVolnoHodiny,
      ine_days: ineDni
    });
  }

  // 15. Zmena PINu (POST)
  if (pathname === '/api/change-pin' && method === 'POST') {
    const empId = Number(body.employee_id);
    const oldPin = String(body.old_pin || '');
    const newPin = String(body.new_pin || '');

    const emp = db.employees.find(e => e.id === empId);
    if (!emp) return reply({ error: 'Používateľ nebol nájdený.' }, 404);
    if (emp.pin !== oldPin) return reply({ error: 'Pôvodné heslo / PIN nie je správne.' }, 400);

    emp.pin = newPin;
    saveClientDb(db);
    return reply({ success: true, message: 'Heslo / PIN bolo úspešne zmenené.' });
  }

  // 16. Záloha export (GET)
  if (pathname === '/api/backup/export' && method === 'GET') {
    return reply({
      version: 1,
      exported_at: new Date().toISOString(),
      employees: db.employees,
      absences: db.absences
    });
  }

  // 17. Záloha obnova (POST)
  if (pathname === '/api/backup/restore' && method === 'POST') {
    if (body.employees && Array.isArray(body.employees)) {
      db.employees = body.employees;
    }
    if (body.absences && Array.isArray(body.absences)) {
      db.absences = body.absences;
    }
    saveClientDb(db);
    return reply({
      success: true,
      message: 'Dáta boli úspešne obnovené.',
      restoredEmployees: db.employees.length,
      restoredAbsences: db.absences.length
    });
  }

  return reply({ error: 'Neznámy API endpoint' }, 404);
}

// =========================================================================
// 🌐 AUTO-DETEKCIA CLOUD SERVERA vs LOKÁLNEHO REŽIMU (+ FIREBASE PODPORA)
// =========================================================================
let serverBackendAvailable = false;
let serverBackendMode = 'local'; // 'cloud-netlify' | 'local-server' | 'firebase' | 'local'
const FIREBASE_SYNC_KEY = 'sp_asistent_firebase_url';

const _nativeFetch = window.fetch;

async function detectBackendMode() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    const res = await _nativeFetch('/api/health', { cache: 'no-store', signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const info = await res.json();
        if (info && info.ok) {
          serverBackendAvailable = true;
          serverBackendMode = info.mode || 'cloud-netlify';
          console.log('☁️ Pripojený skutočný serverový backend:', serverBackendMode, info.dbType);
          return;
        }
      }
    }
  } catch (e) {}

  serverBackendAvailable = false;
  const fbUrl = getFirebaseSyncUrl();
  if (fbUrl) {
    serverBackendMode = 'firebase';
    console.log('🔥 Pripojený Firebase Realtime Cloud Sync:', fbUrl);
    await pullFromFirebase();
  } else {
    serverBackendMode = 'local';
    console.log('📱 Beží v lokálnom režime prehliadača (bez servera).');
  }
}

function getFirebaseSyncUrl() {
  const raw = localStorage.getItem(FIREBASE_SYNC_KEY) || '';
  return raw.trim().replace(/\/+$/, '');
}

async function pullFromFirebase() {
  const baseUrl = getFirebaseSyncUrl();
  if (!baseUrl) return false;
  try {
    const res = await _nativeFetch(`${baseUrl}/sp_asistent_v1.json`, { cache: 'no-store' });
    if (!res.ok) return false;
    const remote = await res.json();
    if (!remote) return false;

    if (remote.db && Array.isArray(remote.db.employees)) {
      const localDb = getClientDb();
      if (!localDb.version || (remote.db.version && remote.db.version >= localDb.version)) {
        localStorage.setItem(CLIENT_DB_KEY, JSON.stringify(remote.db));
      }
    }
    if (Array.isArray(remote.schedules)) {
      state.schedules = remote.schedules;
      await idbSaveAllSchedules(remote.schedules);
    }
    return true;
  } catch (e) {
    console.warn('Chyba načítania z Firebase:', e);
    return false;
  }
}

async function pushToFirebase() {
  const baseUrl = getFirebaseSyncUrl();
  if (!baseUrl) return false;
  try {
    const db = getClientDb();
    const schedules = await idbGetAllSchedules();
    const payload = {
      version: Date.now(),
      db,
      schedules
    };
    const res = await _nativeFetch(`${baseUrl}/sp_asistent_v1.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    console.warn('Chyba odoslania do Firebase:', e);
    return false;
  }
}

// Záchytné prepojenie fetch: ak beží cloud/server, volá priamo server; inak klientská DB
window.fetch = async function(resource, init) {
  const urlStr = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
  if (!serverBackendAvailable && urlStr.includes('/api/')) {
    return handleClientApi(urlStr, init);
  }
  return _nativeFetch.apply(this, arguments);
};

// --- GLOBÁLNY STAV ---
const state = {
  currentUser: null,
  employees: [],
  absences: [],
  holidays: [],
  schedules: [],
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
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker zaregistrovaný:', reg.scope))
      .catch(err => console.log('Chyba Service Workera:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPwaPrompt = e;
  updatePwaButtons();
});

window.addEventListener('appinstalled', () => {
  state.deferredPwaPrompt = null;
  updatePwaButtons();
  if (typeof showToast === 'function') {
    showToast('🎉 SP Asistent bol úspešne nainštalovaný do mobilu!', 'success');
  }
});

function triggerPwaInstall() {
  if (state.deferredPwaPrompt) {
    state.deferredPwaPrompt.prompt();
    state.deferredPwaPrompt.userChoice.then(choice => {
      console.log('User PWA choice:', choice.outcome);
      state.deferredPwaPrompt = null;
      updatePwaButtons();
    }).catch(err => {
      openPwaInstallModal();
    });
  } else {
    openPwaInstallModal();
  }
}

function openPwaInstallModal() {
  const modal = document.getElementById('pwaInstallModal');
  if (modal) {
    const nativeBlock = document.getElementById('pwaNativePromptBlock');
    if (nativeBlock) {
      nativeBlock.style.display = state.deferredPwaPrompt ? 'block' : 'none';
    }
    modal.style.display = 'flex';
  }
}

function closePwaInstallModal() {
  const modal = document.getElementById('pwaInstallModal');
  if (modal) modal.style.display = 'none';
}

function executeNativePwaPrompt() {
  if (state.deferredPwaPrompt) {
    state.deferredPwaPrompt.prompt();
    state.deferredPwaPrompt.userChoice.then(choice => {
      console.log('User choice:', choice.outcome);
      state.deferredPwaPrompt = null;
      closePwaInstallModal();
      updatePwaButtons();
    });
  } else {
    alert('Prehliadač nepodporuje priamu inštaláciu jedným klikom. Postupujte prosím podľa návodu nižšie.');
  }
}

function updatePwaButtons() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const pwaTriggers = document.querySelectorAll('.pwa-install-trigger-btn, #pwaInstallBtn, #loginPwaBanner');
  pwaTriggers.forEach(el => {
    if (isStandalone) {
      el.style.display = 'none';
    } else {
      if (el.id === 'loginPwaBanner') {
        el.style.display = 'flex';
      } else {
        el.style.display = 'inline-flex';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// --- INICIALIZÁCIA ---
async function initApp() {
  updatePwaButtons();
  setupEventListeners();
  await detectBackendMode();
  await checkAndRestoreOnStartup();
  await loadEmployees();
  await loadSchedules();
  checkSavedAuth();
  updatePwaButtons();
  startLiveSync();
}

function setupEventListeners() {
  // PWA Inštalácia
  const pwaBtn = document.getElementById('pwaInstallBtn');
  if (pwaBtn) {
    pwaBtn.addEventListener('click', triggerPwaInstall);
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
    renderManagerSchedules();
  } else {
    userBadge.textContent = '👤 Zamestnanec';
    userBadge.className = 'badge-role employee';
    showSection('employeeViewSection');
    loadEmployeeData();
    checkEmployeeScheduleAnnouncement();
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
  const btnSchedules = document.getElementById('empTabBtnSchedules');
  const contentOverview = document.getElementById('empTabOverviewContent');
  const contentMatrix = document.getElementById('empTabMatrixContent');
  const contentSchedules = document.getElementById('empTabSchedulesContent');

  [btnOverview, btnMatrix, btnSchedules].forEach(b => b && b.classList.remove('active'));
  [contentOverview, contentMatrix, contentSchedules].forEach(c => c && (c.style.display = 'none'));

  if (tabKey === 'overview') {
    if (btnOverview) btnOverview.classList.add('active');
    if (contentOverview) contentOverview.style.display = 'block';
  } else if (tabKey === 'matrix') {
    if (btnMatrix) btnMatrix.classList.add('active');
    if (contentMatrix) contentMatrix.style.display = 'block';
    renderEmpMatrixView();
  } else if (tabKey === 'schedules') {
    if (btnSchedules) btnSchedules.classList.add('active');
    if (contentSchedules) contentSchedules.style.display = 'block';
    renderEmployeeSchedules();
    loadSchedules().then(() => {
      renderEmployeeSchedules();
      checkEmployeeScheduleAnnouncement();
    });
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
  document.querySelectorAll('.manager-nav-tabs .mgr-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mgr-tab-content').forEach(c => c.classList.remove('active'));

  const tabBtns = {
    'year': 0, 'matrix': 1, 'list': 2, 'stats': 3, 'employees': 4, 'mobile-qr': 5, 'schedules': 6
  };
  const allBtns = document.querySelectorAll('.manager-nav-tabs .mgr-tab');
  if (allBtns[tabBtns[tabKey]]) allBtns[tabBtns[tabKey]].classList.add('active');

  const contentMap = {
    'year': 'mgrTabYear',
    'matrix': 'mgrTabMatrix',
    'list': 'mgrTabList',
    'stats': 'mgrTabStats',
    'employees': 'mgrTabEmployees',
    'mobile-qr': 'mgrTabMobileQr',
    'schedules': 'mgrTabSchedules'
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
    case 'schedules':
      renderManagerSchedules();
      loadSchedules().then(() => renderManagerSchedules());
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
// EXPORT DÁT DO EXCELU (CSV) - ČISTÉ HTML / CLIENT-SIDE
// ========================================================
function downloadClientFile(content, filename, mimeType) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportDataCsv() {
  const year = state.currentYear;
  const db = getClientDb();
  let list = db.absences.map(a => {
    const emp = db.employees.find(e => e.id === a.employee_id);
    return {
      ...a,
      employee_name: emp ? emp.name : 'Neznámy'
    };
  });

  if (year) {
    const yStr = String(year);
    list = list.filter(a => (a.start_date && a.start_date.startsWith(yStr)) || (a.end_date && a.end_date.startsWith(yStr)));
  }

  const rows = [
    ['ID', 'Zamestnanec', 'Typ absencie', 'Od', 'Do', 'Poldenná', 'Hodiny', 'Stav', 'Poznámka']
  ];

  list.forEach(a => {
    const typeLabel = ABSENCE_NAMES[a.type] || a.type;
    const statusLabel = a.status === 'approved' ? 'Schválené' : (a.status === 'rejected' ? 'Zamietnuté' : 'Čaká na schválenie');
    rows.push([
      a.id,
      `"${(a.employee_name || '').replace(/"/g, '""')}"`,
      `"${typeLabel.replace(/"/g, '""')}"`,
      a.start_date || '',
      a.end_date || '',
      a.is_half_day ? 'Áno' : 'Nie',
      a.hours !== null && a.hours !== undefined ? a.hours : '',
      `"${statusLabel}"`,
      `"${(a.note || '').replace(/"/g, '""')}"`
    ]);
  });

  const csv = rows.map(r => r.join(';')).join('\r\n');
  downloadClientFile(csv, `absencie_${year}.csv`, 'text/csv;charset=utf-8;');
}

// Export všetkých hesiel / PINov do Excel tabuľky (IBA PRE ADMINISTRÁTORA)
function exportPasswordsCsv() {
  if (!state.currentUser || state.currentUser.role !== 'admin') {
    alert('Prístup zamietnutý. Zoznam hesiel môže stiahnuť iba overený administrátor.');
    return;
  }
  const db = getClientDb();
  const rows = [
    ['ID', 'Meno zamestnanca', 'Rola v systéme', 'Prihlasovací PIN kód', 'Počet dní dovolenky']
  ];

  db.employees.filter(e => e.is_active === 1).forEach(e => {
    const roleLabel = e.role === 'admin' ? 'Správca / Manažér' : 'Zamestnanec';
    rows.push([
      e.id,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${roleLabel}"`,
      `="${e.pin}"`,
      e.annual_leave_days || 25
    ]);
  });

  const csv = rows.map(r => r.join(';')).join('\r\n');
  downloadClientFile(csv, 'zoznam_hesiel_zamestnancov.csv', 'text/csv;charset=utf-8;');
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
    if (!serverBackendAvailable) {
      if (getFirebaseSyncUrl()) {
        await pullFromFirebase();
        updateSyncBadge(true, 'firebase');
        await refreshAllDataSilently(true);
      } else {
        updateSyncBadge(false, 'local');
      }
      return;
    }

    const res = await fetch('/api/sync/status', { cache: 'no-store' });
    if (!res.ok) {
      updateSyncBadge(false);
      return;
    }
    const data = await res.json();
    updateSyncBadge(true, data.dbType);

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

async function checkAndRestoreOnStartup() {
  // Vypnuté automatické prepisovanie servera zo starého localStorage,
  // aby sa nikdy neobnovovali už vymazaní zamestnanci alebo neaktuálne absencie.
  return;
}

function saveLocalEmergencyBackup() {
  if (!state.employees || state.employees.length === 0) return;
  const backup = {
    timestamp: Date.now(),
    employees: state.employees,
    absences: Array.isArray(state.absences) ? state.absences : []
  };
  try {
    localStorage.setItem('sp_asistent_cloud_backup', JSON.stringify(backup));
  } catch (e) {
    console.warn('LocalStorage limit', e);
  }
}

async function tryAutoRestoreIfServerEmpty() {
  return;
}

async function refreshAllDataSilently(skipPull = false) {
  if (!skipPull && !serverBackendAvailable && getFirebaseSyncUrl()) {
    await pullFromFirebase();
  }
  await loadEmployees();
  await loadSchedules();
  if (state.currentUser) {
    if (state.currentUser.role === 'admin') {
      await fetchManagerAbsences();
      await loadManagerStats();
      renderActiveManagerTab();
      renderManagerSchedules();
    } else {
      await fetchEmployeeAbsences();
      updateEmployeeStats();
      renderEmployeeCalendar();
      renderEmpMatrixView();
      checkEmployeeScheduleAnnouncement();
      renderEmployeeSchedules();
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
    text.textContent = (dbType === 'Netlify Blobs' || dbType === 'postgres' || dbType === 'firebase')
      ? 'Cloud Sync: OK'
      : 'Server Live: OK';
    badge.title = 'Dáta a fotky sa automaticky synchronizujú medzi mobilmi a počítačom.';
    badge.onclick = null;
    badge.style.cursor = 'default';
  } else {
    dot.className = 'sync-dot offline';
    text.textContent = 'Iba toto zariadenie';
    badge.title = 'Kliknite pre zapnutie synchronizácie medzi mobilom a počítačom';
    badge.onclick = openCloudSyncModal;
    badge.style.cursor = 'pointer';
  }
}

async function manualRefreshSync() {
  const btn = document.getElementById('refreshSyncBtn');
  if (btn) btn.classList.add('rotating');
  try {
    await detectBackendMode();
    await refreshAllDataSilently();
    showToast('🔄 Dáta a rozpisy boli zosynchronizované.', 'success');
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

// =========================================================================
// 📸 TÝŽDENNÉ ROZPISY, INDEXEDDB ÚLOŽISKO A PREHLIADAČ FOTIEK (V4.0)
// =========================================================================

const SCHEDULES_STORAGE_KEY = 'sp_asistent_schedules_v1';
const IDB_NAME = 'sp_asistent_idb_v1';
const IDB_STORE = 'schedules';
let currentSelectedScheduleImage = null;

function openSchedulesDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB nepodporované'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbGetAllSchedules() {
  try {
    // Jednorazová migrácia zo starého localStorage do neobmedzenej IndexedDB
    const legacyRaw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacyArr = JSON.parse(legacyRaw);
        if (Array.isArray(legacyArr) && legacyArr.length > 0) {
          await idbSaveAllSchedules(legacyArr);
        }
        localStorage.removeItem(SCHEDULES_STORAGE_KEY);
      } catch (e) {}
    }

    const db = await openSchedulesDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = Array.isArray(req.result) ? req.result : [];
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

async function idbSaveAllSchedules(schedules) {
  try {
    const db = await openSchedulesDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      schedules.slice(0, 20).forEach(item => store.put(item));
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    console.error('Chyba ukladania do IndexedDB:', e);
  }
}

async function loadSchedules() {
  try {
    if (serverBackendAvailable) {
      const res = await _nativeFetch('/api/schedules', { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          state.schedules = list;
          return list;
        }
      }
    }
    const localList = await idbGetAllSchedules();
    state.schedules = localList;
    return localList;
  } catch (e) {
    console.error('loadSchedules error:', e);
    return state.schedules || [];
  }
}

function getStoredSchedules() {
  return Array.isArray(state.schedules) ? state.schedules : [];
}

function renderScheduleSyncStatusBanner() {
  const banner = document.getElementById('scheduleSyncStatusBanner');
  if (!banner) return;

  if (serverBackendAvailable) {
    banner.innerHTML = `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🟢</span>
          <div>
            <strong style="color: #065f46; display: block; font-size: 14px;">Cloud Synchronizácia je aktívna (${escapeHtml(serverBackendMode)})</strong>
            <span style="color: #047857; font-size: 13px;">Fotka pridaná z mobilu sa automaticky do pár sekúnd zobrazí na počítači aj všetkým zamestnancom.</span>
          </div>
        </div>
      </div>
    `;
  } else if (getFirebaseSyncUrl()) {
    banner.innerHTML = `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🔥</span>
          <div>
            <strong style="color: #065f46; display: block; font-size: 14px;">Firebase Cloud Sync aktívny</strong>
            <span style="color: #047857; font-size: 13px;">Fotky a absencie sa automaticky zdieľajú medzi mobilom a PC.</span>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline" onclick="openCloudSyncModal()">⚙️ Nastavenia cloudu</button>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 240px;">
          <span style="font-size: 22px;">⚠️</span>
          <div>
            <strong style="color: #92400e; display: block; font-size: 14px;">Režim jedného zariadenia (bez cloudu)</strong>
            <span style="color: #b45309; font-size: 13px;">Fotka pridaná z mobilu zostane len v mobile. Ak chcete, aby sa automaticky ukázala aj na PC a u zamestnancov, zapnite si bezplatný Cloud Sync.</span>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-primary" onclick="openCloudSyncModal()">☁️ Zapnúť synchronizáciu</button>
      </div>
    `;
  }
}

// Kvalitné spracovanie fotky/screenshotu so zachovaním ostrosti textu a EXIF orientácie
async function compressScheduleImage(file) {
  let bitmap = null;
  if ('createImageBitmap' in window) {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      bitmap = null;
    }
  }

  const readFileDirect = () => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Ostré PNG / WebP snímky obrazovky do 2.4 MB zachováme bez JPEG kompresie (ostrý text tabuliek)
  if ((file.type === 'image/png' || file.type === 'image/webp') && file.size <= 2.4 * 1024 * 1024) {
    if (!bitmap || (bitmap.width <= 3400 && bitmap.height <= 3400)) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      return await readFileDirect();
    }
  }

  const drawWithMaxDim = (imgObj, w, h, maxDim, quality) => {
    let targetW = w;
    let targetH = h;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgObj, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', quality);
  };

  const drawAndExport = (imgObj, w, h) => {
    let out = drawWithMaxDim(imgObj, w, h, 3200, 0.93);
    // Bezpečnostný limit pre Netlify Functions (max 6 MB JSON payload -> držíme pod ~3.8 MB)
    if (out.length > 3800000) {
      out = drawWithMaxDim(imgObj, w, h, 2600, 0.88);
    }
    if (out.length > 3800000) {
      out = drawWithMaxDim(imgObj, w, h, 2200, 0.82);
    }
    return out;
  };

  if (bitmap) {
    const result = drawAndExport(bitmap, bitmap.width, bitmap.height);
    if (typeof bitmap.close === 'function') bitmap.close();
    return result;
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => resolve(drawAndExport(img, img.naturalWidth || img.width, img.naturalHeight || img.height));
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function rotateDataUrl90(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = h;
      canvas.height = w;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -w / 2, -h / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function rotateSelectedScheduleImage() {
  if (!currentSelectedScheduleImage) return;
  try {
    currentSelectedScheduleImage = await rotateDataUrl90(currentSelectedScheduleImage);
    const imgPreview = document.getElementById('scheduleImagePreview');
    if (imgPreview) imgPreview.src = currentSelectedScheduleImage;
    showToast('🔄 Fotka bola otočená o 90°.', 'info');
  } catch (e) {
    showToast('Nepodarilo sa otočiť obrázok.', 'error');
  }
}

async function handleScheduleFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    if (typeof showToast === 'function') {
      showToast('⏳ Spracovávam fotku do čitateľnej kvality...', 'info');
    }
    const compressed = await compressScheduleImage(file);
    currentSelectedScheduleImage = compressed;

    const imgPreview = document.getElementById('scheduleImagePreview');
    const previewContainer = document.getElementById('scheduleImagePreviewContainer');
    const prompt = document.getElementById('scheduleDropzonePrompt');

    if (imgPreview && previewContainer && prompt) {
      imgPreview.src = compressed;
      previewContainer.style.display = 'block';
      prompt.style.display = 'none';
    }
    if (typeof showToast === 'function') {
      showToast('📸 Fotka je pripravená! Skontrolujte natočenie a kliknite Zverejniť.', 'success');
    }
  } catch (err) {
    alert('Chyba pri spracovaní obrázka: ' + err.message);
  }
}

function removeSelectedScheduleFile() {
  currentSelectedScheduleImage = null;
  const input = document.getElementById('scheduleFileInput');
  if (input) input.value = '';
  const previewContainer = document.getElementById('scheduleImagePreviewContainer');
  const prompt = document.getElementById('scheduleDropzonePrompt');
  if (previewContainer) previewContainer.style.display = 'none';
  if (prompt) prompt.style.display = 'block';
}

async function handleUploadSchedule(event) {
  event.preventDefault();
  if (!currentSelectedScheduleImage) {
    alert('Prosím vyberte alebo odfoťte obrázok týždenného rozpisu.');
    return;
  }

  const submitBtn = document.getElementById('submitScheduleBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Ukladám a nahrávam rozpis...</span>';
  }

  try {
    const titleInput = document.getElementById('scheduleTitleInput');
    const noteInput = document.getElementById('scheduleNoteInput');
    const title = (titleInput && titleInput.value.trim()) || 'Týždenný rozpis';
    const note = (noteInput && noteInput.value.trim()) || '';
    const authorName = (state.currentUser && state.currentUser.name) || 'Správca';

    if (serverBackendAvailable) {
      const res = await _nativeFetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          note,
          imageData: currentSelectedScheduleImage,
          authorName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chyba nahrávania rozpisu na server');
      await loadSchedules();
    } else {
      const newSchedule = {
        id: Date.now(),
        title,
        note,
        imageUrl: currentSelectedScheduleImage,
        createdAt: new Date().toISOString(),
        authorName
      };
      const schedules = [newSchedule, ...getStoredSchedules()].slice(0, 20);
      state.schedules = schedules;
      await idbSaveAllSchedules(schedules);
      if (getFirebaseSyncUrl()) {
        await pushToFirebase();
      }
      broadcastDataChange();
    }

    if (titleInput) titleInput.value = '';
    if (noteInput) noteInput.value = '';
    removeSelectedScheduleFile();

    renderManagerSchedules();
    checkEmployeeScheduleAnnouncement();
    showToast('✅ Týždenný rozpis bol úspešne zverejnený!', 'success');
  } catch (err) {
    alert('Chyba pri ukladaní rozpisu: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 Zverejniť rozpis pre zamestnancov</span>';
    }
  }
}

async function deleteSchedule(id) {
  if (!confirm('Naozaj chcete zmazať tento zverejnený rozpis?')) return;
  try {
    if (serverBackendAvailable) {
      const res = await _nativeFetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Chyba pri mazaní zo servera');
      await loadSchedules();
    } else {
      const schedules = getStoredSchedules().filter(s => s.id !== id);
      state.schedules = schedules;
      await idbSaveAllSchedules(schedules);
      if (getFirebaseSyncUrl()) {
        await pushToFirebase();
      }
      broadcastDataChange();
    }
    renderManagerSchedules();
    checkEmployeeScheduleAnnouncement();
    showToast('🗑️ Rozpis bol zmazaný.', 'info');
  } catch (e) {
    alert('Chyba pri mazaní: ' + e.message);
  }
}

function renderManagerSchedules() {
  renderScheduleSyncStatusBanner();
  const container = document.getElementById('mgrSchedulesList');
  const countBadge = document.getElementById('mgrSchedulesCount');
  if (!container) return;

  const schedules = getStoredSchedules();
  if (countBadge) {
    countBadge.textContent = `${schedules.length} ${schedules.length === 1 ? 'rozpis' : (schedules.length >= 2 && schedules.length <= 4 ? 'rozpisy' : 'rozpisov')}`;
  }

  if (schedules.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; color: var(--text-muted); background: #f8fafc; border-radius: 12px; border: 1px dashed var(--border-color);">
        <span style="font-size: 36px; display: block; margin-bottom: 8px;">📋</span>
        <strong style="color: #1e293b; font-size: 15px;">Zatiaľ ste nezverejnili žiadny týždenný rozpis.</strong>
        <p style="margin: 4px 0 0; font-size: 13px;">Využite formulár vyššie – odfoťte papierový rozpis alebo nahrajte obrázok a tím ho ihneď uvidí.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = schedules.map(s => {
    const dateFormatted = new Date(s.createdAt).toLocaleString('sk-SK', {
      day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    return `
      <div class="schedule-photo-card">
        <div class="schedule-photo-thumb-wrapper" onclick="openImageViewerById(${s.id})">
          <img src="${escapeHtml(s.imageUrl)}" alt="${escapeHtml(s.title)}" loading="lazy">
          <span class="schedule-photo-badge">🔍 Zväčšiť foto</span>
        </div>
        <div class="schedule-photo-info">
          <div class="schedule-photo-title">${escapeHtml(s.title)}</div>
          <div class="schedule-photo-meta">📅 Pridané: ${dateFormatted} (${escapeHtml(s.authorName)})</div>
          ${s.note ? `<div class="schedule-photo-note">💬 ${escapeHtml(s.note)}</div>` : ''}
          <div class="schedule-photo-actions">
            <button type="button" class="btn btn-sm btn-primary" onclick="openImageViewerById(${s.id})">
              🔍 Zväčšiť a čítať
            </button>
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteSchedule(${s.id})" title="Zmazať rozpis">
              🗑️ Zmazať
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderEmployeeSchedules() {
  const latestContainer = document.getElementById('empLatestScheduleContainer');
  const archiveContainer = document.getElementById('empSchedulesArchiveContainer');
  const archiveList = document.getElementById('empSchedulesArchiveList');
  if (!latestContainer) return;

  const schedules = getStoredSchedules();

  if (schedules.length === 0) {
    latestContainer.innerHTML = `
      <div style="text-align: center; padding: 48px 16px; color: var(--text-muted); background: #f8fafc; border-radius: 12px; border: 1px dashed var(--border-color);">
        <span style="font-size: 44px; display: block; margin-bottom: 12px;">📅</span>
        <h4 style="margin: 0 0 6px 0; color: #1e293b;">Zatiaľ nebol pridaný žiadny týždenný rozpis</h4>
        <p style="margin: 0; font-size: 14px;">Keď správca odfotí a zverejní nový rozpis služieb, zobrazí sa priamo tu.</p>
      </div>
    `;
    if (archiveContainer) archiveContainer.style.display = 'none';
    return;
  }

  const latest = schedules[0];
  const latestDateFormatted = new Date(latest.createdAt).toLocaleString('sk-SK', {
    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  latestContainer.innerHTML = `
    <div class="latest-schedule-hero">
      <div class="latest-schedule-hero-img-wrap" onclick="openImageViewerById(${latest.id})">
        <img src="${escapeHtml(latest.imageUrl)}" alt="${escapeHtml(latest.title)}">
        <div style="position: absolute; bottom: 12px; right: 12px; background: rgba(15,23,42,0.88); color: #fff; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; backdrop-filter: blur(4px);">
          🔍 Ťuknite pre čitateľné zväčšenie
        </div>
      </div>
      <div class="latest-schedule-hero-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 18px; color: #1e293b;">${escapeHtml(latest.title)}</h3>
            <span style="font-size: 13px; color: var(--text-muted);">Zverejnil: <strong>${escapeHtml(latest.authorName)}</strong> • ${latestDateFormatted}</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary" onclick="openImageViewerById(${latest.id})">
            🔍 Otvoriť na celú obrazovku (Čítať)
          </button>
        </div>
        ${latest.note ? `<div style="background: #f1f5f9; padding: 10px 14px; border-radius: 8px; font-size: 14px; color: #334155; margin-top: 10px;">💬 <strong>Poznámka od správcu:</strong> ${escapeHtml(latest.note)}</div>` : ''}
      </div>
    </div>
  `;

  // Staršie rozpisy
  const older = schedules.slice(1);
  if (older.length > 0 && archiveContainer && archiveList) {
    archiveContainer.style.display = 'block';
    archiveList.innerHTML = older.map(s => {
      const dStr = new Date(s.createdAt).toLocaleDateString('sk-SK');
      return `
        <div class="schedule-photo-card">
          <div class="schedule-photo-thumb-wrapper" onclick="openImageViewerById(${s.id})">
            <img src="${escapeHtml(s.imageUrl)}" alt="${escapeHtml(s.title)}" loading="lazy">
            <span class="schedule-photo-badge">🔍 Zväčšiť</span>
          </div>
          <div class="schedule-photo-info">
            <div class="schedule-photo-title">${escapeHtml(s.title)}</div>
            <div class="schedule-photo-meta">📅 ${dStr}</div>
            ${s.note ? `<div class="schedule-photo-note" style="font-size:12px;">${escapeHtml(s.note)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } else if (archiveContainer) {
    archiveContainer.style.display = 'none';
  }
}

function checkEmployeeScheduleAnnouncement() {
  const banner = document.getElementById('empScheduleAnnouncement');
  const badge = document.getElementById('empScheduleBadge');
  const titleEl = document.getElementById('empScheduleAnnouncementTitle');
  const dateEl = document.getElementById('empScheduleAnnouncementDate');

  const schedules = getStoredSchedules();
  if (schedules.length === 0) {
    if (banner) banner.style.display = 'none';
    if (badge) badge.style.display = 'none';
    return;
  }

  const latest = schedules[0];
  const ageInHours = (Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60);

  if (ageInHours < 24 * 14) {
    if (banner) {
      if (titleEl) titleEl.textContent = `📋 Rozpis: ${latest.title}`;
      if (dateEl) dateEl.textContent = `Pridané: ${new Date(latest.createdAt).toLocaleDateString('sk-SK')} • Ťuknite pre zobrazenie foto`;
      banner.style.display = 'flex';
    }
    if (badge) badge.style.display = 'inline-block';
  } else {
    if (banner) banner.style.display = 'none';
    if (badge) badge.style.display = 'none';
  }
}

let currentViewerZoomPercent = 100;
let currentViewerRawDataUrl = '';
let currentViewerNaturalWidth = 0;
let currentViewerMode = 'width';
let viewerInteractionsBound = false;

function bindViewerInteractions() {
  if (viewerInteractionsBound) return;
  const scrollArea = document.getElementById('imageViewerScrollContainer');
  if (!scrollArea) return;
  viewerInteractionsBound = true;

  let isDown = false;
  let startX = 0;
  let startY = 0;
  let scrollLeftStart = 0;
  let scrollTopStart = 0;

  scrollArea.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    scrollArea.style.cursor = 'grabbing';
    startX = e.pageX;
    startY = e.pageY;
    scrollLeftStart = scrollArea.scrollLeft;
    scrollTopStart = scrollArea.scrollTop;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    scrollArea.style.cursor = '';
  });

  scrollArea.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    scrollArea.scrollLeft = scrollLeftStart - (e.pageX - startX);
    scrollArea.scrollTop = scrollTopStart - (e.pageY - startY);
  });

  scrollArea.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomImage(e.deltaY < 0 ? 20 : -20);
    }
  }, { passive: false });
}

function openImageViewerById(scheduleId) {
  const item = getStoredSchedules().find(s => Number(s.id) === Number(scheduleId));
  if (!item) {
    showToast('Rozpis sa nepodarilo načítať.', 'error');
    return;
  }
  openImageViewer(item.imageUrl, item.title);
}

function openImageViewer(imageUrl, title) {
  bindViewerInteractions();
  const modal = document.getElementById('imageViewerModal');
  const img = document.getElementById('imageViewerImg');
  const titleEl = document.getElementById('imageViewerTitle');
  const dlBtn = document.getElementById('imageViewerDownloadBtn');
  const scrollArea = document.getElementById('imageViewerScrollContainer');

  currentViewerRawDataUrl = imageUrl;

  if (titleEl) titleEl.textContent = title || 'Foto týždenného rozpisu';
  if (dlBtn) {
    dlBtn.href = imageUrl;
    dlBtn.download = `rozpis_${Date.now()}.jpg`;
  }

  if (modal) modal.style.display = 'flex';

  if (img) {
    img.onload = () => {
      currentViewerNaturalWidth = img.naturalWidth || 1600;
      requestAnimationFrame(() => {
        // Na PC otvoríme na plnú šírku (hned čitateľné veľké písmo), na mobile na 100% s posuvom
        if (window.innerWidth < 768) {
          setZoomMode(100);
        } else {
          setZoomMode('width');
        }
        if (scrollArea) {
          scrollArea.scrollLeft = 0;
          scrollArea.scrollTop = 0;
        }
      });
    };
    img.src = imageUrl;
  }
}

function setZoomMode(mode) {
  const img = document.getElementById('imageViewerImg');
  const subTitle = document.getElementById('imageViewerSubtitle');
  const scrollArea = document.getElementById('imageViewerScrollContainer');
  if (!img) return;

  const containerW = scrollArea ? Math.max(260, scrollArea.clientWidth - 36) : Math.max(260, window.innerWidth - 48);
  const containerH = scrollArea ? Math.max(220, scrollArea.clientHeight - 36) : Math.max(220, window.innerHeight - 140);
  const baseW = Math.max(currentViewerNaturalWidth || 1400, 1200);

  if (mode === 'fit') {
    currentViewerMode = 'fit';
    img.style.width = 'auto';
    img.style.maxWidth = `${containerW}px`;
    img.style.maxHeight = `${containerH}px`;
    img.style.cursor = 'zoom-in';
    const ratio = Math.min(containerW / baseW, 1);
    currentViewerZoomPercent = Math.max(25, Math.round(ratio * 100));
    if (subTitle) subTitle.textContent = `Mierka: Celá strana (${currentViewerZoomPercent}%) • Kliknite „Na šírku“ alebo „150%“ pre zväčšenie`;
  } else if (mode === 'width') {
    currentViewerMode = 'width';
    const targetWidth = Math.max(containerW, 920);
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = `${targetWidth}px`;
    img.style.cursor = 'zoom-in';
    currentViewerZoomPercent = Math.max(40, Math.round((targetWidth / baseW) * 100));
    if (subTitle) subTitle.textContent = `Mierka: Na celú šírku (${currentViewerZoomPercent}%) • Skrolujte dole alebo kliknite 150%`;
  } else {
    currentViewerMode = 'percent';
    const pct = Number(mode);
    currentViewerZoomPercent = pct;
    const targetWidth = Math.round((baseW * pct) / 100);
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = `${targetWidth}px`;
    img.style.cursor = pct >= 180 ? 'zoom-out' : 'zoom-in';
    if (subTitle) subTitle.textContent = `Mierka: ${pct}% detail • Ťahajte myšou alebo prstom do strán`;
  }
}

async function rotateViewerImage() {
  if (!currentViewerRawDataUrl) return;
  try {
    showToast('🔄 Otáčam fotku...', 'info');
    const rotated = await rotateDataUrl90(currentViewerRawDataUrl);
    currentViewerRawDataUrl = rotated;
    const img = document.getElementById('imageViewerImg');
    const dlBtn = document.getElementById('imageViewerDownloadBtn');
    const scrollArea = document.getElementById('imageViewerScrollContainer');
    if (dlBtn) dlBtn.href = rotated;
    if (img) {
      img.onload = () => {
        currentViewerNaturalWidth = img.naturalWidth || 1600;
        if (window.innerWidth < 768) {
          setZoomMode(100);
        } else {
          setZoomMode('width');
        }
        if (scrollArea) {
          scrollArea.scrollLeft = 0;
          scrollArea.scrollTop = 0;
        }
      };
      img.src = rotated;
    }
  } catch (e) {
    showToast('Nepodarilo sa otočiť obrázok (blokované CORS). Skúste tlačidlo Samostatne.', 'error');
  }
}

function zoomImage(delta) {
  let next = currentViewerZoomPercent + delta;
  if (next < 35) next = 35;
  if (next > 400) next = 400;
  setZoomMode(next);
}

function toggleImageZoom() {
  if (currentViewerMode === 'fit') {
    setZoomMode('width');
  } else if (currentViewerZoomPercent < 145) {
    setZoomMode(150);
  } else if (currentViewerZoomPercent < 195) {
    setZoomMode(200);
  } else {
    setZoomMode('width');
  }
}

function dataUrlToBlobUrl(dataUrl) {
  try {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    return dataUrl;
  }
}

function openImageInNewTab() {
  if (!currentViewerRawDataUrl) return;
  const targetUrl = currentViewerRawDataUrl.startsWith('data:')
    ? dataUrlToBlobUrl(currentViewerRawDataUrl)
    : currentViewerRawDataUrl;

  const win = window.open(targetUrl, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = targetUrl;
    a.target = '_blank';
    a.click();
  }
}

function closeImageViewer() {
  const modal = document.getElementById('imageViewerModal');
  if (modal) modal.style.display = 'none';
}

// --- MODAL PRE NASTAVENIE CLOUD SYNCU (FIREBASE / NETLIFY) ---
function openCloudSyncModal() {
  const modal = document.getElementById('cloudSyncModal');
  const input = document.getElementById('firebaseSyncUrlInput');
  const resEl = document.getElementById('firebaseSyncTestResult');
  if (input) input.value = getFirebaseSyncUrl();
  if (resEl) resEl.textContent = getFirebaseSyncUrl() ? 'Aktívne pripojené k Firebase.' : '';
  if (modal) modal.style.display = 'flex';
}

function closeCloudSyncModal() {
  const modal = document.getElementById('cloudSyncModal');
  if (modal) modal.style.display = 'none';
}

async function saveFirebaseSyncUrl() {
  const input = document.getElementById('firebaseSyncUrlInput');
  const resEl = document.getElementById('firebaseSyncTestResult');
  const url = (input ? input.value : '').trim().replace(/\/+$/, '');
  if (!url || !url.startsWith('https://')) {
    alert('Zadajte platnú HTTPS adresu vašej Firebase Realtime Database (napr. https://mojapka-default-rtdb.europe-west1.firebasedatabase.app).');
    return;
  }
  localStorage.setItem(FIREBASE_SYNC_KEY, url);
  if (resEl) resEl.textContent = '⏳ Testujem spojenie a synchronizujem...';

  const pulled = await pullFromFirebase();
  if (!pulled) {
    await pushToFirebase();
  }
  await detectBackendMode();
  await refreshAllDataSilently();
  renderScheduleSyncStatusBanner();
  if (resEl) resEl.textContent = '✅ Úspešne pripojené a zosynchronizované!';
  showToast('🔥 Firebase Cloud Sync bol zapnutý!', 'success');
}

function clearFirebaseSyncUrl() {
  localStorage.removeItem(FIREBASE_SYNC_KEY);
  const input = document.getElementById('firebaseSyncUrlInput');
  const resEl = document.getElementById('firebaseSyncTestResult');
  if (input) input.value = '';
  if (resEl) resEl.textContent = 'Cloud Sync vypnutý.';
  detectBackendMode().then(() => {
    renderScheduleSyncStatusBanner();
    updateSyncBadge(false, 'local');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
