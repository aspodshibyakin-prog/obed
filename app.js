'use strict';

const KEY = 'obed.v1';
const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const DOW_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const DEFAULTS = { partner: 'Сергей', teaPrice: 340, budget: 1500, step: 50, downMax: 30, proteinGoal: 35, rest: 'chaika' };

// ---------- состояние ----------

let S = load();
const UI = { menuRest: S.draft.rest, q: '', filter: 'all', planRest: S.draft.rest };

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) return migrate(s);
  } catch (e) { /* повреждённые данные — начинаем заново */ }
  return fresh();
}

function fresh() {
  return {
    v: 1,
    settings: { ...DEFAULTS },
    overrides: {},
    custom: [],
    draft: emptyDraft('chaika'),
    log: HISTORY_SEED.map(e => ({ id: uid(), ...e, teaHalf: e.tea ? DEFAULTS.teaPrice / 2 : 0 })),
    plan: null,
    tab: 'today',
  };
}

function migrate(s) {
  s.settings = { ...DEFAULTS, ...s.settings };
  s.overrides = s.overrides || {};
  s.custom = s.custom || [];
  s.log = s.log || [];
  s.draft = s.draft || emptyDraft(s.settings.rest);
  s.tab = s.tab || 'today';
  return s;
}

function emptyDraft(rest) {
  return { rest, items: [], tea: true, date: null, pick: null };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Не удалось сохранить'); }
}

// ---------- утилиты ----------

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
function rub(n) { return fmt(n) + ' ₽'; }
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function todayISO() { return iso(new Date()); }
function dayLabel(s) { const d = parseISO(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
function mondayOf(s) { const d = parseISO(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
// Дательный падеж имени: Сергей → Сергею, Саша → Саше, Иван → Ивану.
function dat(n) {
  if (/[йь]$/.test(n)) return n.slice(0, -1) + 'ю';
  if (/[ая]$/.test(n)) return n.slice(0, -1) + 'е';
  return n + 'у';
}
function shortName(n, max) { const s = n.split(/[,(]/)[0].trim(); return max && s.length > max ? s.slice(0, max - 2).trim() + '…' : s; }

const svg = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

// ---------- меню ----------

function dishes(rest, withHidden) {
  const seed = MENU_SEED[rest].map(d => {
    const o = S.overrides[d.id];
    return o ? { ...d, ...o } : d;
  });
  const all = seed.concat(S.custom.filter(d => d.rest === rest));
  return withHidden ? all : all.filter(d => !d.hidden);
}

function findDish(id) {
  for (const r of Object.keys(RESTAURANTS)) {
    const d = dishes(r, true).find(x => x.id === id);
    if (d) return d;
  }
  return null;
}

function isFirst(d) { return FIRST_CATS.includes(d.cat); }
function isProteinSecond(d) { return SECOND_CATS.includes(d.cat) && d.p >= 20 && d.c <= 30 && !d.small && !/добавка/.test(d.name); }
function fits(d) {
  if (d.pp) return true;
  if (isFirst(d)) return d.c <= 25 && d.kcal <= 350;
  return isProteinSecond(d) && d.kcal <= 550;
}
// Белок насыщает, но сверх 50 г уже не важен; калории, жир и углеводы — штраф.
function score(t) { return Math.min(t.p, 50) * 3 - t.c * 1.5 - t.f - t.kcal * 0.1; }

function combos(rest, maxPrice) {
  const firsts = dishes(rest).filter(d => isFirst(d) && d.c <= 40);
  const seconds = dishes(rest).filter(isProteinSecond);
  const out = [];
  for (const a of firsts) for (const b of seconds) {
    const t = sumItems([a, b]);
    if (t.price <= maxPrice) out.push({ a, b, t, s: score(t) });
  }
  return out.sort((x, y) => y.s - x.s);
}

// ---------- расчёты ----------

function sumItems(items) {
  const t = { price: 0, p: 0, f: 0, c: 0, kcal: 0, est: false };
  for (const it of items) {
    const q = it.qty || 1;
    t.price += it.price * q; t.p += it.p * q; t.f += it.f * q; t.c += it.c * q; t.kcal += it.kcal * q;
    if (it.est) t.est = true;
  }
  return t;
}

function teaHalf() { return Math.round(S.settings.teaPrice / 2); }

function roundOpts(sum) {
  const st = S.settings.step;
  const down = Math.floor(sum / st) * st;
  const up = Math.ceil(sum / st) * st;
  const r = sum - down;
  const rec = r === 0 ? sum : (r <= S.settings.downMax ? down : up);
  return { down, up, r, rec };
}

function entrySum(e) { return sumItems(e.items).price + (e.tea ? e.teaHalf : 0); }

function verdict(t) {
  const g = S.settings.proteinGoal;
  let head;
  if (t.p >= g && t.kcal <= 500 && t.c <= 30 && t.f <= 25) head = 'Лёгкий и белковый — твой лучший формат.';
  else if (t.f >= 40) head = 'Жирный обед.';
  else if (t.c >= 60) head = 'Углеводный обед.';
  else if (t.kcal >= 650) head = 'Плотный обед.';
  else if (t.p < 25) head = 'Лёгкий, но не сытный.';
  else head = 'Сбалансированно.';
  const tail = [];
  if (t.p < g) tail.push('До цели по белку ' + (g - t.p) + ' г.');
  if (t.f >= 40 || t.c >= 60 || t.kcal >= 650) tail.push('Ужин — белок и овощи, без углеводов.');
  if (t.est) tail.push('Часть КБЖУ — оценка.');
  return '<b>' + head + '</b> ' + tail.join(' ');
}

function unpaid() { return S.log.filter(e => !e.paid); }

// ---------- отрисовка ----------

const view = document.getElementById('view');

function render() {
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  if (S.tab === 'today') view.innerHTML = renderToday();
  else if (S.tab === 'menu') { view.innerHTML = renderMenu(); renderMenuList(); }
  else if (S.tab === 'plan') view.innerHTML = renderPlan();
  else view.innerHTML = renderLog();
}

function segment(act, value) {
  return '<div class="segment">' + Object.entries(RESTAURANTS).map(([k, r]) =>
    `<button data-act="${act}" data-v="${k}" class="${k === value ? 'on' : ''}">${r.name}</button>`).join('') + '</div>';
}

function tags(d) {
  return (d.pp ? '<span class="tag pp">ПП</span>' : '') + (d.est ? '<span class="tag est">≈</span>' : '');
}

function macroLine(t) { return `${fmt(t.kcal)} ккал · Б${fmt(t.p)} Ж${fmt(t.f)} У${fmt(t.c)}`; }

function debtPill() {
  const u = unpaid();
  if (!u.length) return '';
  const sum = u.reduce((a, e) => a + e.transfer, 0);
  return `<button class="debt-pill" data-act="go" data-v="log"><span class="dot"></span>${rub(sum)}</button>`;
}

// ----- Сегодня -----

function renderToday() {
  const dr = S.draft;
  const date = dr.date || todayISO();
  const d = parseISO(date);
  const t = sumItems(dr.items);
  const half = dr.tea ? teaHalf() : 0;
  const total = t.price + half;
  const ro = roundOpts(total);
  const pick = dr.pick === 'down' ? ro.down : dr.pick === 'up' ? ro.up : ro.rec;
  const budget = S.settings.budget;
  const logged = S.log.filter(e => e.date === date);

  let h = `<header class="head"><div>
      <p class="eyebrow">${DOW_FULL[d.getDay()]}, ${dayLabel(date)}</p>
      <h1 class="title">Обед.</h1></div>${debtPill()}</header>`;

  h += segment('rest', dr.rest);

  if (logged.length) {
    h += logged.map(e => `<button class="card row" style="padding:14px 16px" data-act="entry" data-id="${e.id}">
      <div class="main"><div class="eyebrow" style="color:var(--green)">Записан</div>
      <div class="name">${esc(e.items.map(i => shortName(i.name)).join(' + '))}</div>
      <div class="sub">${macroLine(sumItems(e.items))}</div></div>
      <div class="price">${rub(e.transfer)}</div></button>`).join('');
  }

  // Блюда дня
  const dow = d.getDay();
  const specials = dishes(dr.rest).filter(x => x.cat === 'specials' && x.dow && x.dow.includes(dow));
  if (specials.length) {
    h += `<div class="card flush"><div style="padding:16px 16px 4px"><p class="eyebrow hot">Блюдо дня</p>
      <p class="note" style="margin:0">Тяжелее твоего профиля — второе бери лёгким.</p></div>
      ${specials.map(rowDish).join('')}</div>`;
  }

  // Состав
  if (!dr.items.length) {
    h += `<div class="card empty"><div class="big">Что сегодня берёшь?</div>
      <p>Первое на объём и белковое второе.<br>Бюджет ${rub(budget)}.</p>
      <div class="add-row"><button class="btn" data-act="go" data-v="menu">Из меню</button>
      <button class="btn secondary" data-act="custom">Своё блюдо</button></div></div>`;
  } else {
    h += `<div class="card flush">${dr.items.map((it, i) => `
      <div class="row"><div class="main"><div class="name">${esc(it.name)}${tags(it)}</div>
      <div class="sub">${macroLine(it)}</div></div>
      <div class="qty"><button data-act="qty" data-i="${i}" data-v="-1" aria-label="${it.qty > 1 ? 'Меньше' : 'Убрать'}">${it.qty > 1 ? '−' : '×'}</button>
      <span>${it.qty}</span><button data-act="qty" data-i="${i}" data-v="1" aria-label="Больше">+</button></div>
      <div class="price">${rub(it.price * it.qty)}</div></div>`).join('')}
      <div class="row" style="gap:10px"><button class="link" data-act="go" data-v="menu">+ Из меню</button>
      <span style="flex:1"></span><button class="link" data-act="custom">Своё блюдо</button></div></div>`;

    // Итог
    const g = S.settings.proteinGoal;
    const bar = (v, target, color) => `<div class="bar"><i style="width:${Math.min(100, v / target * 100)}%;background:${color}"></i></div>`;
    h += `<div class="hero">
      <div class="kcal">${fmt(t.kcal)}<small>ккал${t.est ? ' ≈' : ''}</small></div>
      <div class="macros">
        <div class="macro"><div class="v">${fmt(t.p)}</div><div class="l">белки · цель ${g}</div>${bar(t.p, g, '#30d158')}</div>
        <div class="macro"><div class="v">${fmt(t.f)}</div><div class="l">жиры · до 25</div>${bar(t.f, 25, t.f > 25 ? '#ff9f0a' : '#a1a1a6')}</div>
        <div class="macro"><div class="v">${fmt(t.c)}</div><div class="l">углев. · до 30</div>${bar(t.c, 30, t.c > 30 ? '#ff9f0a' : '#64d2ff')}</div>
      </div>
      <div class="verdict">${verdict(t)}</div>
      <div class="budget"><span>Блюда <b>${rub(t.price)}</b></span>
      <span>${t.price > budget ? `<b style="color:#ff9f45">+${rub(t.price - budget)}</b> сверх бюджета` : `ещё ${rub(budget - t.price)} в бюджете`}</span></div>
    </div>`;

    // Перевод
    const opts = ro.r === 0 ? [ro.rec] : [ro.down, ro.up];
    h += `<div class="card">
      <div class="between"><div><h3>Чай пополам</h3><div class="note">Молочный улун ${rub(S.settings.teaPrice)} → твоя половина ${rub(teaHalf())}</div></div>
      <label class="switch"><input type="checkbox" data-act="tea" ${dr.tea ? 'checked' : ''}><i></i></label></div>
    </div>
    <div class="card">
      <div class="between" style="margin-bottom:12px"><h3>Перевод ${esc(dat(S.settings.partner))}</h3>
      <span class="muted nums">${rub(total)}</span></div>
      <div class="chips">${opts.map(v => `<button class="chip ${v === pick ? 'on' : ''}" data-act="pick" data-v="${v === ro.down && ro.r ? 'down' : 'up'}">${rub(v)}${v === ro.rec ? '<small>по правилу</small>' : ''}</button>`).join('')}</div>
      <div class="note mt">${ro.r === 0 ? 'Сумма уже кратна ' + S.settings.step + '.' : ro.r <= S.settings.downMax ? `Остаток ${ro.r} ₽ — мелкий, округляем вниз.` : `Остаток ${ro.r} ₽ — округляем вверх.`}</div>
    </div>
    <div class="card flush"><div class="field"><label>Дата</label>
      <input type="date" data-act="date" value="${date}" max="${todayISO()}"></div></div>
    <button class="btn" data-act="commit" data-v="${pick}">Записать · ${rub(pick)}</button>`;
  }

  h += renderSuggestions(dr);

  // Повторить
  const seen = new Set();
  const recent = [];
  for (const e of [...S.log].reverse()) {
    if (e.rest !== dr.rest) continue;
    const k = e.items.map(i => i.name).join('|');
    if (seen.has(k)) continue;
    seen.add(k); recent.push(e);
    if (recent.length >= 8) break;
  }
  if (recent.length) {
    h += `<h2 class="section-title">Повторить</h2><div class="chips scroll">${recent.map(e =>
      `<button class="chip" data-act="repeat" data-id="${e.id}">${esc(e.items.map(i => shortName(i.name, 26)).join(' + '))}</button>`).join('')}</div>`;
  }
  return h;
}

function renderSuggestions(dr) {
  const budget = S.settings.budget;
  const used = sumItems(dr.items).price;
  const hasFirst = dr.items.some(i => FIRST_CATS.includes(i.cat));
  const hasSecond = dr.items.some(i => SECOND_CATS.includes(i.cat));
  const inDraft = new Set(dr.items.map(i => i.id));

  if (!dr.items.length) {
    const usedB = new Set();
    const top = combos(dr.rest, budget).filter(c => !usedB.has(c.b.id) && usedB.add(c.b.id)).slice(0, 4);
    if (!top.length) return '';
    return `<h2 class="section-title">Лучшие связки</h2><div class="card flush">${top.map(c => `
      <button class="row" data-act="combo" data-a="${esc(c.a.id)}" data-b="${esc(c.b.id)}">
      <div class="main"><div class="name">${esc(c.a.name)}</div><div class="name">${esc(c.b.name)}</div>
      <div class="sub">${macroLine(c.t)}</div></div><div class="price">${rub(c.t.price)}</div></button>`).join('')}</div>`;
  }

  let list = [], title = '';
  if (hasFirst && !hasSecond) {
    title = 'Добавь белковое второе';
    list = dishes(dr.rest).filter(isProteinSecond);
  } else if (hasSecond && !hasFirst) {
    title = 'Добавь первое';
    list = dishes(dr.rest).filter(d => isFirst(d) && d.c <= 30);
  } else return '';
  list = list.filter(d => !inDraft.has(d.id) && used + d.price <= budget)
    .map(d => ({ d, s: score(sumItems([...dr.items, d])) }))
    .sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.d);
  if (!list.length) return '';
  return `<h2 class="section-title">${title}</h2><div class="card flush">${list.map(rowDish).join('')}</div>`;
}

function rowDish(d) {
  const inDraft = S.draft.items.some(i => i.id === d.id);
  return `<div class="row"><button class="main" style="text-align:left" data-act="dish" data-id="${esc(d.id)}">
    <div class="name">${esc(d.name)}${tags(d)}</div>
    <div class="sub">${esc(d.w || '')}${d.w ? ' · ' : ''}${macroLine(d)}</div></button>
    <div class="price">${rub(d.price)}</div>
    <button class="plus ${inDraft ? 'on' : ''}" data-act="toggle" data-id="${esc(d.id)}" aria-label="${inDraft ? 'Убрать' : 'Добавить'}">${inDraft ? '✓' : '+'}</button></div>`;
}

// ----- Меню -----

function renderMenu() {
  const filters = [['all', 'Все'], ['fit', 'Под профиль'], ['pp', 'ПП']].concat(Object.entries(CATS));
  return `<header class="head"><div><p class="eyebrow">${RESTAURANTS[UI.menuRest].name}</p><h1 class="title">Меню.</h1></div>${debtPill()}</header>
    ${segment('menurest', UI.menuRest)}
    <div class="search">${svg.search}<input type="search" placeholder="Поиск" value="${esc(UI.q)}" data-act="q" autocomplete="off"></div>
    <div class="chips scroll">${filters.map(([k, n]) => `<button class="chip ${UI.filter === k ? 'on' : ''}" data-act="filter" data-v="${k}">${n}</button>`).join('')}</div>
    <div id="menu-list"></div>
    <button class="btn secondary mt-l" data-act="custom" data-v="menu">Добавить блюдо в меню</button>`;
}

function renderMenuList() {
  const el = document.getElementById('menu-list');
  if (!el) return;
  const q = UI.q.trim().toLowerCase();
  let list = dishes(UI.menuRest);
  if (q) list = list.filter(d => d.name.toLowerCase().includes(q));
  if (UI.filter === 'fit') list = list.filter(fits);
  else if (UI.filter === 'pp') list = list.filter(d => d.pp);
  else if (CATS[UI.filter]) list = list.filter(d => d.cat === UI.filter);
  if (!list.length) { el.innerHTML = '<div class="empty"><p>Ничего не нашлось.</p></div>'; return; }
  let h = '';
  for (const cat of Object.keys(CATS)) {
    const items = list.filter(d => d.cat === cat);
    if (!items.length) continue;
    h += `<div class="group-title">${CATS[cat]}</div><div class="card flush">${items.map(rowDish).join('')}</div>`;
  }
  const hidden = dishes(UI.menuRest, true).filter(d => d.hidden).length;
  if (hidden) h += `<p class="hint" style="text-align:center"><button class="link" data-act="unhide">Показать скрытые (${hidden})</button></p>`;
  el.innerHTML = h;
}

// ----- Неделя -----

function weekStart() {
  const t = todayISO();
  const dow = parseISO(t).getDay();
  return dow === 6 || dow === 0 ? addDays(mondayOf(t), 7) : mondayOf(t);
}

function buildPlan(rest, allowOver, random) {
  const budget = S.settings.budget;
  const all = combos(rest, budget + (allowOver ? 900 : 0));
  // Сытость: в план идут связки от 30 г белка, если таких хватает на неделю.
  const filling = all.filter(c => c.t.p >= 30);
  const pool = filling.length >= 8 ? filling : all;
  const days = [];
  const useA = {}, useB = {};
  let over = 0;
  for (let i = 0; i < 5; i++) {
    const ok = pool.filter(c => (useA[c.a.id] || 0) < 2 && (useB[c.b.id] || 0) < 2 &&
      !days.some(x => x.a === c.a.id && x.b === c.b.id) && (c.t.price <= budget || over < 2));
    if (!ok.length) break;
    // разнообразие: штраф за уже взятое второе
    const ranked = ok.map(c => ({ c, s: c.s - (useB[c.b.id] || 0) * 40 - (useA[c.a.id] || 0) * 25 }))
      .sort((x, y) => y.s - x.s);
    const k = random ? Math.min(ranked.length, 6) : 1;
    const c = ranked[Math.floor(Math.random() * k)].c;
    days.push({ a: c.a.id, b: c.b.id });
    useA[c.a.id] = (useA[c.a.id] || 0) + 1;
    useB[c.b.id] = (useB[c.b.id] || 0) + 1;
    if (c.t.price > budget) over++;
  }
  return { rest, allowOver, week: weekStart(), days };
}

function renderPlan() {
  if (!S.plan || S.plan.week !== weekStart() || S.plan.rest !== UI.planRest) {
    S.plan = buildPlan(UI.planRest, S.plan ? S.plan.allowOver : true, false);
    save();
  }
  const p = S.plan;
  const budget = S.settings.budget;
  const today = todayISO();
  let sumP = 0, sumK = 0, sumR = 0, n = 0;

  let h = `<header class="head"><div><p class="eyebrow">С ${dayLabel(p.week)}</p><h1 class="title">Неделя.</h1></div>${debtPill()}</header>
    <p class="lede" style="margin:-12px 0 20px">Суп или салат плюс белковое второе. До ${rub(budget)} в день.</p>
    ${segment('planrest', UI.planRest)}`;

  h += p.days.map((x, i) => {
    const a = findDish(x.a), b = findDish(x.b);
    if (!a || !b) return '';
    const t = sumItems([a, b]);
    const date = addDays(p.week, i);
    sumP += t.p; sumK += t.kcal; sumR += t.price; n++;
    return `<div class="card day ${date === today ? 'today' : ''}">
      <div class="dow"><b>${DOW[(i + 1) % 7].toUpperCase()}</b><span>${parseISO(date).getDate()}</span></div>
      <div class="body"><div class="dish">${esc(a.name)}</div><div class="dish">${esc(b.name)}</div>
      <div class="meta">${rub(t.price)}${t.price > budget ? '<span class="tag over">сверх бюджета</span>' : ''} · ${macroLine(t)}</div>
      <div class="between mt"><span></span><button class="pill-btn ${date === today ? '' : 'ghost'}" data-act="take" data-i="${i}">В обед</button></div></div></div>`;
  }).join('');

  if (n) {
    h += `<div class="card"><div class="stats">
      <div class="stat"><div class="v">${rub(sumR / n)}</div><div class="l">средний чек</div></div>
      <div class="stat"><div class="v">${fmt(sumK / n)}</div><div class="l">ккал в день</div></div>
      <div class="stat"><div class="v">${fmt(sumP / n)} г</div><div class="l">белка в день</div></div>
      <div class="stat"><div class="v">${p.days.filter(x => { const a = findDish(x.a), b = findDish(x.b); return a && b && a.price + b.price > budget; }).length}</div><div class="l">сверх бюджета</div></div>
    </div></div>`;
  }

  h += `<div class="card"><div class="between"><div><h3>Сверх бюджета</h3><div class="note">Не больше двух дней — рыба, осьминог</div></div>
    <label class="switch"><input type="checkbox" data-act="over" ${p.allowOver ? 'checked' : ''}><i></i></label></div></div>
    <button class="btn secondary" data-act="replan">Собрать заново</button>`;
  return h;
}

// ----- Журнал -----

function renderLog() {
  const u = unpaid();
  const debt = u.reduce((a, e) => a + e.transfer, 0);
  let h = `<header class="head"><div><p class="eyebrow">${S.log.length} ${plural(S.log.length, 'обед', 'обеда', 'обедов')}</p><h1 class="title">Журнал.</h1></div>
    <button class="icon-btn" data-act="settings" aria-label="Настройки">${svg.gear}</button></header>`;

  h += `<div class="card"><p class="eyebrow">${esc(dat(S.settings.partner))} к переводу</p>
    <div class="debt"><div class="sum">${debt ? rub(debt) : 'Всё переведено'}</div>
    ${debt ? `<button class="pill-btn" data-act="payall">Перевёл</button>` : ''}</div>
    ${u.length ? `<div class="note">${u.map(e => DOW[parseISO(e.date).getDay()] + ' ' + parseISO(e.date).getDate() + ' — ' + rub(e.transfer)).join(', ')}</div>` : ''}</div>`;

  if (!S.log.length) return h + '<div class="empty"><p>Пока пусто. Первый обед появится здесь.</p></div>';

  const weeks = {};
  for (const e of S.log) (weeks[mondayOf(e.date)] = weeks[mondayOf(e.date)] || []).push(e);
  for (const wk of Object.keys(weeks).sort().reverse()) {
    const list = weeks[wk].sort((a, b) => b.date.localeCompare(a.date));
    const tt = list.map(e => sumItems(e.items));
    const avg = k => tt.reduce((a, t) => a + t[k], 0) / tt.length;
    const spent = list.reduce((a, e) => a + e.transfer, 0);
    h += `<h2 class="section-title">${dayLabel(wk)} — ${dayLabel(addDays(wk, 4))}</h2>
      <div class="card"><div class="stats">
        <div class="stat"><div class="v">${list.length}</div><div class="l">${plural(list.length, 'обед', 'обеда', 'обедов')}</div></div>
        <div class="stat"><div class="v">${rub(spent)}</div><div class="l">потрачено</div></div>
        <div class="stat"><div class="v">${fmt(avg('kcal'))}</div><div class="l">ккал в среднем</div></div>
        <div class="stat"><div class="v">${fmt(avg('p'))} г</div><div class="l">белка в среднем</div></div>
      </div></div>
      <div class="card flush">${list.map(e => {
        const t = sumItems(e.items);
        const d = parseISO(e.date);
        return `<button class="row" data-act="entry" data-id="${e.id}">
          <div style="width:34px;flex:none;text-align:center"><div style="font-weight:600;font-size:17px">${d.getDate()}</div><div class="small muted">${DOW[d.getDay()]}</div></div>
          <div class="main"><div class="name">${esc(e.items.map(i => shortName(i.name)).join(' + '))}</div>
          <div class="sub">${RESTAURANTS[e.rest].name} · ${fmt(t.kcal)} ккал · Б${fmt(t.p)}</div></div>
          <div class="price">${rub(e.transfer)}</div><span class="dot ${e.paid ? 'off' : ''}"></span></button>`;
      }).join('')}</div>`;
  }
  h += `<p class="hint" style="text-align:center;margin-top:18px"><span class="dot" style="display:inline-block;vertical-align:1px"></span> к переводу &nbsp; <span class="dot off" style="display:inline-block;vertical-align:1px"></span> переведено</p>`;
  return h;
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// ---------- шторки ----------

const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('backdrop');

function openSheet(title, body) {
  sheet.innerHTML = `<div class="grabber"></div><div class="sheet-head"><h2>${title}</h2>
    <button class="link" data-act="close" style="font-weight:600">Готово</button></div>${body}`;
  sheet.scrollTop = 0;
  backdrop.classList.add('on');
  sheet.classList.add('on');
}
function closeSheet() { backdrop.classList.remove('on'); sheet.classList.remove('on'); }

function dishSheet(id) {
  const d = findDish(id);
  if (!d) return;
  const inDraft = S.draft.items.some(i => i.id === d.id);
  const custom = id.startsWith('x:');
  openSheet(esc(RESTAURANTS[d.rest].name), `
    <div class="card"><h3 style="font-size:22px">${esc(d.name)}${tags(d)}</h3>
    <div class="muted">${esc(d.w || '')}${d.w ? ' · ' : ''}${CATS[d.cat]}</div>
    ${d.note ? `<div class="note mt">${esc(d.note)}</div>` : ''}</div>
    <div class="card flush">
      <div class="field"><label>Цена, ₽</label><input inputmode="numeric" data-f="price" value="${d.price}"></div>
    </div>
    <div class="card flush"><div class="macro-inputs">
      ${[['p', 'Белки'], ['f', 'Жиры'], ['c', 'Углев.'], ['kcal', 'Ккал']].map(([k, n]) =>
        `<div><label>${n}</label><input inputmode="numeric" data-f="${k}" value="${d[k]}"></div>`).join('')}
    </div></div>
    <p class="hint" style="margin:-4px 4px 16px">Цены и КБЖУ можно поправить — изменения сохранятся в меню.</p>
    <button class="btn" data-act="sheet-add" data-id="${esc(d.id)}">${inDraft ? 'Убрать из обеда' : 'Добавить в обед'}</button>
    <button class="btn secondary" data-act="sheet-save" data-id="${esc(d.id)}">Сохранить изменения</button>
    <button class="btn danger" data-act="${custom ? 'sheet-del' : 'sheet-hide'}" data-id="${esc(d.id)}">${custom ? 'Удалить из меню' : 'Скрыть из меню'}</button>`);
}

function readNums() {
  const o = {};
  sheet.querySelectorAll('[data-f]').forEach(inp => {
    const k = inp.dataset.f;
    if (k === 'name' || k === 'w' || k === 'cat') o[k] = inp.value.trim();
    else o[k] = Math.max(0, Math.round(Number(String(inp.value).replace(',', '.')) || 0));
  });
  return o;
}

function customSheet(toMenu) {
  const rest = toMenu ? UI.menuRest : S.draft.rest;
  openSheet(toMenu ? 'Новое блюдо' : 'Своё блюдо', `
    <div class="card flush">
      <div class="field"><label>Название</label><input data-f="name" placeholder="Например, манты"></div>
      <div class="field"><label>Цена, ₽</label><input inputmode="numeric" data-f="price" placeholder="0"></div>
      <div class="field"><label>Выход</label><input data-f="w" placeholder="250 г"></div>
      <div class="field"><label>Раздел</label><select data-f="cat">${Object.entries(CATS).map(([k, n]) => `<option value="${k}" ${k === (toMenu ? 'hot' : 'specials') ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="card flush"><div class="macro-inputs">
      ${[['p', 'Белки'], ['f', 'Жиры'], ['c', 'Углев.'], ['kcal', 'Ккал']].map(([k, n]) =>
        `<div><label>${n}</label><input inputmode="numeric" data-f="${k}" placeholder="0"></div>`).join('')}
    </div></div>
    <div class="card"><div class="between"><div><h3>Сохранить в меню</h3><div class="note">${RESTAURANTS[rest].name}</div></div>
      <label class="switch"><input type="checkbox" id="keep" ${toMenu ? 'checked' : ''}><i></i></label></div></div>
    <p class="hint" style="margin:-4px 4px 16px">Нет КБЖУ в меню — впиши примерно, блюдо пометится как оценка.</p>
    <button class="btn" data-act="custom-save" data-rest="${rest}" data-menu="${toMenu ? 1 : 0}">${toMenu ? 'Добавить в меню' : 'Добавить в обед'}</button>`);
}

function entrySheet(id) {
  const e = S.log.find(x => x.id === id);
  if (!e) return;
  const t = sumItems(e.items);
  const sum = entrySum(e);
  const ro = roundOpts(sum);
  const opts = [...new Set([ro.down, ro.up, e.transfer])].filter(v => v > 0).sort((a, b) => a - b);
  const d = parseISO(e.date);
  openSheet(`${DOW_FULL[d.getDay()]}, ${dayLabel(e.date)}`, `
    <div class="card flush">${e.items.map(i => `<div class="row"><div class="main"><div class="name">${esc(i.name)}${i.qty > 1 ? ' × ' + i.qty : ''}${tags(i)}</div>
      <div class="sub">${macroLine(i)}</div></div><div class="price">${rub(i.price * (i.qty || 1))}</div></div>`).join('')}
      ${e.tea ? `<div class="row"><div class="main"><div class="name">½ чая</div></div><div class="price">${rub(e.teaHalf)}</div></div>` : ''}
    </div>
    <div class="hero"><div class="kcal">${fmt(t.kcal)}<small>ккал</small></div>
      <div class="macros"><div class="macro"><div class="v">${fmt(t.p)}</div><div class="l">белки</div></div>
      <div class="macro"><div class="v">${fmt(t.f)}</div><div class="l">жиры</div></div>
      <div class="macro"><div class="v">${fmt(t.c)}</div><div class="l">углеводы</div></div></div>
      <div class="verdict">${verdict(t)}</div>
      <div class="budget"><span>${RESTAURANTS[e.rest].name}</span><span>чек <b>${rub(sum)}</b></span></div></div>
    <div class="card"><h3>Перевод ${esc(dat(S.settings.partner))}</h3>
      <div class="chips mt">${opts.map(v => `<button class="chip ${v === e.transfer ? 'on' : ''}" data-act="e-amount" data-id="${e.id}" data-v="${v}">${rub(v)}</button>`).join('')}</div>
      <div class="between mt"><span>Переведено</span><label class="switch"><input type="checkbox" data-act="e-paid" data-id="${e.id}" ${e.paid ? 'checked' : ''}><i></i></label></div>
      <div class="between mt"><span>Чай пополам</span><label class="switch"><input type="checkbox" data-act="e-tea" data-id="${e.id}" ${e.tea ? 'checked' : ''}><i></i></label></div>
    </div>
    <button class="btn secondary" data-act="e-repeat" data-id="${e.id}">Взять так же сегодня</button>
    <button class="btn danger" data-act="e-del" data-id="${e.id}">Удалить запись</button>`);
}

function settingsSheet() {
  const s = S.settings;
  openSheet('Настройки', `
    <div class="card flush">
      <div class="field"><label>Кто платит чек</label><input data-s="partner" value="${esc(s.partner)}"></div>
      <div class="field"><label>Чай целиком, ₽</label><input inputmode="numeric" data-s="teaPrice" value="${s.teaPrice}"></div>
      <div class="field"><label>Бюджет на обед, ₽</label><input inputmode="numeric" data-s="budget" value="${s.budget}"></div>
      <div class="field"><label>Цель по белку, г</label><input inputmode="numeric" data-s="proteinGoal" value="${s.proteinGoal}"></div>
      <div class="field"><label>Округлять до, ₽</label><input inputmode="numeric" data-s="step" value="${s.step}"></div>
      <div class="field"><label>Вниз, если остаток до, ₽</label><input inputmode="numeric" data-s="downMax" value="${s.downMax}"></div>
    </div>
    <button class="btn" data-act="settings-save">Сохранить</button>
    <h2 class="section-title" style="font-size:20px">Резервная копия</h2>
    <p class="hint" style="margin:-4px 4px 14px">Данные живут только на этом телефоне. Время от времени сохраняй копию в Файлы.</p>
    <button class="btn secondary" data-act="export">Сохранить копию</button>
    <button class="btn secondary" data-act="import">Восстановить из копии</button>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <button class="btn danger mt-l" data-act="reset-menu">Вернуть исходное меню</button>`);
}

function confirmSheet(title, text, act, label, id) {
  openSheet(title, `<p class="lede" style="margin:0 4px 20px">${text}</p>
    <button class="btn" data-act="${act}" data-id="${id || ''}">${label}</button>
    <button class="btn secondary" data-act="close">Отмена</button>`);
}

// ---------- действия ----------

function snap(d) {
  return { id: d.id, cat: d.cat, name: d.name, price: d.price, p: d.p, f: d.f, c: d.c, kcal: d.kcal, est: !!d.est, qty: 1 };
}

function toggleDish(id) {
  const items = S.draft.items;
  const i = items.findIndex(x => x.id === id);
  if (i >= 0) { items.splice(i, 1); toast('Убрано'); }
  else {
    const d = findDish(id);
    if (!d) return;
    if (d.rest !== S.draft.rest) { S.draft.rest = d.rest; }
    items.push(snap(d));
    toast('Добавлено в обед');
  }
  S.draft.pick = null;
  save();
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1600);
}

function go(tab) {
  S.tab = tab; save(); render(); window.scrollTo(0, 0);
}

function rerender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act], [data-tab]');
  if (!el) return;
  if (el.dataset.tab) { go(el.dataset.tab); return; }
  const a = el.dataset.act, v = el.dataset.v, id = el.dataset.id;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') return; // переключатели — в change

  switch (a) {
    case 'go': closeSheet(); go(v); break;
    case 'close': closeSheet(); break;
    case 'rest': S.draft.rest = v; S.draft.items = []; S.draft.pick = null; save(); rerender(); break;
    case 'menurest': UI.menuRest = v; rerender(); break;
    case 'planrest': UI.planRest = v; rerender(); break;
    case 'filter': UI.filter = v; rerender(); break;
    case 'toggle': toggleDish(id); rerender(); break;
    case 'dish': dishSheet(id); break;
    case 'qty': {
      const it = S.draft.items[+el.dataset.i];
      it.qty += +v;
      if (it.qty <= 0) S.draft.items.splice(+el.dataset.i, 1);
      S.draft.pick = null; save(); rerender(); break;
    }
    case 'pick': S.draft.pick = v; save(); rerender(); break;
    case 'custom': customSheet(v === 'menu'); break;
    case 'combo': {
      const A = findDish(el.dataset.a), B = findDish(el.dataset.b);
      S.draft.items = [snap(A), snap(B)]; S.draft.pick = null; save(); rerender(); break;
    }
    case 'repeat': case 'e-repeat': {
      const e = S.log.find(x => x.id === id);
      S.draft = emptyDraft(e.rest);
      S.draft.tea = e.tea;
      S.draft.items = e.items.map(i => {
        const fresh = i.id && findDish(i.id);
        return fresh ? { ...snap(fresh), qty: i.qty || 1 } : { ...i, qty: i.qty || 1 };
      });
      save(); closeSheet(); go('today'); toast('Состав перенесён'); break;
    }
    case 'commit': {
      const dr = S.draft;
      const e = {
        id: uid(), date: dr.date || todayISO(), rest: dr.rest,
        items: dr.items.map(i => ({ ...i })), tea: dr.tea, teaHalf: dr.tea ? teaHalf() : 0,
        transfer: +v, paid: false,
      };
      S.log.push(e);
      S.draft = emptyDraft(dr.rest);
      save(); rerender(); window.scrollTo(0, 0);
      toast(`Записано · ${dat(S.settings.partner)} ${rub(e.transfer)}`);
      break;
    }
    case 'take': {
      const x = S.plan.days[+el.dataset.i];
      S.draft = emptyDraft(S.plan.rest);
      S.draft.items = [snap(findDish(x.a)), snap(findDish(x.b))];
      save(); go('today'); toast('Состав перенесён'); break;
    }
    case 'replan': S.plan = buildPlan(UI.planRest, S.plan.allowOver, true); save(); rerender(); break;
    case 'entry': entrySheet(id); break;
    case 'e-amount': {
      const e = S.log.find(x => x.id === id); e.transfer = +v; save(); entrySheet(id); rerender(); break;
    }
    case 'e-del': confirmSheet('Удалить запись?', 'Обед пропадёт из журнала и из суммы к переводу. Вернуть нельзя.', 'e-del-yes', 'Удалить', id); break;
    case 'e-del-yes': S.log = S.log.filter(x => x.id !== id); save(); closeSheet(); rerender(); toast('Удалено'); break;
    case 'payall': {
      const u = unpaid();
      const sum = u.reduce((s, e) => s + e.transfer, 0);
      confirmSheet('Перевёл?', `Отметить ${u.length} ${plural(u.length, 'обед', 'обеда', 'обедов')} на ${rub(sum)} как переведённые.`, 'payall-yes', 'Да, перевёл ' + rub(sum));
      break;
    }
    case 'payall-yes': unpaid().forEach(e => { e.paid = true; }); save(); closeSheet(); rerender(); toast('Долгов нет'); break;
    case 'sheet-add': toggleDish(id); closeSheet(); rerender(); break;
    case 'sheet-save': {
      const n = readNums();
      if (id.startsWith('x:')) Object.assign(S.custom.find(x => x.id === id), n);
      else S.overrides[id] = { ...(S.overrides[id] || {}), ...n };
      save(); closeSheet(); rerender(); toast('Сохранено'); break;
    }
    case 'sheet-hide': S.overrides[id] = { ...(S.overrides[id] || {}), hidden: true }; save(); closeSheet(); rerender(); toast('Скрыто'); break;
    case 'sheet-del': S.custom = S.custom.filter(x => x.id !== id); save(); closeSheet(); rerender(); toast('Удалено'); break;
    case 'unhide':
      for (const k of Object.keys(S.overrides)) if (S.overrides[k].hidden && k.startsWith(UI.menuRest + ':')) delete S.overrides[k].hidden;
      S.custom.forEach(d => { if (d.rest === UI.menuRest) delete d.hidden; });
      save(); rerender(); break;
    case 'custom-save': {
      const n = readNums();
      if (!n.name) { toast('Впиши название'); return; }
      const rest = el.dataset.rest;
      const d = { id: 'x:' + uid(), rest, cat: n.cat || 'specials', name: n.name, w: n.w, price: n.price, p: n.p, f: n.f, c: n.c, kcal: n.kcal, est: true };
      if (document.getElementById('keep').checked) S.custom.push(d);
      if (el.dataset.menu !== '1') { S.draft.rest = rest; S.draft.items.push(snap(d)); S.draft.pick = null; }
      save(); closeSheet(); rerender(); toast(el.dataset.menu === '1' ? 'Добавлено в меню' : 'Добавлено в обед'); break;
    }
    case 'settings': settingsSheet(); break;
    case 'settings-save': {
      sheet.querySelectorAll('[data-s]').forEach(inp => {
        const k = inp.dataset.s;
        S.settings[k] = k === 'partner' ? (inp.value.trim() || DEFAULTS.partner) : (Math.max(0, Number(inp.value) || DEFAULTS[k]));
      });
      if (S.settings.step < 1) S.settings.step = DEFAULTS.step;
      save(); closeSheet(); rerender(); toast('Сохранено'); break;
    }
    case 'export': exportData(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'reset-menu': confirmSheet('Вернуть исходное меню?', 'Твои правки цен, скрытые и добавленные блюда пропадут. Журнал не тронется.', 'reset-menu-yes', 'Вернуть'); break;
    case 'reset-menu-yes': S.overrides = {}; S.custom = []; save(); closeSheet(); rerender(); toast('Меню как в начале'); break;
  }
});

document.addEventListener('change', ev => {
  const el = ev.target;
  const a = el.dataset.act, id = el.dataset.id;
  if (a === 'tea') { S.draft.tea = el.checked; S.draft.pick = null; save(); rerender(); }
  else if (a === 'date') { S.draft.date = el.value && el.value !== todayISO() ? el.value : null; save(); rerender(); }
  else if (a === 'over') { S.plan = buildPlan(UI.planRest, el.checked, false); save(); rerender(); }
  else if (a === 'e-paid') { S.log.find(x => x.id === id).paid = el.checked; save(); rerender(); }
  else if (a === 'e-tea') {
    const e = S.log.find(x => x.id === id);
    e.tea = el.checked; e.teaHalf = el.checked ? teaHalf() : 0;
    e.transfer = roundOpts(entrySum(e)).rec;
    save(); entrySheet(id); rerender();
  }
  else if (el.id === 'import-file' && el.files[0]) importData(el.files[0]);
});

document.addEventListener('input', ev => {
  if (ev.target.dataset.act === 'q') { UI.q = ev.target.value; renderMenuList(); }
});

backdrop.addEventListener('click', closeSheet);

// ---------- резервная копия ----------

async function exportData() {
  const name = 'obed-' + todayISO() + '.json';
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Обед — копия' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s || s.v !== 1 || !Array.isArray(s.log)) throw new Error('bad');
      S = migrate(s); save(); closeSheet(); render(); toast('Копия восстановлена');
    } catch (e) { toast('Это не копия «Обеда»'); }
  };
  r.readAsText(file);
}

// ---------- запуск ----------

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
