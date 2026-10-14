(function () {
'use strict';
var el = document.getElementById('laterne');
if (!el) return;
var P = {
a: [
'soso', 'hm...irgendwie riecht das hier nach feierabend', 'kann man als frührentner eigentlich urlaub beantragen?',
'so siehts aus', 'das ist wie magic, nur ohne karten...und ohne spaß',
'gibts hier eigentlich loot oder nur sand?', '*summt marschmusik*', 
 
'das imperium schläft nie...ich schon xD', 'aha', 'versteh ick', 'was würd darth vader jetzt tun...vermutlich meckern',
'*schnüffelt in der gegend herum* ...riecht ihr das auch?!', 'moment...wo ist mein hut? achso, im nacken xD'
],
2: ['aha, wie man an der flagge unschwer erkennt, handelt es sich um ein piratenschiff', 'wenn ich hier anheuer, bin ich nach 5 minuten kapitän...von nix, aber kapitän'],
j: ['hoppla', 'und hopp...das war eher gedacht als gekonnt', 'achievement unlocked: knie']
};
var calm = false;
try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
var cur = '', ci = 0, last = '';
function pick() {
var o = el.getAttribute('data-ort'), pool = P.a, s;
if (el.getAttribute('data-j')) { el.removeAttribute('data-j'); pool = P.j; }
else if (P[o] && Math.random() < 0.45) pool = P[o];
do { s = pool[Math.floor(Math.random() * pool.length)]; } while (s === last && pool.length > 1);
last = s;
return s;
}
function say() { cur = pick(); ci = 0; type(); }
function type() {
ci = calm ? cur.length : ci + 1;
el.textContent = cur.slice(0, ci);
if (ci < cur.length) setTimeout(type, 45);
else setTimeout(function () { el.textContent = ''; setTimeout(say, 500 + Math.random() * 1500); }, 1800 + cur.length * 35);
}
setTimeout(say, 800);
})();
(function () {
var hb = document.getElementById('hbtn'), hf = document.getElementById('hafen'), hx = document.getElementById('hback');
if (!hb || !hf) return;
hb.addEventListener('click', function () { hf.style.display = 'block'; });
hx.addEventListener('click', function () { hf.style.display = 'none'; });
})();
