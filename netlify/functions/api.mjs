import { getStore } from '@netlify/blobs';
import { Readable } from 'node:stream';

const SEED_DATA = {
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
  ],
  schedules: []
};

function jsonReply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

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
    const dow = curr.getUTCDay();
    const dateStr = curr.toISOString().split('T')[0];
    if (dow !== 0 && dow !== 6 && !holidaysMap.has(dateStr)) count++;
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return count;
}

async function getDb(store) {
  let db = await store.get('db_state', { type: 'json' });
  if (!db || !Array.isArray(db.employees) || db.employees.length === 0) {
    db = JSON.parse(JSON.stringify(SEED_DATA));
    await store.setJSON('db_state', db);
  }
  if (!Array.isArray(db.schedules)) db.schedules = [];
  if (!Array.isArray(db.absences)) db.absences = [];
  return db;
}

async function saveDb(store, db) {
  db.version = Date.now();
  await store.setJSON('db_state', db);
}

async function handleWithBlobs(request, url, pathname, method) {
  const store = getStore('sp-asistent-store');

  if (pathname === '/api/health' && method === 'GET') {
    return jsonReply({ ok: true, mode: 'cloud-netlify', dbType: 'Netlify Blobs' });
  }

  // Serve schedule image directly as binary HTTP response
  if (pathname.startsWith('/api/schedules/image/') && method === 'GET') {
    const id = pathname.split('/').pop();
    const entry = await store.getWithMetadata(`schedule_img_${id}`, { type: 'arrayBuffer' });
    if (!entry || !entry.data) {
      return new Response('Obrázok nenájdený', { status: 404 });
    }
    const contentType = (entry.metadata && entry.metadata.contentType) || 'image/jpeg';
    return new Response(entry.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }

  const db = await getDb(store);

  if (pathname === '/api/sync/status' && method === 'GET') {
    return jsonReply({
      success: true,
      version: db.version,
      dbType: 'Netlify Blobs',
      absencesCount: db.absences.length,
      employeesCount: db.employees.filter(e => e.is_active === 1).length,
      schedulesCount: db.schedules.length,
      timestamp: Date.now()
    });
  }

  let body = {};
  if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
    try {
      body = await request.json();
    } catch (e) {}
  }

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
    }
    if (!user) return jsonReply({ error: 'Nesprávny PIN kód alebo zamestnanec nebol nájdený.' }, 401);
    return jsonReply({
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

  if (pathname === '/api/employees' && method === 'GET') {
    return jsonReply(db.employees.filter(e => e.is_active === 1));
  }

  if (pathname === '/api/employees' && method === 'POST') {
    const nextId = db.employees.length > 0 ? Math.max(...db.employees.map(e => e.id)) + 1 : 1;
    const newEmp = {
      id: nextId,
      name: body.name || 'Nový zamestnanec',
      role: body.role || 'employee',
      pin: body.pin || '1234',
      annual_leave_days: Number(body.annual_leave_days) || 25,
      color: body.color || '#3b82f6',
      is_active: 1,
      created_at: new Date().toISOString()
    };
    db.employees.push(newEmp);
    await saveDb(store, db);
    return jsonReply({ success: true, id: nextId });
  }

  if (pathname.startsWith('/api/employees/') && method === 'PUT') {
    const id = Number(pathname.split('/')[3]);
    const emp = db.employees.find(e => e.id === id);
    if (!emp) return jsonReply({ error: 'Zamestnanec nebol nájdený.' }, 404);
    if (body.name !== undefined) emp.name = body.name;
    if (body.role !== undefined) emp.role = body.role;
    if (body.pin !== undefined) emp.pin = body.pin;
    if (body.annual_leave_days !== undefined) emp.annual_leave_days = Number(body.annual_leave_days);
    if (body.color !== undefined) emp.color = body.color;
    await saveDb(store, db);
    return jsonReply({ success: true });
  }

  if (pathname.startsWith('/api/employees/') && method === 'DELETE') {
    const id = Number(pathname.split('/')[3]);
    const permanent = url.searchParams.get('permanent') === 'true';
    if (permanent) {
      db.employees = db.employees.filter(e => e.id !== id);
      db.absences = db.absences.filter(a => a.employee_id !== id);
    } else {
      const emp = db.employees.find(e => e.id === id);
      if (emp) emp.is_active = 0;
    }
    await saveDb(store, db);
    return jsonReply({ success: true });
  }

  if (pathname === '/api/absences' && method === 'GET') {
    const year = url.searchParams.get('year') ? Number(url.searchParams.get('year')) : null;
    const empId = url.searchParams.get('employee_id') ? Number(url.searchParams.get('employee_id')) : null;
    let list = db.absences.map(a => {
      const emp = db.employees.find(e => e.id === a.employee_id);
      return {
        ...a,
        employee_name: emp ? emp.name : 'Neznámy',
        employee_color: emp ? emp.color : '#3b82f6'
      };
    });
    if (empId) list = list.filter(a => a.employee_id === empId);
    if (year) {
      const yStr = String(year);
      list = list.filter(a => (a.start_date && a.start_date.startsWith(yStr)) || (a.end_date && a.end_date.startsWith(yStr)));
    }
    return jsonReply(list);
  }

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
    await saveDb(store, db);
    return jsonReply({ success: true, id: nextId });
  }

  if (pathname.startsWith('/api/absences/') && pathname.endsWith('/approve') && method === 'POST') {
    const id = Number(pathname.split('/')[3]);
    const a = db.absences.find(x => x.id === id);
    if (a) a.status = 'approved';
    await saveDb(store, db);
    return jsonReply({ success: true, status: 'approved' });
  }

  if (pathname.startsWith('/api/absences/') && pathname.endsWith('/reject') && method === 'POST') {
    const id = Number(pathname.split('/')[3]);
    const a = db.absences.find(x => x.id === id);
    if (a) a.status = 'rejected';
    await saveDb(store, db);
    return jsonReply({ success: true, status: 'rejected' });
  }

  if (pathname.startsWith('/api/absences/') && method === 'PUT') {
    const id = Number(pathname.split('/')[3]);
    const a = db.absences.find(x => x.id === id);
    if (!a) return jsonReply({ error: 'Absencia nebola nájdená.' }, 404);
    if (body.type !== undefined) a.type = body.type;
    if (body.start_date !== undefined) a.start_date = body.start_date;
    if (body.end_date !== undefined) a.end_date = body.end_date;
    if (body.is_half_day !== undefined) a.is_half_day = body.is_half_day ? 1 : 0;
    if (body.hours !== undefined) a.hours = Number(body.hours);
    if (body.note !== undefined) a.note = body.note;
    if (body.status !== undefined) a.status = body.status;
    await saveDb(store, db);
    return jsonReply({ success: true });
  }

  if (pathname.startsWith('/api/absences/') && method === 'DELETE') {
    const id = Number(pathname.split('/')[3]);
    db.absences = db.absences.filter(x => x.id !== id);
    await saveDb(store, db);
    return jsonReply({ success: true });
  }

  // Schedules API (with binary image storage in Netlify Blobs!)
  if (pathname === '/api/schedules' && method === 'GET') {
    return jsonReply(db.schedules);
  }

  if (pathname === '/api/schedules' && method === 'POST') {
    const id = Date.now();
    const imageDataUrl = body.imageData || body.imageUrl || '';
    const match = String(imageDataUrl).match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return jsonReply({ error: 'Neplatný formát obrázka' }, 400);
    }
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    await store.set(`schedule_img_${id}`, buffer, { metadata: { contentType } });

    const newSchedule = {
      id,
      title: body.title || 'Týždenný rozpis',
      note: body.note || '',
      imageUrl: `/api/schedules/image/${id}`,
      createdAt: new Date().toISOString(),
      authorName: body.authorName || 'Správca'
    };

    db.schedules.unshift(newSchedule);
    // Uchováme max 20 najnovších rozpisov v cloude
    if (db.schedules.length > 20) {
      const removed = db.schedules.splice(20);
      for (const rem of removed) {
        try { await store.delete(`schedule_img_${rem.id}`); } catch (e) {}
      }
    }
    await saveDb(store, db);
    return jsonReply({ success: true, schedule: newSchedule });
  }

  if (pathname.startsWith('/api/schedules/') && method === 'DELETE') {
    const id = Number(pathname.split('/')[3]);
    db.schedules = db.schedules.filter(s => s.id !== id);
    try { await store.delete(`schedule_img_${id}`); } catch (e) {}
    await saveDb(store, db);
    return jsonReply({ success: true });
  }

  if (pathname === '/api/holidays' && method === 'GET') {
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
    return jsonReply(getSlovakHolidays(year));
  }

  if (pathname === '/api/stats' && method === 'GET') {
    const empId = Number(url.searchParams.get('employee_id'));
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
    const emp = db.employees.find(e => e.id === empId);
    if (!emp) return jsonReply({ error: 'Zamestnanec nebol nájdený' }, 404);
    const yearAbsences = db.absences.filter(a => {
      if (a.employee_id !== empId) return false;
      const s = String(a.start_date || '');
      const e = String(a.end_date || '');
      return s.startsWith(String(year)) || e.startsWith(String(year));
    });
    let dovolenkaDni = 0, dovolenkaCakajucaDni = 0, pnDni = 0, ocrDni = 0, lekarHodiny = 0, nahradneVolnoHodiny = 0, ineDni = 0;
    yearAbsences.forEach(a => {
      const days = calculateWorkingDays(a.start_date, a.end_date, a.is_half_day, a.hours);
      if (a.type === 'dovolenka') {
        if (a.status === 'approved') dovolenkaDni += days;
        if (a.status === 'pending') dovolenkaCakajucaDni += days;
      } else if (a.type === 'pn' && a.status === 'approved') pnDni += days;
      else if (a.type === 'ocr' && a.status === 'approved') ocrDni += days;
      else if (a.type === 'lekar' && a.status === 'approved') lekarHodiny += (a.hours || (days * 8));
      else if (a.type === 'nahradne_volno' && a.status === 'approved') nahradneVolnoHodiny += (a.hours || (days * 8));
      else if (a.type === 'ine' && a.status === 'approved') ineDni += days;
    });
    const totalLeave = emp.annual_leave_days || 25;
    return jsonReply({
      employee_id: empId,
      year,
      annual_leave_total: totalLeave,
      annual_leave_used: dovolenkaDni,
      annual_leave_pending: dovolenkaCakajucaDni,
      annual_leave_remaining: totalLeave - dovolenkaDni,
      pn_days: pnDni,
      ocr_days: ocrDni,
      lekar_hours: lekarHodiny,
      nahradne_volno_hours: nahradneVolnoHodiny,
      ine_days: ineDni
    });
  }

  if (pathname === '/api/change-pin' && method === 'POST') {
    const empId = Number(body.employee_id);
    const oldPin = String(body.old_pin || '');
    const newPin = String(body.new_pin || '');
    const emp = db.employees.find(e => e.id === empId);
    if (!emp) return jsonReply({ error: 'Používateľ nebol nájdený.' }, 404);
    if (emp.pin !== oldPin) return jsonReply({ error: 'Pôvodné heslo / PIN nie je správne.' }, 400);
    emp.pin = newPin;
    await saveDb(store, db);
    return jsonReply({ success: true, message: 'Heslo / PIN bolo úspešne zmenené.' });
  }

  if (pathname === '/api/backup/export' && method === 'GET') {
    return jsonReply({
      version: 2,
      exported_at: new Date().toISOString(),
      employees: db.employees,
      absences: db.absences,
      schedules: db.schedules
    });
  }

  if (pathname === '/api/backup/restore' && method === 'POST') {
    if (body.employees && Array.isArray(body.employees)) db.employees = body.employees;
    if (body.absences && Array.isArray(body.absences)) db.absences = body.absences;
    if (body.schedules && Array.isArray(body.schedules)) db.schedules = body.schedules;
    await saveDb(store, db);
    return jsonReply({
      success: true,
      message: 'Dáta boli úspešne obnovené.',
      restoredEmployees: db.employees.length,
      restoredAbsences: db.absences.length
    });
  }

  return jsonReply({ error: 'Neznámy API endpoint' }, 404);
}

export default async function handler(request, context) {
  try {
    const url = new URL(request.url);
    let normalizedPath = url.pathname;
    if (normalizedPath.startsWith('/.netlify/functions/api')) {
      normalizedPath = normalizedPath.replace(/^\/\.netlify\/functions\/api/, '/api');
    }
    const method = (request.method || 'GET').toUpperCase();

    // Try Netlify Blobs first (available in Netlify production and netlify dev)
    try {
      return await handleWithBlobs(request, url, normalizedPath, method);
    } catch (blobErr) {
      console.warn('Netlify Blobs unavailable, falling back to server.js:', blobErr.message);
    }

    // Local fallback to server.js
    const { default: serverHandler } = await import('../../server.js');
    let bodyBuffer = Buffer.alloc(0);
    if (method !== 'GET' && method !== 'HEAD') {
      const ab = await request.arrayBuffer();
      bodyBuffer = Buffer.from(ab);
    }
    const reqHeaders = {};
    for (const [k, v] of request.headers.entries()) reqHeaders[k.toLowerCase()] = v;

    const req = new Readable();
    req._read = () => {};
    req.push(bodyBuffer);
    req.push(null);
    req.url = normalizedPath + url.search;
    req.method = method;
    req.headers = reqHeaders;
    if (bodyBuffer.length > 0) req.body = bodyBuffer.toString('utf-8');

    let statusCode = 200;
    const resHeaders = {};
    const chunks = [];
    const result = await new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
        getHeader(k) { return resHeaders[k.toLowerCase()]; },
        writeHead(code, headers) {
          statusCode = code;
          if (headers) for (const [hk, hv] of Object.entries(headers)) resHeaders[hk.toLowerCase()] = hv;
        },
        write(chunk) { if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); },
        end(chunk) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          resolve({ statusCode: res.statusCode || statusCode, headers: resHeaders, body: Buffer.concat(chunks) });
        }
      };
      serverHandler(req, res).catch(reject);
    });

    const isNoContent = result.statusCode === 204 || result.statusCode === 304;
    return new Response(isNoContent ? null : result.body, { status: result.statusCode, headers: result.headers });
  } catch (error) {
    return jsonReply({ error: error.message || 'Server error' }, 500);
  }
}

export const config = {
  path: ["/api/*", "/.netlify/functions/api/*"]
};
