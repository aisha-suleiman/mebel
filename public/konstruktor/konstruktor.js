/* Страница конструктора: настройки, цена, отправка проекта в Telegram.
   Всё это работает и без 3D: если сцена не загрузилась, размеры и цена
   остаются рабочими. */
import {
  TYPES, COLORS, SECTION_MIN, DRYER_CAB, equalSections, upperDefault, buildModel, estimate, describe
} from './model.js?v=6';

const CONTACTS = { sister: 'BintApandi', brother: 'AAA116Z' };
const SHORT = {
  w: 'w', w2: 'w2', h: 'h', d: 'd', cols: 'c', rows: 'r', gap: 'g', forma: 'f',
  nizh: 'n', dveri: 'o', shtanga: 's', tumby: 'tb', front: 'fr', susilka: 'sh', hLow: 'hn', hUp: 'hv',
  wUp: 'wu', w2Up: 'w2u', dUp: 'du'
};
const SECTION_STEP = 10;

/* перевод из i18n.js; если он не загрузился, остаётся русский */
const tr = (key, vars) => (window.t ? window.t(key, vars)
  : key.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m)));

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
  groups(type).forEach((g) => { out[g.key] = defaultSections(g, out); });
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
  groups(type).forEach((g) => { s[g.key] = fitGroup(g, s); });
}

/* ---------- Ширина каждого шкафа или отсека ----------
   Это ширины по осям перегородок, в сумме равные общей ширине ряда. Ниша не
   меняется: если один шкаф шире, соседний на столько же уже. Группы описывают,
   какие ряды можно так настраивать. */
const GROUPS = {
  shkaf: [
    { key: 'sw', param: 'sw', total: 'w', after: 'cols', title: 'Ширина отсеков', item: 'Отсек',
      hint: 'Сумма всегда равна ширине шкафа: соседний отсек подстраивается сам.' }
  ],
  kuhnya: [
    { key: 'swL', param: 'sl', total: 'w', after: 'susilka', title: 'Ширина нижних шкафов', item: 'Нижний шкаф',
      hint: 'Сумма равна ширине нижних шкафов: соседний шкаф подстраивается сам.',
      when: (s) => s.nizh === 'da' },
    { key: 'swU', param: 'su', total: 'wUp', after: 'susilka', title: 'Ширина верхних шкафов', item: 'Верхний шкаф',
      hint: 'Сумма равна ширине верхних шкафов: соседний шкаф подстраивается сам.' }
  ]
};

function groups(type) { return GROUPS[type] || []; }
function activeGroups(type, s) { return groups(type).filter((g) => !g.when || g.when(s)); }

/* первый верхний шкаф под сушилку не меняется */
function fixedFirst(g, s) { return g.key === 'swU' && s.susilka === 'da' && s.cols > 1; }
function firstFree(g, s) { return fixedFirst(g, s) ? 1 : 0; }
function canAdjust(g, s) { return s.cols - firstFree(g, s) >= 2; }

function defaultSections(g, s) {
  return g.key === 'swU' ? upperDefault(s[g.total], s.cols, s.susilka === 'da') : equalSections(s[g.total], s.cols);
}

function fitList(sw, w, cols) {
  if (!Array.isArray(sw) || sw.length !== cols) return equalSections(w, cols);
  const sum = sw.reduce((a, b) => a + b, 0);
  if (sum === w) return sw;
  /* общая ширина изменилась: сохраняем пропорции */
  const out = sw.map((x) => Math.max(SECTION_MIN, Math.round((x * w) / sum / SECTION_STEP) * SECTION_STEP));
  out[cols - 1] = w - out.slice(0, -1).reduce((a, b) => a + b, 0);
  return out.every((x) => x >= SECTION_MIN) ? out : equalSections(w, cols);
}

function fitGroup(g, s) {
  const arr = s[g.key];
  const total = s[g.total];
  if (fixedFirst(g, s)) {
    if (!Array.isArray(arr) || arr.length !== s.cols || arr[0] !== DRYER_CAB) return defaultSections(g, s);
    return [DRYER_CAB, ...fitList(arr.slice(1), total - DRYER_CAB, s.cols - 1)];
  }
  return fitList(arr, total, s.cols);
}

function neighbourOf(g, s, i) {
  return i < s.cols - 1 ? i + 1 : i - 1;
}

function secId(g, i) { return `${g.key}:${i}`; }

function parseSecId(raw) {
  const [key, idx] = String(raw).split(':');
  const g = groups(state.type).find((x) => x.key === key);
  return g ? { g, i: Number(idx) } : null;
}

/* подтянуть поля ввода к данным группы */
function syncGroupDom(g, s) {
  s[g.key].forEach((v, i) => {
    const r = el.fields.querySelector(`[data-secr="${secId(g, i)}"]`);
    const nInput = el.fields.querySelector(`[data-sec="${secId(g, i)}"]`);
    if (r) {
      r.max = v + s[g.key][neighbourOf(g, s, i)] - SECTION_MIN;
      r.value = v;
      paintRange(r);
    }
    if (nInput) { nInput.max = r ? r.max : nInput.max; nInput.value = v; }
  });
}

function setSection(g, i, raw, source) {
  const s = values[state.type];
  const arr = s[g.key];
  const j = neighbourOf(g, s, i);
  if (i < firstFree(g, s) || j < firstFree(g, s)) return;
  const pair = arr[i] + arr[j];
  let v = Math.round(Number(raw) / SECTION_STEP) * SECTION_STEP;
  if (!Number.isFinite(v)) v = arr[i];
  v = Math.min(pair - SECTION_MIN, Math.max(SECTION_MIN, v));
  arr[i] = v;
  arr[j] = pair - v;
  [i, j].forEach((k) => {
    const r = el.fields.querySelector(`[data-secr="${secId(g, k)}"]`);
    const nInput = el.fields.querySelector(`[data-sec="${secId(g, k)}"]`);
    if (r && !(k === i && source === 'range')) r.value = arr[k];
    if (r) paintRange(r);
    if (nInput && !(k === i && source === 'typing')) nInput.value = arr[k];
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
  /* старые ссылки на кухню задавали один размер на оба ряда */
  if (state.type === 'kuhnya') {
    if (q.get('wu') === null && q.get('w') !== null) s.wUp = s.w;
    if (q.get('w2u') === null && q.get('w2') !== null) s.w2Up = s.w2;
  }
  fitDependents(state.type);
  groups(state.type).forEach((g) => {
    const raw = q.get(g.param);
    if (raw === null) return;
    const list = raw.split(',').map(Number);
    const ok = list.length === s.cols && list.every((x) => Number.isFinite(x) && x >= SECTION_MIN)
      && list.reduce((a, b) => a + b, 0) === s[g.total]
      && (!fixedFirst(g, s) || list[0] === DRYER_CAB);
    if (ok) s[g.key] = list;
  });
}

function projectUrl() {
  const q = new URLSearchParams({ t: state.type, col: state.color });
  const s = values[state.type];
  Object.entries(TYPES[state.type].fields).forEach(([k, f]) => {
    if (!f.when || f.when(s)) q.set(SHORT[k], s[k]);
  });
  activeGroups(state.type, s).forEach((g) => { if (s.cols > 1) q.set(g.param, s[g.key].join(',')); });
  return `${location.origin}${location.pathname}?${q}`;
}

/* ---------- Сцена подключается отдельно и может не загрузиться ---------- */
let view = null;

async function startScene() {
  try {
    const { createScene } = await import('./scene.js?v=6');
    view = createScene(el.stage, el.labels);
    el.status.hidden = true;
    refresh({ refit: true });
  } catch (err) {
    console.error(err);
    /* Обрыв связи и отсутствие 3D в браузере лечатся по-разному.
       Настройки лежат в адресе, поэтому перезагрузка их не теряет. */
    sceneError = /fetch|import|load/i.test(String(err && err.message)) ? 'network' : 'nowebgl';
    renderStatus();
  }
}

/* null: сцена грузится или уже работает */
let sceneError = null;

function renderStatus() {
  if (!sceneError) return;
  el.status.hidden = false;
  el.status.textContent = sceneError === 'network'
    ? tr('Модель не загрузилась, похоже, прервалась связь. Размеры и цена работают.')
    : tr('Этот браузер не показывает 3D-модель. Размеры, цена и отправка проекта работают.');
  if (sceneError === 'network') {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn--ghost';
    retry.textContent = tr('Повторить');
    retry.addEventListener('click', () => location.reload());
    el.status.append(retry);
  }
}

/* ---------- Отрисовка настроек ---------- */
function choiceHtml(name, options, current) {
  return Object.entries(options).map(([value, label]) => `
    <label class="choice__item">
      <input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}>
      <span>${tr(label)}</span>
    </label>`).join('');
}

function sizeHtml(attr, rangeAttr, id, label, value, min, max, step) {
  return `<div class="kf__head">
      <label class="kf__label" for="${id}">${label}</label>
      <span class="kf__num">
        <input class="mono" id="${id}" ${attr} type="number" inputmode="numeric"
          min="${min}" max="${max}" step="${step}" value="${value}">
        <span class="mono">${tr('мм')}</span>
      </span>
    </div>
    <input class="range" ${rangeAttr} type="range" aria-label="${label}"
      min="${min}" max="${max}" step="${step}" value="${value}">`;
}

function fieldHtml(key, f, s) {
  if (f.kind === 'choice') {
    return `<div class="kf" role="radiogroup" aria-label="${tr(f.label)}">
      <span class="kf__label">${tr(f.label)}</span>
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
      <span class="kf__label" id="l-${key}">${tr(f.label)}</span>
      <div class="stepper" role="group" aria-labelledby="l-${key}">
        <button type="button" class="stepper__btn stepper__btn--minus" data-step="${key}" data-by="-1" aria-label="${tr('Меньше')}"${atMin}></button>
        <output class="stepper__val mono" id="v-${key}">${s[key]}</output>
        <button type="button" class="stepper__btn stepper__btn--plus" data-step="${key}" data-by="1" aria-label="${tr('Больше')}"${atMax}></button>
      </div>
    </div>`;
  }
  const min = minFor(f, s);
  return `<div class="kf">
    ${sizeHtml(`data-num="${key}"`, `data-range="${key}"`, `n-${key}`, tr(f.label), s[key], min, f.max, f.step)}
    <div class="kf__limits mono"><span>${min}</span><span>${f.max}</span></div>
  </div>`;
}

/* Ширина каждого шкафа: ползунок отдаёт место соседнему */
function sectionsHtml(g, s) {
  const free = firstFree(g, s);
  const adjust = canAdjust(g, s);
  const rows = s[g.key].map((v, i) => {
    if (i < free || !adjust) {
      const why = i < free ? tr(', под сушилку') : '';
      return `<div class="kf__sec kf__sec--fixed">
        <span class="kf__label">${tr(g.item)} ${i + 1}${why}</span>
        <span class="mono kf__fixed">${v} ${tr('мм')}</span>
      </div>`;
    }
    const j = neighbourOf(g, s, i);
    const max = v + s[g.key][j] - SECTION_MIN;
    const id = secId(g, i);
    return `<div class="kf__sec">
      ${sizeHtml(`data-sec="${id}"`, `data-secr="${id}"`, `sw-${g.key}-${i}`, `${tr(g.item)} ${i + 1}`, v, SECTION_MIN, max, SECTION_STEP)}
    </div>`;
  }).join('');
  const dryerNote = free ? ` ${tr('Шкаф под сушилку фиксированный: внутри него ровно 80 см.')}` : '';
  return `<div class="kf kf--secs">
    <span class="kf__label">${tr(g.title)}</span>
    <p class="kf__hint">${tr(g.hint)}${dryerNote}</p>
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
    .map(([k, f]) => fieldHtml(k, f, s) + (s.cols > 1
      ? activeGroups(state.type, s).filter((g) => g.after === k).map((g) => sectionsHtml(g, s)).join('') : ''))
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
      <span style="--c:${c.hex}"><i class="sr">${tr(c.label)}</i></span>
    </label>`).join('');
  el.colorName.textContent = tr(COLORS[state.color].label);
}

/* ---------- Пересчёт ---------- */
function message(usd) {
  const lines = describe(state.type, values[state.type], tr);
  return [
    tr('Проект из конструктора'),
    ...lines,
    tr('Цвет: {c}', { c: tr(COLORS[state.color].label) }),
    tr('Примерная стоимость: {p} $', { p: usd }),
    tr('Проект: {u}', { u: projectUrl() })
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
    ? tr('Стоимость примерная, столешница считается отдельно. Чтобы узнать точную стоимость, свяжитесь с нами.')
    : tr('Стоимость примерная. Чтобы узнать точную стоимость, свяжитесь с нами.');

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
  el.doors.textContent = tr(state.labels[state.open ? 1 : 0]);

  history.replaceState(null, '', projectUrl());
  if (view) view.update(model, COLORS[state.color], opts);
}

function setNoDoors(on) {
  state.noDoors = on;
  el.noDoors.textContent = tr(on ? 'С дверями' : 'Без дверей');
  el.noDoors.setAttribute('aria-pressed', String(on));
  if (view) view.setDoorsShown(!on);
}

function setOpen(open) {
  state.open = open;
  el.doors.textContent = tr(state.labels[open ? 1 : 0]);
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
  /* общая ширина изменилась: ширины шкафов пересчитываются по пропорциям */
  groups(state.type).filter((g) => g.total === key).forEach((g) => {
    s[g.key] = fitGroup(g, s);
    syncGroupDom(g, s);
  });
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
  if (t.dataset.secr) {
    const p = parseSecId(t.dataset.secr);
    if (p) setSection(p.g, p.i, t.value, 'range');
  }
  if (t.dataset.num && t.value !== '') {
    const f = TYPES[state.type].fields[t.dataset.num];
    const v = Number(t.value);
    if (v >= minFor(f, s) && v <= maxFor(f, s)) setValue(t.dataset.num, t.value, 'typing');
  }
  if (t.dataset.sec && t.value !== '') {
    const p = parseSecId(t.dataset.sec);
    if (p) {
      const v = Number(t.value);
      const pair = s[p.g.key][p.i] + s[p.g.key][neighbourOf(p.g, s, p.i)];
      if (v >= SECTION_MIN && v <= pair - SECTION_MIN) setSection(p.g, p.i, v, 'typing');
    }
  }
});

/* На выходе из поля подводим число к допустимому, отпущенный ползунок
   обновляет пределы соседних отсеков */
el.fields.addEventListener('change', (e) => {
  const t = e.target;
  const s = values[state.type];
  if (t.dataset.num) setValue(t.dataset.num, t.value === '' ? s[t.dataset.num] : t.value, 'blur');
  if (t.dataset.sec) {
    const p = parseSecId(t.dataset.sec);
    if (p) setSection(p.g, p.i, t.value === '' ? s[p.g.key][p.i] : t.value, 'blur');
  }
  if (t.dataset.secr || t.dataset.sec) {
    const id = t.id;
    renderFields();
    const back = id && document.getElementById(id);
    if (back && t.dataset.sec) back.focus();
  }
  if (t.type === 'radio') {
    s[t.name] = t.value;
    /* сушилка меняет первый верхний шкаф: делим ширины заново */
    if (t.name === 'susilka') groups(state.type).forEach((g) => { s[g.key] = defaultSections(g, s); });
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
  /* новое число шкафов: делим ширину поровну заново */
  if (key === 'cols') groups(state.type).forEach((g) => { s[g.key] = defaultSections(g, s); });
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
    el.copied.textContent = tr('Скопировано');
  } catch (err) {
    el.copied.textContent = tr('Не получилось, выделите текст вручную');
  }
});

/* Смена языка: всё, что рисует этот скрипт, рисуется заново */
document.addEventListener('langchange', () => {
  el.copied.textContent = '';
  renderTypes();
  renderColors();
  renderFields();
  setNoDoors(state.noDoors);
  renderStatus();
  refresh();
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
