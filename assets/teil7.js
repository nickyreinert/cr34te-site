(function (root) {
'use strict';
var W = root.World;

// ---------- state defaults (old saves keep working) ----------
function fill(S) {
if (!S) return S;
S.marks = S.marks || {}; S.rover = S.rover || { st: 'idle', t: 0 }; S.roverDone = S.roverDone || {}; S.signals = S.signals || {};
return S;
}
var ng = W.newGame, ds = W.deserialize;
W.newGame = function (seed, ship) { return fill(ng(seed, ship)); };
W.deserialize = function (s) { return fill(ds(s)); };

// ---------- marks on the star map ----------
W.mark = function (S, id, k, n) { fill(S); var st = W.findStar(S, id); S.marks[id] = { k: k || 'user', n: n || 'Markiert', name: st ? st.name : id }; };
W.unmark = function (S, id) { fill(S); delete S.marks[id]; };

// ---------- rover: harvests a scanned planet from orbit ----------
W.MODS.rover = { n: 'Rover', d: 'Erntet Rohstoffe vom Orbit aus', val: [0, 1, 2, 3], unit: '', sec: 1, cost: [{ cr: 1500, eisen: 12, kristall: 4 }, { cr: 3500, eisen: 20, kristall: 10 }, { cr: 7000, kristall: 18, forschung: 20 }] };
W.MKEYS.push('rover');
W.ROVER_T = [0, 30, 22, 15]; W.ROVER_M = [0, 120, 90, 60];
W.roverYield = function (p) { var o = {}; for (var k in p.res) o[k] = Math.round(p.res[k] * 2.5 + 2); return o; };
W.roverCan = function (S, p) {
fill(S); return S.mods.rover > 0 && S.rover.st === 'idle' && !!S.scanned[p.key] && !!W.WORLDS[p.type].land && !p.sol && Object.keys(p.res).length > 0 && !S.roverDone[p.key];
};
W.roverGo = function (S, p) { var l = S.mods.rover || 1; S.rover = { st: 'out', t: W.ROVER_T[l], T: W.ROVER_T[l], star: S.star, pk: p.key, pi: p.i, pn: p.name, load: W.roverYield(p) }; };
function unload(S, load) { var got = {}; for (var k in load) { var a = W.addRes(S, k, load[k]); if (a) got[k] = a; } return got; }
W.roverTick = function (S, dt) {
fill(S); var R = S.rover;
if (R.st === 'out') {
if (R.star !== S.star) return null;
R.t -= dt; if (R.t > 0) return null;
var got = unload(S, R.load); S.roverDone[R.pk] = 1;
var m = W.ROVER_M[S.mods.rover || 1] * (W.hasCrew(S, 'kofi') ? 0.5 : 1), pn = R.pn;
S.rover = { st: 'maint', t: m, T: m }; return { k: 'back', got: got, pn: pn };
}
if (R.st === 'maint') { R.t -= dt; if (R.t <= 0) { S.rover = { st: 'idle', t: 0 }; return { k: 'ready' }; } }
return null;
};
W.roverOut = function (S) { fill(S); return S.rover.st === 'out' && S.rover.star === S.star; };
W.roverLeave = function (S) { var R = S.rover; R.st = 'left'; S.roverDone[R.pk] = 1; W.mark(S, R.star, 'rover', 'Rover wartet auf ' + R.pn); };
W.roverPickupHere = function (S, p) { fill(S); return S.rover.st === 'left' && S.rover.star === S.star && S.rover.pk === p.key; };
W.roverPickup = function (S) { var got = unload(S, S.rover.load || {}); if (S.marks[S.rover.star] && S.marks[S.rover.star].k === 'rover') W.unmark(S, S.rover.star); S.rover = { st: 'idle', t: 0 }; return got; };
W.ROVER_NEW = { cr: 1200, eisen: 10 };
W.roverReplace = function (S) {
var c = W.ROVER_NEW; if (S.cr < c.cr) return 'Dir fehlen ' + W.fmt(c.cr - S.cr) + ' Cr'; if ((S.res.eisen || 0) < c.eisen) return 'Dir fehlen ' + (c.eisen - (S.res.eisen || 0)) + ' t Eisen';
S.cr -= c.cr; S.res.eisen -= c.eisen; if (S.marks[S.rover.star] && S.marks[S.rover.star].k === 'rover') W.unmark(S, S.rover.star); S.rover = { st: 'idle', t: 0 }; return null;
};

// ---------- wormholes: some black holes, revealed by measuring ----------
W.isWorm = function (S, st) { return st.type === 'loch' && W.hash(S.seed, st.seed, 13) % 2 === 0; };
W.wormKnown = function (S, st) { return W.isWorm(S, st) && !!(S.flags.measured && S.flags.measured[st.id]); };
W.wormTarget = function (S) {
var cur = W.findStar(S, S.star), d = Math.hypot(cur.x, cur.y); if (d < 260) return null;
var D = Math.min(d - 120, 150 + Math.random() * 300), ux = -cur.x / d, uy = -cur.y / d, side = (Math.random() - 0.5) * 220;
var px = cur.x + ux * D - uy * side, py = cur.y + uy * D + ux * side, best = null, bd = 1e9;
W.starsNear(S, px, py, 160).forEach(function (st) { var sd = Math.hypot(st.x, st.y), dd = Math.hypot(st.x - px, st.y - py); if (st.id !== S.star && sd < d - 100 && st.type !== 'loch' && dd < bd) { bd = dd; best = st; } });
return best ? { st: best, years: 15 + Math.round(Math.random() * 15) } : null;
};
W.wormJump = function (S, w) {
// reuse the normal jump for crew, production and messages, then add the real distance and time
var cur = W.findStar(S, S.star), t = w.st, fake = { id: t.id, x: cur.x + 0.001, y: cur.y, type: t.type, name: t.name, seed: t.seed }, fuel = S.fuel;
S.fuel = Math.max(S.fuel, 1);
var r = W.jump(S, fake); if (!r.ok) { S.fuel = fuel; return r; }
S.fuel = fuel; var d = Math.hypot(t.x - cur.x, t.y - cur.y); S.year += w.years; S.stats.ly += d; r.d = d; r.years = w.years; r.worm = true;
r.news.msgs = r.news.msgs.concat(W.deliver(S));
return r;
};

// ---------- route over several jumps (fuel ignored, range as now) ----------
W.route = function (S, goalId) {
var R = W.baseRange(S), a = W.findStar(S, S.star), g = W.findStar(S, goalId); if (!g || g.id === a.id) return null;
function d(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
if (d(a, g) <= R) return [g];
var open = [{ st: a, g: 0, f: d(a, g) / R, prev: null }], seen = {}; seen[a.id] = 1;
for (var n = 0; n < 500 && open.length; n++) {
var bi = 0; for (var i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
var cur = open.splice(bi, 1)[0];
if (d(cur.st, g) <= R) { var path = [g]; for (var c = cur; c && c.prev; c = c.prev) path.unshift(c.st); return path; }
var nb = W.starsNear(S, cur.st.x, cur.st.y, R); if (d(cur.st, W.solStar()) <= R) nb.push(W.solStar());
nb.forEach(function (st) { if (seen[st.id]) return; seen[st.id] = 1; open.push({ st: st, g: cur.g + 1, f: cur.g + 1 + d(st, g) / R, prev: cur }); });
}
return null;
};

// ---------- signals on planets ----------
W.SIGNAL_FINDS = [
'Unter einem flachen Stein liegt eine Funkbake der Albatros, noch immer sendend, ganz leise. Daneben eine Dose mit Notizen: Wetterdaten, Sternpositionen, ein Kinderreim.',
'Das Signal kommt aus einer alten Wetterboje. Ihre Daten sind Jahrzehnte alt und trotzdem wertvoll: Niemand hat diesen Planeten je so lange beobachtet.',
'Eine Messsonde, umgekippt, aber heil. Auf dem Gehäuse hat jemand mit dem Finger in den Staub geschrieben: „Wir waren hier. Es war schön.“',
'Ein Kristall, der auf der Funkfrequenz singt. Rena hält ihn ans Ohr und lacht. „Das ist Musik. Irgendwer hat das so gestimmt.“'
];
W.signalHas = function (S, p) { fill(S); return !p.ruin && !p.sol && W.hash(p.seed, 17, 3) % 10 < 6 && !S.signals[p.key]; };
W.signalReward = function (S, p) {
fill(S); S.signals[p.key] = 1;
var cur = W.findStar(S, S.star), best = null, bs = 1e9;
W.starsNear(S, cur.x, cur.y, 450).forEach(function (st) {
if (st.id === S.star || S.visited[st.id] || S.marks[st.id]) return;
var has = W.system(S, st).planets.some(function (q) { return q.ruin && !S.ruins[q.key]; }); if (!has) return;
var sd = Math.hypot(st.x, st.y); if (sd < bs) { bs = sd; best = st; }
});
if (best && (S.frags || 0) < W.TECH.length) {
W.mark(S, best.id, 'ruin', 'Ruine der Erbauer · Peilstein');
return { ruin: best, t: 'Ein Peilstein der Erbauer', b: 'Das Signal kommt aus einem kleinen Stein, glatt wie Glas. Als du ihn berührst, leuchtet darin ein Punkt auf, und die Sternkarte zeigt ihn mit: ' + best.name + ', ' + Math.round(Math.hypot(best.x - cur.x, best.y - cur.y)) + ' Lichtjahre entfernt.\n\nDort steht eine Ruine der Erbauer. Das System ist jetzt auf deiner Karte markiert.' };
}
var cr = 150 + (W.hash(p.seed, 5, 5) % 4) * 50; S.cr += cr; S.forschung += 5; S.flags.ftot = (S.flags.ftot || 0) + 5;
return { t: 'Ein Fundstück', b: W.SIGNAL_FINDS[W.hash(p.seed, 9, 9) % W.SIGNAL_FINDS.length] + '\n\n+' + cr + ' Cr, +5 Forschung.' };
};
})(window);
