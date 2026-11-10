const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- DATABÁZA ---
const db = new DatabaseSync(DB_FILE);

// Vytvorenie tabuliek
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    pin TEXT NOT NULL DEFAULT '1234',
    annual_leave_days INTEGER DEFAULT 25,
    color TEXT DEFAULT '#3b82f6',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_half_day INTEGER DEFAULT 0,
    hours REAL DEFAULT 0,
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'approved',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Predvolené nastavenia a administrátor
const adminCheck = db.prepare("SELECT COUNT(*) as count FROM employees WHERE role = 'admin'").get();
if (adminCheck.count === 0) {
  const insertEmp = db.prepare(`
    INSERT INTO employees (name, role, pin, annual_leave_days, color) 
    VALUES (?, ?, ?, ?, ?)
  `);
  // Predvolený vedúci / manažér
  insertEmp.run('Správca / Manažér', 'admin', '0000', 25, '#8b5cf6');
  // Predvolení ukážkoví zamestnanci
  insertEmp.run('Ján Novák', 'employee', '1111', 25, '#3b82f6');
  insertEmp.run('Mária Kováčová', 'employee', '2222', 25, '#10b981');
  insertEmp.run('Peter Horváth', 'employee', '3333', 25, '#f59e0b');
  console.log('Inicializovaní predvolení zamestnanci.');
}

// --- VÝPOČET SLOVENSKÝCH ŠTÁTNYCH SVIATKOV ---
function calculateEaster(year) {
  // Anonymný algoritmus pre gregoriánsky kalendár (Meeus/Jones/Butcher)
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Marec, 4 = Apríl
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getSlovakHolidays(year) {
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

  // Veľkonočné sviatky
  const easterSunday = calculateEaster(year);
  
  // Veľký piatok (Veľká noc - 2 dni)
  const goodFriday = new Date(easterSunday);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  const gfStr = goodFriday.toISOString().split('T')[0];
  holidays.push({ date: gfStr, name: 'Veľký piatok' });

  // Veľkonočný pondelok (Veľká noc + 1 deň)
  const easterMonday = new Date(easterSunday);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  const emStr = easterMonday.toISOString().split('T')[0];
  holidays.push({ date: emStr, name: 'Veľkonočný pondelok' });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Výpočet pracovných dní medzi dátumami
function calculateWorkingDays(startDateStr, endDateStr, isHalfDay, hours) {
  if (isHalfDay) return 0.5;
  if (hours && hours > 0) return hours / 8; // Prepočet na ekvivalent dní

  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  if (isNaN(start) || isNaN(end) || start > end) return 0;

  const currentYear = start.getUTCFullYear();
  const holidaysMap = new Set();
  getSlovakHolidays(currentYear).forEach(h => holidaysMap.add(h.date));
  if (end.getUTCFullYear() !== currentYear) {
    getSlovakHolidays(end.getUTCFullYear()).forEach(h => holidaysMap.add(h.date));
  }

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getUTCDay(); // 0 = Nedeľa, 6 = Sobota
    const dateStr = curr.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysMap.has(dateStr)) {
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return count;
}

// MIME typy
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

// Pomocník pre parsovanie JSON tela
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Pomocník pre overenie práv administrátora
function isAdminRequest(req, parsedUrl) {
  const pin = req.headers['x-admin-pin'] || (parsedUrl && parsedUrl.query && parsedUrl.query.admin_pin);
  if (!pin) return false;
  const admin = db.prepare("SELECT * FROM employees WHERE role = 'admin' AND pin = ?").get(String(pin));
  return !!admin;
}

// Odpoveď JSON
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// --- HTTP SERVER ---
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- API ROUTY ---

  // 1. Prihlásenie (zamestnanec alebo manažér)
  if (pathname === '/api/login' && method === 'POST') {
    try {
      const { employeeId, pin } = await parseJsonBody(req);
      if (!pin) {
        return sendJson(res, 400, { error: 'Zadajte PIN kód' });
      }

      let employee;
      if (employeeId === 'admin' || !employeeId) {
        // Kontrola manažérskeho PINu
        employee = db.prepare("SELECT * FROM employees WHERE role = 'admin' AND pin = ?").get(pin);
      } else {
        employee = db.prepare("SELECT * FROM employees WHERE id = ? AND pin = ? AND is_active = 1").get(Number(employeeId), pin);
      }

      if (!employee) {
        return sendJson(res, 401, { error: 'Nesprávny PIN kód alebo zamestnanec nebol nájdený.' });
      }

      // Bezpečný objekt bez PINu do odpovede
      return sendJson(res, 200, {
        success: true,
        user: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          annual_leave_days: employee.annual_leave_days,
          color: employee.color
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 2. Zoznam zamestnancov (BEZPEČNÉ: heslá/PINy vidí IBA administrátor!)
  if (pathname === '/api/employees' && method === 'GET') {
    try {
      const isAdmin = isAdminRequest(req, parsedUrl);
      const employees = db.prepare("SELECT id, name, role, pin, annual_leave_days, color, is_active FROM employees WHERE is_active = 1 ORDER BY role DESC, name ASC").all();

      // Ak požiadavka nie je od overeného administrátora, heslo/PIN sa NIKDY neodošle!
      const safeEmployees = employees.map(emp => {
        if (!isAdmin) {
          const { pin, ...safeData } = emp;
          return safeData;
        }
        return emp;
      });

      return sendJson(res, 200, safeEmployees);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 3. Pridanie zamestnanca (iba manažér / administrátor)
  if (pathname === '/api/employees' && method === 'POST') {
    try {
      if (!isAdminRequest(req, parsedUrl)) {
        return sendJson(res, 403, { error: 'Iba administrátor môže pridávať zamestnancov.' });
      }

      const data = await parseJsonBody(req);
      if (!data.name || !data.name.trim()) {
        return sendJson(res, 400, { error: 'Meno zamestnanca je povinné.' });
      }

      const pin = data.pin && data.pin.trim() ? data.pin.trim() : Math.floor(1000 + Math.random() * 9000).toString();
      const role = data.role === 'admin' ? 'admin' : 'employee';
      const days = Number(data.annual_leave_days) || 25;
      const color = data.color || '#3b82f6';

      const stmt = db.prepare(`
        INSERT INTO employees (name, role, pin, annual_leave_days, color)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(data.name.trim(), role, pin, days, color);
      
      return sendJson(res, 201, {
        success: true,
        id: result.lastInsertRowid,
        name: data.name.trim(),
        pin,
        role,
        annual_leave_days: days,
        color
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 4. Úprava zamestnanca (iba administrátor)
  if (pathname.startsWith('/api/employees/') && method === 'PUT') {
    try {
      if (!isAdminRequest(req, parsedUrl)) {
        return sendJson(res, 403, { error: 'Iba administrátor môže upravovať zamestnancov.' });
      }

      const id = Number(pathname.split('/')[3]);
      const data = await parseJsonBody(req);
      
      const stmt = db.prepare(`
        UPDATE employees 
        SET name = COALESCE(?, name),
            role = COALESCE(?, role),
            pin = COALESCE(?, pin),
            annual_leave_days = COALESCE(?, annual_leave_days),
            color = COALESCE(?, color)
        WHERE id = ?
      `);
      stmt.run(data.name, data.role, data.pin, data.annual_leave_days, data.color, id);
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 5. Odobratie / zmazanie zamestnanca (iba administrátor)
  if (pathname.startsWith('/api/employees/') && method === 'DELETE') {
    try {
      if (!isAdminRequest(req, parsedUrl)) {
        return sendJson(res, 403, { error: 'Iba administrátor môže odoberať zamestnancov.' });
      }

      const id = Number(pathname.split('/')[3]);
      const isPermanent = parsedUrl.query.permanent === 'true';

      if (isPermanent) {
        // Trvalé vymazanie zamestnanca a jeho absencií
        db.prepare("DELETE FROM absences WHERE employee_id = ?").run(id);
        db.prepare("DELETE FROM employees WHERE id = ?").run(id);
      } else {
        // Bezpečná deaktivácia (história dochádzky zostane zachovaná)
        db.prepare("UPDATE employees SET is_active = 0 WHERE id = ?").run(id);
      }

      return sendJson(res, 200, { success: true, permanent: isPermanent });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 6. Zoznam absencií (filtre: year, month, employee_id)
  if (pathname === '/api/absences' && method === 'GET') {
    try {
      const year = parsedUrl.query.year;
      const month = parsedUrl.query.month;
      const empId = parsedUrl.query.employee_id;

      let sql = `
        SELECT a.*, e.name as employee_name, e.color as employee_color
        FROM absences a
        JOIN employees e ON a.employee_id = e.id
        WHERE e.is_active = 1
      `;
      const params = [];

      if (empId) {
        sql += ` AND a.employee_id = ?`;
        params.push(Number(empId));
      }

      if (year && month) {
        const ym = `${year}-${String(month).padStart(2, '0')}`;
        sql += ` AND (
          (substr(a.start_date, 1, 7) <= ? AND substr(a.end_date, 1, 7) >= ?)
        )`;
        params.push(ym, ym);
      } else if (year) {
        sql += ` AND (
          substr(a.start_date, 1, 4) = ? OR substr(a.end_date, 1, 4) = ?
        )`;
        params.push(String(year), String(year));
      }

      sql += ` ORDER BY a.start_date ASC, a.id ASC`;
      const absences = db.prepare(sql).all(...params);

      // Doplníme počet pracovných dní
      const enriched = absences.map(a => ({
        ...a,
        working_days: calculateWorkingDays(a.start_date, a.end_date, a.is_half_day === 1, a.hours)
      }));

      return sendJson(res, 200, enriched);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 7. Pridanie novej absencie
  if (pathname === '/api/absences' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { employee_id, type, start_date, end_date, is_half_day, hours, note, status } = data;

      if (!employee_id || !type || !start_date) {
        return sendJson(res, 400, { error: 'Vyplňte povinné polia (zamestnanec, typ, začiatok).' });
      }

      const finalEndDate = end_date || start_date;
      const finalStatus = status || 'approved'; // Predvolene schválené, resp. podľa voľby
      const isHalf = is_half_day ? 1 : 0;
      const totalHours = Number(hours) || 0;

      const stmt = db.prepare(`
        INSERT INTO absences (employee_id, type, start_date, end_date, is_half_day, hours, note, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(Number(employee_id), type, start_date, finalEndDate, isHalf, totalHours, note || '', finalStatus);

      return sendJson(res, 201, {
        success: true,
        id: result.lastInsertRowid,
        working_days: calculateWorkingDays(start_date, finalEndDate, isHalf === 1, totalHours)
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 8. Úprava absencie (napr. zmena stavu schválenia, dátumov)
  if (pathname.startsWith('/api/absences/') && method === 'PUT') {
    try {
      const id = Number(pathname.split('/')[3]);
      const data = await parseJsonBody(req);

      const stmt = db.prepare(`
        UPDATE absences
        SET type = COALESCE(?, type),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            is_half_day = COALESCE(?, is_half_day),
            hours = COALESCE(?, hours),
            note = COALESCE(?, note),
            status = COALESCE(?, status)
        WHERE id = ?
      `);
      stmt.run(data.type, data.start_date, data.end_date, data.is_half_day, data.hours, data.note, data.status, id);
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 9. Zmazanie absencie
  if (pathname.startsWith('/api/absences/') && method === 'DELETE') {
    try {
      const id = Number(pathname.split('/')[3]);
      db.prepare("DELETE FROM absences WHERE id = ?").run(id);
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 10. Slovenské štátne sviatky
  if (pathname === '/api/holidays' && method === 'GET') {
    const year = Number(parsedUrl.query.year) || new Date().getFullYear();
    return sendJson(res, 200, getSlovakHolidays(year));
  }

  // 11. Súhrnné štatistiky a zostatky (dovolenka, PN, OČR, lekár, náhradné voľno)
  if (pathname === '/api/stats' && method === 'GET') {
    try {
      const year = Number(parsedUrl.query.year) || new Date().getFullYear();
      const employees = db.prepare("SELECT id, name, role, annual_leave_days, color FROM employees WHERE is_active = 1 ORDER BY name ASC").all();

      const stats = employees.map(emp => {
        // Získame všetky absencie pre daného zamestnanca v roku
        const absences = db.prepare(`
          SELECT * FROM absences 
          WHERE employee_id = ? 
            AND (substr(start_date, 1, 4) = ? OR substr(end_date, 1, 4) = ?)
            AND status != 'rejected'
        `).all(emp.id, String(year), String(year));

        let usedVacationDays = 0;
        let pnDays = 0;
        let ocrDays = 0;
        let doctorDays = 0;
        let doctorHours = 0;
        let compensatoryLeaveDays = 0;
        let otherDays = 0;

        absences.forEach(a => {
          const days = calculateWorkingDays(a.start_date, a.end_date, a.is_half_day === 1, a.hours);
          switch (a.type) {
            case 'dovolenka':
              usedVacationDays += days;
              break;
            case 'pn':
              pnDays += days;
              break;
            case 'ocr':
              ocrDays += days;
              break;
            case 'lekar':
              doctorDays += days;
              if (a.hours) doctorHours += Number(a.hours);
              break;
            case 'nahradne_volno':
              compensatoryLeaveDays += days;
              break;
            default:
              otherDays += days;
              break;
          }
        });

        const remainingVacation = emp.annual_leave_days - usedVacationDays;

        return {
          employee_id: emp.id,
          name: emp.name,
          role: emp.role,
          color: emp.color,
          annual_leave_days: emp.annual_leave_days,
          used_vacation_days: usedVacationDays,
          remaining_vacation_days: remainingVacation,
          pn_days: pnDays,
          ocr_days: ocrDays,
          doctor_days: doctorDays,
          doctor_hours: doctorHours,
          compensatory_leave_days: compensatoryLeaveDays,
          other_days: otherDays,
          total_absences_count: absences.length
        };
      });

      return sendJson(res, 200, { year, stats });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 12. Export do CSV (s diakritikou a UTF-8 BOM pre MS Excel)
  if (pathname === '/api/export' && method === 'GET') {
    try {
      const year = Number(parsedUrl.query.year) || new Date().getFullYear();
      const month = parsedUrl.query.month;

      let sql = `
        SELECT a.*, e.name as employee_name
        FROM absences a
        JOIN employees e ON a.employee_id = e.id
        WHERE e.is_active = 1
      `;
      const params = [];

      if (month) {
        const ym = `${year}-${String(month).padStart(2, '0')}`;
        sql += ` AND (substr(a.start_date, 1, 7) <= ? AND substr(a.end_date, 1, 7) >= ?)`;
        params.push(ym, ym);
      } else {
        sql += ` AND (substr(a.start_date, 1, 4) = ? OR substr(a.end_date, 1, 4) = ?)`;
        params.push(String(year), String(year));
      }

      sql += ` ORDER BY a.start_date ASC, e.name ASC`;
      const rows = db.prepare(sql).all(...params);

      const typeLabels = {
        'dovolenka': 'Dovolenka',
        'pn': 'PN (Práceneschopnosť)',
        'ocr': 'OČR',
        'lekar': 'Lekár / Prehliadka',
        'nahradne_volno': 'Náhradné voľno',
        'ine': 'Iné'
      };

      let csv = '\uFEFF'; // UTF-8 BOM pre Excel
      csv += 'Zamestnanec;Typ absencie;Od;Do;Počet pracovných dní;Hodiny;Poldňa;Stav;Poznámka\r\n';

      rows.forEach(r => {
        const wDays = calculateWorkingDays(r.start_date, r.end_date, r.is_half_day === 1, r.hours);
        const typ = typeLabels[r.type] || r.type;
        const pol = r.is_half_day ? 'Áno' : 'Nie';
        const poznamka = (r.note || '').replace(/;/g, ',').replace(/\r?\n/g, ' ');
        csv += `"${r.employee_name}";"${typ}";"${r.start_date}";"${r.end_date}";"${wDays.toFixed(1)}";"${r.hours || 0}";"${pol}";"${r.status}";"${poznamka}"\r\n`;
      });

      const filename = month 
        ? `absencie_${year}_${String(month).padStart(2, '0')}.csv` 
        : `absencie_${year}.csv`;

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      return res.end(csv);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 13. Zmena PINu / hesla (pre zamestnanca aj manažéra)
  if (pathname === '/api/change-pin' && method === 'POST') {
    try {
      const { employeeId, oldPin, newPin, isAdminChange } = await parseJsonBody(req);
      if (!employeeId || !newPin || !newPin.trim()) {
        return sendJson(res, 400, { error: 'Vyplňte nové heslo / PIN.' });
      }

      const emp = db.prepare("SELECT * FROM employees WHERE id = ? AND is_active = 1").get(Number(employeeId));
      if (!emp) {
        return sendJson(res, 404, { error: 'Používateľ nebol nájdený.' });
      }

      // Ak to nie je manažérska priama zmena, vyžadujeme overenie starého PINu
      if (!isAdminChange) {
        if (!oldPin || emp.pin !== oldPin.trim()) {
          return sendJson(res, 400, { error: 'Pôvodné heslo / PIN nie je správne.' });
        }
      }

      db.prepare("UPDATE employees SET pin = ? WHERE id = ?").run(newPin.trim(), Number(employeeId));
      return sendJson(res, 200, { success: true, message: 'Heslo bolo úspešne zmenené.' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 14. Export všetkých hesiel / PINov do Excel tabuľky (CSV) - LEN PRE ADMINISTRÁTORA
  if (pathname === '/api/export-passwords' && method === 'GET') {
    try {
      if (!isAdminRequest(req, parsedUrl)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Prístup zamietnutý. Zoznam hesiel môže stiahnuť iba overený administrátor.');
      }

      const rows = db.prepare(`
        SELECT name, role, pin, annual_leave_days 
        FROM employees 
        WHERE is_active = 1 
        ORDER BY role DESC, name ASC
      `).all();

      let csv = '\uFEFF'; // UTF-8 BOM pre Excel
      csv += 'Meno a priezvisko;Rola v systéme;Prihlasovacie heslo / PIN;Ročný nárok na dovolenku (dní);Stav účtu\r\n';

      rows.forEach(r => {
        const rola = r.role === 'admin' ? 'Správca / Manažér' : 'Zamestnanec';
        csv += `"${r.name}";"${rola}";"${r.pin}";"${r.annual_leave_days}";"Aktívny"\r\n`;
      });

      const today = new Date().toISOString().split('T')[0];
      const filename = `zoznam_hesiel_zamestnancov_${today}.csv`;

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      return res.end(csv);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- STATICKÉ SÚBORY (Frontend PWA) ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Zabezpečenie proti directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Prístup odmietnutý');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback pre SPA na index.html ak súbor neexistuje
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Súbor nebol nájdený');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(content);
    });
  });
});

// Získanie sieťových IP adries počítača
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log('\n' + '='.repeat(60));
  console.log('   🚀 SP ASISTENT - EVIDENCIA ABSENCIÍ & KALENDÁR');
  console.log('='.repeat(60));
  console.log(`\n💻 Pre vás na tomto počítači:`);
  console.log(`   http://localhost:${PORT}`);
  
  if (ips.length > 0) {
    console.log(`\n📱 Pre zamestnancov v mobile (rovnaká Wi-Fi / sieť):`);
    ips.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}`);
    });
  }
  console.log('\n' + '-'.repeat(60));
  console.log('💡 TIP: Pre inštaláciu do mobilu otvorte odkaz v mobile a zvoľte');
  console.log('   „Pridať na plochu“ (Add to Home screen)');
  console.log('='.repeat(60) + '\n');
});
