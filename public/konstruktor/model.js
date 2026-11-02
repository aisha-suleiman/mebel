/* Модель изделия и расчёт цены. Без 3D и без страницы: один и тот же
   список деталей рисуется в сцене и идёт в смету, поэтому цена всегда
   соответствует тому, что видно на экране. Все размеры в миллиметрах. */

/* ---------- Цены: всё, что меняется, только здесь ---------- */
export const PRICE = {
  sheetUsd: 55,        /* лист МДФ */
  backSheetUsd: 10,    /* лист для задних стенок и дна ящиков, размер листа тот же */
  sheetW: 2100,
  sheetH: 2800,
  edgeUsdPerM: 0.7,    /* обклейка кромки за погонный метр */
  hingeUsd: 0.5,       /* одна петля: две стоят 1 доллар */
  handleUsd: 2,        /* одна ручка */
  /* комплект направляющих: длина в мм и цена. Берём самую длинную, что
     не длиннее ящика, а для совсем короткого ящика самую короткую. */
  slidePrices: { 300: 2, 500: 3, 600: 5 },
  kupeRailsUsd: 8,     /* рельсы купе: верхний и нижний, один комплект на шкаф */
  railUsdPerM: 1,      /* штанга для одежды за погонный метр */
  dryerUsd: 15,        /* сушилка для посуды шириной 90 см */
  markup: 1.5          /* ко всей себестоимости плюс 50 % */
};

const T = 16;          /* толщина панели */
const PL = 80;         /* цоколь шкафа */

/* Отсеки шкафа: самый узкий допустимый и деление поровну */
export const SECTION_MIN = 300;
export function equalSections(w, cols) {
  const base = Math.floor(w / cols / 10) * 10;
  const out = Array(cols).fill(base);
  out[cols - 1] = w - base * (cols - 1);
  return out;
}

/* ---------- Что можно настроить в каждом изделии ---------- */
export const TYPES = {
  kuhnya: {
    label: 'Кухня',
    fields: {
      forma: { kind: 'choice', label: 'Форма', def: 'pryam',
        options: { pryam: 'Прямая', ugol: 'Угловая' } },
      w: { kind: 'size', label: 'Длина', min: 1200, max: 4200, step: 50, def: 2400 },
      w2: { kind: 'size', label: 'Вторая сторона', min: 1200, max: 3000, step: 50, def: 1800,
        when: (s) => s.forma === 'ugol' },
      d: { kind: 'size', label: 'Глубина', min: 450, max: 650, step: 10, def: 600 },
      cols: { kind: 'count', label: 'Шкафов в ряду', min: 2, max: 8, def: 4 },
      nizh: { kind: 'choice', label: 'Нижние шкафы', def: 'da',
        options: { da: 'С нижними', net: 'Без нижних' } },
      susilka: { kind: 'choice', label: 'Сушилка для посуды', def: 'da',
        options: { net: 'Без сушилки', da: 'С сушилкой 90 см' } }
    }
  },
  shkaf: {
    label: 'Шкаф',
    fields: {
      w: { kind: 'size', label: 'Ширина', min: 600, max: 2800, step: 10, def: 1800 },
      h: { kind: 'size', label: 'Высота', min: 1800, max: 2700, step: 10, def: 2400 },
      d: { kind: 'size', label: 'Глубина', min: 350, max: 600, step: 10, def: 600 },
      cols: { kind: 'count', label: 'Отсеков', min: 1, max: 6, def: 3 },
      /* верхний предел зависит от числа отсеков: maxOf */
      shtanga: { kind: 'count', label: 'Со штангой для одежды', min: 0, max: 6, maxOf: 'cols', def: 1 },
      rows: { kind: 'count', label: 'Полок в отсеке', min: 1, max: 7, def: 4,
        when: (s) => s.shtanga < s.cols },
      dveri: { kind: 'choice', label: 'Двери', def: 'petli',
        options: { petli: 'На петлях', kupe: 'Купе', net: 'Без дверей' } }
    }
  },
  polki: {
    label: 'Полки',
    fields: {
      w: { kind: 'size', label: 'Длина', min: 300, max: 1800, step: 10, def: 900 },
      d: { kind: 'size', label: 'Глубина', min: 150, max: 400, step: 10, def: 250 },
      rows: { kind: 'count', label: 'Количество полок', min: 1, max: 6, def: 3 },
      gap: { kind: 'size', label: 'Между полками', min: 200, max: 500, step: 10, def: 300,
        when: (s) => s.rows > 1 }
    }
  },
  stol: {
    label: 'Стол',
    fields: {
      /* с тумбами стол должен быть длиннее, иначе не останется места для ног:
         minFn поднимает нижний предел */
      w: { kind: 'size', label: 'Длина', min: 800, max: 2400, step: 10, def: 1400,
        minFn: (s) => (s.tumby === 'dve' ? 1300 : s.tumby === 'odna' ? 1000 : 800) },
      d: { kind: 'size', label: 'Глубина', min: 500, max: 1000, step: 10, def: 700 },
      h: { kind: 'size', label: 'Высота', min: 700, max: 800, step: 5, def: 750 },
      tumby: { kind: 'choice', label: 'Тумбы', def: 'net',
        options: { net: 'Без тумб', odna: 'С одной стороны', dve: 'С двух сторон' } },
      front: { kind: 'choice', label: 'Тумба', def: 'yashiki',
        options: { dverca: 'С дверцей', yashiki: 'С ящиками', smesh: 'Дверца слева, ящики справа' },
        /* смешанный вариант возможен, только если тумбы с обеих сторон */
        optionOk: { smesh: (s) => s.tumby === 'dve' },
        when: (s) => s.tumby !== 'net' }
    }
  }
};

export const COLORS = {
  bel: { label: 'Белый', hex: '#EFEDE6', line: '#8E8A80' },
  ser: { label: 'Серый', hex: '#A9A8A2', line: '#5F5E59' },
  dub: { label: 'Светлый дуб', hex: '#CFA774', line: '#7D5F38', grain: true },
  orh: { label: 'Орех', hex: '#6E4A2F', line: '#3A2616', grain: true },
  gra: { label: 'Графит', hex: '#34373A', line: '#6D7276' }
};

/* ---------- Детали ----------
   k: body, front, back считаются как МДФ;
      stone и metal рисуются, но в смету не входят.
   s: размер [x, y, z], p: центр [x, y, z]. Кромка считается в смете сама. */
function part(list, k, s, p, extra) {
  list.push(Object.assign({ k, s, p, g: 'a' }, extra));
}

function addDoor(m, g, x0, x1, y0, y1, z, hingeLeft, handleY) {
  const id = m.doors.length;
  const hx = hingeLeft ? x0 : x1;
  m.doors.push({ id, g, x: hx, z, dir: hingeLeft ? -1 : 1, h: y1 - y0 });
  const w = x1 - x0, h = y1 - y0;
  part(m.parts, 'front', [w, h, T], [(x0 + x1) / 2, (y0 + y1) / 2, z + T / 2], { door: id, g });
  const nx = hingeLeft ? x1 - 34 : x0 + 34;
  part(m.parts, 'metal', [10, 130, 10], [nx, handleY, z + T + 12], { door: id, g, hw: 'handle' });
}

/* Двери-купе едут по двум направляющим: передней и задней, соседние
   створки заходят друг за друга на KUPE_OVERLAP. Корпус под купе мельче
   на KUPE_ZONE: в этой полосе спереди стоят направляющие и сами двери. */
const KUPE_ZONE = 100;
const KUPE_OVERLAP = 40;

function addKupe(m, w, h, d) {
  const P = m.parts;
  const n = Math.max(2, Math.round(w / 900));
  const dw = (w + KUPE_OVERLAP * (n - 1)) / n;
  const step = dw - KUPE_OVERLAP;
  const y0 = PL + 6, y1 = h - 30;
  const zFront = d - T / 2 - 18;
  const zBack = zFront - T - 18;

  part(P, 'metal', [w - 2 * T, 24, KUPE_ZONE - 10], [0, h - 12, d - KUPE_ZONE / 2], { hw: 'kupe' });
  part(P, 'metal', [w - 2 * T, 6, KUPE_ZONE - 10], [0, PL + 3, d - KUPE_ZONE / 2]);

  for (let i = 0; i < n; i++) {
    const front = i % 2 === 0;
    const x = -w / 2 + i * step + dw / 2;
    const z = front ? zFront : zBack;
    /* «открыть»: задние створки уезжают влево за переднюю соседку */
    let id;
    if (!front) {
      id = m.drawers.length;
      m.drawers.push({ id, g: 'a', dx: -step, dz: 0 });
    }
    const extra = id === undefined ? {} : { drawer: id };
    part(P, 'front', [dw, y1 - y0, T], [x, (y0 + y1) / 2, z], extra);
    part(P, 'metal', [8, Math.min(900, (y1 - y0) * 0.5), 6], [x + (front ? dw / 2 - 24 : -dw / 2 + 24), (y0 + y1) / 2, z + T / 2 + 3], { ...extra, hw: 'handle' });
  }
}

function buildShkaf(s) {
  const m = { parts: [], doors: [], drawers: [], dims: [] };
  const { w, h, d, cols, rows } = s;
  const rails = Math.min(s.shtanga, cols);
  const doors = s.dveri === 'petli';
  const kupe = s.dveri === 'kupe';
  const dep = doors ? d - T : kupe ? d - KUPE_ZONE : d;
  const P = m.parts;
  const H = h - PL - 2 * T;

  /* Ширины отсеков по осям перегородок. Неверные данные из адреса
     не ломают модель: тогда отсеки делятся поровну. */
  const ok = Array.isArray(s.sw) && s.sw.length === cols
    && s.sw.every((x) => x >= SECTION_MIN) && s.sw.reduce((a, b) => a + b, 0) === w;
  const sw = ok ? s.sw : equalSections(w, cols);
  const xb = [-w / 2];
  sw.forEach((c, i) => xb.push(xb[i] + c));

  part(P, 'back', [w, h - PL, 4], [0, PL + (h - PL) / 2, 2]);
  [-1, 1].forEach((n) => part(P, 'body', [T, h, dep], [n * (w - T) / 2, h / 2, dep / 2]));
  part(P, 'body', [w - 2 * T, T, dep], [0, h - T / 2, dep / 2]);
  part(P, 'body', [w - 2 * T, T, dep], [0, PL + T / 2, dep / 2]);
  part(P, 'body', [w - 2 * T, PL, T], [0, PL / 2, dep - 30]);

  for (let i = 0; i < cols; i++) {
    const left = i === 0 ? -w / 2 + T : xb[i] + T / 2;
    const right = i === cols - 1 ? w / 2 - T : xb[i + 1] - T / 2;
    const cw = right - left;
    const cx = (left + right) / 2;
    if (i > 0) part(P, 'body', [T, H, dep - 20], [xb[i], PL + T + H / 2, dep / 2]);
    if (i < rails) {
      /* Отсек для платьев: полка под шляпы сверху, под ней штанга,
         ниже пусто во всю высоту. Штанга это фурнитура, в смету не идёт. */
      const shelfY = h - T - 300;
      const railY = shelfY - T / 2 - 70;
      part(P, 'body', [cw, T, dep - 20], [cx, shelfY, dep / 2]);
      part(P, 'metal', [cw, 22, 22], [cx, railY, dep / 2], { hw: 'rail' });
      /* несколько плечиков, чтобы отсек читался как место для одежды */
      const hangers = Math.max(2, Math.min(5, Math.floor(cw / 110)));
      for (let k = 0; k < hangers; k++) {
        const hx = cx - cw / 2 + (cw * (k + 1)) / (hangers + 1);
        part(P, 'metal', [5, 46, 5], [hx, railY - 30, dep / 2]);
        part(P, 'metal', [5, 5, Math.min(420, dep - 80)], [hx, railY - 55, dep / 2]);
      }
    } else {
      for (let r = 1; r <= rows; r++) {
        const y = PL + T + (H * r) / (rows + 1);
        part(P, 'body', [cw, T, dep - 20], [cx, y, dep / 2]);
      }
    }
  }

  if (doors) {
    const handleY = Math.min(1100, h / 2);
    for (let i = 0; i < cols; i++) {
      /* широкий отсек закрывают две створки, чтобы дверь не была шире 650 */
      const each = Math.max(1, Math.ceil(sw[i] / 650));
      const dw = sw[i] / each;
      for (let j = 0; j < each; j++) {
        const x0 = xb[i] + j * dw + 1.5;
        addDoor(m, 'a', x0, x0 + dw - 3, PL + 2, h - 2, dep, (i + j) % 2 === 0, handleY);
      }
    }
  }
  if (kupe) addKupe(m, w, h, d);

  m.dims = [
    { a: [-w / 2, h, d], b: [w / 2, h, d], n: [0, 1, 0], v: w },
    { a: [w / 2, 0, d], b: [w / 2, h, d], n: [1, 0, 0], v: h },
    { a: [w / 2, 0, 0], b: [w / 2, 0, d], n: [1, 0, 0], v: d }
  ];
  return m;
}

/* Сушилка для посуды: два яруса прутков над поддоном. Размер сушилки это
   внутренняя ширина шкафа. Это фурнитура: в расчёт идёт по цене штуки. */
const DRYER_W = 900;
const DRYER_CAB = DRYER_W + 2 * T;

function addDryer(m, g, cx, innerW, dep, upY, upH) {
  const P = m.parts;
  const rodL = innerW - 20;
  const spread = Math.min(110, dep / 2 - 25);
  const z0 = dep / 2;
  part(P, 'metal', [innerW - 30, 10, dep - 40], [cx, upY + T + 14, z0], { g, hw: 'dryer' });
  const yTop = upY + upH - T - 230;
  [yTop, upY + T + 150].forEach((y) => {
    [-1, 1].forEach((q) => part(P, 'metal', [rodL, 8, 8], [cx, y, z0 + q * spread], { g }));
    const n = Math.floor(rodL / 90);
    for (let k = 0; k <= n; k++) {
      part(P, 'metal', [5, 5, spread * 2], [cx - rodL / 2 + (rodL * k) / n, y - 5, z0], { g });
    }
    [-1, 1].forEach((q) => part(P, 'metal', [6, 40, spread * 2 + 10], [cx + q * (rodL / 2), y - 18, z0], { g }));
  });

  /* Верхний ярус для тарелок: они стоят на ребре рядом друг с другом.
     p.s тарелки это [толщина по x, диаметр, диаметр]. */
  const dia = 220, pitch = 46;
  const count = Math.floor((rodL - 30) / pitch);
  const x0 = cx - ((count - 1) * pitch) / 2;
  for (let i = 0; i < count; i++) {
    part(P, 'plate', [8, dia, dia], [x0 + i * pitch, yTop + 4 + dia / 2, z0], { g });
  }
}

/* Один ряд кухни вдоль оси x, от from на длину len. Группа b это вторая сторона. */
function kitchenRun(m, g, from, len, cols, d, lower, upFrom, dryer) {
  const P = m.parts;
  const plinth = 100, baseH = 720, upY = 1400, upH = 720, upD = 320;
  const modW = len / cols;
  const y0 = plinth, y1 = plinth + baseH;

  /* нижние шкафы вместе со столешницей необязательны */
  if (lower) {
    part(P, 'body', [len, plinth, T], [from + len / 2, plinth / 2, d - 50], { g });
    for (let i = 0; i < cols; i++) {
      const x0 = from + i * modW, x1 = x0 + modW, cx = (x0 + x1) / 2;
      const dep = d - T;
      /* боковины до пола: иначе под шкафом с торца виден пустой зазор */
      [x0 + T / 2, x1 - T / 2].forEach((x) => part(P, 'body', [T, y1, dep], [x, y1 / 2, dep / 2], { g }));
      part(P, 'body', [modW - 2 * T, T, dep], [cx, y0 + T / 2, dep / 2], { g });
      part(P, 'body', [modW - 2 * T, T, dep - 20], [cx, y0 + baseH / 2, dep / 2], { g });
      part(P, 'back', [modW, baseH, 4], [cx, y0 + baseH / 2, 2], { g });
      const each = modW > 620 ? 2 : 1;
      const dw = modW / each;
      for (let j = 0; j < each; j++) {
        const a = x0 + j * dw + 1.5;
        addDoor(m, g, a, a + dw - 3, y0 + 2, y1 - 2, dep, j % 2 === 0, y1 - 90);
      }
    }
    part(P, 'stone', [len, 38, d + 20], [from + len / 2, y1 + 19, (d + 20) / 2], { g });
  }

  {
    const uLen = from + len - upFrom;
    /* Шкаф под сушилку: внутри ровно DRYER_W, остальные верхние шкафы делят
       оставшуюся длину, сохраняя примерно прежний размер модуля. */
    const hasDryer = dryer && uLen >= DRYER_CAB + 150;
    let widths = Array(cols).fill(uLen / cols);
    if (hasDryer) {
      const n = Math.max(1, Math.round((uLen - DRYER_CAB) / (uLen / cols)));
      widths = [DRYER_CAB, ...Array(n).fill((uLen - DRYER_CAB) / n)];
    }
    let xs = upFrom;
    widths.forEach((uW, i) => {
      const x0 = xs, x1 = x0 + uW, cx = (x0 + x1) / 2;
      xs = x1;
      const dep = upD - T;
      [x0 + T / 2, x1 - T / 2].forEach((x) => part(P, 'body', [T, upH, dep], [x, upY + upH / 2, dep / 2], { g }));
      [upY + T / 2, upY + upH - T / 2].forEach((y) => part(P, 'body', [uW - 2 * T, T, dep], [cx, y, dep / 2], { g }));
      part(P, 'back', [uW, upH, 4], [cx, upY + upH / 2, 2], { g });
      if (hasDryer && i === 0) addDryer(m, g, cx, uW - 2 * T, dep, upY, upH);
      const each = uW > 620 ? 2 : 1;
      const dw = uW / each;
      for (let j = 0; j < each; j++) {
        const a = x0 + j * dw + 1.5;
        addDoor(m, g, a, a + dw - 3, upY + 2, upY + upH - 2, dep, j % 2 === 0, upY + 90);
      }
    });
  }
}

function buildKuhnya(s) {
  const m = { parts: [], doors: [], dims: [] };
  const { w, d, cols } = s;
  const lower = s.nizh === 'da';
  const ugol = s.forma === 'ugol';
  kitchenRun(m, 'a', -w / 2, w, cols, d, lower, -w / 2, s.susilka === 'da');
  const top = 2120;
  m.dims.push({ a: [-w / 2, top, ugol ? 0 : d], b: [w / 2, top, ugol ? 0 : d], n: [0, 1, 0], v: w });
  m.dims.push({ a: [-w / 2, 0, 0], b: [-w / 2, 0, d], n: [-1, 0, 0], v: d });
  if (ugol) {
    const len = s.w2 - d;
    const wc = Math.max(1, Math.round(len / (w / cols)));
    m.wing = { x: w / 2, z: d };
    kitchenRun(m, 'b', 0, len, wc, d, lower, 320 - d);
    m.dims.push({ a: [w / 2, 0, 0], b: [w / 2, 0, s.w2], n: [1, 0, 0], v: s.w2 });
  }
  return m;
}

function buildPolki(s) {
  const m = { parts: [], doors: [], dims: [] };
  const { w, d, rows } = s;
  const gap = rows > 1 ? s.gap : 0;
  const y0 = 1000;
  for (let i = 0; i < rows; i++) {
    const y = y0 + i * gap;
    part(m.parts, 'body', [w, T, d], [0, y, d / 2]);
    [-1, 1].forEach((n) => {
      const x = n * (w / 2 - Math.min(90, w / 5));
      part(m.parts, 'metal', [8, 130, 8], [x, y - 70, 6]);
      part(m.parts, 'metal', [8, 8, d * 0.7], [x, y - 12, d * 0.35]);
    });
  }
  const top = y0 + (rows - 1) * gap + T / 2;
  m.dims.push({ a: [-w / 2, top, d], b: [w / 2, top, d], n: [0, 1, 0], v: w });
  m.dims.push({ a: [w / 2, top, 0], b: [w / 2, top, d], n: [1, 0, 0], v: d });
  if (rows > 1) m.dims.push({ a: [w / 2, y0, d], b: [w / 2, y0 + gap, d], n: [1, 0, 0], v: gap });
  return m;
}

/* Тумба стола. side: -1 слева, 1 справа. Наружная боковина стоит там же,
   где стояла бы опора стола, тумба уходит от неё внутрь. */
function stolTumba(m, side, outerX, tw, legH, d, front) {
  const P = m.parts;
  const plinth = 60;
  const z0 = 50;
  const cd = d - 100 - T;
  const innerX = outerX - side * (tw - T);
  const cx = (outerX + innerX) / 2;
  const inner = tw - 2 * T;

  [outerX, innerX].forEach((x) => part(P, 'body', [T, legH, cd], [x, legH / 2, z0 + cd / 2]));
  part(P, 'body', [inner, T, cd], [cx, plinth + T / 2, z0 + cd / 2]);
  part(P, 'body', [inner, plinth, T], [cx, plinth / 2, z0 + cd - 30]);
  part(P, 'back', [tw, legH - plinth, 4], [cx, plinth + (legH - plinth) / 2, z0 + 2]);

  const L = Math.min(outerX, innerX) - T / 2 + 1.5;
  const R = Math.max(outerX, innerX) + T / 2 - 1.5;
  const fz = z0 + cd;
  const y0 = plinth + 2;

  if (front === 'dverca') {
    /* петли с наружной стороны, дверца открывается от ног */
    addDoor(m, 'a', L, R, y0, legH - 2, fz, side < 0, legH - 90);
    part(P, 'body', [inner, T, cd - 20], [cx, y0 + (legH - y0) / 2, z0 + cd / 2]);
    return;
  }

  /* три ящика: фасад и короб выезжают вместе */
  const n = 3;
  const dh = (legH - 2 - y0) / n;
  for (let k = 0; k < n; k++) {
    const id = m.drawers.length;
    /* slide: глубина ящика, по ней считается комплект направляющих */
    m.drawers.push({ id, g: 'a', dx: 0, dz: cd * 0.7, slide: cd - 40 });
    const a = y0 + k * dh;
    const fh = dh - 3;
    const bh = Math.max(60, fh - 50);
    const bd = cd - 40;
    const bw = inner - 26;
    const bz = fz - bd / 2;
    part(P, 'front', [R - L, fh, T], [cx, a + fh / 2, fz + T / 2], { drawer: id });
    part(P, 'metal', [Math.min(140, (R - L) * 0.4), 10, 10], [cx, a + fh - 40, fz + T + 8], { drawer: id, hw: 'handle' });
    [-1, 1].forEach((q) => part(P, 'body', [T, bh, bd], [cx + q * (bw / 2 - T / 2), a + 20 + bh / 2, bz], { drawer: id }));
    part(P, 'body', [bw - 2 * T, bh, T], [cx, a + 20 + bh / 2, bz - bd / 2 + T / 2], { drawer: id });
    part(P, 'back', [bw, 4, bd], [cx, a + 22, bz], { drawer: id });
  }
}

function buildStol(s) {
  const m = { parts: [], doors: [], drawers: [], dims: [] };
  const { w, d, h } = s;
  const P = m.parts;
  const top = 2 * T;
  const legH = h - top;
  part(P, 'body', [w, T, d], [0, h - T / 2, d / 2]);
  part(P, 'body', [w, T, d], [0, h - T * 1.5, d / 2]);
  const inset = Math.min(70, w / 10);
  const edgeX = w / 2 - inset;

  /* с одной стороны тумба справа: так привычнее большинству */
  const sides = s.tumby === 'dve' ? [-1, 1] : s.tumby === 'odna' ? [1] : [];
  const tw = sides.length ? Math.min(450, Math.max(300, (w - 2 * inset - 600) / sides.length)) : 0;

  let left = -edgeX, right = edgeX;
  [-1, 1].forEach((side) => {
    if (sides.includes(side)) {
      /* смешанный вариант: слева дверца, справа ящики */
      const kind = s.front === 'smesh' ? (side < 0 ? 'dverca' : 'yashiki') : s.front;
      stolTumba(m, side, side * edgeX, tw, legH, d, kind);
      if (side < 0) left = -edgeX + (tw - T); else right = edgeX - (tw - T);
    } else {
      part(P, 'body', [T, legH, d - 100], [side * edgeX, legH / 2, d / 2]);
    }
  });
  part(P, 'body', [right - left - T, 320, T], [(left + right) / 2, legH - 160, 90]);
  m.dims = [
    { a: [-w / 2, h, d], b: [w / 2, h, d], n: [0, 1, 0], v: w },
    { a: [w / 2, 0, d], b: [w / 2, h, d], n: [1, 0, 0], v: h },
    /* у низкого стола глубину ставим слева, иначе подпись налезает на высоту */
    { a: [-w / 2, 0, 0], b: [-w / 2, 0, d], n: [-1, 0, 0], v: d }
  ];
  return m;
}

const BUILD = { kuhnya: buildKuhnya, shkaf: buildShkaf, polki: buildPolki, stol: buildStol };

export function buildModel(type, s) {
  const m = BUILD[type](s);
  m.drawers = m.drawers || [];
  return m;
}

/* ---------- Смета ----------
   Берём площадь деталей по цене листа, а не целые листы: иначе одна
   полка стоила бы как полный лист. Кромка клеится на все торцы каждой
   детали, то есть по всему периметру её большой грани. */
export function estimate(model) {
  let area = 0, edge = 0, backArea = 0;
  model.parts.forEach((p) => {
    if (p.k !== 'body' && p.k !== 'front' && p.k !== 'back') return;
    const [a, b] = p.s.slice().sort((x, y) => y - x);
    /* задние стенки и дно ящиков: дешёвый тонкий лист, кромки нет */
    if (p.k === 'back') { backArea += a * b; return; }
    area += a * b;
    edge += 2 * (a + b);
  });
  const m2 = area / 1e6;
  const usdPerM2 = PRICE.sheetUsd / ((PRICE.sheetW * PRICE.sheetH) / 1e6);
  const sheetM2 = (PRICE.sheetW * PRICE.sheetH) / 1e6;
  const backCost = (backArea / 1e6) * (PRICE.backSheetUsd / sheetM2);
  const material = m2 * usdPerM2 + backCost;
  const edgeM = edge / 1000;
  const edgeCost = PRICE.edgeUsdPerM ? edgeM * PRICE.edgeUsdPerM : 0;

  /* Фурнитура. Петли по высоте двери, по обычному правилу мебельщиков;
     ручка одна на каждую дверь, ящик и створку купе. */
  const hinges = model.doors.reduce((n, d) => n + hingesFor(d.h), 0);
  const handles = model.parts.filter((p) => p.hw === 'handle').length;
  /* Направляющие: настоящие стандартные длины идут шагом 50 мм, поэтому
     длину округляем вниз до 50 и считаем цену пропорционально длине. */
  const lens = Object.keys(PRICE.slidePrices).map(Number).sort((a, b) => a - b);
  const slides = model.drawers.filter((d) => d.slide)
    .map((d) => lens.filter((l) => l <= d.slide).pop() || lens[0]);
  const slideCost = slides.reduce((a, len) => a + PRICE.slidePrices[len], 0);
  const dryers = model.parts.filter((p) => p.hw === 'dryer').length;
  const railM = model.parts.filter((p) => p.hw === 'rail').reduce((a, p) => a + p.s[0], 0) / 1000;
  const railCost = railM * PRICE.railUsdPerM;
  const kupeSets = model.parts.filter((p) => p.hw === 'kupe').length;
  const hardware = hinges * PRICE.hingeUsd + handles * PRICE.handleUsd + slideCost + dryers * PRICE.dryerUsd + railCost + kupeSets * PRICE.kupeRailsUsd;

  return {
    m2, backM2: backArea / 1e6, backCost, edgeM, material, edgeCost, hinges, handles, slides, slideCost, dryers, railM, railCost, hardware,
    usd: Math.round((material + edgeCost + hardware) * PRICE.markup)
  };
}

export function hingesFor(doorH) {
  if (doorH <= 900) return 2;
  if (doorH <= 1600) return 3;
  if (doorH <= 2000) return 4;
  return 5;
}

export function describe(type, s) {
  const t = TYPES[type].label;
  if (type === 'kuhnya') {
    const size = s.forma === 'ugol' ? `${s.w} × ${s.w2}` : `${s.w}`;
    return [
      `${t}, ${s.forma === 'ugol' ? 'угловая' : 'прямая'}`,
      `Длина: ${size} мм, глубина ${s.d} мм`,
      `Шкафов в ряду: ${s.cols}`,
      s.nizh === 'da' ? 'С нижними и верхними шкафами' : 'Только верхние шкафы, без нижних',
      ...(s.susilka === 'da' ? ['Сушилка для посуды 90 см в верхнем шкафу'] : [])
    ];
  }
  if (type === 'shkaf') {
    const rails = Math.min(s.shtanga, s.cols);
    const shelves = s.cols - rails;
    return [
      t,
      `Размер: ${s.w} × ${s.h} × ${s.d} мм`,
      `Отсеков: ${s.cols}, из них со штангой для одежды: ${rails}`,
      ...(s.cols > 1 && Array.isArray(s.sw) ? [`Ширина отсеков: ${s.sw.join(', ')} мм`] : []),
      shelves > 0 ? `Полок в остальных отсеках: ${s.rows}` : 'Все отсеки со штангой',
      s.dveri === 'petli' ? 'Двери на петлях' : s.dveri === 'kupe' ? 'Двери-купе' : 'Открытый, без дверей'
    ];
  }
  if (type === 'polki') {
    return [
      t,
      `Размер полки: ${s.w} × ${s.d} мм`,
      s.rows > 1 ? `Количество: ${s.rows}, между полками ${s.gap} мм` : 'Количество: 1'
    ];
  }
  const lines = [t, `Размер: ${s.w} × ${s.d} мм, высота ${s.h} мм`];
  if (s.tumby === 'net') {
    lines.push('Без тумб');
  } else {
    if (s.tumby === 'dve' && s.front === 'smesh') {
      lines.push('Тумбы с двух сторон: слева с дверцей, справа с тремя ящиками');
    } else {
      const where = s.tumby === 'dve' ? 'Тумбы с двух сторон' : 'Тумба с одной стороны';
      lines.push(`${where}, ${s.front === 'dverca' ? 'с дверцей' : 'с тремя ящиками'}`);
    }
  }
  return lines;
}
