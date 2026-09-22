import { Figure } from './rig.js';
import { EXERCISES, EQUIPMENT, byId } from './exercises.js';
import { t, setLang, getLang, resolveLang, translateDom } from './i18n.js';
import { pickExercises as pick } from './rotation.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let settings = null;
let state = null;       // timer snapshot from the backend
let recent = [];        // exercise ids, most recent first
let plan = null;        // { kind: 'short'|'long', ids: [] } for the upcoming break
let session = null;     // the break in progress
let view = 'timer';
const figure = new Figure($('rig'));

// ── helpers ─────────────────────────────────────────────────────────────────

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const isBreak = (phase) => phase === 'short' || phase === 'long';
const exName = (ex) => ex.name[getLang()] ?? ex.name.en;

function toast(msg, ms = 3200) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

async function store(key, value) {
  try { await tiny.store.set(key, value); } catch {}
}

// ── sound ───────────────────────────────────────────────────────────────────

const sound = {
  ready: false,
  async init() {
    try {
      const s = tiny.audio.sampler;
      for (const name of ['focus-done', 'break-done', 'set-done', 'tick']) {
        let path = decodeURIComponent(new URL(`sounds/${name}.wav`, location.href).pathname);
        if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
        await s.load(name, path);
      }
      this.ready = true;
      this.volume();
    } catch (e) {
      report(`sampler unavailable: ${e?.message || e}`);
    }
  },
  volume() {
    if (this.ready) tiny.audio.sampler.master((settings?.volume ?? 80) / 100);
  },
  play(name, vol = 1) {
    if (!this.ready || settings?.muted) return;
    tiny.audio.sampler.play(name, { vol }).catch(() => {});
  },
};

// ── exercise rotation ───────────────────────────────────────────────────────

function pool() {
  return EXERCISES.filter((e) => settings.equipment.includes(e.equipment));
}

function pickExercises(n, exclude = []) {
  return pick(pool(), recent, n, exclude);
}

function upcomingBreakKind() {
  if (!state) return 'short';
  if (state.phase === 'focus') return state.round >= state.rounds ? 'long' : 'short';
  return state.phase;
}

async function ensurePlan() {
  const kind = upcomingBreakKind();
  const size = kind === 'long' ? settings.circuitSize : 1;
  const valid = plan && plan.kind === kind && plan.ids.length === size &&
    plan.ids.every((id) => byId(id) && settings.equipment.includes(byId(id).equipment));
  if (!valid) {
    plan = { kind, ids: pickExercises(size) };
    await store('plan', plan);
  }
  renderNext();
}

// ── break session ───────────────────────────────────────────────────────────

// A break is open-ended: one exercise at a time, and after its last set the
// user picks the next from a few suggestions, until the break ends. On long
// breaks the planned circuit leads the suggestions (session.queue).
async function startBreak() {
  await ensurePlan();
  const planned = plan.ids.slice();
  session = { ids: [], idx: -1, done: [], logged: [], queue: planned.slice(1), choosing: false, choices: [], timer: null };
  plan = null;
  await store('plan', null);
  if (planned.length) await beginExercise(planned[0]);
  else renderBreak();
}

async function beginExercise(id) {
  session.ids.push(id);
  session.done.push(0);
  session.logged.push(false);
  session.idx = session.ids.length - 1;
  session.queue = session.queue.filter((q) => q !== id);
  session.choosing = false;
  recent = [id, ...recent.filter((x) => x !== id)].slice(0, 12);
  await store('recent', recent);
  renderBreak();
}

// Three options: the next planned circuit move first (if any), then fresh picks
// that skip everything already done this break.
function buildChoices(skip = []) {
  const allowed = new Set(pool().map((e) => e.id));
  const lead = session.queue.filter((id) => allowed.has(id) && !skip.includes(id)).slice(0, 1);
  const rest = pickExercises(3 - lead.length, [...session.ids, ...lead, ...skip]);
  return [...lead, ...rest];
}

function openChooser() {
  if (!session) return;
  session.choosing = true;
  session.choices = buildChoices();
  renderBreak();
}

function moreChoices() {
  if (!session?.choosing) return;
  const shown = session.choices;
  let next = buildChoices(shown);
  if (!next.length) next = buildChoices();   // pool exhausted: start over
  session.choices = next;
  renderBreak();
}

function logProgress(i) {
  if (!session || session.logged[i] || !session.done[i]) return;
  const ex = byId(session.ids[i]);
  const sides = ex.perSide ? 2 : 1;
  session.logged[i] = true;
  tiny.api.call('logExercise', {
    exercise: ex.id, sets: session.done[i], amount: session.done[i] * ex.amount * sides, mode: ex.mode,
  }).catch(() => {});
}

function endBreak() {
  if (!session) return;
  stopSetTimer();
  session.ids.forEach((_, i) => logProgress(i));
  session = null;
  figure.stop();
  minis.forEach((m) => m.stop());
  minis = [];
}

function stopSetTimer() {
  if (session?.timer) { clearInterval(session.timer); session.timer = null; }
}

function markSet() {
  const i = session.idx;
  const ex = byId(session.ids[i]);
  session.done[i] = Math.min(ex.sets, session.done[i] + 1);
  sound.play('set-done', 0.7);
  renderBreak();
  if (session.done[i] >= ex.sets) {
    logProgress(i);
    // let the last set dot fill in, then offer what's next
    setTimeout(() => { if (session && session.idx === i && !session.choosing) openChooser(); }, 700);
  }
}

function onSetButton() {
  if (!session) return;
  const ex = byId(session.ids[session.idx]);
  if (session.done[session.idx] >= ex.sets) return;
  if (ex.mode === 'time') {
    if (session.timer) return;
    const endsAt = Date.now() + ex.amount * 1000;
    const step = () => {
      const left = endsAt - Date.now();
      if (left <= 0) { stopSetTimer(); markSet(); return; }
      $('setBtn').textContent = `${Math.ceil(left / 1000)} ${t('secs')}`;
    };
    session.timer = setInterval(step, 200);
    renderBreak();   // Swap becomes Reset while the timed set runs
    step();
  } else {
    markSet();
  }
}

function resetSets() {
  if (!session || session.idx < 0 || session.choosing) return;
  stopSetTimer();
  session.done[session.idx] = 0;
  renderBreak();
}

async function swapExercise() {
  if (!session || session.timer || session.idx < 0) return;
  const i = session.idx;
  const [id] = pickExercises(1, [...session.ids, ...session.queue]);
  if (!id || id === session.ids[i]) return;
  session.ids[i] = id;
  session.done[i] = 0;
  session.logged[i] = false;
  recent = [id, ...recent.filter((x) => x !== id)].slice(0, 12);
  await store('recent', recent);
  renderBreak();
}

// ── rendering ───────────────────────────────────────────────────────────────

const DIAL = 2 * Math.PI * 88;

function renderTimer() {
  if (!state) return;
  const brk = isBreak(state.phase);
  document.body.classList.toggle('is-break', brk);
  $('focusPane').hidden = brk;
  $('breakPane').hidden = !brk;

  const frac = state.total ? 1 - state.remaining / state.total : 0;
  $('time').textContent = fmt(state.remaining);
  $('timeSm').textContent = fmt(state.remaining);
  $('phaseLabel').textContent = t(state.phase);
  $('breakPhaseLabel').textContent = t(state.phase);
  $('roundLabel').textContent = t('round', { n: state.round, total: state.rounds });
  $('dialFill').style.strokeDashoffset = String(DIAL * (1 - frac));
  $('breakProgress').style.width = `${(frac * 100).toFixed(2)}%`;

  const fresh = state.remaining === state.total;
  $('toggleBtn').textContent = state.running ? t('pause') : fresh ? t('start') : t('resume');
  $('toggleSmIcon').innerHTML = state.running
    ? '<path d="M8 5v14M16 5v14"/>'
    : '<path d="M7 5l12 7-12 7z"/>';
  $('toggleSmBtn').title = state.running ? t('pause') : t('resume');
  document.title = state.running ? `${fmt(state.remaining)} · ${t(state.phase)}` : 'Arvudoro';
}

function renderNext() {
  const kind = upcomingBreakKind();
  if (!plan || !plan.ids.length) {
    $('nextLabel').textContent = t('nextBreak');
    $('nextName').textContent = pool().length ? '—' : t('noEquipment');
    return;
  }
  $('nextLabel').textContent = kind === 'long' && plan.ids.length > 1
    ? t('nextCircuit', { n: plan.ids.length })
    : t('nextBreak');
  $('nextName').textContent = plan.ids.map((id) => exName(byId(id))).join(' → ');
}

let loadedId = null;
let minis = [];

function renderBreak() {
  if (!session) return;
  const choosing = session.choosing;
  $('exercise').hidden = choosing || session.idx < 0;
  $('chooser').hidden = !choosing;
  if (choosing) { renderChooser(); return; }
  minis.forEach((m) => m.stop());
  minis = [];
  if (session.idx < 0) return;

  const i = session.idx;
  const ex = byId(session.ids[i]);
  const lang = getLang();

  if (loadedId !== ex.id || !figure.raf) {
    figure.load(ex);
    figure.play();
    loadedId = ex.id;
  }

  $('exStep').textContent = t('exerciseN', { n: i + 1 });
  $('exGroup').textContent = t('groups')[ex.group] ?? ex.group;
  $('exName').textContent = exName(ex);
  $('exDose').textContent = dose(ex);
  $('exCues').innerHTML = (ex.cues[lang] ?? ex.cues.en).map((c) => `<li>${esc(c)}</li>`).join('');

  const done = session.done[i];
  $('sets').innerHTML = Array.from({ length: ex.sets }, (_, k) =>
    `<span class="set-dot ${k < done ? 'done' : k === done ? 'active' : ''}"></span>`).join('');

  const finished = done >= ex.sets;
  const btn = $('setBtn');
  btn.disabled = finished || !!session.timer;
  if (!session.timer) btn.textContent = ex.mode === 'time' ? t('startSet') : t('setDone');
  // Swap before the first set; once a set is logged or a timed set is running
  // the same button resets this exercise's sets, which frees Swap again.
  const started = done > 0 || !!session.timer;
  const alt = $('swapBtn');
  alt.textContent = started ? t('resetSets') : t('swap');
  alt.title = started ? t('resetSetsHint') : '';
  alt.dataset.action = started ? 'reset' : 'swap';
  alt.disabled = finished;
  $('exStatus').textContent = finished ? t('allSetsDone') : t('setOf', { n: done + 1, total: ex.sets });

  const next = session.queue[0];
  $('exNext').hidden = !next;
  if (next) $('exNext').textContent = `${t('nextUp')}: ${exName(byId(next))}`;
}

function dose(ex) {
  const unit = ex.mode === 'time' ? t('secs') : ` ${t('reps')}`;
  return t('sets', { sets: ex.sets, amount: `${ex.amount}${unit}` }) + (ex.perSide ? ` · ${t('perSide')}` : '');
}

function renderChooser() {
  figure.stop();
  minis.forEach((m) => m.stop());
  const finished = session.done.filter((d, k) => d >= byId(session.ids[k]).sets).length;
  $('chooserCount').textContent = t('doneThisBreak', { n: finished });
  const box = $('choices');
  if (!session.choices.length) {
    box.innerHTML = `<p class="muted">${esc(t('noEquipment'))}</p>`;
    minis = [];
    return;
  }
  const hasLead = session.queue.includes(session.choices[0]);
  box.innerHTML = session.choices.map((id, k) => {
    const ex = byId(id);
    const tag = k === 0 && hasLead ? `<span class="chip chip-accent">${esc(t('circuitNext'))}</span>` : '';
    return `<button class="choice" data-id="${esc(id)}" type="button">
      <svg class="choice-rig" data-aspect="1.35" aria-hidden="true"></svg>
      <span class="choice-text">
        <span class="choice-name">${esc(exName(ex))}</span>
        <span class="choice-dose">${esc(dose(ex))}</span>
        <span class="choice-tags"><span class="chip">${esc(t('groups')[ex.group] ?? ex.group)}</span>${tag}</span>
      </span>
      <kbd class="choice-key">${k + 1}</kbd>
    </button>`;
  }).join('');
  minis = [...box.querySelectorAll('.choice-rig')].map((svg, k) => {
    const f = new Figure(svg);
    f.load(byId(session.choices[k]));
    f.play();
    return f;
  });
}

function chooseAt(k) {
  const id = session?.choosing && session.choices[k];
  if (id) beginExercise(id);
}

function showView(v) {
  view = v;
  for (const b of document.querySelectorAll('.tab')) b.setAttribute('aria-selected', String(b.dataset.view === v));
  for (const s of document.querySelectorAll('.view')) s.hidden = s.id !== `view-${v}`;
  if (v === 'stats') renderStats();
  if (v === 'timer' && session) renderBreak();
  if (v !== 'timer') { figure.stop(); minis.forEach((m) => m.stop()); }
  $('tooltip').hidden = true;
}

// ── stats ───────────────────────────────────────────────────────────────────

function dayKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function renderStats() {
  let s;
  try { s = await tiny.api.call('stats', { days: 7 }); } catch { s = null; }
  if (!s) return;
  const locale = getLang() === 'pt' ? 'pt-BR' : 'en';
  const days = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - k);
    days.push(d);
  }
  const focus = Object.fromEntries(s.focus.map((r) => [r.day, r]));
  const moves = Object.fromEntries(s.moves.map((r) => [r.day, r]));
  const today = s.today;
  const tf = focus[today] ?? { n: 0, secs: 0 };
  const tm = moves[today] ?? { n: 0, reps: 0 };

  const tile = (value, label, wide = false) =>
    `<div class="tile${wide ? ' wide' : ''}"><div class="tile-value">${esc(value)}</div><div class="tile-label">${esc(label)}</div></div>`;
  $('todayTiles').innerHTML =
    tile(tf.n, t('pomodoros')) + tile(Math.round((tf.secs || 0) / 60), t('focusMin')) +
    tile(tm.n, t('exercises')) + tile(tm.reps || 0, t('repsTotal')) +
    tile(s.streak, t('streak'), true);

  const chart = (el, rows, pick, unitLabel) => {
    const vals = days.map((d) => pick(rows[dayKey(d)]));
    const max = Math.max(1, ...vals);
    el.innerHTML = days.map((d, k) => {
      const v = vals[k];
      const key = dayKey(d);
      const label = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
      const full = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
      return `<div class="bar-col${key === today ? ' today' : ''}" data-tip="${esc(`${full}: ${v} ${unitLabel}`)}">
        <span class="bar-val">${v || ''}</span>
        <div class="bar${v ? '' : ' zero'}" style="height:${(v / max) * 84}%"></div>
        <span class="bar-day">${esc(label)}</span>
        <span class="bar-hit"></span>
      </div>`;
    }).join('');
  };
  chart($('chartFocus'), focus, (r) => r?.n ?? 0, t('pomodoros').toLowerCase());
  chart($('chartMoves'), moves, (r) => r?.n ?? 0, t('exercises').toLowerCase());

  $('topList').innerHTML = s.top.length
    ? s.top.map((r) => {
        const ex = byId(r.exercise);
        return `<li><span>${esc(ex ? exName(ex) : r.exercise)}</span><span class="n">${esc(t('times', { n: r.n }))}</span></li>`;
      }).join('')
    : `<li class="empty">${esc(t('nothingYet'))}</li>`;

  const tot = s.totals;
  $('totalTiles').innerHTML =
    tile(tot.pomodoros, t('pomodoros')) + tile(Math.round(tot.focusSecs / 60), t('focusMin')) +
    tile(tot.exercises, t('exercises')) + tile(tot.reps, t('repsTotal'));
}

function wireTooltips() {
  const tip = $('tooltip');
  const host = $('view-stats');
  host.addEventListener('mousemove', (e) => {
    const col = e.target.closest('.bar-col');
    if (!col) { tip.hidden = true; return; }
    tip.textContent = col.dataset.tip;
    tip.hidden = false;
    const r = host.getBoundingClientRect();
    const x = Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 8);
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${e.clientY - r.top + host.scrollTop - 36}px`;
  });
  host.addEventListener('mouseleave', () => { tip.hidden = true; });
}

// ── settings ────────────────────────────────────────────────────────────────

const SCHEMA = [
  { title: 'sTimer', rows: [
    { key: 'focusMin', type: 'range', min: 1, max: 90, unit: 'min', label: 'focusLen' },
    { key: 'shortMin', type: 'range', min: 1, max: 30, unit: 'min', label: 'shortLen' },
    { key: 'longMin', type: 'range', min: 1, max: 60, unit: 'min', label: 'longLen' },
    { key: 'rounds', type: 'range', min: 1, max: 12, label: 'roundsLen' },
  ] },
  { title: 'sExercise', rows: [
    { key: 'equipment', type: 'chips', label: 'equipment' },
    { key: 'circuitSize', type: 'range', min: 1, max: 5, label: 'circuitSize' },
  ] },
  { title: 'sBehavior', rows: [
    { key: 'autoStartBreak', type: 'switch' },
    { key: 'autoStartWork', type: 'switch' },
    { key: 'showOnBreak', type: 'switch' },
    { key: 'notifications', type: 'switch' },
    { key: 'alwaysOnTop', type: 'switch' },
    { key: 'minimizeToTrayOnClose', type: 'switch' },
    { key: 'autoStartOnLaunch', type: 'switch' },
    { key: 'startMinimized', type: 'switch' },
    { key: 'launchAtLogin', type: 'switch' },
  ] },
  { title: 'sSound', rows: [
    { key: 'muted', type: 'switch' },
    { key: 'volume', type: 'range', min: 0, max: 100, unit: '%', label: 'volume' },
    { key: 'tickWork', type: 'switch' },
    { key: 'tickBreak', type: 'switch' },
  ] },
  { title: 'sAppearance', rows: [
    { key: 'theme', type: 'select', label: 'theme',
      options: [['system', 'themeSystem'], ['dark', 'themeDark'], ['light', 'themeLight']] },
    { key: 'language', type: 'select', label: 'language',
      options: [['auto', 'langAuto'], ['en', null, 'English'], ['pt', null, 'Português (Brasil)']] },
  ] },
];

function renderSettings() {
  const form = $('settingsForm');
  form.innerHTML = SCHEMA.map((sec) => `<fieldset><legend class="eyebrow">${esc(t(sec.title))}</legend>${
    sec.rows.map((r) => {
      const id = `set-${r.key}`;
      const label = esc(t(r.label ?? r.key));
      const v = settings[r.key];
      if (r.type === 'switch') {
        return `<div class="row"><label for="${id}">${label}</label>
          <span class="switch"><input type="checkbox" id="${id}" data-key="${r.key}" ${v ? 'checked' : ''}><span></span></span></div>`;
      }
      if (r.type === 'range') {
        const unit = r.unit === 'min' ? ` ${t('min')}` : r.unit ?? '';
        return `<div class="row range"><label for="${id}">${label}</label>
          <output id="${id}-out">${v}${esc(unit)}</output>
          <input type="range" id="${id}" data-key="${r.key}" min="${r.min}" max="${r.max}" value="${v}" data-unit="${esc(unit)}"></div>`;
      }
      if (r.type === 'select') {
        return `<div class="row"><label for="${id}">${label}</label>
          <select id="${id}" data-key="${r.key}">${r.options.map(([val, key, raw]) =>
            `<option value="${val}" ${v === val ? 'selected' : ''}>${esc(raw ?? t(key))}</option>`).join('')}</select></div>`;
      }
      if (r.type === 'chips') {
        return `<div class="row" style="border:0;min-height:0;padding-bottom:0"><span class="label">${label}</span></div>
          <div class="chips">${EQUIPMENT.map((eq) => `<label class="chip-check">
            <input type="checkbox" data-equipment="${eq}" ${v.includes(eq) ? 'checked' : ''}><span>${esc(t(`eq_${eq}`))}</span></label>`).join('')}</div>`;
      }
      return '';
    }).join('')}</fieldset>`).join('');
}

async function saveSettings(patch) {
  settings = await tiny.api.call('setSettings', patch);
  applySettings(Object.keys(patch));
}

function applySettings(keys = null) {
  const has = (k) => !keys || keys.includes(k);
  if (has('theme')) applyTheme();
  if (has('language')) {
    const l = resolveLang(settings.language);
    if (l !== getLang() || !keys) {
      setLang(l);
      translateDom();
      tiny.api.call('setLang', { lang: l }).catch(() => {});
      setMenu();
      if (keys) renderSettings();
      renderAbout();
      renderTimer();
      renderNext();
      if (session) renderBreak();
    }
  }
  if (has('volume')) sound.volume();
  if (has('equipment') || has('circuitSize') || has('rounds')) ensurePlan();
}

let systemDark = true;
function applyTheme() {
  const th = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;
  document.documentElement.dataset.theme = th;
}

function wireSettings() {
  const form = $('settingsForm');
  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.type === 'range') {
      $(`${el.id}-out`).textContent = `${el.value}${el.dataset.unit}`;
    }
  });
  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.equipment) {
      const eq = [...form.querySelectorAll('[data-equipment]')].filter((x) => x.checked).map((x) => x.dataset.equipment);
      saveSettings({ equipment: eq });
      return;
    }
    const key = el.dataset.key;
    if (!key) return;
    const value = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    saveSettings({ [key]: value });
  });
}

function renderAbout() {
  $('aboutBy').innerHTML = esc(t('aboutBy', { author: '§' }))
    .replace('§', '<a href="https://github.com/samoaste" data-external>@samoaste</a>');
}

// ── menu & shortcuts ────────────────────────────────────────────────────────

function setMenu() {
  tiny.menu.set([
    { title: 'Arvudoro', items: [
      { id: 'toggle', label: `${t('start')} / ${t('pause')}` },
      { id: 'skip', label: t('skip') },
      { id: 'restart', label: t('restart') },
      { id: 'resetAll', label: t('resetAll') },
      { separator: true },
      { id: 'view-timer', label: t('timer'), key: '1' },
      { id: 'view-stats', label: t('stats'), key: '2' },
      { id: 'view-settings', label: t('settings'), key: ',' },
      { separator: true },
      { id: 'about', label: t('sAbout') },
    ] },
  ]).catch(() => {});
}

function onMenu(id) {
  if (id === 'toggle') tiny.api.call('toggle');
  if (id === 'skip') tiny.api.call('skip');
  if (id === 'restart') tiny.api.call('reset');
  if (id === 'resetAll') tiny.api.call('resetAll');
  if (id.startsWith('view-')) showView(id.slice(5));
  if (id === 'about') { showView('settings'); $('about').scrollIntoView(); }
}

// ── events from the backend ─────────────────────────────────────────────────

function onState(s) {
  const prev = state;
  state = s;
  renderTimer();
  if (prev && (prev.round !== s.round || prev.phase !== s.phase || prev.rounds !== s.rounds) && !isBreak(s.phase)) {
    ensurePlan();
  }
}

function onTick(s) {
  onState(s);
  if (s.running && settings) {
    const on = s.phase === 'focus' ? settings.tickWork : settings.tickBreak;
    if (on) sound.play('tick', 0.5);
  }
}

async function onPhaseEnd({ from, to, state: s, skipped }) {
  state = s;
  if (isBreak(from)) endBreak();
  if (!skipped) sound.play(isBreak(to) ? 'focus-done' : 'break-done');
  if (isBreak(to)) {
    showView('timer');
    renderTimer();
    await startBreak();
  } else {
    await ensurePlan();
    if (!skipped) toast(t('breakOver'));
  }
  renderTimer();
}

// ── boot ────────────────────────────────────────────────────────────────────

async function waitForTiny() {
  for (let i = 0; i < 100 && !window.tiny; i++) await new Promise((r) => setTimeout(r, 30));
  if (!window.tiny) throw new Error('tiny bridge missing');
}

async function boot() {
  await waitForTiny();
  let dir = decodeURIComponent(new URL('.', location.href).pathname).replace(/\/$/, '');
  if (/^\/[A-Za-z]:\//.test(dir)) dir = dir.slice(1);

  const early = resolveLang('auto');
  const res = await tiny.api.call('boot', { frontendDir: dir, lang: early });
  settings = res.settings;
  state = res.state;
  recent = (await tiny.store.get('recent').catch(() => null)) ?? [];
  plan = (await tiny.store.get('plan').catch(() => null)) ?? null;

  try {
    const th = await tiny.theme.get();
    if (th) systemDark = !!th.dark;
    tiny.theme.on((dark) => { systemDark = dark; applyTheme(); });
  } catch {}

  setLang(resolveLang(settings.language));
  applySettings();
  renderSettings();
  wireSettings();
  wireTooltips();

  try {
    const info = await tiny.app.info();
    $('version').textContent = `v${info.version}`;
  } catch {}

  tiny.api.on('tick', onTick);
  tiny.api.on('state', onState);
  tiny.api.on('phase-end', onPhaseEnd);
  tiny.api.on('focus-window', () => showView('timer'));
  tiny.menu.on(onMenu);
  tiny.win.setMinSize(360, 560);
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!session || session.idx < 0) return;
      if (session.choosing) { renderChooser(); return; }
      figure.load(byId(session.ids[session.idx]));   // viewBox follows the new aspect
      figure.play();
    }, 150);
  });

  for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => showView(b.dataset.view));
  $('toggleBtn').addEventListener('click', () => tiny.api.call('toggle'));
  $('toggleSmBtn').addEventListener('click', () => tiny.api.call('toggle'));
  $('skipBtn').addEventListener('click', () => tiny.api.call('skip'));
  $('skipSmBtn').addEventListener('click', () => tiny.api.call('skip'));
  $('restartBtn').addEventListener('click', () => tiny.api.call('reset'));
  $('restartBtn').title = t('restart');
  $('skipBtn').title = t('skip');
  $('skipSmBtn').title = t('skip');
  $('setBtn').addEventListener('click', onSetButton);
  $('swapBtn').addEventListener('click', (e) =>
    e.currentTarget.dataset.action === 'reset' ? resetSets() : swapExercise());
  $('moreBtn').addEventListener('click', moreChoices);
  $('choices').addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (b) beginExercise(b.dataset.id);
  });
  $('nextCard').addEventListener('click', async () => {
    // reroll the preview
    plan = null;
    await ensurePlan();
  });
  $('clearStats').addEventListener('click', async () => {
    const ok = await tiny.dialog.confirm(t('clearConfirm'), { detail: t('clearDetail') });
    if (ok) { await tiny.api.call('clearStats'); renderStats(); }
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-external]');
    if (a) { e.preventDefault(); tiny.app.shell.open(a.href); }
  });
  document.addEventListener('keydown', (e) => {
    // focused controls handle their own keys (a button's Enter/Space is its click)
    if (e.target.closest('input, select, textarea, button, a') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); tiny.api.call('toggle'); }
    else if (e.key === 's') tiny.api.call('skip');
    else if (e.key === 'r') tiny.api.call('reset');
    else if (session?.choosing && view === 'timer' && /^[1-3]$/.test(e.key)) chooseAt(+e.key - 1);
    else if (e.key === 'Enter' && session && view === 'timer') session.choosing ? chooseAt(0) : onSetButton();
  });

  renderTimer();
  if (isBreak(state.phase)) await startBreak();
  else await ensurePlan();

  await sound.init();
}

// page errors go to the backend log (visible in the `tinyjs dev` terminal)
const report = (msg) => { try { tiny.api.call('log', { msg: String(msg) }); } catch {} };
window.addEventListener('error', (e) => report(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => report(`unhandled: ${e.reason?.stack || e.reason}`));

boot().catch((e) => {
  report(`boot failed: ${e.stack || e}`);
  console.error(e);
  toast('Arvudoro failed to start: ' + e.message, 10000);
});
