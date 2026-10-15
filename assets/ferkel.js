/* Ziehverschluss auf dem Deckel: Zieht man daran, geht die Dose auf und ein Ferkel springt heraus.
 * Liegt als Overlay ueber der WebGL-Dose (eigene 2D-Flaeche), rechnet die Kamera aus window.doseMasse() nach.
 * Kein Speicher, kein Netz, keine externen Dateien. */
(function () {
  'use strict';
  var buehne = document.getElementById('buehne');
  if (!buehne || typeof window.doseMasse !== 'function') return;

  var TANF = Math.tan(32 * Math.PI / 180 / 2);
  var R_NAHT = 4.30, R_AUF = 3.3, G = 26;
  var RUFE = ['Quiek!', 'Oink!', 'Hihi!', 'Quiek quiek!'];
  var ruhe = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var stil = document.createElement('style');
  stil.textContent = '.ferkel-leinwand{position:fixed;left:0;top:0;width:100%;height:100%;z-index:5;pointer-events:none}' +
    '.ferkel-griff{position:fixed;left:0;top:0;z-index:6;margin:0;padding:0;border:0;border-radius:50%;background:transparent;touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent}' +
    '.ferkel-griff:active{cursor:grabbing}';
  document.head.appendChild(stil);

  var leinwand = document.createElement('canvas');
  leinwand.className = 'ferkel-leinwand';
  leinwand.setAttribute('aria-hidden', 'true');
  document.body.appendChild(leinwand);
  var ctx = leinwand.getContext('2d');
  if (!ctx) return;

  var griff = document.createElement('button');
  griff.type = 'button';
  griff.className = 'ferkel-griff';
  griff.setAttribute('aria-label', 'Dose \u00f6ffnen: Verschluss ziehen');
  document.body.appendChild(griff);

  var zustand = 'zu';            // 'zu' oder 'offen'
  var ziehen = null, pull = 0, pullZiel = 0;
  var offenSeit = 0, offenT = 0, jetzt = 0;
  var f = null, letzteKamera = null, rufNr = 0;

  function kamera() {
    var m = window.doseMasse(), a = m.ansicht;
    var r = buehne.getBoundingClientRect();
    var w = Math.max(1, r.width), h = Math.max(1, r.height);
    var k = m.hoehe_cm / 7.40, asp = w / h;
    var dH = R_NAHT / (TANF * Math.max(0.2, asp));
    var dV = (3.70 * k + R_NAHT * Math.abs(Math.sin(a.pitch)) + 0.15) / TANF;
    var d = (Math.max(dH, dV) + R_NAHT * 1.1) * a.zoom;
    var cp = Math.cos(a.pitch), sp = Math.sin(a.pitch);
    var ex = d * Math.sin(a.yaw) * cp, ey = d * sp + 0.15, ez = d * Math.cos(a.yaw) * cp;
    var zx = ex, zy = ey - 0.05, zz = ez, l = Math.hypot(zx, zy, zz) || 1;
    zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx;
    l = Math.hypot(xx, xy, xz) || 1;
    xx /= l; xz /= l;
    return {
      ex: ex, ey: ey, ez: ez, zx: zx, zy: zy, zz: zz, xx: xx, xz: xz,
      yx: zy * xz - zz * xy, yy: zz * xx - zx * xz, yz: zx * xy - zy * xx,
      left: r.left, top: r.top, w: w, h: h, asp: asp, k: k, yaw: a.yaw
    };
  }

  function proj(c, x, y, z) {
    var rx = x - c.ex, ry = y - c.ey, rz = z - c.ez;
    var xv = rx * c.xx + rz * c.xz;
    var yv = rx * c.yx + ry * c.yy + rz * c.yz;
    var t = -(rx * c.zx + ry * c.zy + rz * c.zz);
    if (t < 0.1) t = 0.1;
    return {
      x: c.left + (xv / (t * TANF * c.asp) * 0.5 + 0.5) * c.w,
      y: c.top + (0.5 - yv / (t * TANF) * 0.5) * c.h,
      s: (c.h / 2) / (TANF * t)
    };
  }

  function kreis(c, cx, cy, cz, r) {
    var p = [], i, a;
    for (i = 0; i < 40; i++) {
      a = i / 40 * Math.PI * 2;
      p.push(proj(c, cx + r * Math.cos(a), cy, cz + r * Math.sin(a)));
    }
    return p;
  }

  function pfad(p) {
    ctx.moveTo(p[0].x, p[0].y);
    for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath();
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function deckelZeichnen(c, yd, sicht) {
    var y0 = yd + 0.04, lift = pull * 2.2 + offenT * 6;
    var ringM = proj(c, 0, y0 + lift, 2.1);
    var o = 1 - offenT;

    if (offenT > 0) {                                  // geoeffnete Oeffnung
      var mitte = proj(c, 0, yd + 0.03, 0);
      var loch = kreis(c, 0, yd + 0.03, 0, R_AUF * ease(offenT));
      var gr = ctx.createRadialGradient(mitte.x, mitte.y, 2, mitte.x, mitte.y, R_AUF * mitte.s);
      gr.addColorStop(0, '#1d120b');
      gr.addColorStop(1, '#52341f');
      ctx.save();
      ctx.globalAlpha = sicht;
      ctx.beginPath(); pfad(loch);
      ctx.fillStyle = gr; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(245,232,190,0.9)'; ctx.stroke();
      ctx.restore();
    }
    if (o <= 0.01) return ringM;

    ctx.save();
    ctx.globalAlpha = sicht * o;
    ctx.beginPath(); pfad(kreis(c, 0, yd + 0.02, 0, 3.35));   // Reisslinie
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,70,30,0.45)'; ctx.stroke();

    if (lift > 0.05) {                                          // Schatten der Lasche
      ctx.beginPath(); pfad(kreis(c, 0, y0, 2.1, 0.95));
      ctx.fillStyle = 'rgba(40,30,10,0.22)'; ctx.fill();
    }
    var gl = ctx.createLinearGradient(ringM.x - ringM.s, ringM.y - ringM.s, ringM.x + ringM.s, ringM.y + ringM.s);
    gl.addColorStop(0, '#f4f4f0'); gl.addColorStop(0.5, '#b9b9b4'); gl.addColorStop(1, '#e6e6e1');
    ctx.fillStyle = gl; ctx.strokeStyle = '#74746e'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';

    ctx.beginPath();                                            // Steg
    pfad([proj(c, -0.32, y0, 0.1), proj(c, 0.32, y0, 0.1), proj(c, 0.32, y0 + lift, 1.5), proj(c, -0.32, y0 + lift, 1.5)]);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();                                            // Ring
    pfad(kreis(c, 0, y0 + lift, 2.1, 0.95));
    pfad(kreis(c, 0, y0 + lift, 2.1, 0.6));
    ctx.fill('evenodd'); ctx.stroke();

    var niet = proj(c, 0, y0, 0.2);                             // Niete
    ctx.beginPath(); ctx.arc(niet.x, niet.y, Math.max(2, 0.22 * niet.s), 0, Math.PI * 2);
    ctx.fillStyle = '#9d9d98'; ctx.fill(); ctx.stroke();
    ctx.restore();
    return ringM;
  }

  function el(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }

  function schwein(p, u, zeit) {
    var HAUT = '#f8b9c6', HAUT2 = '#f09aac', RAND = '#c75b78';
    var sy = 1, sx = 1, q;
    if (f.flug) { sy = 1 + Math.min(0.22, Math.abs(f.vy) / 60); sx = 1 / sy; }
    else if (f.quetsch > 0) { q = Math.sin(Math.PI * (1 - f.quetsch / 0.28)); sy = 1 - 0.26 * q; sx = 1 + 0.2 * q; }
    else { sy = 1 + 0.02 * Math.sin(zeit * 3.2); }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(u * sx, u * sy);
    ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = RAND;

    ctx.save();                                                 // Ringelschwanz
    ctx.translate(0.78, -0.72);
    ctx.rotate(Math.sin(zeit * 9) * (f.flug ? 0.12 : 0.38));
    ctx.beginPath(); ctx.arc(0.18, -0.05, 0.17, Math.PI * 0.9, Math.PI * 2.5);
    ctx.strokeStyle = HAUT2; ctx.lineWidth = 0.11; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = RAND; ctx.lineWidth = 0.05;

    ctx.fillStyle = HAUT2;                                      // Fuesse
    el(-0.42, -0.1, 0.26, 0.15); ctx.fill(); ctx.stroke();
    el(0.42, -0.1, 0.26, 0.15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = HAUT;                                       // Koerper
    el(0, -0.62, 0.88, 0.62); ctx.fill(); ctx.stroke();

    var seite, ohr = Math.sin(zeit * 7) * 0.06;                 // Ohren
    for (seite = -1; seite <= 1; seite += 2) {
      ctx.save(); ctx.scale(seite, 1); ctx.rotate(ohr * seite);
      ctx.beginPath();
      ctx.moveTo(0.42, -2.0); ctx.quadraticCurveTo(1.15, -2.35, 1.12, -1.62);
      ctx.quadraticCurveTo(0.75, -1.72, 0.42, -2.0);
      ctx.fillStyle = HAUT2; ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = HAUT;                                       // Kopf
    el(0, -1.52, 0.82, 0.82); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5a0b3';                                  // Ruessel
    el(0, -1.36, 0.4, 0.29); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a8405a';
    el(-0.14, -1.36, 0.06, 0.09); ctx.fill();
    el(0.14, -1.36, 0.06, 0.09); ctx.fill();
    ctx.fillStyle = 'rgba(238,90,120,0.35)';                    // Wangen
    el(-0.58, -1.4, 0.13, 0.13); ctx.fill();
    el(0.58, -1.4, 0.13, 0.13); ctx.fill();
    ctx.fillStyle = '#2a1a1f';                                  // Augen
    el(-0.34, -1.7, 0.1, 0.11); ctx.fill();
    el(0.34, -1.7, 0.1, 0.11); ctx.fill();
    ctx.fillStyle = '#fff';
    el(-0.31, -1.74, 0.035, 0.035); ctx.fill();
    el(0.37, -1.74, 0.035, 0.035); ctx.fill();
    if (f.flug) {                                               // Mund
      ctx.fillStyle = '#8a2d45';
      el(0, -0.98, 0.15, 0.12); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, -1.12, 0.17, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  function sprechblase(x, y, u, text, alpha) {
    var px = Math.max(13, 0.5 * u);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + px + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width + px * 1.2, h = px * 1.9, r = h / 2;
    var l = x - w / 2, t = y - h;
    ctx.beginPath();
    ctx.moveTo(l + r, t); ctx.lineTo(l + w - r, t); ctx.arc(l + w - r, t + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + px * 0.5, t + h); ctx.lineTo(x, t + h + px * 0.7); ctx.lineTo(x - px * 0.1, t + h);
    ctx.lineTo(l + r, t + h); ctx.arc(l + r, t + r, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#c75b78'; ctx.stroke();
    ctx.fillStyle = '#7a2540';
    ctx.fillText(text, x, t + h / 2 + 1);
    ctx.restore();
  }

  function oeffnen() {
    if (zustand !== 'zu' || !letzteKamera) return;
    var c = letzteKamera, yd = 3.55 * c.k;
    var ang = c.yaw + (Math.random() - 0.5) * 0.8;
    var mitte = proj(c, 0, yd, 0);
    var platz = (mitte.y - c.top - 0.05 * c.h) / mitte.s - 2.9;     // Platz nach oben im Bild
    var hoehe = Math.max(1.6, Math.min(4.6, platz));
    var v0 = Math.sqrt(2 * G * hoehe), T = 2 * v0 / G;
    var tx = 3.55 * Math.sin(ang), tz = 3.55 * Math.cos(ang);
    zustand = 'offen';
    offenSeit = jetzt;
    pullZiel = 0; ziehen = null;
    griff.setAttribute('aria-label', 'Ferkel streicheln');
    f = {
      x: 0, y: yd + 0.3, z: 0, vx: tx / T, vy: v0, vz: tz / T, boden: yd,
      flug: true, verzoegerung: 0.12, quetsch: 0, ruf: '', rufT: 0, wachsen: 0
    };
    if (ruhe) {
      f.x = tx; f.z = tz; f.y = yd; f.vx = f.vy = f.vz = 0;
      f.flug = false; f.verzoegerung = 0; f.wachsen = 1;
    }
  }

  function hupfen() {
    if (!f || f.flug || f.verzoegerung > 0) return;
    f.flug = true; f.vy = Math.sqrt(2 * G * 1.6); f.vx = 0; f.vz = 0;
    f.ruf = RUFE[rufNr++ % RUFE.length]; f.rufT = 1.3;
  }

  function aufsetzen(c) {
    var y = 3.55 * c.k;
    if (f) f.boden = y;
  }

  griff.addEventListener('pointerdown', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (zustand === 'offen') { hupfen(); return; }
    ziehen = { id: e.pointerId, x: e.clientX, y: e.clientY, weit: 0 };
    try { griff.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
  });
  griff.addEventListener('pointermove', function (e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    var d = Math.hypot(e.clientX - ziehen.x, e.clientY - ziehen.y);
    ziehen.weit = Math.max(ziehen.weit, d);
    pullZiel = Math.min(1, d / 40);
    if (d >= 40) oeffnen();
  });
  griff.addEventListener('pointerup', function (e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    var weit = ziehen.weit;
    ziehen = null; pullZiel = 0;
    if (weit < 8) oeffnen();
  });
  griff.addEventListener('pointercancel', function () { ziehen = null; pullZiel = 0; });
  griff.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); e.stopPropagation();
    if (zustand === 'zu') oeffnen(); else hupfen();
  });

  var letzte = 0;
  function bild(zeit) {
    requestAnimationFrame(bild);
    jetzt = zeit / 1000;
    var dt = letzte ? Math.min(0.05, (zeit - letzte) / 1000) : 0;
    letzte = zeit;
    var c;
    try { c = kamera(); } catch (fehler) { return; }
    letzteKamera = c;
    aufsetzen(c);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.round(window.innerWidth * dpr), bh = Math.round(window.innerHeight * dpr);
    if (leinwand.width !== bw || leinwand.height !== bh) { leinwand.width = bw; leinwand.height = bh; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    var yd = 3.55 * c.k;
    var sicht = Math.max(0, Math.min(1, (c.ey - yd) / 1.5));
    pull += (pullZiel - pull) * Math.min(1, dt * 16);
    if (zustand === 'offen') offenT = ruhe ? 1 : Math.min(1, (jetzt - offenSeit) / 0.3);

    var ringM = deckelZeichnen(c, yd, sicht);

    if (zustand === 'zu') {
      var gs = Math.max(56, 2.2 * ringM.s);
      griff.style.width = gs + 'px'; griff.style.height = gs + 'px';
      griff.style.transform = 'translate(' + (ringM.x - gs / 2) + 'px,' + (ringM.y - gs / 2) + 'px)';
      griff.style.pointerEvents = sicht > 0.4 ? 'auto' : 'none';
      if (sicht > 0.5 && pull < 0.05) {
        ctx.save();
        ctx.globalAlpha = 0.7 * sicht;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#3c321e';
        ctx.fillText('Am Verschluss ziehen', c.left + c.w / 2, c.top + c.h - 16);
        ctx.restore();
      }
      return;
    }

    if (!f) return;
    if (f.verzoegerung > 0) {
      f.verzoegerung = Math.max(0, f.verzoegerung - dt);
    } else {
      f.wachsen = Math.min(1, f.wachsen + dt / 0.18);
      if (f.flug) {
        f.vy -= G * dt;
        f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
        if (f.vy < 0 && f.y <= f.boden) {
          f.y = f.boden; f.flug = false; f.vx = f.vy = f.vz = 0; f.quetsch = 0.28;
          if (!f.ruf) { f.ruf = RUFE[rufNr++ % RUFE.length]; f.rufT = 1.5; }
        }
      } else {
        f.y = f.boden;
      }
      if (f.quetsch > 0) f.quetsch = Math.max(0, f.quetsch - dt);
      if (f.rufT > 0) f.rufT -= dt;
    }
    if (f.verzoegerung > 0) { griff.style.pointerEvents = 'none'; return; }

    var fuss = proj(c, f.x, f.y, f.z);
    var u = fuss.s * 1.3 * (0.4 + 0.6 * ease(f.wachsen));
    var schatten = proj(c, f.x, f.boden, f.z);
    var hoch = Math.max(0, f.y - f.boden);
    ctx.save();
    ctx.globalAlpha = 0.28 / (1 + hoch * 0.35);
    el(schatten.x, schatten.y, 0.9 * u, 0.3 * u);
    ctx.fillStyle = '#20140a'; ctx.fill();
    ctx.restore();

    schwein(fuss, u, jetzt);
    if (f.rufT > 0 && f.ruf) sprechblase(fuss.x, fuss.y - 2.5 * u, u, f.ruf, Math.min(1, f.rufT / 0.3));

    var gb = Math.max(56, 2.1 * u);
    griff.style.width = gb + 'px'; griff.style.height = gb + 'px';
    griff.style.transform = 'translate(' + (fuss.x - gb / 2) + 'px,' + (fuss.y - 1.2 * u - gb / 2) + 'px)';
    griff.style.pointerEvents = 'auto';
  }
  requestAnimationFrame(bild);
})();
