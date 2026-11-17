(function () {
'use strict';
var B = window.BarSim, A = window.BarArt;
var KEY = 'vicebar_save_v3', BEST = 'vicebar_best_v3', OPT = 'vicebar_opt_v3';
var $ = function (id) { return document.getElementById(id); };
var M = B.money;
var S = null, tab = 'plan', speed = 1, paused = false, time = 0, acc = 0, lastOcc = 0.3, occS = 0.3;
var feed = [], recent = [], autoNext = false, autoT = 0;
var TICKMS = 5000;
var canvas = $('scene'), sctx = canvas.getContext('2d');
var SEGC = { fam: '#40a0e0', surf: '#40e0a0', stud: '#ffd040', tour: '#ff8c3c', party: '#ff5fb0', after: '#a070ff', jet: '#ffffff' };
var PSHORT = ['Mo', 'Mi', 'Na', 'Su', 'Nt'];

// ---------- storage ----------
function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; } return null; }
function save() { if (S && !S.over && S.mode !== 'run') store(KEY, B.serialize(S)); }
function load() { var r = store(KEY); if (!r) return null; try { return B.deserialize(r); } catch (e) { return null; } }
function best() { try { return JSON.parse(store(BEST) || '{}') || {}; } catch (e) { return {}; } }
function saveBest() { var b = best(); b.day = Math.max(b.day || 0, S.day); b.stage = Math.max(b.stage || 0, S.stage); b.rating = Math.max(b.rating || 0, S.bestRating); store(BEST, JSON.stringify(b)); }
try { var o = JSON.parse(store(OPT) || '{}'); autoNext = !!o.auto; speed = o.speed || 1; } catch (e) { }
function saveOpt() { store(OPT, JSON.stringify({ auto: autoNext, speed: speed })); }

// ---------- format ----------
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function price$(v) { var r = Math.round(v * 10) / 10; return '$' + (r % 1 ? r.toFixed(1) : r.toFixed(0)).replace('.', ','); }
function n0(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function pct(v) { return Math.round(v * 100) + ' %'; }
function stars(v) { var o = ''; for (var i = 1; i <= 5; i++) o += v >= i - 0.25 ? '★' : (v >= i - 0.75 ? '<span style="opacity:.55">★</span>' : '<span class="off">★</span>'); return o; }
function sgn(v) { return (v >= 0 ? '+' : '') + M(v); }
function wname(w) { return B.WEATHER[w.k].n + ' ' + w.temp + '°'; }
function tagFor(ratio) { return ratio < 0.88 ? '<span class="tag low">günstig</span>' : ratio <= 1.08 ? '<span class="tag ok">fair</span>' : ratio <= 1.3 ? '<span class="tag high">teuer</span>' : '<span class="tag xhigh">Wucher</span>'; }
function nm(k) { return B.ITEMS[k] ? B.ITEMS[k].n : B.RENTALS[k] ? B.RENTALS[k].n : k; }
function canBuild() { return S.mode === 'night' || (S.mode === 'plan' && S.phase === 0); }
function running() { return S && S.mode === 'run'; }
function curPh() { return running() ? S.run.ph : Math.min(4, S.phase); }
function clock() {
var ph = curPh(), frac = running() ? (S.run.tick + Math.min(1, acc / TICKMS)) / B.NT : 0;
if (S.mode === 'night') return '24:00';
var m = Math.round((B.PHASES[ph].h + frac * 3) * 60), h = Math.floor(m / 60), mm = m % 60;
return h + ':' + (mm < 10 ? '0' : '') + mm;
}
function tLabel(ph, tk) { var m = B.PHASES[ph].h * 60 + tk * 15, mm = m % 60; return Math.floor(m / 60) + ':' + (mm < 10 ? '0' : '') + mm; }

// ---------- layout ----------
function fit() {
var w = $('sceneWrap').clientWidth, vh = window.innerHeight;
var visW = w < 560 ? 250 : 320;
var sc = w / visW, h = Math.round(150 * sc);
var maxH = Math.max(110, Math.round(vh * (w < 560 ? 0.3 : 0.36)));
if (h > maxH) { sc = maxH / 150; h = maxH; }
canvas.style.height = h + 'px';
canvas.style.width = Math.round(320 * sc) + 'px';
$('sceneWrap').style.height = h + 'px';
}
window.addEventListener('resize', function () { fit(); render(); });

// ---------- header, phases, tabs ----------
function header() {
$('tDay').textContent = 'Tag ' + S.day + ' · ' + clock();
$('tPhase').textContent = S.mode === 'night' ? 'Feierabend' : B.PHASES[curPh()].n;
$('tWeatherL').textContent = S.mode === 'night' ? 'Wetter morgen' : 'Wetter';
$('tWeather').textContent = wname(S.weather[S.mode === 'night' ? 1 : 0]);
$('tCash').textContent = M(S.cash);
$('tCash').className = 'money' + (S.cash < 0 ? ' neg' : '');
$('tRatingL').textContent = 'Ruf ' + S.rating.toFixed(2).replace('.', ',');
$('tRating').innerHTML = stars(S.rating);
$('tStage').textContent = B.STAGES[S.stage].n;
$('speedBtn').textContent = speed + '×';
$('pauseBtn').textContent = paused ? '▶' : '❚❚';
$('pauseBtn').disabled = !running();
}
function phaseStrip() {
var h = '', done = S.today.phases;
for (var i = 0; i < 5; i++) {
var cls = 'ph', r = B.PHASES[i].t, run = running() && S.run.ph === i;
if (i < done.length) { cls += ' done'; var pr = done[i].profit; r = '<span class="r ' + (pr >= 0 ? 'pos' : 'neg') + '">' + sgn(pr) + '</span>'; }
else { if ((i === S.phase && S.mode === 'plan') || run) cls += ' cur'; r = '<span class="r">' + (run ? (paused ? 'Pause' : 'läuft ' + S.run.tick + '/' + B.NT) : r) + '</span>'; }
h += '<div class="' + cls + '"><div class="n">' + B.PHASES[i].n + '</div>' + r + '</div>';
}
$('phases').innerHTML = h;
}
var TABS = [['plan', 'Schicht'], ['menu', 'Karte'], ['result', 'Ergebnis'], ['stock', 'Lager'], ['build', 'Ausbau'], ['goals', 'Ziele']];
function lowStock() {
if (S.mode === 'night') return false;
var f = B.forecast(S, curPh(), S.plan), low = false;
S.menu.forEach(function (k) { if (S.stock[k] < (f.units[k] || 0) * 0.6) low = true; });
return low;
}
function tabs() {
var ls = lowStock();
$('tabs').innerHTML = TABS.map(function (t) {
var dot = (t[0] === 'plan' && S.event) || (t[0] === 'stock' && ls);
var label = t[0] === 'plan' ? (S.mode === 'night' ? 'Abend' : running() ? 'Live' : 'Schicht') : t[1];
return '<button type="button" data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + label + (dot ? '<span class="dot"></span>' : '') + '</button>';
}).join('');
}
$('tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (!b) return; tab = b.getAttribute('data-t'); render(); });

// ---------- render ----------
function render() {
if (!S) return;
header(); phaseStrip(); tabs();
var wide = window.innerWidth >= 900;
if (wide && tab === 'result') tab = 'plan';
var L = $('left'), Rp = $('right');
var html = tab === 'plan' ? (S.mode === 'night' ? paneNight() : running() ? paneLive() : panePlan()) : tab === 'menu' ? paneMenu() : tab === 'result' ? paneResult() : tab === 'stock' ? paneStock() : tab === 'build' ? paneBuild() : paneGoals();
var st = L.getAttribute('data-tab') === tab ? L.scrollTop : 0; L.innerHTML = html; L.scrollTop = st; L.setAttribute('data-tab', tab);
if (wide) { var st2 = Rp.scrollTop; Rp.innerHTML = paneResult(); Rp.scrollTop = st2; }
var pv = L.querySelector('canvas[data-preview]');
if (pv) A.draw(pv.getContext('2d'), sceneData(+pv.getAttribute('data-preview'), 3, 0.7), 3);
}
function eventCard() {
var e = S.event; if (!e) return '';
return '<div class="event"><b>Ereignis</b><p>' + esc(e.t) + '</p><div class="btns"><button type="button" class="btn pri" data-a="event" data-v="1">' + esc(e.yes) + '</button>' + (e.info ? '' : '<button type="button" class="btn" data-a="event" data-v="0">' + esc(e.no) + '</button>') + '</div></div>';
}
function mixBar(mix) {
var h = '<div class="mixbar">';
B.SEGKEYS.forEach(function (g) { if (mix[g] > 0.005) h += '<i title="' + B.SEGS[g].n + '" style="width:' + (mix[g] * 100).toFixed(1) + '%;background:' + SEGC[g] + '"></i>'; });
return h + '</div>';
}
function legend(mix) { return '<div class="legend">' + B.SEGKEYS.filter(function (g) { return mix[g] > 0.01; }).map(function (g) { return '<span style="--c:' + SEGC[g] + '">' + B.SEGS[g].n + ' ' + Math.round(mix[g] * 100) + ' %</span>'; }).join('') + '</div>'; }
function missingHint(f) {
var miss = Object.keys(f.missing).filter(function (c) { return f.missing[c] > 3; }).sort(function (a, b) { return f.missing[b] - f.missing[a]; });
return miss.length ? '<p class="warn">Gefragt, aber nicht auf der Karte: ' + miss.map(function (c) { return B.CATS[c].n + ' (≈ ' + n0(f.missing[c]) + ')'; }).join(', ') + ' – Tab „Karte“.</p>' : '';
}
function staffBlock(f, ph, frac) {
var plan = S.plan, slots = B.slots(S), capU = plan.staff * B.staffCap(S), load = f.load, util = capU ? load / capU : 9, h = '';
h += '<div class="sec"><h3>Personal' + (running() ? ' (jetzt)' : '') + '</h3><div class="staff">';
for (var i = 0; i <= slots; i++) h += '<button type="button" data-a="staff" data-v="' + i + '" class="' + (plan.staff === i ? 'on' : '') + '">' + i + '</button>';
h += '</div><p class="muted">Bedarf ≈ ' + f.staffNeed + ' · Auslastung <b class="' + (util > 1 ? 'neg' : util > 0.95 ? 'warn' : util < 0.5 ? 'warn' : 'pos') + '">' + (capU ? pct(util) : '–') + '</b> · Lohn ' + M(B.wage(S)) + ' × ' + plan.staff + ' pro Phase</p>';
h += '<div class="meter ' + (util > 1 ? 'bad' : util > 0.95 ? 'warn' : '') + '"><i style="width:' + Math.min(100, util * 100) + '%"></i></div></div>';
var ex = '';
if (B.canHappy(S, ph)) ex += '<div class="row"><div class="grow"><div class="name">Happy Hour</div><div class="sub">Getränke −30 %, +35 % Gäste, mehr Bestellungen</div></div><button type="button" class="btn ' + (plan.happy ? 'on' : '') + '" data-a="happy">' + (plan.happy ? 'AN' : 'AUS') + '</button></div>';
if (B.canDJ(S, ph)) ex += '<div class="row"><div class="grow"><div class="name">DJ</div><div class="sub">' + M(B.djCost(S)) + '/Phase · +30 % Gäste, mehr Cocktails, mehr Partyvolk</div></div><button type="button" class="btn ' + (plan.dj ? 'on' : '') + '" data-a="dj">' + (plan.dj ? 'AN' : 'AUS') + '</button></div>';
else if (ph >= 3 && S.stage >= 3 && !S.up.djpult) ex += '<p class="muted">Mit einem DJ-Pult (Ausbau) kannst du abends einen DJ buchen.</p>';
if (ex) h += '<div class="sec"><h3>Extras</h3>' + ex + '</div>';
return h;
}
function priceRows(f, rest) {
var plan = S.plan, ph = curPh(), h = '<div class="sec"><h3>Preise' + (running() ? ' (wirken sofort)' : '') + '</h3>';
S.menu.forEach(function (k) {
var it = B.ITEMS[k], fp = B.fairFor(S, k, ph), pr = S.prices[k], eff = pr * (plan.happy && it.cat !== 'food' && B.canHappy(S, ph) ? 0.7 : 1);
var need = (f.units[k] || 0) * rest, low = S.stock[k] < need;
var sub = 'fair ' + price$(fp) + ' · EK ' + price$(S.cost[k]) + ' · ' + (running() ? 'Rest' : 'Prognose') + ' ≈ ' + n0(need) + ' · Lager <span class="' + (low ? 'neg' : '') + '">' + n0(S.stock[k]) + '</span>';
h += '<div class="row"><div class="grow"><div class="name"><span class="swatch" style="background:' + it.c + '"></span>' + it.n + ' ' + tagFor(eff / fp) + '</div><div class="sub">' + sub + (low && running() ? ' <button type="button" class="btn sm" data-a="buy" data-v="' + k + '" data-w="' + Math.max(10, Math.ceil(need - S.stock[k] + 5)) + '">Eil +' + n0(Math.max(10, Math.ceil(need - S.stock[k] + 5))) + '</button>' : '') + '</div></div>' +
'<div class="step"><button type="button" class="btn" data-a="price" data-v="' + k + '" data-w="-1" aria-label="billiger">−</button><span class="v">' + price$(pr) + '</span><button type="button" class="btn" data-a="price" data-v="' + k + '" data-w="1" aria-label="teurer">+</button></div></div>';
});
B.RKEYS.forEach(function (k) {
if (!B.rentOffered(S, k)) return;
var fp = B.fairPrice(S, k), pr = S.prices[k];
h += '<div class="row"><div class="grow"><div class="name">' + B.RENTALS[k].n + ' ' + tagFor(pr / fp) + '</div><div class="sub">fair ' + price$(fp) + ' · Nachfrage ≈ ' + n0((f.rent[k] || 0) * rest) + ' · Kapazität ' + n0(B.rentCap(S, k)) + '</div></div>' +
'<div class="step"><button type="button" class="btn" data-a="price" data-v="' + k + '" data-w="-1" aria-label="billiger">−</button><span class="v">' + price$(pr) + '</span><button type="button" class="btn" data-a="price" data-v="' + k + '" data-w="1" aria-label="teurer">+</button></div></div>';
});
if (!S.menu.length) h += '<p class="warn">Die Karte ist leer – ohne Angebot verkaufst du nichts.</p>';
return h + '<div class="btns"><button type="button" class="btn sm" data-a="fair">Alle auf fair</button><button type="button" class="btn sm" data-t2="menu">Karte bearbeiten</button></div></div>';
}
function panePlan() {
var ph = S.phase, f = B.forecast(S, ph, S.plan), h = eventCard();
var LR = S.today.phases[S.today.phases.length - 1];
if (LR && window.innerWidth < 900) {
h += '<div class="card"><b>' + B.PHASES[LR.ph].n + ':</b> Gewinn <b class="' + (LR.profit >= 0 ? 'pos' : 'neg') + '">' + M(LR.profit) + '</b> · ' + n0(LR.guests) + ' Gäste' + (LR.turned ? ' · <span class="neg">' + n0(LR.turned) + ' abgewiesen</span>' : '') + ' · Zufr. ' + Math.round(LR.sat) + ' %' +
LR.hints.slice(0, 2).map(function (x) { return '<div class="hint ' + x.k + '" style="margin:6px 0 0">' + esc(x.t) + '</div>'; }).join('') + '<div class="btns"><button type="button" class="btn sm" data-t2="result">Alle Zahlen</button></div></div>';
}
h += '<div class="sec"><h3>' + B.PHASES[ph].n + ' ' + B.PHASES[ph].t + ' Uhr – Prognose</h3>';
h += '<div class="kgrid"><div class="k"><small>Gäste</small><b>≈ ' + n0(f.guests) + '</b><span>Nachfrage ' + n0(f.demand) + ' · Platz ' + n0(f.cap) + '</span></div>' +
'<div class="k"><small>Bestellungen</small><b>≈ ' + n0(f.load) + '</b><span>Arbeitseinheiten</span></div>' +
'<div class="k"><small>Personal nötig</small><b>' + f.staffNeed + '</b><span>je ' + n0(B.staffCap(S)) + ' Einheiten</span></div></div>';
h += '<p class="muted" style="margin-top:8px">Publikum</p>' + mixBar(f.mix) + legend(f.mix);
if (f.demand > f.cap * 1.05) h += '<p class="warn">Mehr Nachfrage als Plätze – ≈ ' + n0(f.demand - f.cap) + ' Gäste werden abgewiesen.</p>';
h += missingHint(f) + '</div>';
h += staffBlock(f, ph) + priceRows(f, 1);
h += '<label class="chk"><input type="checkbox" data-a="auto" ' + (autoNext ? 'checked' : '') + '> Nächste Phase automatisch starten</label>';
h += '<button type="button" class="btn pink big" data-a="run" ' + (S.event ? 'disabled' : '') + '>▶ ' + B.PHASES[ph].n + ' starten (' + Math.round(B.NT * TICKMS / 1000 / speed) + ' s)</button>';
if (S.event) h += '<p class="muted">Entscheide erst über das Ereignis oben.</p>';
return h;
}
function paneLive() {
var run = S.run, R = run.R, ph = run.ph, f = B.forecast(S, ph, S.plan), rest = (B.NT - run.tick) / B.NT, h = '';
var L = run.last;
h += '<div class="live"><div class="clock"><span>' + B.PHASES[ph].n + ' läuft</span><b id="liveClock">' + clock() + '</b></div>';
h += '<div class="prog"><i id="liveBar" style="width:' + ((run.tick + Math.min(1, acc / TICKMS)) / B.NT * 100).toFixed(1) + '%"></i></div>';
h += '<div class="kgrid"><div class="k"><small>Gäste bisher</small><b>' + n0(R.guests) + '</b><span>' + (R.turned >= 1 ? '<span class="neg">' + n0(R.turned) + ' abgewiesen</span>' : 'niemand abgewiesen') + '</span></div>' +
'<div class="k"><small>Umsatz bisher</small><b class="gold">' + M(R.rev) + '</b><span>Kosten ' + M(R.cogs + R.wages + R.dj + R.ops) + '</span></div>' +
'<div class="k"><small>Stimmung</small><b class="' + (!L ? '' : L.sat >= 70 ? 'pos' : L.sat >= 50 ? 'warn' : 'neg') + '">' + (L ? Math.round(L.sat) + ' %' : '–') + '</b><span>Auslastung ' + (L ? pct(L.util) : '–') + '</span></div></div>';
h += '<div class="tick" style="margin-top:8px">' + (feed.length ? feed.slice(0, 7).map(function (x) { return '<div' + (x.c ? ' class="' + x.c + '"' : '') + '><span class="t">' + x.t + '</span>' + x.m + '</div>'; }).join('') : '<div class="muted">Die ersten Gäste kommen …</div>') + '</div>';
h += '<div class="btns"><button type="button" class="btn sm" data-a="pause">' + (paused ? '▶ Weiter' : '❚❚ Pause') + '</button><button type="button" class="btn sm" data-a="speed">Tempo ' + speed + '×</button></div></div>';
h += missingHint({ missing: f.missing });
h += staffBlock(f, ph) + priceRows(f, rest);
h += '<p class="muted">Nachbestellungen laufen als Eilbestellung (+50 %). Karte und Ausbau änderst du zwischen den Phasen.</p>';
return h;
}
function withTomorrow(fn) { var w0 = S.weather[0]; S.weather[0] = S.weather[1]; try { return fn(); } finally { S.weather[0] = w0; } }
function paneNight() {
var rep = S.reports[S.reports.length - 1], h = '';
h += '<div class="sec"><h3>Feierabend – Tag ' + S.day + '</h3>';
if (rep) h += '<div class="kgrid"><div class="k"><small>Tagesgewinn</small><b class="' + (rep.profit >= 0 ? 'pos' : 'neg') + '">' + M(rep.profit) + '</b><span>Umsatz ' + M(rep.revTot) + '</span></div><div class="k"><small>Gäste</small><b>' + n0(rep.guests) + '</b><span>' + n0(rep.turned) + ' abgewiesen</span></div><div class="k"><small>Ruf</small><b>' + rep.rating1.toFixed(2).replace('.', ',') + '</b><span class="' + (rep.rating1 >= rep.rating0 ? 'pos' : 'neg') + '">' + (rep.rating1 >= rep.rating0 ? '+' : '') + (rep.rating1 - rep.rating0).toFixed(2).replace('.', ',') + '</span></div></div>';
h += '<div class="btns"><button type="button" class="btn sm" data-a="report">Tagesbilanz ansehen</button></div></div>';
h += '<div class="sec"><h3>Wetter</h3>';
for (var i = 1; i < 4; i++) h += '<div class="row"><div class="grow">' + (i === 1 ? 'Morgen' : 'In ' + i + ' Tagen') + '</div><b>' + wname(S.weather[i]) + '</b></div>';
h += '<p class="muted">Hitze: mehr Softdrinks & Bier. Kühl: mehr Kaffee. Regen: kaum Gäste.</p></div>';
var fc = withTomorrow(function () { return B.forecastDay(S); });
h += '<div class="sec"><h3>Einkauf für morgen</h3><table class="t"><tr><th>Ware</th><th>Prognose</th><th>Lager</th><th>Fehlt</th></tr>';
var miss = 0;
S.menu.forEach(function (k) { var need = Math.max(0, Math.ceil(fc[k] * 1.1 - S.stock[k])); miss += need * S.cost[k]; h += '<tr><td><span class="swatch" style="background:' + B.ITEMS[k].c + '"></span>' + nm(k) + '</td><td>' + n0(fc[k]) + '</td><td>' + n0(S.stock[k]) + '</td><td class="' + (need ? 'neg' : 'pos') + '">' + n0(need) + '</td></tr>'; });
h += '</table><div class="btns"><button type="button" class="btn pri" data-a="fillAll">Alles auffüllen (≈ ' + M(miss) + ')</button><button type="button" class="btn" data-t2="stock">Lager</button><button type="button" class="btn" data-t2="menu">Karte</button></div></div>';
h += '<p class="muted">Jetzt ist die Zeit für Karte, Ausbau, Werbung und Kredit.</p>';
h += '<button type="button" class="btn pink big" data-a="next">▶ Tag ' + (S.day + 1) + ' starten</button>';
return h;
}
function paneMenu() {
var slots = B.menuSlots(S), used = S.menu.length, edit = !running(), h = '';
var f5 = [], ph0 = S.mode === 'night' ? 0 : curPh(), plan = { staff: S.plan.staff, happy: false, dj: false };
var calc = function () { for (var ph = 0; ph < 5; ph++) f5.push(B.forecast(S, ph, { staff: plan.staff, happy: false, dj: B.canDJ(S, ph) })); };
if (S.mode === 'night') withTomorrow(calc); else calc();
h += '<div class="sec"><h3>Karte – ' + used + ' von ' + slots + ' Plätzen</h3><p class="muted">Jede Tageszeit und jedes Publikum will anderes: morgens kalte Softdrinks und Kaffee, nachmittags Bier, abends Wein, Cocktails und Shots. Zahlen = erwartete Bestellungen je Phase' + (S.mode === 'night' ? ' (morgen)' : '') + '.</p>';
if (!edit) h += '<p class="warn">Während einer Phase kann die Karte nicht geändert werden.</p>';
h += '</div><div class="sec"><h3>Publikum je Tageszeit</h3>';
for (var ph = 0; ph < 5; ph++) h += '<div class="mixrow"><span>' + B.PHASES[ph].n + '</span>' + mixBar(f5[ph].mix) + '</div>';
var tot = {}; B.SEGKEYS.forEach(function (g) { tot[g] = 0; f5.forEach(function (f) { tot[g] += f.mix[g] * f.guests; }); });
var sum = 0; B.SEGKEYS.forEach(function (g) { sum += tot[g]; }); B.SEGKEYS.forEach(function (g) { tot[g] = sum ? tot[g] / sum : 0; });
h += legend(tot) + '<p class="muted">Je besser Bar und Ruf, desto zahlungskräftiger das Publikum.</p>';
var miss = {}; f5.forEach(function (f) { for (var c in f.missing) miss[c] = (miss[c] || 0) + f.missing[c]; });
var mk = Object.keys(miss).filter(function (c) { return miss[c] > 4; });
if (mk.length) h += '<p class="warn">Den ganzen Tag gefragt, nicht im Angebot: ' + mk.map(function (c) { return B.CATS[c].n + ' (≈ ' + n0(miss[c]) + ')'; }).join(', ') + '</p>';
h += '</div>';
B.CKEYS.forEach(function (c) {
var keys = B.IKEYS.filter(function (k) { return B.ITEMS[k].cat === c; });
h += '<div class="catH">' + B.CATS[c].n + '</div>';
keys.forEach(function (k) {
var it = B.ITEMS[k], on = B.onMenu(S, k), un = B.unlocked(S, k);
if (!un) { h += '<div class="row locked"><div class="grow"><div class="name"><span class="swatch" style="background:' + it.c + '"></span>' + it.n + '</div><div class="sub">🔒 ' + esc(B.lockWhy(S, k)) + '</div></div></div>'; return; }
var pots = f5.map(function (f) { return f.potential[k] || 0; }), mx = Math.max.apply(null, pots);
var margin = S.prices[k] - S.cost[k];
h += '<div class="row' + (on ? '' : ' off') + '"><div class="grow"><div class="name"><span class="swatch" style="background:' + it.c + '"></span>' + it.n + (it.lux ? ' <span class="gold">★</span>' : '') + '</div><div class="sub">VK ' + price$(S.prices[k]) + ' · EK ' + price$(S.cost[k]) + ' · Marge ' + price$(margin) + (it.spoil ? ' · verderblich' : '') + (S.stock[k] ? ' · Lager ' + n0(S.stock[k]) : '') + '</div>' +
'<div class="pot">' + pots.map(function (v, i) { return '<span class="' + (v >= mx * 0.75 && v >= 1 ? 'hi' : '') + (i === ph0 && S.mode !== 'night' ? ' cur' : '') + '">' + PSHORT[i] + ' ' + (v >= 0.5 ? n0(v) : '–') + '</span>'; }).join('') + '</div></div>' +
'<button type="button" class="btn sm ' + (on ? 'on' : '') + '" data-a="menu" data-v="' + k + '" ' + (edit && (on || used < slots) ? '' : 'disabled') + '>' + (on ? 'Auf Karte' : '+ Aufnehmen') + '</button></div>';
});
});
h += '<p class="muted">Mehr Kartenplätze gibt es mit jeder Ausbaustufe und der zweiten Theke. Eine vielfältige Karte zieht mehr Gäste an.</p>';
return h;
}
function paneResult() {
var live = running(), R = live ? S.run.R : S.today.phases[S.today.phases.length - 1], h = '';
if (!R && S.mode === 'night' && S.reports.length) { var ps = S.reports[S.reports.length - 1].phases; R = ps[ps.length - 1]; }
if (!R) h += '<h3 class="pink">Ergebnis</h3><p class="muted">Noch keine Phase gespielt. Stell Karte, Preise und Personal ein und starte die erste Schicht.</p>';
else {
var cost = R.cogs + R.wages + R.dj + R.ops, profit = R.rev - cost, sat = live ? (R.satW ? R.satSum / R.satW : 0) : R.sat, util = live ? (R.capU ? R.load / R.capU : 0) : R.util;
h += '<h3 class="pink">' + (live ? 'Live: ' : 'Ergebnis: ') + B.PHASES[R.ph].n + '</h3>';
h += '<div class="kgrid">' +
'<div class="k"><small>Gäste</small><b>' + n0(R.guests) + '</b><span>von ' + n0(R.demand) + ' Nachfrage</span></div>' +
'<div class="k"><small>Abgewiesen</small><b class="' + (R.turned >= 1 ? 'neg' : '') + '">' + n0(R.turned) + '</b><span>kein Platz</span></div>' +
'<div class="k"><small>Umsatz</small><b class="gold">' + M(R.rev) + '</b><span>Ø ' + price$(R.guests ? R.rev / R.guests : 0) + ' pro Gast</span></div>' +
'<div class="k"><small>Kosten</small><b>' + M(cost) + '</b><span>Ware ' + M(R.cogs) + ' · Personal ' + M(R.wages) + '</span></div>' +
'<div class="k"><small>Gewinn</small><b class="' + (profit >= 0 ? 'pos' : 'neg') + '">' + M(profit) + '</b><span>Marge ' + (R.rev ? pct(profit / R.rev) : '–') + '</span></div>' +
'<div class="k"><small>Zufriedenheit</small><b class="' + (sat >= 70 ? 'pos' : sat >= 50 ? 'warn' : 'neg') + '">' + Math.round(sat) + ' %</b><span>Auslastung ' + pct(util) + '</span></div></div>';
h += '<p class="muted" style="margin-top:8px">Publikum</p>' + mixBar(R.mix);
h += '<table class="t" style="margin-top:8px"><tr><th>Produkt</th><th>Preis</th><th>Verkauft</th><th>Wollten</th><th>Fehlt</th><th>Umsatz</th></tr>';
var keys = Object.keys(R.prod).sort(function (a, b) { return R.prod[b].rev - R.prod[a].rev; });
keys.forEach(function (key) {
var p = R.prod[key], miss = (p.lostStock || 0) + (p.lostService || 0);
h += '<tr><td><span class="swatch" style="background:' + B.ITEMS[key].c + '"></span>' + nm(key) + '</td><td>' + price$(p.price) + '</td><td>' + n0(p.sold) + '</td><td>' + n0(p.req) + '</td><td class="' + (miss >= 1 ? 'neg' : '') + '">' + n0(miss) + '</td><td>' + M(p.rev) + '</td></tr>';
});
Object.keys(R.rent).forEach(function (key) { var p = R.rent[key]; h += '<tr><td>' + nm(key) + '</td><td>' + price$(p.price) + '</td><td>' + n0(p.sold) + '</td><td>' + n0(p.req) + '</td><td class="' + (p.lostPlace >= 1 ? 'neg' : '') + '">' + n0(p.lostPlace) + '</td><td>' + M(p.rev) + '</td></tr>'; });
h += '</table>';
var mc = Object.keys(R.missing || {}).filter(function (c) { return R.missing[c] >= 1; });
if (mc.length) h += '<p class="warn">Nicht im Angebot, aber gefragt: ' + mc.map(function (c) { return B.CATS[c].n + ' ' + n0(R.missing[c]) + '×'; }).join(', ') + '</p>';
if (!live && R.hints) h += '<div style="margin-top:8px">' + R.hints.map(function (x) { return '<div class="hint ' + x.k + '">' + esc(x.t) + '</div>'; }).join('') + '</div>';
}
var phs = S.mode === 'night' && S.reports.length ? S.reports[S.reports.length - 1].phases : S.today.phases;
if (phs.length) {
var mx = 1; phs.forEach(function (x) { mx = Math.max(mx, Math.abs(x.profit)); });
h += '<h3 style="margin-top:12px">Heute pro Phase</h3><div class="bars">';
for (var i = 0; i < 5; i++) { var x = phs[i]; h += '<div>' + (x ? '<span>' + M(x.profit) + '</span><i class="' + (x.profit < 0 ? 'neg' : '') + '" style="height:' + Math.max(2, Math.abs(x.profit) / mx * 52) + 'px"></i>' : '<i style="height:2px;background:#3a2456"></i>') + B.PHASES[i].n.slice(0, 5) + '</div>'; }
h += '</div>';
var tr = 0, tc = 0, tw = 0, td = 0, to = 0; phs.forEach(function (x) { tr += x.rev; tc += x.cogs; tw += x.wages; td += x.dj; to += x.ops; });
h += '<table class="t"><tr><td>Umsatz</td><td class="pos">' + M(tr) + '</td></tr><tr><td>Wareneinsatz</td><td>−' + M(tc) + '</td></tr><tr><td>Personal</td><td>−' + M(tw) + '</td></tr>' + (td ? '<tr><td>DJ</td><td>−' + M(td) + '</td></tr>' : '') + '<tr><td>Betriebskosten</td><td>−' + M(to) + '</td></tr><tr class="tot"><td>Deckungsbeitrag</td><td class="' + (tr - tc - tw - td - to >= 0 ? 'pos' : 'neg') + '">' + M(tr - tc - tw - td - to) + '</td></tr></table>';
h += '<p class="muted">Abends kommen Pacht ' + M(B.STAGES[S.stage].fix) + ', Wartung ' + M(B.upkeep(S)) + (S.loan ? ', Zinsen ' + M(S.loan * 0.015) : '') + ' und Verderb dazu.</p>';
}
return h;
}
function restOfDay() {
var tot = {}; B.IKEYS.forEach(function (k) { tot[k] = 0; });
for (var ph = curPh(); ph < 5; ph++) { var f = B.forecast(S, ph, { staff: S.plan.staff, happy: false, dj: B.canDJ(S, ph) }), w = running() && ph === S.run.ph ? (B.NT - S.run.tick) / B.NT : 1; for (var k in f.units) tot[k] += f.units[k] * w; }
return tot;
}
function paneStock() {
var rush = B.rushActive(S), used = B.stockUsed(S), cap = B.storeCap(S), h = '';
h += '<div class="sec"><h3>Lager</h3><p>Belegt <b>' + n0(used) + '</b> von ' + n0(cap) + ' Plätzen</p><div class="meter ' + (used / cap > 0.9 ? 'warn' : '') + '"><i style="width:' + Math.min(100, used / cap * 100) + '%"></i></div>';
h += rush ? '<p class="warn">Der Tag läuft: Nachbestellungen sind Eilbestellungen (+50 %). Günstiger kaufst du abends oder vor dem Morgen.</p>' : '<p class="muted">Einkaufspreise schwanken täglich. Verderbliches (Smoothies, Cocktail-Sets, Essen) verdirbt nachts teilweise – ein Kühlraum hilft.</p>';
h += '</div>';
var fc = S.mode === 'night' ? withTomorrow(function () { return B.forecastDay(S); }) : restOfDay();
var keys = S.menu.concat(B.IKEYS.filter(function (k) { return !B.onMenu(S, k) && S.stock[k] > 0; }));
keys.forEach(function (k) {
var it = B.ITEMS[k], on = B.onMenu(S, k), unit = S.cost[k] * (rush ? 1.5 : 1), need = on ? Math.max(0, Math.ceil(fc[k] * 1.1 - S.stock[k])) : 0, trend = S.cost[k] / it.cost;
h += '<div class="row"><div class="grow"><div class="name"><span class="swatch" style="background:' + it.c + '"></span>' + it.n + ' · <span class="gold">' + n0(S.stock[k]) + '</span>' + (on ? '' : ' <span class="muted">(nicht auf der Karte)</span>') + '</div><div class="sub">EK ' + price$(unit) + (trend > 1.07 ? ' <span class="neg">(teuer heute)</span>' : trend < 0.93 ? ' <span class="pos">(günstig heute)</span>' : '') + ' · VK ' + price$(S.prices[k]) + (on ? ' · ' + (S.mode === 'night' ? 'Prognose morgen' : 'Bedarf heute noch') + ' ≈ ' + n0(fc[k]) : '') + (it.spoil ? ' · verdirbt ' + Math.round(it.spoil * (1 - 0.35 * S.up.kuehl) * 100) + ' %/Nacht' : '') + '</div>' +
'<div class="btns"><button type="button" class="btn sm" data-a="buy" data-v="' + k + '" data-w="20">+20</button><button type="button" class="btn sm" data-a="buy" data-v="' + k + '" data-w="100">+100</button>' +
(need ? '<button type="button" class="btn sm pri" data-a="buy" data-v="' + k + '" data-w="' + need + '">Auffüllen +' + n0(need) + ' (' + M(need * unit) + ')</button>' : on ? '<span class="muted">reicht</span>' : '') + '</div></div></div>';
});
if (!keys.length) h += '<p class="muted">Nichts auf der Karte.</p>';
return h;
}
function paneBuild() {
var h = '', ok = canBuild();
if (!ok) h += '<p class="warn">Ausbau, Werbung und Kredit sind nur vor dem Morgen oder abends nach Feierabend möglich.</p>';
var si = B.stageInfo(S);
h += '<div class="sec"><h3>Ausbaustufe</h3>';
if (si) {
var d = si.def, cur = B.STAGES[S.stage];
var newP = B.IKEYS.filter(function (k) { return B.ITEMS[k].stage === si.stage; }).map(nm);
var newG = B.SEGKEYS.filter(function (g) { return B.SEGS[g].stg[si.stage] > 0 && !B.SEGS[g].stg[S.stage]; }).map(function (g) { return B.SEGS[g].n; });
h += '<div class="card"><canvas width="320" height="150" data-preview="' + si.stage + '"></canvas><div class="name"><b>' + si.stage + ' · ' + d.n + '</b> <span class="gold">' + M(si.cost) + '</span></div><p class="muted">' + esc(d.d) + '</p>' +
'<table class="t"><tr><th></th><th>jetzt</th><th>danach</th></tr><tr><td>Grundnachfrage</td><td>' + cur.base + '</td><td class="pos">' + d.base + '</td></tr><tr><td>Plätze pro Phase</td><td>' + cur.cap + '</td><td class="pos">' + d.cap + '</td></tr><tr><td>Personalplätze</td><td>' + cur.slots + '</td><td class="pos">' + d.slots + '</td></tr><tr><td>Kartenplätze</td><td>' + cur.menu + '</td><td class="pos">' + d.menu + '</td></tr><tr><td>Preisniveau</td><td>×' + String(cur.sm).replace('.', ',') + '</td><td class="pos">×' + String(d.sm).replace('.', ',') + '</td></tr><tr><td>Max. Ruf</td><td>' + String(cur.rmax).replace('.', ',') + '★</td><td class="pos">' + String(d.rmax).replace('.', ',') + '★</td></tr><tr><td>Lohn pro Kopf/Phase</td><td>' + M(cur.wage) + '</td><td class="neg">' + M(d.wage) + '</td></tr><tr><td>Pacht pro Tag</td><td>' + M(cur.fix) + '</td><td class="neg">' + M(d.fix) + '</td></tr><tr><td>Betriebskosten/Gast</td><td>' + price$(cur.ops) + '</td><td class="neg">' + price$(d.ops) + '</td></tr></table>' +
(newP.length ? '<p>Neu im Angebot: ' + newP.join(', ') + '</p>' : '') + (newG.length ? '<p>Neue Gäste: ' + newG.join(', ') + '</p>' : '') +
(si.locked ? '<p class="warn">Benötigt: ' + si.why + ' (Rekord: ' + S.bestRating.toFixed(2).replace('.', ',') + '★)</p>' : '') +
'<button type="button" class="btn ' + (si.ok && ok ? 'pink' : '') + '" data-a="expand" ' + (si.ok && ok ? '' : 'disabled') + '>Ausbauen für ' + M(si.cost) + '</button></div>';
} else h += '<p class="pos">Voll ausgebaut – das Vice Beach Resort!</p>';
h += '</div><div class="sec"><h3>Zusatz-Ausbauten</h3>';
B.UKEYS.forEach(function (k) {
var u = B.UPGRADES[k], i = B.upgradeInfo(S, k), lvl = S.up[k];
h += '<div class="row"><div class="grow"><div class="name">' + u.n + (u.max > 1 ? ' <span class="muted">(' + lvl + '/' + u.max + ')</span>' : (lvl ? ' <span class="pos">✓</span>' : '')) + '</div><div class="sub">' + u.d + (i.done ? '' : ' · <span class="gold">' + M(i.cost) + '</span>') + (S.stage < u.stage ? ' · <span class="warn">' + i.why + '</span>' : '') + '</div></div>' +
(i.done ? '' : '<button type="button" class="btn sm ' + (i.ok && ok ? 'pri' : '') + '" data-a="up" data-v="' + k + '" ' + (i.ok && ok ? '' : 'disabled') + '>Kaufen</button>') + '</div>';
});
h += '</div><div class="sec"><h3>Werbung</h3>';
Object.keys(B.MKT).forEach(function (k) {
var m = B.MKT[k], c = B.mktCost(S, k), run = S.mkt.filter(function (x) { return x.k === k; })[0];
var can = ok && S.stage >= m.stage && !run && S.cash >= c;
h += '<div class="row"><div class="grow"><div class="name">' + m.n + '</div><div class="sub">+' + Math.round(m.boost * 100) + ' % Gäste für ' + m.days + ' Tag' + (m.days > 1 ? 'e' : '') + ' · <span class="gold">' + M(c) + '</span>' + (S.stage < m.stage ? ' · <span class="warn">ab Stufe ' + m.stage + '</span>' : '') + (run ? ' · <span class="pos">läuft noch ' + run.left + ' Tag(e)</span>' : '') + '</div></div><button type="button" class="btn sm ' + (can ? 'pri' : '') + '" data-a="mkt" data-v="' + k + '" ' + (can ? '' : 'disabled') + '>Buchen</button></div>';
});
var lim = B.loanLimit(S), step = 1000 * S.stage;
h += '</div><div class="sec"><h3>Bankkredit</h3><p>Schulden <b class="' + (S.loan ? 'neg' : '') + '">' + M(S.loan) + '</b> von ' + M(lim) + ' Rahmen · Zinsen 1,5 % pro Tag' + (S.loan ? ' (≈ ' + M(S.loan * 0.015) + ' täglich)' : '') + '</p>' +
'<div class="btns"><button type="button" class="btn" data-a="borrow" data-v="' + step + '" ' + (ok && S.loan < lim ? '' : 'disabled') + '>+' + M(step) + ' leihen</button><button type="button" class="btn" data-a="repay" data-v="' + step + '" ' + (ok && S.loan > 0 ? '' : 'disabled') + '>' + M(step) + ' tilgen</button><button type="button" class="btn" data-a="repay" data-v="999999999" ' + (ok && S.loan > 0 ? '' : 'disabled') + '>Alles tilgen</button></div>' +
'<p class="muted">Rutscht die Kasse abends ins Minus, wird automatisch Kredit gezogen. Ist der Rahmen voll und das Konto 3 Tage im Minus, ist die Bar pleite.</p></div>';
return h;
}
function paneGoals() {
var cur = B.currentGoal(S), h = '<div class="sec"><h3>Ziele</h3>';
B.GOALS.forEach(function (g) { var d = S.goalsDone[g.id]; h += '<div class="goal ' + (d ? 'done' : '') + (cur && cur.id === g.id ? ' cur' : '') + '">' + (d ? '✓ ' : cur && cur.id === g.id ? '▶ ' : '') + esc(g.n) + (g.r ? ' <span class="gold">+' + M(g.r) + '</span>' : '') + '</div>'; });
h += '</div>';
if (S.history.length) {
var mx = 1; S.history.forEach(function (x) { mx = Math.max(mx, Math.abs(x.p)); });
h += '<div class="sec"><h3>Gewinn der letzten Tage</h3><div class="bars">';
S.history.slice(-10).forEach(function (x) { h += '<div><i class="' + (x.p < 0 ? 'neg' : '') + '" style="height:' + Math.max(2, Math.abs(x.p) / mx * 58) + 'px"></i>T' + x.d + '</div>'; });
h += '</div></div>';
}
var b = best();
h += '<div class="sec"><h3>Statistik</h3><table class="t"><tr><td>Ruf-Rekord</td><td>' + S.bestRating.toFixed(2).replace('.', ',') + '★</td></tr><tr><td>Bester Tagesgewinn</td><td>' + M(S.bestProfit) + '</td></tr><tr><td>Meiste Gäste</td><td>' + n0(S.bestGuests) + '</td></tr><tr><td>Gesamtumsatz</td><td>' + M(S.earned) + '</td></tr>' + (b.day ? '<tr><td>Allzeit-Rekord</td><td>Tag ' + b.day + ', Stufe ' + b.stage + '</td></tr>' : '') + '</table></div>';
h += '<div class="btns"><button type="button" class="btn red" data-a="restart">Neues Spiel</button></div>';
return h;
}

// ---------- modals ----------
function modal(title, html) { $('mTitle').textContent = title; $('mBody').innerHTML = html; $('modal').hidden = false; $('mBody').scrollTop = 0; }
function closeModal() { $('modal').hidden = true; }
function reportModal() {
var r = S.reports[S.reports.length - 1]; if (!r) return;
var h = '<table class="t">';
Object.keys(r.rev).sort(function (a, b) { return r.rev[b] - r.rev[a]; }).forEach(function (k) { if (r.rev[k] >= 1) h += '<tr><td>' + nm(k) + ' <span class="muted">(' + n0(r.sold[k]) + ')</span></td><td class="pos">' + M(r.rev[k]) + '</td></tr>'; });
h += '<tr class="tot"><td>Umsatz</td><td class="pos">' + M(r.revTot) + '</td></tr>';
[['Wareneinsatz', r.cogs], ['Personal', r.wages], ['DJ', r.dj], ['Betriebskosten', r.ops], ['Werbung & Ereignisse', r.mkt], ['Verderb (' + r.spoil + ' Stk.)', r.spoilVal], ['Pacht', r.fix], ['Wartung', r.upkeep], ['Kreditzinsen', r.interest]].forEach(function (x) { if (x[1] >= 0.5) h += '<tr><td>' + x[0] + '</td><td class="neg">−' + M(x[1]) + '</td></tr>'; });
h += '<tr class="tot"><td>Tagesgewinn</td><td class="' + (r.profit >= 0 ? 'pos' : 'neg') + '">' + M(r.profit) + '</td></tr></table>';
if (r.invest || r.buy) h += '<p class="muted">Außerdem ausgegeben: Einkauf ' + M(r.buy) + (r.invest ? ', Ausbau ' + M(r.invest) : '') + '. Kasse jetzt ' + M(r.cash) + '.</p>';
var lost = r.lost.stock + r.lost.service + r.lost.place;
h += '<div class="kgrid" style="margin-top:8px"><div class="k"><small>Gäste</small><b>' + n0(r.guests) + '</b><span>' + n0(r.turned) + ' abgewiesen</span></div><div class="k"><small>Verlorene Verkäufe</small><b class="' + (lost >= 1 ? 'neg' : 'pos') + '">' + n0(lost) + '</b><span>Lager ' + n0(r.lost.stock) + ' · Personal ' + n0(r.lost.service) + ' · Platz ' + n0(r.lost.place) + '</span></div><div class="k"><small>Nicht im Angebot</small><b class="' + (r.lost.menu >= 1 ? 'warn' : 'pos') + '">' + n0(r.lost.menu) + '</b><span>Wünsche ohne passende Karte</span></div><div class="k"><small>Zufriedenheit</small><b>' + Math.round(r.sat) + ' %</b><span>Ruf ' + r.rating0.toFixed(2).replace('.', ',') + ' → ' + r.rating1.toFixed(2).replace('.', ',') + '</span></div></div>';
if (r.rating1 >= B.STAGES[S.stage].rmax - 0.01 && B.stageInfo(S)) h += '<p class="warn">Dein Ruf ist für die ' + B.STAGES[S.stage].n + ' am Maximum. Mehr geht erst nach dem nächsten Ausbau.</p>';
if (r.goals && r.goals.length) h += r.goals.map(function (g) { return '<p class="gold">Ziel geschafft: ' + esc(g.n) + (g.r ? ' (+' + M(g.r) + ')' : '') + '</p>'; }).join('');
if (r.autoLoan) h += '<p class="neg">Konto war im Minus – ' + M(r.autoLoan) + ' Kredit automatisch aufgenommen.</p>';
if (r.debt) h += '<p class="neg"><b>Konto im Minus! Tag ' + r.debt + ' von 3 – danach ist die Bar pleite.</b></p>';
h += '<div class="btns"><button type="button" class="btn pink" data-a="closeReport">Weiter</button></div>';
modal('Tagesbilanz Tag ' + r.day, h);
}
function startModal() {
var sv = load(), b = best();
var h = '<div class="title"><div class="sub">VICE BEACH</div><h1>BEACH BAR BOSS</h1><div class="sub">Zahlen · Sonne · Cocktails</div></div>' +
'<ul class="help"><li>Ein Tag hat 5 Phasen, jede läuft live etwa eine Minute (Tempo 1×). Preise, Personal, Happy Hour und DJ kannst du auch während der Phase ändern.</li>' +
'<li>Stell deine <b>Karte</b> zusammen: morgens kalte Softdrinks und Kaffee, nachmittags Bier, abends Wein, Cocktails und Champagner. Die Kartenplätze sind begrenzt.</li>' +
'<li>Je besser Bar und Ruf, desto zahlungskräftiger das Publikum – vom Surfer bis zum Jetset.</li>' +
'<li>Abends günstig einkaufen (tagsüber nur Eilbestellung +50 %), ausbauen, werben. Drei Tage im Minus ohne Kreditrahmen = pleite.</li></ul>' +
'<div class="btns" style="justify-content:center">' + (sv ? '<button type="button" class="btn pink" data-a="cont">Weiter (Tag ' + sv.day + ')</button>' : '') + '<button type="button" class="btn ' + (sv ? '' : 'pink') + '" data-a="new">Neues Spiel</button></div>' +
(b.day ? '<p class="muted" style="text-align:center">Rekord: Tag ' + b.day + ' · Stufe ' + b.stage + ' · ' + (b.rating || 0).toFixed(2).replace('.', ',') + '★</p>' : '');
modal('Willkommen', h);
}
function overModal() { modal('Pleite', '<p class="neg"><b>Drei Tage im Minus – die Bar ist pleite.</b></p><p>Geschafft bis Tag ' + S.day + ', Stufe ' + S.stage + ' (' + B.STAGES[S.stage].n + '), Ruf-Rekord ' + S.bestRating.toFixed(2).replace('.', ',') + '★.</p><p class="muted">Tipp: Karte zur Tageszeit passend wählen, abends günstig einkaufen, Personal an die Prognose anpassen.</p><div class="btns"><button type="button" class="btn pink" data-a="new">Neues Spiel</button></div>'); }
function winModal() { modal('Legende!', '<div class="title"><h1>LEGENDE!</h1><div class="sub">Vice Beach Resort mit 4,8★ an Tag ' + S.day + '</div></div><p>Du hast die beste Bar von Vice Beach. Spiel gerne weiter und knack deine Rekorde.</p><div class="btns"><button type="button" class="btn pink" data-a="closeModal">Weiterspielen</button></div>'); }

// ---------- actions ----------
function msgFlash(t) { var el = document.createElement('div'); el.className = 'hint bad'; el.textContent = t; var L = $('left'); L.insertBefore(el, L.firstChild); L.scrollTop = 0; setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2500); }
var LIVEOK = { price: 1, fair: 1, staff: 1, happy: 1, dj: 1, buy: 1, pause: 1, speed: 1, report: 1, closeModal: 1, auto: 1 };
var ACT = {
price: function (k, d) { var p = S.prices[k], step = p < 10 ? 0.5 : p < 50 ? 1 : 5; B.setPrice(S, k, Math.max(0, p + (+d) * step)); save(); render(); },
fair: function () { var ph = curPh(); B.IKEYS.forEach(function (k) { if (B.unlocked(S, k)) B.setPrice(S, k, B.fairFor(S, k, ph)); }); B.RKEYS.forEach(function (k) { if (B.rentOffered(S, k)) B.setPrice(S, k, B.fairPrice(S, k)); }); save(); render(); },
staff: function (v) { S.plan.staff = +v; save(); render(); },
happy: function () { S.plan.happy = !S.plan.happy; render(); },
dj: function () { S.plan.dj = !S.plan.dj; render(); },
menu: function (k) { var e = B.toggleMenu(S, k); if (e) msgFlash(e); save(); render(); },
event: function (v) { B.answerEvent(S, v === '1'); save(); render(); },
run: function () { startPhase(); },
pause: function () { paused = !paused; render(); },
speed: function () { cycleSpeed(); },
auto: function (v, w, el) { autoNext = el.checked; saveOpt(); },
next: function () { B.nextDay(S); S.plan.happy = false; S.plan.dj = false; feed = []; save(); saveBest(); tab = 'plan'; render(); },
report: function () { reportModal(); },
closeReport: function () { closeModal(); if (S.over) { overModal(); return; } if (S.won && !S.winShown) { S.winShown = true; save(); winModal(); } },
closeModal: function () { closeModal(); },
buy: function (k, q) { var e = B.buy(S, k, +q); if (e) msgFlash(e); save(); render(); },
fillAll: function () {
var fc = withTomorrow(function () { return B.forecastDay(S); });
S.menu.forEach(function (k) { var need = Math.ceil(fc[k] * 1.1 - S.stock[k]); if (need > 0) B.buy(S, k, need); });
save(); render();
},
expand: function () { var e = B.expand(S); if (e) msgFlash(e); save(); render(); },
up: function (k) { var e = B.buyUpgrade(S, k); if (e) msgFlash(e); save(); render(); },
mkt: function (k) { var e = B.buyMkt(S, k); if (e) msgFlash(e); save(); render(); },
borrow: function (v) { var e = B.borrow(S, +v); if (e) msgFlash(e); save(); render(); },
repay: function (v) { var e = B.repay(S, +v); if (e) msgFlash(e); save(); render(); },
restart: function (v, w, el) { if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Wirklich? Spielstand wird gelöscht'; return; } newGame(); },
new: function (v, w, el) { if (load() && !S.over && el.getAttribute('data-sure') !== '1' && $('mTitle').textContent === 'Willkommen') { el.setAttribute('data-sure', '1'); el.textContent = 'Alten Spielstand überschreiben?'; return; } newGame(); },
cont: function () { S = load() || B.newGame(seed()); closeModal(); tab = 'plan'; render(); }
};
function seed() { return (Date.now() & 0x7fffffff) || 7; }
function newGame() { S = B.newGame(seed()); feed = []; paused = false; save(); closeModal(); tab = 'plan'; render(); }
function cycleSpeed() { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; saveOpt(); render(); }
document.addEventListener('click', function (e) {
var t2 = e.target.closest('[data-t2]'); if (t2) { tab = t2.getAttribute('data-t2'); render(); return; }
var el = e.target.closest('[data-a]'); if (!el || el.disabled || !S && el.getAttribute('data-a') !== 'new') return;
var a = el.getAttribute('data-a');
if (running() && !LIVEOK[a]) return;
var f = ACT[a]; if (f) f(el.getAttribute('data-v'), el.getAttribute('data-w'), el);
});
$('speedBtn').addEventListener('click', cycleSpeed);
$('pauseBtn').addEventListener('click', function () { if (running()) { paused = !paused; render(); } });
window.addEventListener('keydown', function (e) {
if (!S || !$('modal').hidden) { if (e.key === 'Enter' && !$('modal').hidden) { var b = $('mBody').querySelector('.btn.pink'); if (b) b.click(); } return; }
if (e.key === 'Enter' || e.key === ' ') {
if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') && e.key === ' ') return;
e.preventDefault();
if (running()) { paused = !paused; render(); }
else if (S.mode === 'plan' && !S.event) startPhase(); else if (S.mode === 'night') ACT.next();
}
var n = +e.key; if (n >= 1 && n <= 6) { tab = TABS[n - 1][0]; render(); }
});

// ---------- live phase ----------
function startPhase() {
if (S.mode !== 'plan' || S.event) return;
save();
if (!B.beginPhase(S)) return;
acc = 0; paused = false; autoT = 0;
feed.unshift({ t: tLabel(S.run.ph, 0), m: '— ' + B.PHASES[S.run.ph].n + ' beginnt —', c: 'muted' });
if (tab === 'plan') $('left').setAttribute('data-tab', '');
render();
}
function onTick() {
var ph = S.run.ph, tk = S.run.tick, before = {};
S.menu.forEach(function (k) { before[k] = S.stock[k]; });
var miss0 = {}; for (var c in S.run.R.missing) miss0[c] = S.run.R.missing[c];
var R = B.tick(S), L = R ? null : S.run.last;
var last = L || (R ? R.last : null);
if (last) {
var top = last.sales.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (x) { return nm(x[0]) + ' ×' + Math.round(x[1]); }).join(', ');
feed.unshift({ t: tLabel(ph, tk + 1), m: Math.round(last.guests) + ' Gäste · ' + M(last.rev) + (top ? ' · ' + top : '') });
last.sales.forEach(function (x) { for (var i = 0; i < Math.min(3, Math.ceil(x[1] / 4)); i++) recent.push(B.ITEMS[x[0]].c); });
while (recent.length > 14) recent.shift();
S.menu.forEach(function (k) { if (before[k] > 0 && S.stock[k] < 0.5) feed.unshift({ t: tLabel(ph, tk + 1), m: '⚠ ' + nm(k) + ' ausverkauft!', c: 'neg' }); });
if (last.util > 1.05) feed.unshift({ t: tLabel(ph, tk + 1), m: '⚠ Personal überlastet – Gäste warten', c: 'warn' });
if (last.turned >= 2) feed.unshift({ t: tLabel(ph, tk + 1), m: '⚠ ' + Math.round(last.turned) + ' Gäste finden keinen Platz', c: 'warn' });
var mm = (L ? S.run.R.missing : R.missing) || {};
for (c in mm) if (mm[c] - (miss0[c] || 0) > 1.5 && tk % 3 === 1) feed.unshift({ t: tLabel(ph, tk + 1), m: 'Gäste fragen nach ' + B.CATS[c].n, c: 'warn' });
occS = S.run ? S.run.occ : (R && R.occ != null ? R.occ : occS);
if (feed.length > 30) feed.length = 30;
}
if (R) {
lastOcc = Math.min(1, R.guests / Math.max(1, R.cap)); paused = false;
feed.unshift({ t: tLabel(ph, B.NT), m: '— ' + B.PHASES[ph].n + ' vorbei: Gewinn ' + M(R.profit) + ' —', c: R.profit >= 0 ? 'pos' : 'neg' });
if (S.mode === 'night') { save(); saveBest(); render(); reportModal(); }
else { save(); render(); if (autoNext) autoT = 1800; }
} else render();
}

// ---------- loop ----------
var lastTs = 0;
function sceneData(stage, ph, occ) {
var menu = S.menu.map(function (k) { return { k: k, c: B.ITEMS[k].c, cat: B.ITEMS[k].cat, p: S.prices[k] }; });
var sold = S.today.sold, topK = null; for (var k in sold) if (B.ITEMS[k] && (!topK || sold[k] > sold[topK])) topK = k;
var sales = recent.length ? recent : menu.filter(function (m) { return m.cat !== 'food'; }).map(function (m) { return m.c; });
return {
stage: stage, up: S.up, phase: ph, mode: running() ? 'run' : 'plan', t: running() ? (S.run.tick + Math.min(1, acc / TICKMS)) / B.NT : 0, occ: occ,
staff: S.plan.staff, menu: menu, mix: B.segMix(S, Math.min(4, ph), S.plan), sales: sales, dj: S.plan.dj && B.canDJ(S, Math.min(4, ph)), happy: S.plan.happy && B.canHappy(S, Math.min(4, ph)),
top: topK ? { k: topK, p: S.prices[topK] } : null, rain: S.weather[0].k === 'regen' && S.mode !== 'night'
};
}
function frame(ts) {
var dt = Math.min(0.1, (ts - lastTs) / 1000 || 0); lastTs = ts; time += dt;
if (S) {
if (running() && $('modal').hidden) {
if (!paused) { acc += dt * 1000 * speed; if (acc >= TICKMS) { acc -= TICKMS; onTick(); } }
var bar = $('liveBar'); if (bar && running()) bar.style.width = ((S.run.tick + Math.min(1, acc / TICKMS)) / B.NT * 100).toFixed(1) + '%';
var ck = $('liveClock'); if (ck) ck.textContent = clock();
if (((time * 4) | 0) % 2 === 0) $('tDay').textContent = 'Tag ' + S.day + ' · ' + clock();
} else if (autoT > 0 && S.mode === 'plan' && $('modal').hidden) { autoT -= dt * 1000; if (autoT <= 0 && autoNext && !S.event) startPhase(); }
var occ, ph;
if (running()) { ph = S.run.ph; occ = occS; }
else if (S.mode === 'night') { ph = 5; occ = 0; }
else { ph = S.phase; occ = S.phase === 0 ? 0.15 : lastOcc * 0.6; }
A.draw(sctx, sceneData(S.stage, ph, occ), time);
}
window.requestAnimationFrame(frame);
}

// ---------- boot ----------
fit();
S = load() || B.newGame(seed());
render();
startModal();
window.requestAnimationFrame(frame);
setTimeout(fit, 60);
})();
