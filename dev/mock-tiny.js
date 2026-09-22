// Minimal in-page stand-in for the tiny bridge so the UI can be rendered in a
// plain browser (dev/app.html). ?phase=short|long|focus  ?theme=light  ?lang=pt  ?view=stats
const q = new URLSearchParams(location.search);
const listeners = {};
const settings = {
  focusMin: 25, shortMin: 5, longMin: 15, rounds: 4, autoStartBreak: false, autoStartWork: false,
  autoStartOnLaunch: false, alwaysOnTop: false, notifications: true, minimizeToTrayOnClose: true,
  startMinimized: false, launchAtLogin: false, showOnBreak: true, muted: false, volume: 80,
  tickWork: false, tickBreak: false, theme: q.get('theme') || 'system', language: q.get('lang') || 'auto',
  equipment: q.get('eq') ? q.get('eq').split(',') : ['dumbbell', 'bar', 'rope', 'body'], circuitSize: 3,
};
const phase = q.get('phase') || 'focus';
const total = 60000 * (phase === 'focus' ? 25 : phase === 'short' ? 5 : 15);
const state = { phase, round: phase === 'long' ? 4 : 2, rounds: 4, running: true, remaining: total * 0.62, total };
const day = (k) => { const d = new Date(); d.setDate(d.getDate() - k); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const mem = {};
window.tiny = {
  api: {
    on(ev, fn) { (listeners[ev] ||= []).push(fn); return () => {}; },
    async call(m, p) {
      if (m === 'boot') return { settings, state, firstRun: false };
      if (m === 'setSettings') { Object.assign(settings, p); return settings; }
      if (m === 'stats') return {
        today: day(0), streak: 5,
        focus: [6, 5, 4, 3, 2, 1, 0].map((k, i) => ({ day: day(k), n: [4, 6, 0, 5, 8, 3, 2][i], secs: [4, 6, 0, 5, 8, 3, 2][i] * 1500 })),
        moves: [6, 5, 4, 3, 2, 1, 0].map((k, i) => ({ day: day(k), n: [3, 5, 0, 4, 7, 3, 2][i], reps: 60, secs: 0 })),
        top: [{ exercise: 'squat-press', n: 9 }, { exercise: 'gorilla-row', n: 7 }, { exercise: 'burpee', n: 6 }],
        totals: { pomodoros: 128, focusSecs: 128 * 1500, exercises: 97, reps: 2410 },
      };
      if (m === 'toggle') { state.running = !state.running; return state; }
      return true;
    },
  },
  store: { async get(k) { return mem[k] ?? null; }, async set(k, v) { mem[k] = v; return true; } },
  theme: { async get() { return { dark: true }; }, on() {} },
  menu: { async set() {}, on() {} },
  win: { setMinSize() {} },
  app: { async info() { return { version: '0.1.0' }; }, shell: { open() {} } },
  audio: { sampler: { async load() {}, master() {}, async play() {} } },
  dialog: { async confirm() { return false; } },
};

if (q.get('view')) setTimeout(() => document.querySelector(`.tab[data-view="${q.get('view')}"]`)?.click(), 400);
// ?choose=1 — keep pressing "set done" until the next-exercise chooser shows
if (q.get('choose')) {
  const iv = setInterval(() => {
    const btn = document.getElementById('setBtn');
    if (!document.getElementById('chooser')?.hidden) { clearInterval(iv); return; }
    if (btn && !btn.disabled && !btn.closest('[hidden]')) btn.click();
  }, 300);
}

// ?clicks=N — press "set done" N times; &reset=1 — then press Reset
if (q.get('clicks')) {
  setTimeout(() => {
    for (let i = 0; i < +q.get('clicks'); i++) document.getElementById('setBtn').click();
    if (q.get('reset')) setTimeout(() => document.getElementById('swapBtn').click(), 200);
    setTimeout(() => console.log('STATE', document.getElementById('swapBtn').textContent, document.getElementById('exStatus').textContent), 500);
  }, 800);
}
