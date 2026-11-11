const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const os = require('node:os');

const PORT = process.env.PORT || 3000;
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const DB_FILE = isServerless ? path.join('/tmp', 'data.db') : path.join(__dirname, 'data.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- DATABÁZOVÝ ADAPTÉR (POSTGRESQL & SQLITE) ---
let dbType = 'sqlite';
let pgPool = null;
let sqliteDb = null;
let dataVersion = Date.now();

// Záložná in-memory pamäť ak nie je dostupný Postgres ani SQLite
let memEmployees = [
  { id: 1, name: 'Správca / Manažér', role: 'admin', pin: '0000', annual_leave_days: 25, color: '#8b5cf6', is_active: 1 },
  { id: 2, name: 'Ján Novák', role: 'employee', pin: '1111', annual_leave_days: 25, color: '#3b82f6', is_active: 1 },
  { id: 3, name: 'Mária Kováčová', role: 'employee', pin: '2222', annual_leave_days: 25, color: '#10b981', is_active: 1 },
  { id: 4, name: 'Peter Horváth', role: 'employee', pin: '3333', annual_leave_days: 25, color: '#f59e0b', is_active: 1 }
];
let memAbsences = [];
let nextEmpId = 5;
let nextAbsId = 1;

function toPgSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
  async query(sql, params = []) {
    if (dbType === 'postgres') {
      const pgSql = toPgSql(sql);
      const res = await pgPool.query(pgSql, params);
      return res.rows;
    } else if (dbType === 'sqlite' && sqliteDb) {
      return sqliteDb.prepare(sql).all(...params);
    } else {
      return [];
    }
  },

  async all(sql, params = []) {
    return this.query(sql, params);
  },

  async get(sql, params = []) {
    if (dbType === 'postgres') {
      const pgSql = toPgSql(sql);
      const res = await pgPool.query(pgSql, params);
      return res.rows[0] || null;
    } else if (dbType === 'sqlite' && sqliteDb) {
      return sqliteDb.prepare(sql).get(...params) || null;
    } else {
      return null;
    }
  },

  async run(sql, params = []) {
    if (dbType === 'postgres') {
      let isInsert = /^\s*INSERT\s+INTO/i.test(sql);
      let runSql = sql;
      if (isInsert && !/RETURNING/i.test(runSql)) {
        runSql += ' RETURNING id';
      }
      const pgSql = toPgSql(runSql);
      const res = await pgPool.query(pgSql, params);
      const lastId = isInsert && res.rows[0] ? res.rows[0].id : null;
      return { lastInsertRowid: lastId, rowCount: res.rowCount };
    } else if (dbType === 'sqlite' && sqliteDb) {
      const res = sqliteDb.prepare(sql).run(...params);
      return { lastInsertRowid: res.lastInsertRowid, changes: res.changes };
    } else {
      return { lastInsertRowid: Date.now(), changes: 1 };
    }
  },

  async exec(sql) {
    if (dbType === 'postgres') {
      await pgPool.query(sql);
    } else if (dbType === 'sqlite' && sqliteDb) {
      sqliteDb.exec(sql);
    }
  }
};

let initDbPromise = null;
function getDbInit() {
  if (!initDbPromise) {
    initDbPromise = initDatabase().catch(err => {
      console.warn('initDatabase fallback zachytený:', err.message);
    });
  }
  return initDbPromise;
}

async function initDatabase() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (dbUrl) {
    try {
      const { Pool } = require('pg');
      try {
        pgPool = new Pool({
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false }
        });
        await pgPool.query('SELECT 1');
        dbType = 'postgres';
        console.log('✅ Pripojené k PostgreSQL databáze cez POSTGRES_URL / DATABASE_URL (SSL).');
      } catch (sslErr) {
        pgPool = new Pool({
          connectionString: dbUrl,
          ssl: false
        });
        await pgPool.query('SELECT 1');
        dbType = 'postgres';
        console.log('✅ Pripojené k PostgreSQL databáze (bez SSL).');
      }
    } catch (err) {
      console.error('⚠️ Chyba pripojenia k PostgreSQL databáze, prepínam na SQLite:', err.message);
      dbType = 'sqlite';
    }
  }

  if (dbType === 'sqlite') {
    try {
      const { DatabaseSync } = require('node:sqlite');
      sqliteDb = new DatabaseSync(DB_FILE);
      console.log(`✅ Používa sa SQLite databáza (${DB_FILE}).`);
    } catch (err) {
      console.warn('⚠️ SQLite nie je dostupné na tomto prostredí, beží núdzový režim:', err.message);
      dbType = 'memory';
    }
  }

  // Vytvorenie tabuliek
  if (dbType === 'postgres') {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        pin TEXT NOT NULL DEFAULT '1234',
        annual_leave_days INTEGER DEFAULT 25,
        color TEXT DEFAULT '#3b82f6',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS absences (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_half_day INTEGER DEFAULT 0,
        hours REAL DEFAULT 0,
        note TEXT DEFAULT '',
        status TEXT DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } else {
    await db.exec(`
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
  }

  // Kontrola administrátora a predvolených dát
  const adminCheck = await db.get("SELECT COUNT(*) as count FROM employees WHERE role = 'admin'");
  const adminCount = adminCheck ? Number(adminCheck.count) : 0;
  if (adminCount === 0) {
    await db.run(
      "INSERT INTO employees (name, role, pin, annual_leave_days, color) VALUES (?, ?, ?, ?, ?)",
      ['Správca / Manažér', 'admin', '0000', 25, '#8b5cf6']
    );
    await db.run(
      "INSERT INTO employees (name, role, pin, annual_leave_days, color) VALUES (?, ?, ?, ?, ?)",
      ['Ján Novák', 'employee', '1111', 25, '#3b82f6']
    );
    await db.run(
      "INSERT INTO employees (name, role, pin, annual_leave_days, color) VALUES (?, ?, ?, ?, ?)",
      ['Mária Kováčová', 'employee', '2222', 25, '#10b981']
    );
    await db.run(
      "INSERT INTO employees (name, role, pin, annual_leave_days, color) VALUES (?, ?, ?, ?, ?)",
      ['Peter Horváth', 'employee', '3333', 25, '#f59e0b']
    );
    console.log('✅ Inicializovaní predvolení zamestnanci.');
  }
}

function notifyDataChanged() {
  dataVersion = Date.now();
}

// --- VÝPOČET SLOVENSKÝCH ŠTÁTNYCH SVIATKOV ---
function calculateEaster(year) {
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

  const easterSunday = calculateEaster(year);
  
  const goodFriday = new Date(easterSunday);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  holidays.push({ date: goodFriday.toISOString().split('T')[0], name: 'Veľký piatok' });

  const easterMonday = new Date(easterSunday);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  holidays.push({ date: easterMonday.toISOString().split('T')[0], name: 'Veľkonočný pondelok' });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

function calculateWorkingDays(startDateStr, endDateStr, isHalfDay, hours) {
  if (isHalfDay) return 0.5;
  if (hours && hours > 0) return hours / 8;

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
    const dayOfWeek = curr.getUTCDay();
    const dateStr = curr.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysMap.has(dateStr)) {
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return count;
}

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

function parseJsonBody(req) {
  if (req.body) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    try { return Promise.resolve(JSON.parse(req.body)); } catch (e) {}
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e7) {
        if (req.socket) req.socket.destroy();
        reject(new Error('Payload príliš veľký'));
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

async function isAdminRequest(req, parsedUrl) {
  const pin = req.headers['x-admin-pin'] || (parsedUrl && parsedUrl.query && parsedUrl.query.admin_pin);
  if (!pin) return false;
  const admin = await db.get("SELECT * FROM employees WHERE role = 'admin' AND pin = ?", [String(pin)]);
  return !!admin;
}

function sendJson(res, statusCode, data) {
  const jsonStr = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (res.status && typeof res.status === 'function') {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }
  res.end(jsonStr);
}

// --- HLAVNÝ REQUEST HANDLER (pre serverless aj lokálny server) ---
async function handleRequest(req, res) {
  await getDbInit();

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin');
    res.statusCode = 204;
    return res.end();
  }

  // --- API ROUTY ---

  // 0. Synchronizácia & Živý stav
  if (pathname === '/api/sync/status' && method === 'GET') {
    try {
      const absencesRow = await db.get("SELECT COUNT(*) as count FROM absences");
      const empRow = await db.get("SELECT COUNT(*) as count FROM employees WHERE is_active = 1");
      return sendJson(res, 200, {
        success: true,
        version: dataVersion,
        dbType,
        absencesCount: absencesRow ? Number(absencesRow.count) : 0,
        employeesCount: empRow ? Number(empRow.count) : 0,
        timestamp: Date.now()
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 0b. Export kompletnej zálohy (JSON)
  if (pathname === '/api/backup/export' && method === 'GET') {
    try {
      const employees = await db.all("SELECT * FROM employees ORDER BY id ASC");
      const absences = await db.all("SELECT * FROM absences ORDER BY start_date ASC, id ASC");
      return sendJson(res, 200, {
        exportedAt: new Date().toISOString(),
        version: dataVersion,
        employees,
        absences
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 0c. Obnova kompletnej zálohy (JSON restore)
  if (pathname === '/api/backup/restore' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const employees = body.employees || [];
      const absences = body.absences || [];

      let restoredEmployees = 0;
      let restoredAbsences = 0;

      // 1. Obnova zamestnancov
      const empIdMap = new Map();
      for (const emp of employees) {
        if (!emp.name) continue;
        const existing = await db.get("SELECT * FROM employees WHERE name = ?", [emp.name]);
        if (existing) {
          empIdMap.set(emp.id, existing.id);
          await db.run(
            "UPDATE employees SET role = ?, pin = ?, annual_leave_days = ?, color = ?, is_active = ? WHERE id = ?",
            [emp.role || existing.role, emp.pin || existing.pin, emp.annual_leave_days || existing.annual_leave_days, emp.color || existing.color, emp.is_active !== undefined ? emp.is_active : 1, existing.id]
          );
        } else {
          const result = await db.run(
            "INSERT INTO employees (name, role, pin, annual_leave_days, color, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            [emp.name, emp.role || 'employee', emp.pin || '1234', emp.annual_leave_days || 25, emp.color || '#3b82f6', emp.is_active !== undefined ? emp.is_active : 1]
          );
          empIdMap.set(emp.id, result.lastInsertRowid);
          restoredEmployees++;
        }
      }

      // 2. Obnova absencií
      for (const abs of absences) {
        let targetEmpId = empIdMap.get(abs.employee_id);
        if (!targetEmpId && abs.employee_name) {
          const matchByName = await db.get("SELECT id FROM employees WHERE name = ?", [abs.employee_name]);
          if (matchByName) targetEmpId = matchByName.id;
        }
        if (!targetEmpId) targetEmpId = abs.employee_id;
        if (!targetEmpId || !abs.type || !abs.start_date) continue;

        const exists = await db.get(
          "SELECT id FROM absences WHERE employee_id = ? AND type = ? AND start_date = ? AND end_date = ?",
          [targetEmpId, abs.type, abs.start_date, abs.end_date || abs.start_date]
        );

        if (!exists) {
          await db.run(
            "INSERT INTO absences (employee_id, type, start_date, end_date, is_half_day, hours, note, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [targetEmpId, abs.type, abs.start_date, abs.end_date || abs.start_date, abs.is_half_day ? 1 : 0, Number(abs.hours) || 0, abs.note || '', abs.status || 'approved']
          );
          restoredAbsences++;
        }
      }

      notifyDataChanged();
      return sendJson(res, 200, {
        success: true,
        message: 'Dáta boli úspešne obnovené.',
        restoredEmployees,
        restoredAbsences,
        version: dataVersion
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 1. Prihlásenie
  if (pathname === '/api/login' && method === 'POST') {
    try {
      const { employeeId, pin } = await parseJsonBody(req);
      if (!pin) {
        return sendJson(res, 400, { error: 'Zadajte PIN kód' });
      }

      let employee;
      if (employeeId === 'admin' || !employeeId) {
        employee = await db.get("SELECT * FROM employees WHERE role = 'admin' AND pin = ?", [String(pin)]);
      } else {
        employee = await db.get("SELECT * FROM employees WHERE id = ? AND pin = ? AND is_active = 1", [Number(employeeId), String(pin)]);
      }

      if (!employee) {
        return sendJson(res, 401, { error: 'Nesprávny PIN kód alebo zamestnanec nebol nájdený.' });
      }

      return sendJson(res, 200, {
        success: true,
        user: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          pin: employee.pin,
          annual_leave_days: employee.annual_leave_days,
          color: employee.color
        }
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 2. Zoznam zamestnancov
  if (pathname === '/api/employees' && method === 'GET') {
    try {
      const employees = await db.all("SELECT id, name, role, pin, annual_leave_days, color, is_active FROM employees WHERE is_active = 1 ORDER BY role DESC, name ASC");
      return sendJson(res, 200, employees);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 3. Pridanie zamestnanca
  if (pathname === '/api/employees' && method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      if (!data.name || !data.name.trim()) {
        return sendJson(res, 400, { error: 'Meno zamestnanca je povinné.' });
      }

      const pin = data.pin && data.pin.trim() ? data.pin.trim() : Math.floor(1000 + Math.random() * 9000).toString();
      const role = data.role === 'admin' ? 'admin' : 'employee';
      const days = Number(data.annual_leave_days) || 25;
      const color = data.color || '#3b82f6';

      const result = await db.run(
        "INSERT INTO employees (name, role, pin, annual_leave_days, color) VALUES (?, ?, ?, ?, ?)",
        [data.name.trim(), role, pin, days, color]
      );
      
      notifyDataChanged();
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

  // 4. Úprava zamestnanca
  if (pathname.startsWith('/api/employees/') && method === 'PUT') {
    try {
      const id = Number(pathname.split('/')[3]);
      const data = await parseJsonBody(req);
      const current = await db.get("SELECT * FROM employees WHERE id = ?", [id]);
      if (!current) {
        return sendJson(res, 404, { error: 'Zamestnanec nebol nájdený.' });
      }
      
      const updatedName = data.name !== undefined ? data.name : current.name;
      const updatedRole = data.role !== undefined ? data.role : current.role;
      const updatedPin = data.pin !== undefined ? data.pin : current.pin;
      const updatedDays = data.annual_leave_days !== undefined ? Number(data.annual_leave_days) : current.annual_leave_days;
      const updatedColor = data.color !== undefined ? data.color : current.color;

      await db.run(
        "UPDATE employees SET name = ?, role = ?, pin = ?, annual_leave_days = ?, color = ? WHERE id = ?",
        [updatedName, updatedRole, updatedPin, updatedDays, updatedColor, id]
      );

      notifyDataChanged();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 5. Odobratie / zmazanie zamestnanca
  if (pathname.startsWith('/api/employees/') && method === 'DELETE') {
    try {
      const id = Number(pathname.split('/')[3]);
      const isPermanent = parsedUrl.query.permanent === 'true';

      if (isPermanent) {
        await db.run("DELETE FROM absences WHERE employee_id = ?", [id]);
        await db.run("DELETE FROM employees WHERE id = ?", [id]);
      } else {
        await db.run("UPDATE employees SET is_active = 0 WHERE id = ?", [id]);
      }

      notifyDataChanged();
      return sendJson(res, 200, { success: true, permanent: isPermanent });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 6. Zoznam absencií
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
          (SUBSTR(a.start_date, 1, 7) <= ? AND SUBSTR(a.end_date, 1, 7) >= ?)
        )`;
        params.push(ym, ym);
      } else if (year) {
        sql += ` AND (
          SUBSTR(a.start_date, 1, 4) = ? OR SUBSTR(a.end_date, 1, 4) = ?
        )`;
        params.push(String(year), String(year));
      }

      sql += ` ORDER BY a.start_date ASC, a.id ASC`;
      const absences = await db.all(sql, params);

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
      const isHalf = is_half_day ? 1 : 0;
      const totalHours = Number(hours) || 0;
      const finalStatus = status || 'pending';

      const result = await db.run(
        "INSERT INTO absences (employee_id, type, start_date, end_date, is_half_day, hours, note, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [Number(employee_id), type, start_date, finalEndDate, isHalf, totalHours, note || '', finalStatus]
      );

      notifyDataChanged();
      return sendJson(res, 201, {
        success: true,
        id: result.lastInsertRowid,
        status: finalStatus,
        working_days: calculateWorkingDays(start_date, finalEndDate, isHalf === 1, totalHours)
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 7b. Schválenie absencie
  if (pathname.startsWith('/api/absences/') && pathname.endsWith('/approve') && method === 'POST') {
    try {
      const id = Number(pathname.split('/')[3]);
      await db.run("UPDATE absences SET status = 'approved' WHERE id = ?", [id]);
      notifyDataChanged();
      return sendJson(res, 200, { success: true, status: 'approved' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 7c. Zamietnutie absencie
  if (pathname.startsWith('/api/absences/') && pathname.endsWith('/reject') && method === 'POST') {
    try {
      const id = Number(pathname.split('/')[3]);
      await db.run("UPDATE absences SET status = 'rejected' WHERE id = ?", [id]);
      notifyDataChanged();
      return sendJson(res, 200, { success: true, status: 'rejected' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 8. Úprava absencie
  if (pathname.startsWith('/api/absences/') && method === 'PUT') {
    try {
      const id = Number(pathname.split('/')[3]);
      const data = await parseJsonBody(req);
      const current = await db.get("SELECT * FROM absences WHERE id = ?", [id]);
      if (!current) {
        return sendJson(res, 404, { error: 'Absencia nebola nájdená.' });
      }

      const updatedType = data.type !== undefined ? data.type : current.type;
      const updatedStart = data.start_date !== undefined ? data.start_date : current.start_date;
      const updatedEnd = data.end_date !== undefined ? data.end_date : current.end_date;
      const updatedHalf = data.is_half_day !== undefined ? (data.is_half_day ? 1 : 0) : current.is_half_day;
      const updatedHours = data.hours !== undefined ? Number(data.hours) : current.hours;
      const updatedNote = data.note !== undefined ? data.note : current.note;
      const updatedStatus = data.status !== undefined ? data.status : current.status;

      await db.run(
        "UPDATE absences SET type = ?, start_date = ?, end_date = ?, is_half_day = ?, hours = ?, note = ?, status = ? WHERE id = ?",
        [updatedType, updatedStart, updatedEnd, updatedHalf, updatedHours, updatedNote, updatedStatus, id]
      );

      notifyDataChanged();
      return sendJson(res, 200, { success: true });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 9. Zmazanie absencie
  if (pathname.startsWith('/api/absences/') && method === 'DELETE') {
    try {
      const id = Number(pathname.split('/')[3]);
      await db.run("DELETE FROM absences WHERE id = ?", [id]);
      notifyDataChanged();
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

  // 11. Súhrnné štatistiky a zostatky
  if (pathname === '/api/stats' && method === 'GET') {
    try {
      const year = Number(parsedUrl.query.year) || new Date().getFullYear();
      const employees = await db.all("SELECT id, name, role, annual_leave_days, color FROM employees WHERE is_active = 1 ORDER BY name ASC");

      const stats = [];
      for (const emp of employees) {
        const absences = await db.all(`
          SELECT * FROM absences 
          WHERE employee_id = ? 
            AND (SUBSTR(start_date, 1, 4) = ? OR SUBSTR(end_date, 1, 4) = ?)
            AND status != 'rejected'
        `, [emp.id, String(year), String(year)]);

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

        stats.push({
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
        });
      }

      return sendJson(res, 200, { year, stats });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 12. Export do CSV
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
        sql += ` AND (SUBSTR(a.start_date, 1, 7) <= ? AND SUBSTR(a.end_date, 1, 7) >= ?)`;
        params.push(ym, ym);
      } else {
        sql += ` AND (SUBSTR(a.start_date, 1, 4) = ? OR SUBSTR(a.end_date, 1, 4) = ?)`;
        params.push(String(year), String(year));
      }

      sql += ` ORDER BY a.start_date ASC, e.name ASC`;
      const rows = await db.all(sql, params);

      const typeLabels = {
        'dovolenka': 'Dovolenka',
        'pn': 'PN (Práceneschopnosť)',
        'ocr': 'OČR',
        'lekar': 'Lekár / Prehliadka',
        'nahradne_volno': 'Náhradné voľno',
        'ine': 'Iné'
      };

      let csv = '\uFEFF';
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

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = 200;
      return res.end(csv);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 13. Zmena PINu / hesla
  if (pathname === '/api/change-pin' && method === 'POST') {
    try {
      const { employeeId, oldPin, newPin } = await parseJsonBody(req);
      if (!employeeId || !newPin || !newPin.trim()) {
        return sendJson(res, 400, { error: 'Vyplňte nové heslo / PIN.' });
      }

      const emp = await db.get("SELECT * FROM employees WHERE id = ? AND is_active = 1", [Number(employeeId)]);
      if (!emp) {
        return sendJson(res, 404, { error: 'Používateľ nebol nájdený.' });
      }

      if (oldPin && oldPin.trim() && emp.pin && emp.pin !== oldPin.trim()) {
        return sendJson(res, 400, { error: 'Pôvodné heslo / PIN nie je správne.' });
      }

      await db.run("UPDATE employees SET pin = ? WHERE id = ?", [newPin.trim(), Number(employeeId)]);
      notifyDataChanged();
      return sendJson(res, 200, { success: true, message: 'Heslo bolo úspešne zmenené.' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 14. Export všetkých hesiel do CSV
  if (pathname === '/api/export-passwords' && method === 'GET') {
    try {
      const authorized = await isAdminRequest(req, parsedUrl);
      if (!authorized) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.statusCode = 403;
        return res.end('Prístup zamietnutý. Zoznam hesiel môže stiahnuť iba overený administrátor.');
      }

      const rows = await db.all(`
        SELECT name, role, pin, annual_leave_days 
        FROM employees 
        WHERE is_active = 1 
        ORDER BY role DESC, name ASC
      `);

      let csv = '\uFEFF';
      csv += 'Meno a priezvisko;Rola v systéme;Prihlasovacie heslo / PIN;Ročný nárok na dovolenku (dní);Stav účtu\r\n';

      rows.forEach(r => {
        const rola = r.role === 'admin' ? 'Správca / Manažér' : 'Zamestnanec';
        csv += `"${r.name}";"${rola}";"${r.pin}";"${r.annual_leave_days}";"Aktívny"\r\n`;
      });

      const today = new Date().toISOString().split('T')[0];
      const filename = `zoznam_hesiel_zamestnancov_${today}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = 200;
      return res.end(csv);
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // --- STATICKÉ SÚBORY (pre lokálny server) ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end('Prístup odmietnutý');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.statusCode = 404;
        return res.end('Súbor nebol nájdený');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.statusCode = 200;
      res.end(content);
    });
  });
}

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

const server = http.createServer(handleRequest);

// Ak sa spúšťa cez "node server.js" (lokálne alebo na klasickom serveri)
if (require.main === module) {
  initDatabase().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      const ips = getNetworkIps();
      console.log('\n' + '='.repeat(60));
      console.log(`   🚀 SP ASISTENT - BEŽÍ ÚSPEŠNE (DB: ${dbType.toUpperCase()})`);
      console.log('='.repeat(60));
      console.log(`\n💻 Lokálna adresa na počítači:`);
      console.log(`   http://localhost:${PORT}`);
      
      if (ips.length > 0) {
        console.log(`\n📱 Mobilná adresa v sieti Wi-Fi:`);
        ips.forEach(ip => {
          console.log(`   👉 http://${ip}:${PORT}`);
        });
      }
      console.log('\n' + '-'.repeat(60));
      console.log('💡 TIP: Pre Vercel / serverless hosting je exportovaný handleRequest.');
      console.log('='.repeat(60) + '\n');
    });
  }).catch(err => {
    console.error('❌ Zlyhalo spustenie aplikácie:', err);
    process.exit(1);
  });
}

function handler(req, res) {
  return handleRequest(req, res);
}
handler.handleRequest = handleRequest;
handler.server = server;

module.exports = handler;
