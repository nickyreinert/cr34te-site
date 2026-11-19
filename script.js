(function () {
'use strict';
var W = window.World, SP = window.Space, PL = window.Planet;
var KEY = 'lichtjahre_v1';
var $ = function (id) { return document.getElementById(id); };
var cv = $('cv'), ctx = cv.getContext('2d'), CW = 0, CH = 0;
var S = null, mode = 'title', F = null, P = null, sys = null, gsel = null, gview = null, gstars = [], ssel = null, fade = null, tunnel = null;
var panelKind = null, panelTab = null, time = 0, lastHud = 0, lastSave = 0, demo = null, o2warn = false, shipPick = 'kranich';
var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
if (touch) $('app').classList.add('touch');

// ---------- helpers ----------
function store(v) { try { if (v === undefined) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) { return null; } return null; }
function save() { if (S) store(W.serialize(S)); lastSave = time; }
function load() { var r = store(); if (!r) return null; try { return W.deserialize(r); } catch (e) { return null; } }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
var fmt = W.fmt;
function num(v, d) { return (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0).replace('.', ','); }
function show(id, on) { $(id).hidden = !on; }
function resize() { var dpr = Math.min(2, window.devicePixelRatio || 1); CW = $('app').clientWidth; CH = $('app').clientHeight; cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (mode === 'galaxy') gview = SP.galaxyView(S, CW, CH); }
window.addEventListener('resize', resize);

function toast(text, btn, fn, ms) {
var el = document.createElement('div'); el.className = 'toast'; el.innerHTML = '<span>' + esc(text) + '</span>';
if (btn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = btn; b.onclick = function () { el.remove(); fn(); }; el.appendChild(b); }
$('toasts').appendChild(el); while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
setTimeout(function () { if (el.parentNode) el.remove(); }, ms || (btn ? 9000 : 4200));
}
function unread() { return S ? S.msgs.filter(function (m) { return !m.read; }).length : 0; }

// ---------- input ----------
var keys = {}, actPressed = false, jumpPressed = false, bActHeld = false, bAltHeld = false, joy = { x: 0, y: 0, id: null };
var GAMEKEYS = ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], SND = window.Sound;
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (t) { window.addEventListener(t, function () { SND.resume(); }, true); });
function sndScene() {
if (mode === 'title') SND.scene({ kind: 'title', seed: 3 });
else if (P) SND.scene({ kind: 'planet', seed: P.p.seed, star: sys.star.type, weather: P.weather });
else if (mode === 'ending') SND.scene({ kind: 'home', seed: 7 });
else if (sys) SND.scene({ kind: 'space', seed: sys.star.seed, star: sys.star.type, home: sys.star.id === 'sol' });
}
window.addEventListener('keydown', function (e) {
if (!$('modal').hidden) { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); closeModal(); } return; }
if (GAMEKEYS.indexOf(e.code) >= 0 && !(e.target && e.target.tagName === 'BUTTON' && e.code === 'Space' && mode === 'title')) e.preventDefault();
if (e.repeat) { keys[e.code] = true; return; }
keys[e.code] = true;
if (mode === 'title') return;
if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') actPressed = true;
if (e.code === 'KeyW' || e.code === 'ArrowUp') jumpPressed = true;
if (e.code === 'Tab' || e.code === 'Escape') { if (!$('panel').hidden) closePanel(); else if (mode === 'galaxy' || mode === 'system') closeMap(); else if (panelKind !== 'station') openMenu(); }
if (e.code === 'KeyM' && (mode === 'space' || mode === 'system')) openMap('galaxy'); else if (e.code === 'KeyM' && mode === 'galaxy') closeMap();
if (e.code === 'KeyN' && (mode === 'space' || mode === 'galaxy')) openMap('system'); else if (e.code === 'KeyN' && mode === 'system') closeMap();
if (e.code === 'KeyC' && mode === 'space' && F) { F.cruise = !F.cruise; F.auto = false; }
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });
window.addEventListener('blur', function () { keys = {}; bActHeld = bAltHeld = false; joy.x = joy.y = 0; });
function hold(id, on) {
var el = $(id);
el.addEventListener('pointerdown', function (e) { e.preventDefault(); el.setPointerCapture(e.pointerId); on(true); el.classList.add('on'); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { el.addEventListener(t, function () { on(false); el.classList.remove('on'); }); });
}
hold('bAct', function (v) { bActHeld = v; if (v) actPressed = true; });
hold('bAlt', function (v) { bAltHeld = v; if (v) jumpPressed = true; });
$('bMenu').addEventListener('click', function () { if (panelKind === 'station') return; openMenu(); });
var jz = $('joy');
jz.addEventListener('pointerdown', function (e) { e.preventDefault(); jz.setPointerCapture(e.pointerId); joy.id = e.pointerId; moveJoy(e); });
jz.addEventListener('pointermove', function (e) { if (joy.id === e.pointerId) moveJoy(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { jz.addEventListener(t, function () { joy.id = null; joy.x = joy.y = 0; jz.firstChild.style.transform = ''; }); });
function moveJoy(e) {
var r = jz.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, m = r.width / 2 - 10, l = Math.hypot(dx, dy);
if (l > m) { dx *= m / l; dy *= m / l; }
var py = joy.y; joy.x = dx / m; joy.y = dy / m; if (py > -0.6 && joy.y <= -0.6) jumpPressed = true;
jz.firstChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}
var drag = null, dragSteer = 0;
cv.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; var dx = e.clientX - drag.x0; if (Math.abs(dx) > 12) drag.moved = true; dragSteer = drag.moved ? Math.max(-1, Math.min(1, dx / 90)) : 0; });
['pointerup', 'pointercancel'].forEach(function (t) { cv.addEventListener(t, function (e) {
if (!drag || drag.id !== e.pointerId) return; var d = drag; drag = null; dragSteer = 0;
if (t === 'pointerup' && !d.moved && mode === 'space' && F) { var o = SP.pickInView(F, CW, CH, d.mx, d.my); if (o) flyTo(o); }
}); });
cv.addEventListener('pointerdown', function (e) {
var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
if (mode === 'space' && F) { drag = { id: e.pointerId, x0: e.clientX, mx: mx, my: my, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) { } }
else if (mode === 'galaxy') { var st = SP.pickGalaxy(S, gview, gstars, mx, my); if (st) { gsel = st; sheet(); } }
else if (mode === 'system') { var so = SP.pickSystem(F, SP.sysView(F, CW, CH), mx, my); if (so) { ssel = so; sheet(); } }
});
function input() {
var k = keys, i = {
sx: (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + joy.x + dragSteer,
sy: (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0) + (mode === 'space' ? joy.y : 0),
thrust: !!(k.KeyW || k.ShiftLeft || k.ShiftRight || bAltHeld), brake: !!k.KeyS,
action: !!(k.Space || k.KeyE || bActHeld), actionPressed: actPressed,
ax: (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (Math.abs(joy.x) > 0.2 ? joy.x : 0),
jump: jumpPressed, jet: !!(k.KeyW || k.ArrowUp || k.ShiftLeft || k.ShiftRight || bAltHeld || joy.y < -0.6)
};
i.ax = Math.max(-1, Math.min(1, i.ax)); i.sx = Math.max(-1, Math.min(1, i.sx)); i.sy = Math.max(-1, Math.min(1, i.sy));
if (mode === 'space') { i.sy = 0; if (k.ArrowUp) i.thrust = true; if (k.ArrowDown) i.brake = true; }
actPressed = false; jumpPressed = false;
return i;
}

// ---------- context action ----------
function ctxAction() {
if (mode === 'planet' && P) {
var n = P.near;
if (!n) return { l: 'Erkunden', idle: 1 };
if (n.k === 'node') return { l: 'Abbauen · halten', hold: 1 };
if (n.k === 'species') return { l: 'Scannen · halten', hold: 1 };
if (n.k === 'wreck') return { l: 'Untersuchen · halten', hold: 1 };
if (n.k === 'site') return P.site.built ? { l: 'Deine Basis', idle: 1 } : { l: 'Basis bauen' };
return { l: 'Abheben', fn: leavePlanet };
}
if (mode !== 'space' || !F) return null;
var near = F.near;
if (near && near.kind === 'station') return { l: 'Andocken', fn: dock };
if (near && near.kind === 'planet') {
var p = sys.planets[near.i];
if (!S.scanned[p.key]) return { l: 'Scannen', fn: function () { scan(p); } };
if (W.WORLDS[p.type].land) return { l: 'Landen', fn: function () { land(p); } };
}
if (near && near.kind === 'star' && W.measurable(S)) return { l: sys.star.type === 'loch' ? 'Schwarzes Loch vermessen' : 'Pulsar vermessen', fn: measureStar };
if (near && near.kind === 'star' && F.inZone && W.STARS[sys.star.type].fuel > 0) {
if (S.fuel < W.tankMax(S) - 0.5) return { l: 'Auftanken · halten', hold: 1 };
}
if (F.target && !F.auto && !(near && sameObj(near, F.target))) return { l: 'Zum Ziel', fn: function () { flyTo(F.target); } };
return { l: 'Sternkarte', fn: function () { openMap('galaxy'); }, idle: 1 };
}
function sameObj(a, b) { return a.kind === b.kind && (a.i === b.i || a.kind !== 'planet'); }
function flyTo(o) {
if (W.hasCrew(S, 'tomas') && o.kind !== 'star') { startFade(function () { SP.warpTo(F, o); }); toast('Tomas fliegt dich zu ' + SP.targetName(F, o) + '.'); }
else SP.setTarget(F, o, true);
}

// ---------- actions ----------
function scan(p) {
var r = W.scanPlanet(S, p); if (!r) return;
var Wt = W.WORLDS[p.type], res = Object.keys(p.res).map(function (k) { return W.RES[k].n; });
SND.sfx('scan');
toast(p.name + ': ' + Wt.n + (p.life ? ' · ' + p.life + ' Arten' : '') + (res.length ? ' · ' + res.join(', ') : '') + ' · +' + r.cr + ' Cr, +' + r.f + ' Forschung');
if (p.ruin && !S.ruins[p.key]) toast('Auf ' + p.name + ' steht eine Ruine der Erbauer.');
W.deliver(S).forEach(notifyMsg); save();
}
function land(p) {
if (p.sol === 'erde') { startFade(startEnding, 1.4); return; }
startFade(function () {
P = PL.enter(S, p, sys.star.type); mode = 'planet'; o2warn = false; S.lastPlanet = p.i; sndScene();
handlePlanetEvents();
}, 0.9);
}
function leavePlanet(abort) {
var p = P.p, loot = P.loot, cr = P.cr;
startFade(function () {
var lost = abort ? PL.abort(S, P) : null;
SP.warpTo(F, { kind: 'planet', i: p.i }); mode = 'space'; P = null; sndScene();
var got = W.RKEYS.filter(function (k) { return loot[k]; }).map(function (k) { return (loot[k] - (lost && lost[k] || 0)) + ' t ' + W.RES[k].n; });
if (abort) toast('Notrückruf: Der Sauerstoff war leer. Die Hälfte der Ausbeute blieb auf ' + p.name + '.');
if (got.length || cr) toast('Ausbeute: ' + got.concat(cr ? ['+' + fmt(cr) + ' Cr'] : []).join(', '));
save();
}, 0.9);
}
function handlePlanetEvents() {
if (!P) return;
var ev = P.events; P.events = [];
ev.forEach(function (e) {
if (e.k === 'species') toast((e.auto ? 'Rena hat erfasst: ' : 'Neue Art: ') + e.sp.name + (e.sp.rare ? ' (selten)' : '') + ' · +' + e.res.cr + ' Cr, +' + e.res.f + ' Forschung');
if (e.k === 'wreck') letter({ from: 'Fundstück', t: 'Ein Wrack', b: e.text });
if (e.k === 'ruin') { SND.sfx('scan'); letter({ from: 'Fundstück', t: 'Eine Ruine der Erbauer', b: e.text + '\n\nBruchstück geborgen (' + S.frags + '). Entschlüsseln kannst du es im Menü unter Forschung.' }); save(); }
if (e.k === 'leave') leavePlanet(false);
if (e.k === 'mined') SND.sfx('mine');
if (e.k === 'drones') toast('Deine Drohnen haben abgebaut: ' + Object.keys(e.got).map(function (k) { return e.got[k] + ' t ' + W.RES[k].n; }).join(', '));
if (e.k === 'build') { var nb = S.msgs.length, be = W.buildBase(S, P.p); if (be) toast(be); else { P.site.built = true; SND.sfx('dock'); toast('Basis auf ' + P.p.name + ' errichtet. Sie liefert bei jedem Sprung Nachschub.'); S.msgs.slice(nb).forEach(function (x) { notifyMsg(x.id); }); save(); } }
if (e.k === 'o2out' && !fade) leavePlanet(true);
});
if (ev.length) W.deliver(S).forEach(notifyMsg);
}
function dock() {
F.speed = 0; F.auto = false; SND.sfx('dock');
if (W.hasCrew(S, 'mira')) {
var keep = { eisen: 20, kristall: 10, sporen: 10, exotik: 16 }, sold = [], sum = 0;
W.RKEYS.forEach(function (k) { var n = (S.res[k] || 0) - keep[k]; if (n > 0 && sys.station.price[k] >= W.RES[k].p * 1.02) { sum += W.sell(S, k, n, sys.station); sold.push(n + ' t ' + W.RES[k].n); } });
if (sold.length) toast('Mira hat verkauft: ' + sold.join(', ') + ' · +' + fmt(sum) + ' Cr');
}
openStation();
}
function measureStar() {
var r = W.measure(S); if (!r) return; SND.sfx('scan');
toast((r.hole ? 'Schwarzes Loch vermessen' : 'Pulsar vermessen') + ' · +' + r.f + ' Forschung, +' + r.ex + ' t Exotische Materie, +' + fmt(r.cr) + ' Cr');
r.msgs.forEach(notifyMsg); save();
}
function albatros() {
var A2 = W.ALBATROS;
$('letter').innerHTML = '<div class="lab ac">Funde · Der Schlund</div><h2>' + esc(A2.t) + '</h2>' + A2.b.split('\n\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<button type="button" class="go pri" data-a="alb" data-v="mit">' + esc(A2.a) + '</button><button type="button" class="go" data-a="alb" data-v="boje">' + esc(A2.bb) + '</button>';
show('modal', true);
}
function doJump(st) {
var r = W.jump(S, st); if (!r.ok) { toast(r.why); return; }
S.trail = S.trail || []; var cur = st; S.trail.push([cur.x, cur.y]); if (S.trail.length > 80) S.trail.shift();
closeMap(true); mode = 'tunnel'; tunnel = { t: 0, star: st, res: r }; SND.sfx('jump');
show('hud', false); show('ctl', false);
}
function arrive() {
var r = tunnel.res; tunnel = null;
sys = W.system(S, W.findStar(S, S.star)); F = SP.enter(S, sys); mode = 'space'; gsel = null; sndScene();
if (r.sling) toast('Schleudersprung: ' + fmt(r.d) + ' Lichtjahre. Nahe am Loch verging die Zeit langsamer, auf der Erde 8 Jahre mehr.');
var st = sys.star, T = W.STARS[st.type];
toast(st.name + ' · ' + T.n + ' · ' + sys.planets.length + ' Planeten' + (sys.station ? ' · Station' : '') + ' · auf der Erde ist es jetzt ' + Math.floor(S.year));
r.news.auto.forEach(function (t) { toast(t); });
if (r.news.sectionUp) {
var sec = r.news.sectionUp, nm = W.MKEYS.filter(function (k) { return W.MODS[k].sec === sec; }).map(function (k) { return W.MODS[k].n; });
var wl = Object.keys(W.WORLDS).filter(function (k) { return W.WORLDS[k].sec === sec; }).map(function (k) { return W.WORLDS[k].n; });
letter({ from: 'Abschnitt ' + sec, t: W.SECTIONS[sec], b: 'Neuer Abschnitt der Reise erreicht. Noch ' + fmt(W.dist(S)) + ' Lichtjahre bis zur Erde.' + (wl.length ? '\n\nNeue Welten: ' + wl.join(', ') + '.' : '') + (nm.length ? '\nNeue Module an Stationen: ' + nm.join(', ') + '.' : '') });
}
r.news.crew.forEach(function (k) { var C = W.CREW[k]; toast(C.n + ' (' + C.role + ') sucht eine Mitfahrgelegenheit – auf der nächsten Station.'); });
r.news.msgs.forEach(notifyMsg);
if (sys.star.type === 'loch' && W.curSection(S) >= 4 && !S.flags.albatros) setTimeout(albatros, 1200);
save();
}
function notifyMsg(id) { var m = W.msgById(id); toast('Nachricht · ' + m.from + ': „' + m.t + '“', 'Lesen', function () { openMsg(id); }); }

// ---------- fade ----------
function startFade(mid, dur) { fade = { t: 0, d: dur || 0.6, mid: mid, done: false }; }

// ---------- modal ----------
function letter(m) {
var age = S ? Math.floor(W.ageLena(S)) : 9, sub = m.year ? 'Erdjahr ' + m.year + (m.from === 'Lena' ? ' · Lena ist ' + (9 + m.year - W.START_YEAR) : '') : '';
$('letter').innerHTML = '<div class="lab ac">' + esc(m.from) + (sub ? ' · ' + esc(sub) : '') + '</div><h2>' + esc(m.t) + '</h2>' + m.b.split('\n\n').map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') + '<button type="button" class="go pri" data-a="closeModal" style="max-width:260px;margin-top:10px">Weiter</button>';
show('modal', true); $('letter').scrollTop = 0;
}
function openMsg(id) { var e = S.msgs.filter(function (m) { return m.id === id; })[0], m = W.msgById(id); if (!m) return; e.read = true; if (m.from === 'Lena') SND.lena(W.curSection(S)); letter({ from: m.from, t: m.t, b: m.b, year: e.year }); hud(true); save(); }
var autoQ = [], END = null;
function closeModal() { show('modal', false); if (mode === 'ending') { endCont(); return; } if (autoQ.length) { var nx = autoQ.shift(); setTimeout(function () { openMsg(nx); }, 450); } }
function startEnding() { mode = 'ending'; END = window.Ending.start(S); show('hud', false); show('ctl', false); show('hint', false); S.flags.home = 1; save(); sndScene(); }
function epilogueModal() {
$('letter').innerHTML = '<div class="lab ac">Epilog · Erdjahr ' + Math.floor(S.year) + '</div><h2>Heimkehr</h2>' + W.epilogue(S).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<button type="button" class="go pri" data-a="endCont">Weiterfliegen</button><button type="button" class="go" data-a="endNew">Neue Reise beginnen</button>';
show('modal', true); $('letter').scrollTop = 0;
}
function endCont() { show('modal', false); mode = 'space'; END = null; showPlay(); sndScene(); toast('Du kannst weiterfliegen, so lange du willst. Die Galaxie bleibt offen.'); }

// ---------- map ----------
function openMap(kind) {
if (!F) return;
mode = kind; show('mapbar', true); show('hud', false); show('ctl', false); show('hint', false);
$('mapbar').children[0].classList.toggle('on', kind === 'galaxy'); $('mapbar').children[1].classList.toggle('on', kind === 'system');
if (kind === 'galaxy') gview = SP.galaxyView(S, CW, CH);
if (kind === 'system') ssel = F.target;
sheet();
}
function closeMap(silent) { show('mapbar', false); show('sheet', false); if (!silent) { mode = 'space'; showPlay(); } }
// star map preview (research): what waits in nearby systems
function mapMarks(V) {
var mr = W.mapRadius(S); if (!mr) return;
var w = V.w, h = V.h, ox = w / 2, oy = V.oy;
function sx(x) { return ox + (x - V.cx) * V.s; } function sy(y) { return oy + (y - V.cy) * V.s; }
ctx.strokeStyle = 'rgba(159,180,201,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([1, 4]); ctx.beginPath(); ctx.arc(ox, oy, mr * V.s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
W.starsNear(S, V.cx, V.cy, mr).forEach(function (st) {
var x = sx(st.x), y = sy(st.y); if (x < -10 || y < -10 || x > w + 10 || y > h + 10 || S.visited[st.id]) return;
var v = W.preview(S, st); if (!v) return;
if (v.ruin) { ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 5, y - 3); ctx.lineTo(x, y + 2); ctx.lineTo(x - 5, y - 3); ctx.closePath(); ctx.stroke(); }
if (v.station) { ctx.fillStyle = 'rgba(239,233,221,0.8)'; ctx.fillRect(x + 5, y + 3, 3, 3); }
if (v.wreck) { ctx.fillStyle = 'rgba(255,122,47,0.85)'; ctx.beginPath(); ctx.moveTo(x - 7, y + 7); ctx.lineTo(x - 4, y + 2); ctx.lineTo(x - 1, y + 7); ctx.fill(); }
});
ctx.lineWidth = 1;
}
function prevTxt(st) { var v = W.preview(S, st); if (!v) return W.mapRadius(S) ? '' : '<p class="p">Mit Forschung kannst du die Sternkarte ausbauen und siehst vorher, was dich erwartet.</p>'; var a = [v.n + ' Planeten: ' + v.types.join(', ')]; if (v.station) a.push('Station'); if (v.wreck) a.push('Wrack'); if (v.ruin) a.push('<span style="color:#bfe0ff">Ruine der Erbauer</span>'); return '<p class="p">' + a.join(' · ') + '</p>'; }
function sheet() {
var h = '';
if (mode === 'galaxy') {
var d = W.dist(S);
if (!gsel) h = '<div class="lab">Sternkarte</div><h2>Nach Hause</h2><p class="p">Tippe einen Stern im orangen Kreis an. Je näher er an Sol liegt, desto näher bist du der Erde.</p><div class="kv"><div><div class="lab">Bis Sol</div><b>' + fmt(d) + '<small>LJ</small></b></div><div><div class="lab">Tank</div><b>' + Math.round(S.fuel) + '<small>/ ' + W.tankMax(S) + '</small></b></div></div>';
else {
var c = W.canJump(S, gsel), T = W.STARS[gsel.type], nd = Math.hypot(gsel.x, gsel.y);
h = (c.sling ? '<div class="lab ac">Schleudersprung am schwarzen Loch</div>' : '') + '<div class="lab ac">' + esc(T.n) + (S.visited[gsel.id] ? ' · besucht' : '') + '</div><h2>' + esc(gsel.name) + '</h2>' +
'<div class="kv"><div><div class="lab">Distanz</div><b>' + num(c.d || 0) + '<small>LJ</small></b></div><div><div class="lab">Treibstoff</div><b>' + (c.fuel || W.fuelCost(S, c.d || 0)) + '<small>/ ' + Math.round(S.fuel) + '</small></b></div>' +
'<div><div class="lab">Danach bis Sol</div><b>' + fmt(nd) + '<small>LJ</small></b></div><div><div class="lab">Auf der Erde</div><b>+' + num(c.years || W.yearsFor(c.d || 0), 1) + '<small>JAHRE</small></b></div></div>' +
prevTxt(gsel) + '<button type="button" class="go pri" data-a="jump" ' + (c.ok ? '' : 'disabled') + '>Springen</button>' + (c.ok ? '' : '<p class="why">' + esc(c.why) + (c.why === 'Zu wenig Treibstoff' ? ' – tanke am Stern auf oder kaufe an einer Station.' : '') + '</p>');
}
} else if (mode === 'system') {
var o = ssel;
if (!o) h = '<div class="lab">Systemkarte</div><h2>' + esc(sys.star.name) + '</h2><p class="p">' + esc(W.STARS[sys.star.type].n) + ' · ' + sys.planets.length + ' Planeten' + (sys.station ? ' · Station ' + esc(sys.station.name) : '') + '. Tippe einen Planeten an.</p>';
else if (o.kind === 'planet') {
var p = sys.planets[o.i], known = S.scanned[p.key] || S.mods.scanner > 0, Wt = W.WORLDS[p.type];
h = '<div class="lab ac">' + (known ? esc(Wt.n) : 'Nicht gescannt') + '</div><h2>' + esc(p.name) + '</h2><div class="kv"><div><div class="lab">Schwerkraft</div><b>' + num(p.grav, 1) + '<small>G</small></b></div><div><div class="lab">Leben</div><b>' + (known ? p.life + '<small>ARTEN</small>' : '?') + '</b></div></div>' +
'<p class="p">' + (known ? (Object.keys(p.res).length ? 'Rohstoffe: ' + Object.keys(p.res).map(function (k) { return W.RES[k].n; }).join(', ') + '.' : 'Keine nennenswerten Rohstoffe.') + (Wt.land ? '' : ' Man kann hier nicht landen.') + (p.ruin ? (S.ruins[p.key] ? ' Die Ruine ist untersucht.' : ' <span style="color:#bfe0ff">Hier steht eine Ruine der Erbauer.</span>') : '') : 'Fliege hin und scanne den Planeten.') + '</p>';
h += '<button type="button" class="go pri" data-a="flyHere">Hinfliegen</button>';
} else {
h = '<div class="lab ac">' + (o.kind === 'star' ? esc(W.STARS[sys.star.type].n) : 'Station') + '</div><h2>' + esc(o.kind === 'star' ? sys.star.name : sys.station.name) + '</h2><p class="p">' + (o.kind === 'star' ? 'Im gestrichelten Ring kannst du auftanken. Halte die Aktion gedrückt, solange die Hitze es zulässt.' : 'Handel, Werft und neue Crew.') + '</p><button type="button" class="go pri" data-a="flyHere">Hinfliegen</button>';
}
}
$('sheet').innerHTML = h; show('sheet', !!h);
}

// ---------- panels ----------
function openMenu() { if (mode === 'title' || mode === 'tunnel' || mode === 'ending') return; panelKind = 'menu'; panelTab = panelTab && ['schiff', 'crew', 'forsch', 'log'].indexOf(panelTab) >= 0 ? panelTab : 'schiff'; renderPanel(); show('panel', true); }
function openStation() { panelKind = 'station'; panelTab = 'handel'; renderPanel(); show('panel', true); }
function closePanel() { show('panel', false); panelKind = null; save(); }
function renderPanel() {
var tabs = panelKind === 'station' ? [['handel', 'Handel'], ['werft', 'Werft'], ['crewst', 'Crew']] : (mode === 'planet' ? [] : [['karte', 'Karte']]).concat([['schiff', 'Schiff'], ['crew', 'Crew'], ['forsch', 'Forschung' + (W.decodable(S) ? ' ·' : '')], ['log', 'Logbuch' + (unread() ? ' ·' + unread() : '')]]);
$('tabs').innerHTML = tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" class="' + (panelTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
$('pbody').innerHTML = '<div class="wrap">' + (PANES[panelTab] ? PANES[panelTab]() : '') + '</div>';
document.querySelector('#panel .x').textContent = panelKind === 'station' ? 'Ablegen' : '×';
document.querySelector('#panel .x').style.fontSize = panelKind === 'station' ? '12px' : '';
}
function lv(n) { var o = '<span class="lv">'; for (var i = 0; i < 3; i++) o += '<i class="' + (i < n ? 'on' : '') + '"></i>'; return o + '</span>'; }
function costTxt(c) { var a = [fmt(c.cr) + ' Cr']; W.RKEYS.forEach(function (k) { if (c[k]) a.push(c[k] + ' t ' + W.RES[k].n); }); if (c.forschung) a.push(c.forschung + ' Forschung'); return a.join(' · '); }
function money() { return '<div class="grid2"><div class="stat"><div class="lab">Credits</div><b>' + fmt(S.cr) + '</b></div><div class="stat"><div class="lab">Forschung</div><b>' + S.forschung + '</b></div><div class="stat"><div class="lab">Laderaum</div><b>' + W.cargoUsed(S) + ' / ' + W.cargoMax(S) + ' t</b></div><div class="stat"><div class="lab">Tank</div><b>' + Math.round(S.fuel) + ' / ' + W.tankMax(S) + '</b></div></div>'; }
var PANES = {
schiff: function () {
var sh = W.SHIPS[S.ship], h = '<div class="lab">' + esc(sh.d) + '</div><h1>' + esc(sh.n) + '</h1>' + money();
h += '<div class="lab" style="margin-bottom:6px">Module · Einbau an Stationen</div>';
W.MKEYS.forEach(function (k) { var M = W.MODS[k]; h += '<div class="row"><div><div class="n">' + M.n + lv(S.mods[k]) + '</div><div class="d">' + M.d + ' · jetzt ' + fmtMod(k) + '</div></div></div>'; });
h += '<div class="lab" style="margin:22px 0 6px">Fracht</div>' + W.RKEYS.map(function (k) { return '<div class="row"><div class="n">' + W.RES[k].n + '</div><div class="d">' + (S.res[k] || 0) + ' t</div></div>'; }).join('');
h += '<div class="lab" style="margin:22px 0 6px">Basen · ' + (S.bases || []).length + '</div>' + ((S.bases || []).length ? S.bases.map(function (b) { return '<div class="row"><div><div class="n">' + esc(b.name) + '</div><div class="d">liefert ' + W.RES[b.k].n + ' bei jedem Sprung</div></div></div>'; }).join('') : '<p class="p">Ab dem Nebelgürtel kannst du neben deinem Landeplatz eine Basis bauen (' + fmt(W.BASE_COST.cr) + ' Cr, ' + W.BASE_COST.eisen + ' t Eisen, ' + W.BASE_COST.kristall + ' t Kristall).</p>');
return h;
},
crew: function () {
var h = '<div class="lab">Quartiere · ' + S.crew.length + ' von ' + W.crewMax(S) + ' belegt</div><h1>Crew</h1>';
if (!S.crew.length) h += '<p class="p">Noch bist du allein an Bord. Auf Stationen triffst du Menschen, die mitfliegen wollen. Jedes Crewmitglied nimmt dir eine Aufgabe ab.</p>';
S.crew.forEach(function (k) { var C = W.CREW[k]; h += '<div class="row"><div><div class="n">' + C.n + '</div><div class="d">' + C.role + ' · ' + C.auto + '</div></div></div>'; });
if (S.recruitable.length) h += '<p class="p" style="margin-top:20px">Auf der nächsten Station wartet: ' + S.recruitable.map(function (k) { return W.CREW[k].n + ' (' + W.CREW[k].role + ')'; }).join(', ') + '.</p>';
return h;
},
forsch: function () {
var h = '<div class="lab">Forschung · ' + S.forschung + ' Punkte</div><h1>Forschung</h1><p class="p">Forschung bekommst du für Scans, neue Arten, vermessene Sterne und Ruinen. Du kannst sie hier und für die höchsten Ausbaustufen in der Werft einsetzen.</p>';
var ml = S.mapLvl || 0;
h += '<div class="lab" style="margin:22px 0 6px">Sternkarte</div><div class="row"><div><div class="n">Vorschau' + lv(ml) + '</div><div class="d">' + (W.mapRadius(S) ? 'Die Karte zeigt Planeten, Stationen, Wracks und Ruinen bis ' + W.mapRadius(S) + ' Lj voraus.' : 'Zeigt auf der Sternkarte, was in Systemen wartet, bevor du hinspringst.') + (ml < 3 ? ' Nächste Stufe: ' + W.MAP_R[ml + 1] + ' Lj.' : '') + '</div></div>' + (ml < 3 ? '<button type="button" class="go act" data-a="mapUp" ' + (S.forschung >= W.MAP_COST[ml] ? '' : 'disabled') + '>' + W.MAP_COST[ml] + ' Forschung</button>' : '') + '</div>';
var open = (S.frags || 0) - S.techs.length;
h += '<div class="lab" style="margin:22px 0 6px">Technik der Erbauer · ' + S.techs.length + ' von ' + W.TECH.length + '</div>';
if (!S.frags) h += '<p class="p">Auf manchen Planeten stehen Ruinen einer verschwundenen Kultur. Wer sie gebaut hat, war auch einmal unterwegs nach Hause. Lande dort und birg ein Bruchstück. Ein Planetenscan zeigt, wo eine Ruine steht.</p>';
W.TECH.forEach(function (T, i) {
if (i < S.techs.length) h += '<div class="row"><div><div class="n">' + T.n + '</div><div class="d">' + T.d + '</div></div><span class="lab ac">Aktiv</span></div>';
else if (i === S.techs.length && open > 0) h += '<div class="row"><div><div class="n">Bruchstück ' + (i + 1) + '</div><div class="d">Bereit zum Entschlüsseln.</div></div><button type="button" class="go act" data-a="decode" ' + (S.forschung >= T.f ? '' : 'disabled') + '>' + T.f + ' Forschung</button></div>';
else if (i < S.frags) h += '<div class="row"><div><div class="n">Bruchstück ' + (i + 1) + '</div><div class="d">Geborgen. Erst das vorige entschlüsseln.</div></div></div>';
else h += '<div class="row"><div><div class="n" style="color:var(--mu)">Unbekannt</div><div class="d">Noch nicht gefunden.</div></div></div>';
});
return h;
},
log: function () {
var h = '<div class="lab">Erdjahr ' + Math.floor(S.year) + ' · Lena ist ' + Math.floor(W.ageLena(S)) + '</div><h1>Logbuch</h1>';
h += '<div class="grid2"><div class="stat"><div class="lab">Bis Sol</div><b>' + fmt(W.dist(S)) + ' Lj</b></div><div class="stat"><div class="lab">Sprünge</div><b>' + S.jumps + '</b></div><div class="stat"><div class="lab">Planeten gescannt</div><b>' + S.stats.planets + '</b></div><div class="stat"><div class="lab">Arten entdeckt</div><b>' + S.stats.species + '</b></div><div class="stat"><div class="lab">Pulsare vermessen</div><b>' + (S.flags.pulsars || 0) + '</b></div><div class="stat"><div class="lab">Schwarze Löcher</div><b>' + (S.flags.holes || 0) + '</b></div><div class="stat"><div class="lab">Basen</div><b>' + (S.bases || []).length + '</b></div></div>';
S.msgs.slice().reverse().forEach(function (e) { var m = W.msgById(e.id); h += '<button type="button" class="msg' + (e.read ? '' : ' new') + '" data-msg="' + e.id + '"><div class="lab">' + esc(m.from) + ' · Erdjahr ' + e.year + '</div><div class="n">' + esc(m.t) + '</div></button>'; });
h += '<div class="row" style="margin-top:20px"><div><div class="n">Musik</div><div class="d">Sphärische Klänge, live erzeugt</div></div><button type="button" class="go act" data-a="music">' + (S.music !== false ? 'An · ausschalten' : 'Aus · einschalten') + '</button></div>';
h += '<div class="row"><div><div class="n">Neue Reise</div><div class="d">Löscht den Spielstand.</div></div><button type="button" class="go act" data-a="reset">Neu beginnen</button></div>';
return h;
},
handel: function () {
var st = sys.station, h = '<div class="lab">Station · ' + esc(st.name) + '</div><h1>Handel</h1>' + money();
W.RKEYS.forEach(function (k) { var n = S.res[k] || 0; h += '<div class="row"><div><div class="n">' + W.RES[k].n + '</div><div class="d">' + n + ' t an Bord · ' + st.price[k] + ' Cr pro t' + (st.price[k] > W.RES[k].p * 1.1 ? ' · guter Preis' : st.price[k] < W.RES[k].p * 0.9 ? ' · schlechter Preis' : '') + '</div></div><button type="button" class="go act ' + (n ? 'pri' : '') + '" data-a="sell" data-v="' + k + '" ' + (n ? '' : 'disabled') + '>Verkaufen · ' + fmt(n * st.price[k]) + ' Cr</button></div>'; });
var need = Math.ceil(W.tankMax(S) - S.fuel);
h += '<div class="row"><div><div class="n">Treibstoff</div><div class="d">' + st.fuel + ' Cr pro Einheit · Tank ' + Math.round(S.fuel) + ' / ' + W.tankMax(S) + '</div></div><button type="button" class="go act ' + (need ? 'pri' : '') + '" data-a="fuel" ' + (need ? '' : 'disabled') + '>Volltanken · ' + fmt(need * st.fuel) + ' Cr</button></div>';
return h;
},
werft: function () {
var h = '<div class="lab">Station · Werft</div><h1>Module</h1>' + money();
W.MKEYS.forEach(function (k) {
var M = W.MODS[k], u = W.canUpgrade(S, k), c = W.modCost(S, k);
h += '<div class="row"><div><div class="n">' + M.n + lv(S.mods[k]) + '</div><div class="d">' + M.d + ' · jetzt ' + fmtMod(k) + (c ? ' → ' + fmtMod(k, 1) + '<br>' + costTxt(c) : '') + (u.ok || !c ? '' : '<br><span class="ac">' + esc(u.why) + '</span>') + '</div></div>' +
(c ? '<button type="button" class="go act ' + (u.ok ? 'pri' : '') + '" data-a="up" data-v="' + k + '" ' + (u.ok ? '' : 'disabled') + '>Einbauen</button>' : '<span class="lab">voll</span>') + '</div>';
});
return h;
},
crewst: function () {
var h = '<div class="lab">Quartiere · ' + S.crew.length + ' von ' + W.crewMax(S) + ' belegt</div><h1>Crew anwerben</h1>';
if (!S.recruitable.length) h += '<p class="p">Heute sucht hier niemand eine Mitfahrgelegenheit. Auf der weiteren Reise triffst du neue Menschen.</p>';
S.recruitable.forEach(function (k) { var C = W.CREW[k], full = S.crew.length >= W.crewMax(S), poor = S.cr < C.cost; h += '<div class="row"><div><div class="n">' + C.n + '</div><div class="d">' + C.role + ' · ' + C.auto + '</div><p class="p" style="margin:10px 0 0">' + esc(C.intro) + '</p>' + (full ? '<p class="why">Kein Platz – baue die Quartiere in der Werft aus.</p>' : '') + '</div><button type="button" class="go act ' + (!full && !poor ? 'pri' : '') + '" data-a="recruit" data-v="' + k + '" ' + (!full && !poor ? '' : 'disabled') + '>' + (C.cost ? 'Anwerben · ' + fmt(C.cost) + ' Cr' : 'An Bord holen') + '</button></div>'; });
return h;
}
};
function fmtMod(k, next) { var M = W.MODS[k], l = S.mods[k] + (next || 0); var sv = S.mods[k]; S.mods[k] = l; var v = W.modVal(S, k); S.mods[k] = sv; if (k === 'scanner') return ['aus', 'Rohstoffe', 'Rohstoffe und Leben', 'alles'][l]; if (k === 'labor') return '×' + num(v, 1); if (k === 'anzug') return Math.floor(v / 60) + ':' + ('0' + v % 60).slice(-2) + ' min'; return v + ' ' + M.unit; }

// ---------- clicks ----------
document.addEventListener('click', function (e) {
var t = e.target.closest('[data-tab]'); if (t) { var tb = t.getAttribute('data-tab'); if (tb === 'karte') { closePanel(); openMap('galaxy'); return; } panelTab = tb; renderPanel(); return; }
var m = e.target.closest('[data-msg]'); if (m) { openMsg(m.getAttribute('data-msg')); renderPanel(); return; }
var sp = e.target.closest('[data-ship]'); if (sp) { shipPick = sp.getAttribute('data-ship'); titleShips(); return; }
var a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
var v = a.getAttribute('data-v'), act = a.getAttribute('data-a');
if (act === 'closeModal') closeModal();
else if (act === 'closePanel') closePanel();
else if (act === 'mapGal') openMap('galaxy');
else if (act === 'mapSys') openMap('system');
else if (act === 'mapClose') closeMap();
else if (act === 'jump') { if (gsel) doJump(gsel); }
else if (act === 'flyHere') { var o = ssel; closeMap(); if (o) flyTo(o); }
else if (act === 'sell') { var got = W.sell(S, v, S.res[v], sys.station); toast('+' + fmt(got) + ' Cr'); renderPanel(); save(); }
else if (act === 'fuel') { var er = W.buyFuel(S, sys.station); if (er) toast(er); renderPanel(); save(); }
else if (act === 'up') { var e2 = W.upgrade(S, v); if (e2) toast(e2); else toast(W.MODS[v].n + ' ausgebaut.'); renderPanel(); save(); }
else if (act === 'recruit') { var before = S.msgs.length, e3 = W.recruit(S, v); if (e3) toast(e3); else { toast(W.CREW[v].n + ' ist an Bord.'); S.msgs.slice(before).forEach(function (x) { notifyMsg(x.id); }); } renderPanel(); save(); }
else if (act === 'mapUp') { var e4 = W.mapUp(S); toast(e4 || 'Sternkarte verbessert: Vorschau bis ' + W.mapRadius(S) + ' Lj.'); renderPanel(); save(); }
else if (act === 'decode') { var dr = W.decode(S); if (dr.err) toast(dr.err); else { SND.sfx('scan'); toast(dr.tech.n + ' entschlüsselt: ' + dr.tech.d); dr.msgs.forEach(notifyMsg); } renderPanel(); save(); }
else if (act === 'endCont') endCont();
else if (act === 'endNew') { store(''); S = null; END = null; show('modal', false); titleScreen(); }
else if (act === 'music') { S.music = S.music === false; SND.setOn(S.music); renderPanel(); save(); }
else if (act === 'alb') { S.flags.albatros = 1; S.flags.albWahl = v; if (v === 'boje') { S.forschung += 40; toast('Boje gesetzt. Die Sternkarten der Albatros: +40 Forschung.'); } else toast('Die Kapsel ist an Bord. Die beiden schlafen weiter, bis zur Erde.'); closeModal(); W.deliver(S).forEach(notifyMsg); save(); }
else if (act === 'reset') { if (a.getAttribute('data-sure') !== '1') { a.setAttribute('data-sure', '1'); a.textContent = 'Wirklich löschen?'; return; } store(''); S = null; closePanel(); titleScreen(); }
else if (act === 'newGame') titleShips();
else if (act === 'continue') { S = load(); if (S) startGame(); }
else if (act === 'start') { S = W.newGame((Date.now() & 0x7fffffff) || 7, shipPick); save(); startGame(); }
else if (act === 'back') titleScreen();
});
$('panel').addEventListener('pointerdown', function (e) { e.stopPropagation(); });

// ---------- title ----------
var SHIPSVG = W.SHIPSVG;
function shipSvg(k, on) { return '<svg viewBox="-6 0 262 120" aria-hidden="true"><path d="' + SHIPSVG[k] + '" fill="none" stroke="' + (on ? '#ff7a2f' : '#efe9dd') + '" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/></svg>'; }
function titleScreen() {
mode = 'title'; F = null; P = null; show('hud', false); show('ctl', false); show('mapbar', false); show('sheet', false); show('hint', false);
var sv = load();
$('title').innerHTML = '<div class="in"><div class="lab">Logbuch · Tag 1</div><h1>Lichtjahre</h1><p class="p">Ein Sprungtest geht schief. Die Erde liegt 2.500 Lichtjahre entfernt. Jeder Sprung bringt dich näher – und auf der Erde vergehen die Jahre.</p>' +
'<div class="menu">' + (sv ? '<button type="button" class="go pri" data-a="continue">Weiterfliegen · Sprung ' + sv.jumps + '</button>' : '') + '<button type="button" class="go ' + (sv ? '' : 'pri') + '" data-a="newGame">Neue Reise</button></div>' +
'<div class="foot">' + (touch ? 'TIPPEN ZUM SPIELEN' : 'KLICKEN ZUM SPIELEN · MAUS ODER TASTATUR') + '</div></div>';
show('title', true); sndScene();
}
function titleShips() {
$('title').innerHTML = '<div class="in"><div class="lab">Vor dem Start</div><h1 style="font-size:clamp(40px,6vw,64px)">Wähle dein Schiff</h1><div class="ships">' +
W.SKEYS.map(function (k) { var s = W.SHIPS[k]; return '<button type="button" class="ship ' + (shipPick === k ? 'on' : '') + '" data-ship="' + k + '">' + shipSvg(k, shipPick === k) + '<div class="n">' + s.n + '</div><div class="d">' + s.d + '<br>' + s.bonus + '</div></button>'; }).join('') +
'</div><div class="menu"><button type="button" class="go pri" data-a="start">Mit der ' + W.SHIPS[shipPick].n + ' starten</button><button type="button" class="go" data-a="back">Zurück</button></div></div>';
}
function startGame() {
show('title', false);
sys = W.system(S, W.findStar(S, S.star)); F = SP.enter(S, sys); mode = 'space'; showPlay(); SND.setOn(S.music !== false); sndScene();
autoQ = S.jumps === 0 ? S.msgs.filter(function (m) { return !m.read; }).map(function (m) { return m.id; }) : [];
var first = autoQ.length ? autoQ.shift() : (S.msgs.filter(function (m) { return !m.read; })[0] || {}).id;
if (first) openMsg(first);
}
function showPlay() { show('hud', true); show('ctl', true); show('hint', !touch); hud(true); }

// ---------- HUD ----------
function meter(name, v, txt, warn) { return '<div class="mt' + (warn ? ' warn' : '') + '"><div class="lab">' + name + '</div><div class="bar"><i style="width:' + Math.max(0, Math.min(100, v * 100)) + '%"></i></div><b>' + txt + '</b></div>'; }
function hud(force) {
if (!S || (!force && time - lastHud < 0.2)) return; lastHud = time;
var m = '';
if (mode === 'planet' && P) {
var o2 = Math.max(0, P.o2), mm = Math.floor(o2 / 60), ss = Math.floor(o2 % 60);
m = meter('Sauerstoff', o2 / P.o2max, mm + ':' + ('0' + ss).slice(-2), o2 < 30) + meter('Jetpack', P.jet, Math.round(P.jet * 100) + ' %') + meter('Laderaum', W.cargoUsed(S) / W.cargoMax(S), W.cargoUsed(S) + ' / ' + W.cargoMax(S) + ' t', W.cargoUsed(S) >= W.cargoMax(S));
} else if (F) {
m = meter('Tank', S.fuel / W.tankMax(S), Math.round(S.fuel) + ' / ' + W.tankMax(S) + (F.refuel ? ' ↑' : ''));
m += F.heat > 1 ? meter('Hitze', F.heat / 100, Math.round(F.heat) + ' %', true) : meter('Laderaum', W.cargoUsed(S) / W.cargoMax(S), W.cargoUsed(S) + ' / ' + W.cargoMax(S) + ' t');
m += meter('Tempo', Math.min(1, F.speed / 520), Math.round(F.speed) + ' km/s' + (F.cruise ? ' · Marsch' : ''));
}
$('meters').innerHTML = m;
var sec = W.curSection(S);
$('info').innerHTML = '<div><b>' + esc(mode === 'planet' && P ? P.p.name : sys ? sys.star.name : '') + '</b></div><div>Abschnitt ' + sec + ' · ' + W.SECTIONS[sec] + '</div><div>Sol <b>' + fmt(W.dist(S)) + ' Lj</b> · Erde <b>' + Math.floor(S.year) + '</b></div><div><b>' + fmt(S.cr) + '</b> Cr</div>';
var c = ctxAction();
if (c) { $('bAct').textContent = c.l; $('bAct').classList.toggle('idle', !!c.idle); }
$('bAlt').textContent = mode === 'planet' ? 'Jetpack · halten' : 'Schub · halten';
$('badge').hidden = !unread();
$('hint').textContent = mode === 'planet' ? 'A/D LAUFEN · W HALTEN = JETPACK · LEERTASTE AKTION · TAB MENÜ' : 'ZIEL ANKLICKEN = KURS · A/D ODER ZIEHEN LENKT · W SCHUB · C MARSCHFLUG · LEERTASTE AKTION · M KARTE · TAB MENÜ';
}

// ---------- loop ----------
var lastTs = 0;
function frame(ts) {
var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; time += dt;
var paused = !$('panel').hidden || !$('modal').hidden; SND.update();
var inp = input();
if (fade) { fade.t += dt; if (!fade.done && fade.t >= fade.d / 2) { fade.done = true; fade.mid(); } if (fade.t >= fade.d) fade = null; }
if (mode === 'title') {
if (!demo) { demo = { S: W.newGame(31337, 'kranich') }; demo.sys = W.system(demo.S, W.findStar(demo.S, 'start')); demo.F = SP.enter(demo.S, demo.sys); demo.F.pos = [520, 60, -700]; }
demo.F.yaw = -0.62 + Math.sin(time * 0.05) * 0.1; demo.F.pitch = -0.08; demo.F.t = time * 6;
SP.draw(ctx, demo.S, demo.F, CW, CH, time, { noShip: 1 });
ctx.fillStyle = 'rgba(7,8,10,0.45)'; ctx.fillRect(0, 0, CW, CH);
} else if (mode === 'tunnel' && tunnel) {
tunnel.t += dt; SP.drawTunnel(ctx, CW, CH, tunnel.t / 2.4, time);
if (tunnel.t >= 2.4) { arrive(); showPlay(); }
} else if (mode === 'ending' && END) {
window.Ending.draw(ctx, END, CW, CH, time, dt);
if (END.t > 7.8 && !END.theme) { END.theme = 1; SND.lena(6); }
if (END.t > 13 && !END.shown) { END.shown = 1; epilogueModal(); }
} else if (mode === 'galaxy') { gstars = SP.drawGalaxy(ctx, S, gview, gsel, time); mapMarks(gview); }
else if (mode === 'system') { SP.drawSystem(ctx, S, F, SP.sysView(F, CW, CH), time); }
else if (mode === 'space' && F) {
if (!paused) {
SP.update(S, F, dt, inp);
var c = ctxAction(); if (c && c.fn && inp.actionPressed && !fade) c.fn();
if (F.evade === 2) toast('Zu heiß – das Schiff weicht vom Stern zurück.');
}
SP.draw(ctx, S, F, CW, CH, time, inp); hud();
} else if (mode === 'planet' && P) {
if (!paused && !fade) {
PL.update(S, P, dt, inp);
if (P.o2 < 30 && !o2warn) { o2warn = true; toast('Sauerstoff knapp – zurück zum Schiff.'); }
handlePlanetEvents();
}
if (P) PL.draw(ctx, S, P, CW, CH, time);
hud();
}
if (fade) { var k = 1 - Math.abs(fade.t / fade.d * 2 - 1); ctx.fillStyle = 'rgba(7,8,10,' + Math.min(1, k * 1.2) + ')'; ctx.fillRect(0, 0, CW, CH); }
if (S && mode !== 'title' && time - lastSave > 20 && mode !== 'tunnel' && mode !== 'ending') save();
requestAnimationFrame(frame);
}


$('hud').style.textShadow = '0 1px 6px rgba(0,0,0,.6)';
// ---------- boot ----------
resize();
titleScreen();
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
})();
