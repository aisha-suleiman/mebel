/* Страница конструктора: настройки, цена, отправка проекта в Telegram.
   Всё это работает и без 3D: если сцена не загрузилась, размеры и цена
   остаются рабочими. */
import { TYPES, COLORS, SECTION_MIN, equalSections, buildModel, estimate, describe } from './model.js';

const CONTACTS = { sister: 'BintApandi', brother: 'AAA116Z' };
const SHORT = {
  w: 'w', w2: 'w2', h: 'h', d: 'd', cols: 'c', rows: 'r', gap: 'g', forma: 'f',
  nizh: 'n', dveri: 'o', shtanga: 's', tumby: 'tb', front: 'fr', susilka: 'sh'
};
const SECTION_STEP = 10;

const $ = (id) => document.getElementById(id);
const el = {
  types: $('types'), fields: $('fields'), colors: $('colors'), colorName: $('color-name'),
  price: $('price'), send: $('send'), note: $('note'), sendText: $('send-text'),
  sister: $('to-sister'), brother: $('to-brother'), copy: $('copy'), copied: $('copied'),
  stage: $('stage'), labels: $('labels'), status: $('stage-status'), doors: $('doors'), noDoors: $('nodoors')
};

/* ---------- Состояние ---------- */
function defaults(type) {
  const out = {};
  Object.entries(TYPES[type].fields).forEach(([k, f]) => { out[k] = f.def; });
  if (type === 'shkaf') out.sw = equalSections(out.w, out.cols);
  return out;
}

/* Пределы могут зависеть от других полей: штанг не больше, чем отсеков,
   стол с тумбами не короче, чем нужно для места под ноги */
function maxFor(f, s) {
  return f.maxOf ? Math.min(f.max, s[f.maxOf]) : f.max;
}
/* Некоторые варианты выбора бывают только при определённых настройках */
function optionAllowed(f, value, s) {
  const rule = f.optionOk && f.optionOk[value];
  return !rule || rule(s);
}
function minFor(f, s) {
  return f.minFn ? Math.max(f.min, f.minFn(s)) : f.min;
}

function clampField(f, value, s) {
  if (f.kind === 'choice') return f.options[value] && optionAllowed(f, value, s) ? value : f.def;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return f.def;
  const step = f.step || 1;
  const snapped = f.min + Math.round((n - f.min) / step) * step;
  return Math.min(maxFor(f, s), Math.max(minFor(f, s), snapped));
}

/* После любой смены подтягиваем зависимые поля в допустимое */
function fitDependents(type) {
  const s = values[type];
  Object.entries(TYPES[type].fields).forEach(([k, f]) => {
    if (f.maxOf || f.minFn || f.optionOk) s[k] = clampField(f, s[k], s);
  });
  if (type === 'shkaf') s.sw = fitSections(s.sw, s.w, s.cols);
}

/* ---------- Ширина отсеков шкафа ----------
   Это ширины колонок по осям перегородок, в сумме равные ширине шкафа.
   Ниша не меняется: если один отсек шире, соседний на столько же уже. */
function fitSections(sw, w, cols) {
  if (!Array.isArray(sw) || sw.length !== cols) return equalSections(w, cols);
  const sum = sw.reduce((a, b) => a + b, 0);
  if (sum === w) return sw;
  /* общая ширина изменилась: сохраняем пропорции */
  const out = sw.map((x) => Math.max(SECTION_MIN, Math.round((x * w) / sum / SECTION_STEP) * SECTION_STEP));
  const rest = w - out.slice(0, -1).reduce((a, b) => a + b, 0);
  out[cols - 1] = rest;
  return out.every((x) => x >= SECTION_MIN) ? out : equalSections(w, cols);
}

function neighbourOf(i, cols) {
  return i < cols - 1 ? i + 1 : i - 1;
}

function setSection(i, raw, source) {
  const s = values.shkaf;
  const j = neighbourOf(i, s.cols);
  const pair = s.sw[i] + s.sw[j];
  let v = Math.round(Number(raw) / SECTION_STEP) * SECTION_STEP;
  if (!Number.isFinite(v)) v = s.sw[i];
  v = Math.min(pair - SECTION_MIN, Math.max(SECTION_MIN, v));
  s.sw[i] = v;
  s.sw[j] = pair - v;
  [i, j].forEach((k) => {
    const r = el.fields.querySelector(`[data-secr="${k}"]`);
    const n = el.fields.querySelector(`[data-sec="${k}"]`);
    if (r && !(k === i && source === 'range')) r.value = s.sw[k];
    if (r) paintRange(r);
    if (n && !(k === i && source === 'typing')) n.value = s.sw[k];
  });
  refreshSoon();
}

const state = { type: 'shkaf', color: 'bel', open: false, noDoors: false, labels: ['Открыть двери', 'Закрыть двери'] };
const values = {};
Object.keys(TYPES).forEach((t) => { values[t] = defaults(t); });

function readUrl() {
  const q = new URLSearchParams(location.search);
  if (TYPES[q.get('t')]) state.type = q.get('t');
  if (COLORS[q.get('col')]) state.color = q.get('col');
  const s = values[state.type];
  const fields = TYPES[state.type].fields;
  /* сначала выборы, потом числа: пределы чисел зависят от выборов */
  Object.entries(fields).sort(([, a], [, b]) => (a.kind === 'choice' ? -1 : 0) - (b.kind === 'choice' ? -1 : 0))
    .forEach(([k, f]) => {
      const raw = q.get(SHORT[k]);
      if (raw !== null) s[k] = clampField(f, raw, s);
    });
  if (state.type === 'shkaf') {
    const sw = (q.get('sw') || '').split(',').map(Number);
    const ok = sw.length === s.cols && sw.every((x) => Number.isFinite(x) && x >= SECTION_MIN)
      && sw.reduce((a, b) => a + b, 0) === s.w;
    s.sw = ok ? sw : equalSections(s.w, s.cols);
  }
  fitDependents(state.type);
}

function projectUrl() {
  const q = new URLSearchParams({ t: state.type, col: state.color });
  const s = values[state.type];
  Object.entries(TYPES[state.type].fields).forEach(([k, f]) => {
    if (!f.when || f.when(s)) q.set(SHORT[k], s[k]);
  });
  if (state.type === 'shkaf' && s.cols > 1) q.set('sw', s.sw.join(','));
  return `${location.origin}${location.pathname}?${q}`;
}

/* ---------- Сцена подключается отдельно и может не загрузиться ---------- */
let view = null;

async function startScene() {
  try {
    const { createScene } = await import('./scene.js');
    view = createScene(el.stage, el.labels);
    el.status.hidden = true;
    refresh({ refit: true });
  } catch (err) {
    console.error(err);
    /* Обрыв связи и отсутствие 3D в браузере лечатся по-разному.
       Настройки лежат в адресе, поэтому перезагрузка их не теряет. */
    const network = /fetch|import|load/i.test(String(err && err.message));
    el.status.textContent = network
      ? 'Модель не загрузилась, похоже, прервалась связь. Размеры и цена работают.'
      : 'Этот браузер не показывает 3D-модель. Размеры, цена и отправка проекта работают.';
    if (network) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn--ghost';
      retry.textContent = 'Повторить';
      retry.addEventListener('click', () => location.reload());
      el.status.append(retry);
    }
  }
}

/* ---------- Отрисовка настроек ---------- */
function choiceHtml(name, options, current) {
  return Object.entries(options).map(([value, label]) => `
    <label class="choice__item">
      <input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}>
      <span>${label}</span>
    </label>`).join('');
}

function sizeHtml(attr, rangeAttr, id, label, value, min, max, step) {
  return `<div class="kf__head">
      <label class="kf__label" for="${id}">${label}</label>
      <span class="kf__num">
        <input class="mono" id="${id}" ${attr} type="number" inputmode="numeric"
          min="${min}" max="${max}" step="${step}" value="${value}">
        <span class="mono">мм</span>
      </span>
    </div>
    <input class="range" ${rangeAttr} type="range" aria-label="${label}"
      min="${min}" max="${max}" step="${step}" value="${value}">`;
}

function fieldHtml(key, f, s) {
  if (f.kind === 'choice') {
    return `<div class="kf" role="radiogroup" aria-label="${f.label}">
      <span class="kf__label">${f.label}</span>
      <div class="choice">${choiceHtml(key, Object.fromEntries(
        Object.entries(f.options).filter(([v]) => optionAllowed(f, v, s))), s[key])}</div>
    </div>`;
  }
  if (f.kind === 'count') {
    /* aria-disabled, а не disabled: иначе после нажатия на край фокус
       клавиатуры уходит со страницы */
    const atMin = s[key] <= f.min ? ' aria-disabled="true"' : '';
    const atMax = s[key] >= maxFor(f, s) ? ' aria-disabled="true"' : '';
    return `<div class="kf kf--row">
      <span class="kf__label" id="l-${key}">${f.label}</span>
      <div class="stepper" role="group" aria-labelledby="l-${key}">
        <button type="button" class="stepper__btn stepper__btn--minus" data-step="${key}" data-by="-1" aria-label="Меньше"${atMin}></button>
        <output class="stepper__val mono" id="v-${key}">${s[key]}</output>
        <button type="button" class="stepper__btn stepper__btn--plus" data-step="${key}" data-by="1" aria-label="Больше"${atMax}></button>
      </div>
    </div>`;
  }
  const min = minFor(f, s);
  return `<div class="kf">
    ${sizeHtml(`data-num="${key}"`, `data-range="${key}"`, `n-${key}`, f.label, s[key], min, f.max, f.step)}
    <div class="kf__limits mono"><span>${min}</span><span>${f.max}</span></div>
  </div>`;
}

/* Ширина каждого отсека: ползунок отдаёт место соседнему отсеку */
function sectionsHtml(s) {
  const rows = s.sw.map((v, i) => {
    const j = neighbourOf(i, s.cols);
    const max = v + s.sw[j] - SECTION_MIN;
    return `<div class="kf__sec">
      ${sizeHtml(`data-sec="${i}"`, `data-secr="${i}"`, `sw-${i}`, `Отсек ${i + 1}`, v, SECTION_MIN, max, SECTION_STEP)}
    </div>`;
  }).join('');
  return `<div class="kf kf--secs">
    <span class="kf__label">Ширина отсеков</span>
    <p class="kf__hint">Сумма всегда равна ширине шкафа: соседний отсек подстраивается сам.</p>
    ${rows}
  </div>`;
}

function paintRange(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--pct', `${pct}%`);
}

function renderFields() {
  const s = values[state.type];
  el.fields.innerHTML = Object.entries(TYPES[state.type].fields)
    .filter(([, f]) => !f.when || f.when(s))
    .map(([k, f]) => fieldHtml(k, f, s) + (state.type === 'shkaf' && k === 'cols' && s.cols > 1 ? sectionsHtml(s) : ''))
    .join('');
  el.fields.querySelectorAll('.range').forEach(paintRange);
}

function renderTypes() {
  el.types.innerHTML = choiceHtml('type', Object.fromEntries(
    Object.entries(TYPES).map(([k, t]) => [k, t.label])), state.type);
}

function renderColors() {
  el.colors.innerHTML = Object.entries(COLORS).map(([k, c]) => `
    <label class="swatch">
      <input type="radio" name="color" value="${k}"${k === state.color ? ' checked' : ''}>
      <span style="--c:${c.hex}"><i class="sr">${c.label}</i></span>
    </label>`).join('');
  el.colorName.textContent = COLORS[state.color].label;
}

/* ---------- Пересчёт ---------- */
function message(usd) {
  const lines = describe(state.type, values[state.type]);
  return [
    'Проект из конструктора',
    ...lines,
    `Цвет: ${COLORS[state.color].label}`,
    `Примерная стоимость: ${usd} $`,
    `Проект: ${projectUrl()}`
  ].join('\n');
}

function tgLink(user, text) {
  return `https://t.me/${user}?text=${encodeURIComponent(text)}`;
}

function refresh(opts) {
  const s = values[state.type];
  const model = buildModel(state.type, s);
  const sum = estimate(model);
  el.price.textContent = `${sum.usd} $`;
  el.note.textContent = state.type === 'kuhnya'
    ? 'Стоимость примерная, столешница считается отдельно. Точную назовём после замера.'
    : 'Стоимость примерная. Точную назовём после замера.';

  const text = message(sum.usd);
  el.sendText.textContent = text;
  el.sister.href = tgLink(CONTACTS.sister, text);
  el.brother.href = tgLink(CONTACTS.brother, text);

  /* у стола с ящиками кнопка их выдвигает, у остального открывает двери */
  const moving = model.doors.length + model.drawers.length;
  const realDrawers = model.drawers.some((d) => d.slide);
  state.labels = model.doors.length > 0 && realDrawers
    ? ['Открыть дверцу и ящики', 'Закрыть дверцу и ящики']
    : model.doors.length === 0 && state.type === 'stol'
      ? ['Выдвинуть ящики', 'Задвинуть ящики']
      : ['Открыть двери', 'Закрыть двери'];
  /* «без дверей» показываем у кухни: так видно, что лежит внутри шкафов */
  el.noDoors.hidden = !(state.type === 'kuhnya' && view);
  el.doors.hidden = !moving || !view || state.noDoors;
  if (!moving && state.open) setOpen(false);
  el.doors.textContent = state.labels[state.open ? 1 : 0];

  history.replaceState(null, '', projectUrl());
  if (view) view.update(model, COLORS[state.color], opts);
}

function setNoDoors(on) {
  state.noDoors = on;
  el.noDoors.textContent = on ? 'С дверями' : 'Без дверей';
  el.noDoors.setAttribute('aria-pressed', String(on));
  if (view) view.setDoorsShown(!on);
}

function setOpen(open) {
  state.open = open;
  el.doors.textContent = state.labels[open ? 1 : 0];
  el.doors.setAttribute('aria-pressed', String(open));
  if (view) view.setOpen(open);
}

let queued = false;
function refreshSoon() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; refresh(); });
}

/* ---------- События ---------- */
function setValue(key, raw, source) {
  const f = TYPES[state.type].fields[key];
  const s = values[state.type];
  s[key] = clampField(f, raw, s);
  if (state.type === 'shkaf' && key === 'w') {
    s.sw = fitSections(s.sw, s.w, s.cols);
    s.sw.forEach((v, i) => {
      const r = el.fields.querySelector(`[data-secr="${i}"]`);
      const n = el.fields.querySelector(`[data-sec="${i}"]`);
      if (r) { r.max = v + s.sw[neighbourOf(i, s.cols)] - SECTION_MIN; r.value = v; paintRange(r); }
      if (n) { n.max = r ? r.max : n.max; n.value = v; }
    });
  }
  const range = el.fields.querySelector(`[data-range="${key}"]`);
  const num = el.fields.querySelector(`[data-num="${key}"]`);
  if (range && source !== 'range') range.value = s[key];
  if (range) paintRange(range);
  if (num && source !== 'typing') num.value = s[key];
  refreshSoon();
}

el.types.addEventListener('change', (e) => {
  state.type = e.target.value;
  setOpen(false);
  setNoDoors(false);
  renderFields();
  refresh({ refit: true });
});

el.colors.addEventListener('change', (e) => {
  state.color = e.target.value;
  el.colorName.textContent = COLORS[state.color].label;
  refreshSoon();
});

el.fields.addEventListener('input', (e) => {
  const t = e.target;
  const s = values[state.type];
  if (t.dataset.range) setValue(t.dataset.range, t.value, 'range');
  if (t.dataset.secr) setSection(Number(t.dataset.secr), t.value, 'range');
  if (t.dataset.num && t.value !== '') {
    const f = TYPES[state.type].fields[t.dataset.num];
    const v = Number(t.value);
    if (v >= minFor(f, s) && v <= maxFor(f, s)) setValue(t.dataset.num, t.value, 'typing');
  }
  if (t.dataset.sec && t.value !== '') {
    const i = Number(t.dataset.sec);
    const v = Number(t.value);
    if (v >= SECTION_MIN && v <= s.sw[i] + s.sw[neighbourOf(i, s.cols)] - SECTION_MIN) setSection(i, v, 'typing');
  }
});

/* На выходе из поля подводим число к допустимому, отпущенный ползунок
   обновляет пределы соседних отсеков */
el.fields.addEventListener('change', (e) => {
  const t = e.target;
  const s = values[state.type];
  if (t.dataset.num) setValue(t.dataset.num, t.value === '' ? s[t.dataset.num] : t.value, 'blur');
  if (t.dataset.sec) setSection(Number(t.dataset.sec), t.value === '' ? s.sw[Number(t.dataset.sec)] : t.value, 'blur');
  if (t.dataset.secr || t.dataset.sec) {
    const id = t.id;
    renderFields();
    const back = id && document.getElementById(id);
    if (back && t.dataset.sec) back.focus();
  }
  if (t.type === 'radio') {
    s[t.name] = t.value;
    fitDependents(state.type);
    renderFields();
    refresh({ refit: true });
  }
});

el.fields.addEventListener('click', (e) => {
  const b = e.target.closest('[data-step]');
  if (!b) return;
  const key = b.dataset.step;
  const f = TYPES[state.type].fields[key];
  const s = values[state.type];
  const next = clampField(f, s[key] + Number(b.dataset.by), s);
  if (next === s[key]) return;
  s[key] = next;
  /* новое число отсеков: делим ширину поровну заново */
  if (state.type === 'shkaf' && key === 'cols') s.sw = equalSections(s.w, s.cols);
  fitDependents(state.type);
  renderFields();
  const again = el.fields.querySelector(`[data-step="${key}"][data-by="${b.dataset.by}"]`);
  if (again) again.focus();
  refreshSoon();
});

el.doors.addEventListener('click', () => setOpen(!state.open));
el.noDoors.addEventListener('click', () => {
  if (state.open) setOpen(false);
  setNoDoors(!state.noDoors);
  refresh();
});

$('send-btn').addEventListener('click', () => {
  el.send.hidden = false;
  el.send.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

el.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(el.sendText.textContent);
    el.copied.textContent = 'Скопировано';
  } catch (err) {
    el.copied.textContent = 'Не получилось, выделите текст вручную';
  }
});

const header = document.querySelector('.top');
window.addEventListener('scroll', () => {
  header.classList.toggle('is-stuck', window.scrollY > 12);
}, { passive: true });

/* ---------- Старт ---------- */
readUrl();
renderTypes();
renderColors();
renderFields();
refresh();
startScene();
