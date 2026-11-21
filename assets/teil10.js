(function (root) {
'use strict';
var W = root.World;

function fill(S) {
if (!S) return S;
S.voids = S.voids || []; S.sam = S.sam || { met: 0, known: [], last: -9, name: null, gave: 0 }; S.samFrags = S.samFrags || 0;
return S;
}
var ng = W.newGame, ds = W.deserialize;
W.newGame = function (seed, ship) { return fill(ng(seed, ship)); };
W.deserialize = function (s) { return fill(ds(s)); };

// ---------- the Stille: voids where stars stop ----------
W.RES.leer = { n: 'Leerstaub', p: 320 };
W.RKEYS.push('leer');
function inVoid(S, x, y) { for (var i = 0; i < S.voids.length; i++) { var v = S.voids[i]; if (Math.hypot(x - v.x, y - v.y) < v.r) return v; } return null; }
W.inVoid = function (S, st) { fill(S); return st && st.id !== 'sol' && st.id !== S.star && !S.marks[st.id] ? inVoid(S, st.x, st.y) : null; };
var near0 = W.starsNear;
W.starsNear = function (S, x, y, rad) { var a = near0(S, x, y, rad); if (!S || !S.voids || !S.voids.length) return a; return a.filter(function (st) { return !W.inVoid(S, st); }); };
W.voidEdge = function (S) { // distance in Lj from the current star to the nearest void edge
fill(S); var c = W.findStar(S, S.star), best = null;
S.voids.forEach(function (v) { var d = Math.hypot(c.x - v.x, c.y - v.y) - v.r; if (!best || d < best.d) best = { d: d, v: v, dx: v.x - c.x, dy: v.y - c.y }; });
return best;
};
function addVoid(S) {
var tr = S.trail || []; if (tr.length < 5) return;
var r = W.rng(W.hash(S.seed, S.jumps, 77)), pick = tr[Math.max(0, tr.length - 5 - Math.floor(r() * 3))], c = W.findStar(S, S.star);
var rad = 45 + r() * 50, vx = pick[0] + (r() - 0.5) * 60, vy = pick[1] + (r() - 0.5) * 60;
if (r() < 0.35) { var a = Math.atan2(c.y, c.x) + (r() < 0.5 ? 1 : -1) * (1.2 + r() * 0.6), dd = 160 + r() * 140; vx = c.x + Math.cos(a) * dd; vy = c.y + Math.sin(a) * dd; }
if (Math.hypot(vx - c.x, vy - c.y) < rad + 25 || Math.hypot(vx, vy) < rad + 120) return;
S.voids.push({ x: Math.round(vx), y: Math.round(vy), r: Math.round(rad), year: Math.floor(S.year) });
}
var jump0 = W.jump;
W.jump = function (S, t) {
var r = jump0(S, t); if (!r.ok) return r; fill(S);
if (S.jumps >= 8 && S.jumps % 3 === 0 && S.voids.length < 9) { var n = S.voids.length; addVoid(S); if (S.voids.length > n) { S.flags.voids = S.voids.length; r.news.voidNew = true; r.news.msgs = r.news.msgs.concat(W.deliver(S)); } }
return r;
};
var sys0 = W.system;
W.system = function (S, st) { var y = sys0(S, st); if (y.station && y.station.price && y.station.price.leer == null) y.station.price.leer = Math.round(W.RES.leer.p * (0.8 + (W.hash(st.seed, 3, 1) % 40) / 100)); return y; };
W.leerCan = function (S) { var e = W.voidEdge(S); return !!(e && e.d < 70); };

// ---------- the collector: a figure of light ----------
W.GLYPH_WORDS = ['ich', 'du', 'weit', 'Zuhause', 'Licht', 'danke', 'Stille', 'Schiff', 'Freund', 'sammeln', 'kaputt', 'Stern', 'suchen', 'Weg', 'verloren', 'Familie', 'warten', 'hören', 'singen', 'nah', 'zusammen', 'Name', 'bleiben', 'auch'];
W.SAM_LINES = [
{ w: [0, 9, 4], de: 'Ich sammle Licht.' },
{ w: [0, 2, 3], de: 'Ich bin weit weg von zu Hause.' },
{ w: [7, 10, 0, 9], de: 'Mein Schiff ist kaputt. Ich sammle, um es zu reparieren.' },
{ w: [1, 23, 2, 3], de: 'Bist du auch weit weg von zu Hause?' },
{ w: [6, 11, 14], de: 'Die Stille hat Sterne verloren gemacht.' },
{ w: [15, 16, 3, 6, 19], de: 'Meine Familie wartet zu Hause. Die Stille ist nah.' },
{ w: [0, 17, 1, 7, 18], de: 'Ich höre dein Schiff singen. Es ist laut. Die Stille hört es auch.' },
{ w: [21, 0, -1, 5, 8, 20, 13], de: 'Mein Name ist {name}. Danke, Freund. Gemeinsam ist der Weg kürzer.' }
];
W.SAM_BYE = [{ w: [5, 8], de: 'Danke, Freund.' }, { w: [12, 13, 3], de: 'Ich suche den Weg nach Hause.' }, { w: [20, 22, 4], de: 'Bleib im Licht.' }];
function samName(S) { var r = W.rng(W.hash(S.seed, 4, 4)), syl = ['il', 'vo', 'sa', 'ruk', 'ena', 'thal', 'mi', 'or', 'ky', 'lun', 'ae', 'ris']; var n = ''; for (var i = 0; i < 2 + Math.floor(r() * 2); i++) n += syl[Math.floor(r() * syl.length)]; return n.charAt(0).toUpperCase() + n.slice(1); }
W.samChance = function (S, p) { fill(S); return !p.sol && Object.keys(p.res).length > 0 && S.jumps - S.sam.last >= 2 && (S.sam.met === 0 ? S.jumps >= 3 : (W.hash(p.seed, S.jumps, 61) % 100) < 22); };
W.samMeet = function (S) {
fill(S); var M = S.sam; M.last = S.jumps; M.met++;
var line = M.met <= W.SAM_LINES.length ? W.SAM_LINES[M.met - 1] : W.SAM_BYE[M.met % W.SAM_BYE.length], learned = [];
line.w.forEach(function (k) { if (k >= 0 && M.known.indexOf(k) < 0 && learned.length < 2) { M.known.push(k); learned.push(k); } });
if (M.met === W.SAM_LINES.length || M.known.length >= W.GLYPH_WORDS.length - 2) M.name = M.name || samName(S);
var ask = null;
if (M.met >= 2) { var ks = ['eisen', 'kristall', 'sporen'], k2 = ks[W.hash(S.seed, M.met, 9) % 3]; ask = { k: k2, n: 8 + (W.hash(S.seed, M.met, 10) % 3) * 4 }; }
return { line: line, learned: learned, ask: ask };
};
W.samGive = function (S, ask) {
if ((S.res[ask.k] || 0) < ask.n) return 'Du hast nicht genug ' + W.RES[ask.k].n;
S.res[ask.k] -= ask.n; S.frags = (S.frags || 0) + 1; S.samFrags++; S.sam.gave++; S.flags.samGave = S.sam.gave; return null;
};
W.samLearn = function (S) { fill(S); var M = S.sam, c = 10 + M.known.length * 2; if (S.forschung < c) return 'Dir fehlen ' + (c - S.forschung) + ' Forschung'; for (var i = 0; i < W.GLYPH_WORDS.length; i++) if (M.known.indexOf(i) < 0) { M.known.push(i); S.forschung -= c; if (M.known.length >= W.GLYPH_WORDS.length - 2 && M.met >= 3) M.name = M.name || samName(S); return null; } return 'Alle Zeichen sind bekannt'; };
W.samLearnCost = function (S) { fill(S); return 10 + S.sam.known.length * 2; };
// glyph strokes on a 3x3 grid, as an SVG path
W.glyphPath = function (k) {
var r = W.rng(k * 7919 + 13), d = '', n = 2 + Math.floor(r() * 3);
for (var i = 0; i < n; i++) { var a = Math.floor(r() * 9), b = Math.floor(r() * 9); if (a !== b) d += 'M' + (a % 3) * 6 + ' ' + Math.floor(a / 3) * 6 + 'L' + (b % 3) * 6 + ' ' + Math.floor(b / 3) * 6; }
if (r() < 0.5) { var c = Math.floor(r() * 9); d += 'M' + ((c % 3) * 6 - 2) + ' ' + Math.floor(c / 3) * 6 + 'a2 2 0 1 0 4 0a2 2 0 1 0-4 0'; }
return d;
};

// ---------- story ----------
[
{ id: 'm50', at: { flag: 'voids', n: 2 }, from: 'Lena', t: 'Lücken', b: 'Es sind jetzt mehrere, Papa. Sterne, die einfach fehlen. Auf den Karten des Observatoriums sieht es aus, als hätte jemand mit einem Radiergummi über den Himmel gewischt.\n\nDie Leute haben Angst. Ich nicht, glaube ich. Ich schaue nur jeden Abend nach, ob deine Richtung noch da ist. Sie ist noch da.' },
{ id: 'm51', at: { flag: 'voids', n: 4 }, from: 'Logbuch', t: 'Leerstaub', b: 'Am Rand der Lücken treibt etwas, das Rena „Leerstaub“ nennt. Er fällt nicht, er steigt. Er ist kalt, auch wenn man ihn in der Hand hält.\n\nIn den Bruchstücken der Erbauer kommt er vor. Sie haben damit gebaut.' },
{ id: 'm52', at: { flag: 'samGave', n: 1 }, from: 'Logbuch', t: 'Ein Geschenk', b: 'Die Lichtgestalt hat uns ein Bruchstück gegeben, für ein paar Tonnen Gestein. Es ist warm, so wie die in den Ruinen. Rena glaubt, sie kennt die Erbauer. Vielleicht ist sie sogar eine von ihnen, oder das, was von ihnen geblieben ist.' }
].forEach(function (m) { W.MSG.push(m); });
})(window);
