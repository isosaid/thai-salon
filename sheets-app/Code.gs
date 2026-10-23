/**
 * Оздоровительный тайский салон — серверная часть кабинета.
 *
 * Скрипт живёт внутри Google-таблицы и делает две вещи:
 *   1. отдаёт сайт кабинета (doGet → Index.html);
 *   2. обслуживает вход и работу с данными, выполняясь на стороне Google.
 *
 * Браузер сотрудника не получает доступа к таблице: он вызывает только
 * функции ниже, и каждая проверяет сессию. Пароли хранятся в листе
 * «Сотрудники» солёными хешами; восстановить пароль из хеша нельзя,
 * его можно только задать заново через меню «Салон».
 */

// ─────────────────────────── Константы ───────────────────────────

var SHEETS = {
  staff:    'Сотрудники',
  clients:  'Клиенты',
  schedule: 'Расписание',
  settings: 'Настройки',
  sessions: 'Сессии',
  log:      'Журнал'
};

var SLOTS = ['11:00', '12:30', '14:00', '15:30', '17:00', '18:30'];
var ROOMS = ['Нам', 'Ели', 'НОЙ'];

var ROLES = {
  'владелец':      { rank: 4, label: 'Владелец' },
  'администратор': { rank: 3, label: 'Администратор' },
  'мастер':        { rank: 2, label: 'Мастер' },
  'просмотр':      { rank: 1, label: 'Только просмотр' }
};

var SESSION_HOURS = 12;      // срок жизни сессии
var HASH_ROUNDS   = 12000;   // итераций при хешировании пароля
var MIN_PASSWORD  = 8;

// ─────────────────────────── Точка входа ───────────────────────────

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Тайский салон · кабинет')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// ─────────────────────────── Утилиты ───────────────────────────

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Нет листа «' + name + '». Создайте его по инструкции.');
  return sh;
}

function rows_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
}

function toHex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var v = (bytes[i] + 256) % 256;
    out += (v < 16 ? '0' : '') + v.toString(16);
  }
  return out;
}

/** Медленный хеш: соль + пароль, прогнанные через SHA-256 много раз. */
function hashPassword_(password, salt) {
  var acc = salt + '|' + password;
  for (var i = 0; i < HASH_ROUNDS; i++) {
    acc = toHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, acc));
  }
  return acc;
}

/** Сравнение за постоянное время — чтобы по скорости ответа нельзя было подбирать. */
function sameHash_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normEmail_(e) {
  return String(e || '').trim().toLowerCase();
}

function dateKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  return String(v || '').trim();
}

function tel_(v) {
  var raw = String(v == null ? '' : v).trim();
  if (!raw) return { tel: '', check: false };
  var d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('992') === 0) d = d.slice(3);
  if (d.length === 9) {
    return { tel: '+992 ' + d.slice(0, 3) + ' ' + d.slice(3, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7),
             check: false };
  }
  return { tel: raw, check: true };
}

function logAction_(email, action, details) {
  try {
    var sh = ss_().getSheetByName(SHEETS.log);
    if (!sh) return;
    sh.appendRow([new Date(), email || '', action || '', details || '']);
  } catch (e) { /* журнал не должен ломать работу */ }
}

// ─────────────────────────── Сессии ───────────────────────────

function staffByEmail_(email) {
  email = normEmail_(email);
  var data = rows_(SHEETS.staff);
  for (var i = 0; i < data.length; i++) {
    if (normEmail_(data[i][0]) === email) {
      return {
        row: i + 2,
        email: email,
        name: String(data[i][1] || ''),
        role: String(data[i][2] || 'просмотр').trim().toLowerCase(),
        room: String(data[i][3] || ''),
        active: String(data[i][4] || '').trim().toLowerCase() !== 'нет',
        salt: String(data[i][5] || ''),
        hash: String(data[i][6] || '')
      };
    }
  }
  return null;
}

function newToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function openSession_(staff) {
  var sh = sheet_(SHEETS.sessions);
  var token = newToken_();
  var until = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  sh.appendRow([token, staff.email, until, new Date()]);
  cleanSessions_();
  return { token: token, until: until };
}

function cleanSessions_() {
  var sh = sheet_(SHEETS.sessions);
  var last = sh.getLastRow();
  if (last < 2) return;
  var values = sh.getRange(2, 1, last - 1, 4).getValues();
  var now = Date.now();
  for (var i = values.length - 1; i >= 0; i--) {
    var until = values[i][2];
    if (!(until instanceof Date) || until.getTime() < now) sh.deleteRow(i + 2);
  }
}

/** Проверяет токен и возвращает сотрудника. Бросает ошибку, если сессии нет. */
function requireSession_(token, minRank) {
  token = String(token || '');
  if (!token) throw new Error('Войдите в кабинет');
  var data = rows_(SHEETS.sessions);
  var email = null;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === token) {
      var until = data[i][2];
      if (until instanceof Date && until.getTime() > Date.now()) email = normEmail_(data[i][1]);
      break;
    }
  }
  if (!email) throw new Error('Сессия истекла, войдите заново');
  var staff = staffByEmail_(email);
  if (!staff || !staff.active) throw new Error('Доступ отключён');
  var rank = (ROLES[staff.role] || ROLES['просмотр']).rank;
  if (minRank && rank < minRank) throw new Error('Недостаточно прав для этого действия');
  staff.rank = rank;
  return staff;
}

// ─────────────────────────── API: вход ───────────────────────────

function apiLogin(email, password) {
  email = normEmail_(email);
  password = String(password || '');
  Utilities.sleep(400); // замедляет перебор

  var staff = staffByEmail_(email);
  var ok = false;
  if (staff && staff.active && staff.salt && staff.hash) {
    ok = sameHash_(hashPassword_(password, staff.salt), staff.hash);
  }
  if (!ok) {
    logAction_(email, 'неудачный вход', '');
    // один и тот же ответ на неверный пароль и несуществующую почту
    throw new Error('Неверная почта или пароль');
  }

  var s = openSession_(staff);
  sheet_(SHEETS.staff).getRange(staff.row, 8).setValue(new Date());
  logAction_(email, 'вход', '');
  return {
    token: s.token,
    until: s.until.toISOString(),
    me: {
      email: staff.email,
      name: staff.name,
      role: staff.role,
      roleLabel: (ROLES[staff.role] || ROLES['просмотр']).label,
      room: staff.room,
      rank: (ROLES[staff.role] || ROLES['просмотр']).rank
    }
  };
}

function apiLogout(token) {
  var sh = sheet_(SHEETS.sessions);
  var last = sh.getLastRow();
  if (last < 2) return { ok: true };
  var values = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]) === String(token)) sh.deleteRow(i + 2);
  }
  return { ok: true };
}

function apiMe(token) {
  var staff = requireSession_(token);
  return {
    email: staff.email, name: staff.name, role: staff.role,
    roleLabel: (ROLES[staff.role] || ROLES['просмотр']).label,
    room: staff.room, rank: staff.rank
  };
}

/** Смена собственного пароля. */
function apiChangePassword(token, oldPassword, newPassword) {
  var staff = requireSession_(token);
  if (!sameHash_(hashPassword_(String(oldPassword || ''), staff.salt), staff.hash)) {
    throw new Error('Текущий пароль указан неверно');
  }
  if (String(newPassword || '').length < MIN_PASSWORD) {
    throw new Error('Новый пароль короче ' + MIN_PASSWORD + ' знаков');
  }
  var salt = Utilities.getUuid();
  var sh = sheet_(SHEETS.staff);
  sh.getRange(staff.row, 6).setValue(salt);
  sh.getRange(staff.row, 7).setValue(hashPassword_(String(newPassword), salt));
  logAction_(staff.email, 'смена пароля', '');
  return { ok: true };
}

// ─────────────────────────── API: данные ───────────────────────────

function apiBootstrap(token) {
  var staff = requireSession_(token);
  return {
    me: { email: staff.email, name: staff.name, role: staff.role,
          roleLabel: (ROLES[staff.role] || ROLES['просмотр']).label,
          room: staff.room, rank: staff.rank },
    settings: readSettings_(),
    schedule: readSchedule_(),
    clients: staff.rank >= 2 ? readClients_() : [],
    clientsHidden: staff.rank < 2
  };
}

function readSettings_() {
  var out = {};
  rows_(SHEETS.settings).forEach(function (r) {
    if (r[0]) out[String(r[0]).trim()] = r[1];
  });
  return { raw: out, slots: SLOTS, rooms: ROOMS };
}

function readSchedule_() {
  var data = rows_(SHEETS.schedule);
  var days = {};
  data.forEach(function (r, i) {
    var date = dateKey_(r[0]);
    if (!date) return;
    if (!days[date]) days[date] = { date: date, weekday: String(r[1] || ''), closed: false, grid: {} };
    var room = String(r[2] || '');
    var slot = String(r[3] || '').trim();
    if (!days[date].grid[room]) days[date].grid[room] = {};
    var status = String(r[8] || '').trim();
    if (status === 'выходной') days[date].closed = true;
    days[date].grid[room][slot] = {
      client: String(r[4] || ''),
      clientId: String(r[5] || ''),
      course: String(r[6] || ''),
      tel: String(r[7] || ''),
      status: status,
      row: i + 2
    };
  });
  return days;
}

function readClients_() {
  return rows_(SHEETS.clients).filter(function (r) { return r[0] || r[3]; }).map(function (r, i) {
    return {
      id: String(r[0] || ''), group: String(r[1] || ''), segment: String(r[2] || ''),
      name: String(r[3] || ''), note: String(r[4] || ''),
      nam: Number(r[5]) || 0, eli: Number(r[6]) || 0, noy: Number(r[7]) || 0,
      total: Number(r[8]) || 0,
      start: dateKey_(r[9]), end: dateKey_(r[10]),
      tel: String(r[11] || ''), telCheck: String(r[12] || '').trim() !== '',
      row: i + 2
    };
  });
}

// ─────────────────────────── API: запись ───────────────────────────

function findScheduleRow_(date, room, slot) {
  var data = rows_(SHEETS.schedule);
  for (var i = 0; i < data.length; i++) {
    if (dateKey_(data[i][0]) === date && String(data[i][2]) === room &&
        String(data[i][3]).trim() === slot) {
      return { row: i + 2, values: data[i] };
    }
  }
  return null;
}

/** Записать клиента в один слот. Роль не ниже мастера. */
function apiBook(token, payload) {
  var staff = requireSession_(token, 2);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var date = String(payload.date), room = String(payload.room), slot = String(payload.slot);
    var hit = findScheduleRow_(date, room, slot);
    if (!hit) throw new Error('Такого слота нет в расписании: ' + date + ' ' + room + ' ' + slot);
    if (String(hit.values[8]).trim() === 'выходной') throw new Error('Это выходной день');
    if (String(hit.values[4] || '').trim()) {
      throw new Error('Слот уже занят: ' + String(hit.values[4]));
    }
    var t = tel_(payload.tel);
    sheet_(SHEETS.schedule).getRange(hit.row, 5, 1, 5).setValues([[
      String(payload.name || ''), String(payload.clientId || ''),
      String(payload.course || ''), t.tel, 'записан'
    ]]);
    logAction_(staff.email, 'запись', date + ' ' + room + ' ' + slot + ' — ' + payload.name);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Записать курс: несколько слотов подряд, пропуская занятые. */
function apiBookCourse(token, payload) {
  var staff = requireSession_(token, 2);
  var dates = payload.dates || [];
  var done = [], skipped = [];
  for (var i = 0; i < dates.length; i++) {
    try {
      apiBook(token, {
        date: dates[i], room: payload.room, slot: payload.slot,
        name: payload.name, clientId: payload.clientId, tel: payload.tel,
        course: payload.program + ' ' + (done.length + 1) + '/' + dates.length
      });
      done.push(dates[i]);
    } catch (e) {
      skipped.push({ date: dates[i], reason: String(e.message || e) });
    }
  }
  logAction_(staff.email, 'запись курса', payload.name + ' — ' + done.length + ' сеансов');
  return { done: done, skipped: skipped };
}

/** Освободить слот. Роль не ниже мастера. */
function apiFreeSlot(token, date, room, slot) {
  var staff = requireSession_(token, 2);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var hit = findScheduleRow_(date, room, slot);
    if (!hit) throw new Error('Слот не найден');
    if (String(hit.values[8]).trim() === 'выходной') throw new Error('Это выходной день');
    var was = String(hit.values[4] || '');
    sheet_(SHEETS.schedule).getRange(hit.row, 5, 1, 5).setValues([['', '', '', '', 'свободно']]);
    logAction_(staff.email, 'освобождение слота', date + ' ' + room + ' ' + slot + ' — было: ' + was);
    return { ok: true, was: was };
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────── API: карточки клиентов ───────────────────────────

function apiSaveClient(token, c) {
  var staff = requireSession_(token, 2);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(SHEETS.clients);
    var name = String(c.name || '').trim();
    if (!name) throw new Error('Укажите ФИО');
    var t = tel_(c.tel);
    var row = null;

    if (c.id) {
      var data = rows_(SHEETS.clients);
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(c.id)) { row = i + 2; break; }
      }
      if (!row) throw new Error('Карточка не найдена — обновите страницу');
    } else {
      c.id = 'c' + Date.now().toString(36);
      row = sh.getLastRow() + 1;
    }

    sh.getRange(row, 1, 1, 13).setValues([[
      c.id, String(c.group || ''), String(c.segment || ''), name,
      String(c.note || ''),
      Number(c.nam) || 0, Number(c.eli) || 0, Number(c.noy) || 0, Number(c.total) || 0,
      String(c.start || ''), String(c.end || ''), t.tel, t.check ? 'да' : ''
    ]]);
    logAction_(staff.email, c.id ? 'правка карточки' : 'новый клиент', name);
    return { ok: true, id: c.id };
  } finally {
    lock.releaseLock();
  }
}

/** Удаление карточки. Только администратор и выше. */
function apiDeleteClient(token, id) {
  var staff = requireSession_(token, 3);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = rows_(SHEETS.clients);
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        logAction_(staff.email, 'удаление карточки', String(data[i][3]));
        sheet_(SHEETS.clients).deleteRow(i + 2);
        return { ok: true };
      }
    }
    throw new Error('Карточка не найдена');
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────── Меню таблицы ───────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Салон')
    .addItem('Добавить сотрудника', 'menuAddStaff')
    .addItem('Задать пароль сотруднику', 'menuSetPassword')
    .addItem('Отключить сотрудника', 'menuDisableStaff')
    .addSeparator()
    .addItem('Добавить месяц в расписание', 'menuAddMonth')
    .addSeparator()
    .addItem('Загрузить данные из книги', 'menuImportData')
    .addItem('Завести подготовленных сотрудников', 'menuSeedStaff')
    .addItem('Создать недостающие листы', 'menuEnsureSheets')
    .addToUi();
}

function menuEnsureSheets() {
  var ui = SpreadsheetApp.getUi();
  var need = [
    [SHEETS.staff,    ['E-mail', 'ФИО', 'Роль', 'Кабинет', 'Активен', 'Соль', 'Хеш пароля', 'Последний вход']],
    [SHEETS.sessions, ['Токен', 'E-mail', 'Истекает', 'Создана']],
    [SHEETS.log,      ['Время', 'Кто', 'Действие', 'Подробности']]
  ];
  var made = [];
  need.forEach(function (n) {
    if (!ss_().getSheetByName(n[0])) {
      var sh = ss_().insertSheet(n[0]);
      sh.appendRow(n[1]);
      sh.setFrozenRows(1);
      made.push(n[0]);
    }
  });
  if (made.indexOf(SHEETS.staff) >= 0 || made.indexOf(SHEETS.sessions) >= 0) {
    var s = ss_().getSheetByName(SHEETS.sessions);
    if (s) s.hideSheet();
  }
  ui.alert(made.length ? 'Созданы листы: ' + made.join(', ') : 'Все нужные листы уже есть.');
}

function menuAddStaff() {
  var ui = SpreadsheetApp.getUi();
  var email = promptText_(ui, 'Почта сотрудника', 'Например: firuza@example.com');
  if (email === null) return;
  email = normEmail_(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { ui.alert('Почта указана неверно.'); return; }
  if (staffByEmail_(email)) { ui.alert('Такой сотрудник уже есть. Используйте «Задать пароль сотруднику».'); return; }

  var name = promptText_(ui, 'ФИО сотрудника', 'Например: Саидова Нигина');
  if (name === null) return;

  var role = promptText_(ui, 'Роль', 'владелец / администратор / мастер / просмотр');
  if (role === null) return;
  role = String(role).trim().toLowerCase();
  if (!ROLES[role]) { ui.alert('Неизвестная роль. Допустимо: владелец, администратор, мастер, просмотр.'); return; }

  var room = promptText_(ui, 'Кабинет (для мастера)', 'Нам / Ели / НОЙ — или пусто');
  if (room === null) return;

  var pass = promptText_(ui, 'Пароль', 'Не короче ' + MIN_PASSWORD + ' знаков');
  if (pass === null) return;
  if (String(pass).length < MIN_PASSWORD) { ui.alert('Пароль короче ' + MIN_PASSWORD + ' знаков.'); return; }

  var salt = Utilities.getUuid();
  sheet_(SHEETS.staff).appendRow([
    email, String(name).trim(), role, String(room).trim(), 'да',
    salt, hashPassword_(String(pass), salt), ''
  ]);
  logAction_(Session.getActiveUser().getEmail(), 'добавлен сотрудник', email + ' · ' + role);
  ui.alert('Сотрудник добавлен.\n\nПочта: ' + email + '\nРоль: ' + ROLES[role].label +
           '\n\nПередайте пароль лично. В таблице он не хранится — только хеш, ' +
           'восстановить его нельзя, можно задать новый.');
}

function menuSetPassword() {
  var ui = SpreadsheetApp.getUi();
  var email = promptText_(ui, 'Почта сотрудника', 'Кому меняем пароль');
  if (email === null) return;
  var staff = staffByEmail_(email);
  if (!staff) { ui.alert('Сотрудник не найден.'); return; }
  var pass = promptText_(ui, 'Новый пароль', 'Не короче ' + MIN_PASSWORD + ' знаков');
  if (pass === null) return;
  if (String(pass).length < MIN_PASSWORD) { ui.alert('Пароль короче ' + MIN_PASSWORD + ' знаков.'); return; }
  var salt = Utilities.getUuid();
  var sh = sheet_(SHEETS.staff);
  sh.getRange(staff.row, 6).setValue(salt);
  sh.getRange(staff.row, 7).setValue(hashPassword_(String(pass), salt));
  logAction_(Session.getActiveUser().getEmail(), 'задан новый пароль', staff.email);
  ui.alert('Пароль задан. Прежние сессии остаются действующими — ' +
           'чтобы разом их сбросить, удалите строки сотрудника на листе «Сессии».');
}

function menuDisableStaff() {
  var ui = SpreadsheetApp.getUi();
  var email = promptText_(ui, 'Почта сотрудника', 'Кому закрываем доступ');
  if (email === null) return;
  var staff = staffByEmail_(email);
  if (!staff) { ui.alert('Сотрудник не найден.'); return; }
  sheet_(SHEETS.staff).getRange(staff.row, 5).setValue('нет');
  // снести активные сессии
  var sh = sheet_(SHEETS.sessions);
  var last = sh.getLastRow();
  if (last > 1) {
    var vals = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (normEmail_(vals[i][1]) === staff.email) sh.deleteRow(i + 2);
    }
  }
  logAction_(Session.getActiveUser().getEmail(), 'доступ отключён', staff.email);
  ui.alert('Доступ закрыт, активные сессии сброшены.');
}

/** Добавляет в расписание все дни месяца: 18 строк на день. */
function menuAddMonth() {
  var ui = SpreadsheetApp.getUi();
  var ym = promptText_(ui, 'Какой месяц добавить', 'В формате ГГГГ-ММ, например 2026-11');
  if (ym === null) return;
  if (!/^\d{4}-\d{2}$/.test(String(ym).trim())) { ui.alert('Нужен формат ГГГГ-ММ.'); return; }
  ym = String(ym).trim();
  var year = Number(ym.slice(0, 4)), month = Number(ym.slice(5, 7));

  var existing = {};
  rows_(SHEETS.schedule).forEach(function (r) { existing[dateKey_(r[0])] = true; });

  var DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  var out = [], d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    var key = Utilities.formatDate(d, ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    if (!existing[key]) {
      var closed = d.getDay() === 0;
      for (var r = 0; r < ROOMS.length; r++) {
        for (var s = 0; s < SLOTS.length; s++) {
          out.push([key, DOW[d.getDay()], ROOMS[r], SLOTS[s], '', '', '', '',
                    closed ? 'выходной' : 'свободно']);
        }
      }
    }
    d.setDate(d.getDate() + 1);
  }
  if (!out.length) { ui.alert('Этот месяц уже есть в расписании.'); return; }
  var sh = sheet_(SHEETS.schedule);
  sh.getRange(sh.getLastRow() + 1, 1, out.length, 9).setValues(out);
  logAction_(Session.getActiveUser().getEmail(), 'добавлен месяц', ym + ' · строк: ' + out.length);
  ui.alert('Добавлено строк: ' + out.length + '. Воскресенья отмечены выходными.');
}

function promptText_(ui, title, hint) {
  var res = ui.prompt(title, hint, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  return res.getResponseText();
}
