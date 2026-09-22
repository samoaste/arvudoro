// Arvudoro backend. The timer lives here, not in the page: hidden windows are
// throttled, the backend never is. Remaining time is always derived from a
// wall-clock deadline (endsAt), so sleep/wake and slow ticks can't drift it.

import { Database } from 'tjs:sqlite';

const DEFAULTS = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  rounds: 4,
  autoStartBreak: false,
  autoStartWork: false,
  autoStartOnLaunch: false,
  alwaysOnTop: false,
  notifications: true,
  minimizeToTrayOnClose: true,
  startMinimized: false,
  launchAtLogin: false,
  showOnBreak: true,
  muted: false,
  volume: 80,
  tickWork: false,
  tickBreak: false,
  theme: 'system',
  language: 'auto',
  equipment: ['dumbbell', 'bar', 'rope', 'body'],
  circuitSize: 3,
};

const STR = {
  en: {
    focus: 'Focus', short: 'Short break', long: 'Long break',
    focusDone: 'Focus done. Time to move!',
    breakDone: 'Break is over. Back to focus.',
    left: 'left', paused: 'paused',
    start: 'Start', pause: 'Pause', skip: 'Skip', show: 'Open Arvudoro', quit: 'Quit',
  },
  pt: {
    focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa',
    focusDone: 'Foco concluído. Hora de se mexer!',
    breakDone: 'Pausa encerrada. De volta ao foco.',
    left: 'restantes', paused: 'pausado',
    start: 'Iniciar', pause: 'Pausar', skip: 'Pular', show: 'Abrir Arvudoro', quit: 'Sair',
  },
};

let app = null;
let settings = { ...DEFAULTS };
let lang = 'en';
let frontendDir = null;
let db = null;
let firstRun = false;

const timer = {
  phase: 'focus',  // focus | short | long
  round: 1,
  running: false,
  endsAt: 0,       // ms epoch while running
  remaining: 0,    // ms while paused
  total: 0,        // ms, full length of the current phase
};

const phaseMs = (p) =>
  60000 * (p === 'focus' ? settings.focusMin : p === 'short' ? settings.shortMin : settings.longMin);

const remainingMs = () =>
  timer.running ? Math.max(0, timer.endsAt - Date.now()) : timer.remaining;

function snapshot() {
  return {
    phase: timer.phase,
    round: timer.round,
    rounds: settings.rounds,
    running: timer.running,
    remaining: remainingMs(),
    total: timer.total,
  };
}

function loadPhase(phase) {
  timer.phase = phase;
  timer.total = phaseMs(phase);
  timer.remaining = timer.total;
  timer.running = false;
  timer.endsAt = 0;
}

function start() {
  if (timer.running) return;
  timer.endsAt = Date.now() + timer.remaining;
  timer.running = true;
}

function pause() {
  if (!timer.running) return;
  timer.remaining = remainingMs();
  timer.running = false;
}

// ── persistence ─────────────────────────────────────────────────────────────

function dayKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function openDb() {
  const dir = app.paths.data;
  await tjs.makeDir(dir, { recursive: true });
  db = new Database(dir + '/arvudoro.db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL,
      kind TEXT NOT NULL, seconds INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL,
      exercise TEXT NOT NULL, sets INTEGER NOT NULL, amount INTEGER NOT NULL,
      mode TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_day ON sessions(day);
    CREATE INDEX IF NOT EXISTS exercises_day ON exercises(day);
  `);
}

function logSession(kind, seconds) {
  if (!db || seconds < 30) return;
  const ts = Date.now();
  db.prepare('INSERT INTO sessions (ts, day, kind, seconds) VALUES (?, ?, ?, ?)')
    .run(ts, dayKey(ts), kind, Math.round(seconds));
}

async function loadSettings() {
  const saved = await app.store.get('settings');
  if (saved) {
    settings = { ...DEFAULTS, ...saved };
  } else {
    firstRun = true;
    settings = { ...DEFAULTS };
    await app.store.set('settings', settings);
  }
}

function applyWindowSettings() {
  app.setAlwaysOnTop(!!settings.alwaysOnTop);
  app.setHideOnClose(!!settings.minimizeToTrayOnClose);
}

// ── tray ────────────────────────────────────────────────────────────────────

const t = (k) => (STR[lang] ?? STR.en)[k];
const fmt = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let trayKey = '';
function updateTray(force = false) {
  if (!frontendDir) return;
  const rem = remainingMs();
  const frac = timer.total ? 1 - rem / timer.total : 0;
  const kind = timer.phase === 'focus' ? 'focus' : 'break';
  const step = Math.min(16, Math.floor(frac * 16));
  const icon = `${frontendDir}/tray/${timer.running ? kind : 'idle'}-${String(timer.running ? step : 0).padStart(2, '0')}.png`;
  const mins = Math.ceil(rem / 60000);
  const status = `${t(timer.phase)} · ${timer.running ? `${mins} min ${t('left')}` : `${fmt(rem)} ${t('paused')}`}`;
  const key = [icon, status, timer.running, lang].join('|');
  if (!force && key === trayKey) return;
  trayKey = key;
  app.tray.set({
    icon,
    template: false,
    tooltip: `Arvudoro · ${status}`,
    menu: [
      { id: 'status', label: status, enabled: false },
      { separator: true },
      { id: 'toggle', label: timer.running ? t('pause') : t('start') },
      { id: 'skip', label: t('skip') },
      { separator: true },
      { id: 'show', label: t('show') },
      { id: 'quit', label: t('quit') },
    ],
  });
  app.progress(timer.running ? frac : null);
}

// ── phase transitions ───────────────────────────────────────────────────────

function nextPhase(completed) {
  const from = timer.phase;
  let to;
  if (from === 'focus') {
    to = timer.round >= settings.rounds ? 'long' : 'short';
  } else {
    to = 'focus';
    timer.round = from === 'long' ? 1 : Math.min(timer.round + 1, settings.rounds);
  }
  if (completed && from === 'focus') logSession('focus', timer.total / 1000);
  loadPhase(to);
  const auto = to === 'focus' ? settings.autoStartWork : settings.autoStartBreak;
  if (auto) start();
  return { from, to };
}

function completePhase() {
  const { from, to } = nextPhase(true);
  if (settings.notifications) {
    app.notify({
      id: 'phase',
      title: t(to),
      body: from === 'focus' ? t('focusDone') : t('breakDone'),
    });
  }
  if (to !== 'focus' && settings.showOnBreak) app.show();
  app.push('phase-end', { from, to, state: snapshot() });
  updateTray(true);
}

let lastSecond = -1;
function tick() {
  if (timer.running && Date.now() >= timer.endsAt) {
    completePhase();
    lastSecond = -1;
    return;
  }
  const sec = Math.ceil(remainingMs() / 1000);
  if (sec !== lastSecond) {
    lastSecond = sec;
    app.push('tick', snapshot());
    updateTray();
  }
}

function changed() {
  lastSecond = -1;
  app.push('state', snapshot());
  updateTray(true);
}

// ── api ─────────────────────────────────────────────────────────────────────

export const api = {
  async boot({ frontendDir: dir, lang: l }) {
    frontendDir = dir;
    if (l) lang = l;
    updateTray(true);
    return { settings, state: snapshot(), firstRun };
  },

  async setLang({ lang: l }) {
    lang = l === 'pt' ? 'pt' : 'en';
    updateTray(true);
    return true;
  },

  async toggle() {
    timer.running ? pause() : start();
    changed();
    return snapshot();
  },

  async skip() {
    const { from, to } = nextPhase(false);
    app.push('phase-end', { from, to, skipped: true, state: snapshot() });
    changed();
    return snapshot();
  },

  // restart the current phase from its full length
  async reset() {
    loadPhase(timer.phase);
    changed();
    return snapshot();
  },

  // back to round 1, focus, stopped
  async resetAll() {
    timer.round = 1;
    loadPhase('focus');
    changed();
    return snapshot();
  },

  async setSettings(patch) {
    const prev = settings;
    settings = { ...settings, ...patch };
    await app.store.set('settings', settings);
    applyWindowSettings();
    if ('launchAtLogin' in patch) {
      try { await app.launchAtLogin.set(!!settings.launchAtLogin); } catch {}
    }
    // a duration change applies right away to an untouched, stopped phase
    const key = { focus: 'focusMin', short: 'shortMin', long: 'longMin' }[timer.phase];
    if (!timer.running && timer.remaining === timer.total && prev[key] !== settings[key]) {
      loadPhase(timer.phase);
    }
    if (timer.round > settings.rounds) timer.round = settings.rounds;
    changed();
    return settings;
  },

  async logExercise({ exercise, sets, amount, mode }) {
    if (!db) return false;
    const ts = Date.now();
    db.prepare('INSERT INTO exercises (ts, day, exercise, sets, amount, mode) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ts, dayKey(ts), String(exercise), sets | 0, amount | 0, mode === 'time' ? 'time' : 'reps');
    return true;
  },

  async stats({ days = 7 } = {}) {
    if (!db) return null;
    const since = dayKey(Date.now() - (days - 1) * 86400000);
    const focus = db.prepare(
      "SELECT day, COUNT(*) AS n, SUM(seconds) AS secs FROM sessions WHERE kind = 'focus' AND day >= ? GROUP BY day"
    ).all(since);
    const moves = db.prepare(
      `SELECT day, COUNT(*) AS n,
              SUM(CASE WHEN mode = 'reps' THEN amount ELSE 0 END) AS reps,
              SUM(CASE WHEN mode = 'time' THEN amount ELSE 0 END) AS secs
       FROM exercises WHERE day >= ? GROUP BY day`
    ).all(since);
    const top = db.prepare(
      'SELECT exercise, COUNT(*) AS n, SUM(amount) AS amount, mode FROM exercises GROUP BY exercise ORDER BY n DESC LIMIT 5'
    ).all();
    const totals = db.prepare(
      "SELECT (SELECT COUNT(*) FROM sessions WHERE kind = 'focus') AS pomodoros, " +
      "(SELECT COALESCE(SUM(seconds), 0) FROM sessions WHERE kind = 'focus') AS focusSecs, " +
      '(SELECT COUNT(*) FROM exercises) AS exercises, ' +
      "(SELECT COALESCE(SUM(amount), 0) FROM exercises WHERE mode = 'reps') AS reps"
    ).all()[0];
    // streak: consecutive days (ending today or yesterday) with any activity
    const active = new Set(db.prepare(
      'SELECT day FROM sessions UNION SELECT day FROM exercises'
    ).all().map((r) => r.day));
    let streak = 0;
    let cursor = Date.now();
    if (!active.has(dayKey(cursor))) cursor -= 86400000;
    while (active.has(dayKey(cursor))) { streak++; cursor -= 86400000; }
    return { since, focus, moves, top, totals, streak, today: dayKey(Date.now()) };
  },

  async clearStats() {
    if (!db) return false;
    db.exec('DELETE FROM sessions; DELETE FROM exercises;');
    return true;
  },
};

// ── lifecycle ───────────────────────────────────────────────────────────────

export async function init(a) {
  app = a;
  await loadSettings();
  try {
    await openDb();
  } catch (e) {
    console.log('arvudoro: stats disabled, sqlite failed:', String(e));
  }
  loadPhase('focus');
  applyWindowSettings();
  if (settings.startMinimized) app.hide();
  if (settings.autoStartOnLaunch) start();
  setInterval(tick, 200);
}

export function onTray(id) {
  if (id === 'toggle') api.toggle();
  if (id === 'skip') api.skip();
  if (id === 'show') { app.show(); app.push('focus-window'); }
  if (id === 'quit') app.quit();
}

export function onNotificationClick() {
  app.show();
}
