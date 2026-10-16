/* 3D-Roehren — Bildschirmschoner im Stil des klassischen "3D Pipes".
   Auf schwarzem Grund wachsen farbige Roehren in festen Schritten geradeaus,
   biegen im rechten Winkel ab und verzweigen sich; an jeder Ecke sitzt eine
   Kugel. Eigener WebGL-Renderer, kein Framework, keine externe Ressource,
   kein sichtbarer Text, keine Speicher- oder Netzzugriffe. */
(function () {
  'use strict';

  /* ---- feste Masse ------------------------------------------------------ */
  var MANTEL = 14;                  // Mantelsegmente je Zylinder (12..16 genuegen)
  var KU_SL = 8, KU_ST = 5;         // Kugel: Laengs- und Breitensegmente
  var R = 0.34;                     // Rohrradius
  var S = 1.0;                      // Rastermass eines Schrittes
  var RAHMEN = 9.0;                 // halbe Kantenlaenge des Fangrahmens
  var MAX_SEG = 330;                // danach ausblenden und neu beginnen
  var MAX_ROHR = 7;                 // gleichzeitig wachsende Roehren
  var T_MIN = 0.42, T_MAX = 0.68;   // Dauer eines Schrittes in Sekunden
  var FOV = 0.803;                  // Blickwinkel, 46 Grad
  var FARBEN = [                    // Palette des Originals, gedeckte Toene
    [0.04, 0.31, 0.33],             // Petrol
    [0.31, 0.16, 0.47],             // Violett
    [0.44, 0.44, 0.16],             // Oliv
    [0.54, 0.55, 0.57],             // Grau
    [0.56, 0.19, 0.15],             // Rot
    [0.14, 0.30, 0.60],             // Blau
    [0.14, 0.42, 0.26]              // Gruen
  ];

  /* ---- Bausteine -------------------------------------------------------- */
  var V_ZYL = MANTEL * 6;           // Zylinder, zwei Dreiecke je Mantelquad
  var V_KUG = KU_SL * KU_ST * 6;    // Kugel
  var V_KAP = MANTEL * 3;           // Deckel, Kreis aus Dreiecken
  var V_SEG = V_ZYL + V_KUG + V_KAP;
  var STAT_MAX = (MAX_SEG + 4) * V_SEG;             // feste Geometrie
  var SPITZ_MAX = (MAX_ROHR + 2) * (V_ZYL + V_KAP); // wachsende Enden
  var F = 9;                                        // Ort(3)+Normale(3)+Farbe(3)

  /* ---- Zeiger und Puffer ------------------------------------------------ */
  var daten = new Float32Array(STAT_MAX * F);   // feste Geometrie, Weltkoordinaten
  var spitze = new Float32Array(SPITZ_MAX * F); // Enden, jedes Bild neu
  var EZ = daten, EI = 0;                       // Ziel und Zeiger des Schreibers
  var fuellung = 0;                             // Fuellstand der festen Geometrie

  function ev(x, y, z, nx, ny, nz, f) {
    EZ[EI] = x; EZ[EI + 1] = y; EZ[EI + 2] = z;
    EZ[EI + 3] = nx; EZ[EI + 4] = ny; EZ[EI + 5] = nz;
    EZ[EI + 6] = f[0]; EZ[EI + 7] = f[1]; EZ[EI + 8] = f[2];
    EI += F;
  }

  /* Zylinder von a nach b, Normale radial nach aussen */
  function zylinder(a, b, f, r) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    var L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 1e-6) return;
    dx /= L; dy /= L; dz /= L;
    var hx = 0, hy = 1, hz = 0;               // Hilfsachse quer zur Rohrachse
    if (dy > 0.9 || dy < -0.9) { hx = 1; hy = 0; hz = 0; }
    var ux = dy * hz - dz * hy, uy = dz * hx - dx * hz, uz = dx * hy - dy * hx;
    var ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= ul; uy /= ul; uz /= ul;
    var vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
    for (var i = 0; i < MANTEL; i++) {
      var a0 = 2 * Math.PI * i / MANTEL, a1 = 2 * Math.PI * (i + 1) / MANTEL;
      var c0 = Math.cos(a0), s0 = Math.sin(a0);
      var c1 = Math.cos(a1), s1 = Math.sin(a1);
      var n0x = ux * c0 + vx * s0, n0y = uy * c0 + vy * s0, n0z = uz * c0 + vz * s0;
      var n1x = ux * c1 + vx * s1, n1y = uy * c1 + vy * s1, n1z = uz * c1 + vz * s1;
      var A0x = a[0] + n0x * r, A0y = a[1] + n0y * r, A0z = a[2] + n0z * r;
      var A1x = a[0] + n1x * r, A1y = a[1] + n1y * r, A1z = a[2] + n1z * r;
      var B0x = b[0] + n0x * r, B0y = b[1] + n0y * r, B0z = b[2] + n0z * r;
      var B1x = b[0] + n1x * r, B1y = b[1] + n1y * r, B1z = b[2] + n1z * r;
      ev(A0x, A0y, A0z, n0x, n0y, n0z, f);
      ev(B0x, B0y, B0z, n0x, n0y, n0z, f);
      ev(B1x, B1y, B1z, n1x, n1y, n1z, f);
      ev(A0x, A0y, A0z, n0x, n0y, n0z, f);
      ev(B1x, B1y, B1z, n1x, n1y, n1z, f);
      ev(A1x, A1y, A1z, n1x, n1y, n1z, f);
    }
  }

  /* Kugel um z — sie schliesst die Ecke rund */
  function kugel(z, f, r) {
    for (var j = 0; j < KU_ST; j++) {
      var p0 = Math.PI * (j / KU_ST - 0.5), p1 = Math.PI * ((j + 1) / KU_ST - 0.5);
      var y0 = Math.sin(p0), q0 = Math.cos(p0);
      var y1 = Math.sin(p1), q1 = Math.cos(p1);
      for (var i = 0; i < KU_SL; i++) {
        var t0 = 2 * Math.PI * i / KU_SL, t1 = 2 * Math.PI * (i + 1) / KU_SL;
        var c0 = Math.cos(t0), s0 = Math.sin(t0);
        var c1 = Math.cos(t1), s1 = Math.sin(t1);
        var m00x = q0 * c0, m00y = y0, m00z = q0 * s0;
        var m01x = q0 * c1, m01y = y0, m01z = q0 * s1;
        var m10x = q1 * c0, m10y = y1, m10z = q1 * s0;
        var m11x = q1 * c1, m11y = y1, m11z = q1 * s1;
        ev(z[0] + m00x * r, z[1] + m00y * r, z[2] + m00z * r, m00x, m00y, m00z, f);
        ev(z[0] + m10x * r, z[1] + m10y * r, z[2] + m10z * r, m10x, m10y, m10z, f);
        ev(z[0] + m11x * r, z[1] + m11y * r, z[2] + m11z * r, m11x, m11y, m11z, f);
        ev(z[0] + m00x * r, z[1] + m00y * r, z[2] + m00z * r, m00x, m00y, m00z, f);
        ev(z[0] + m11x * r, z[1] + m11y * r, z[2] + m11z * r, m11x, m11y, m11z, f);
        ev(z[0] + m01x * r, z[1] + m01y * r, z[2] + m01z * r, m01x, m01y, m01z, f);
      }
    }
  }

  /* flacher Deckel am Punkt z, Normale d — das offene Rohrende */
  function deckel(z, d, f, r) {
    var hx = 0, hy = 1, hz = 0;
    if (d[1] > 0.9 || d[1] < -0.9) { hx = 1; hy = 0; hz = 0; }
    var ux = d[1] * hz - d[2] * hy, uy = d[2] * hx - d[0] * hz, uz = d[0] * hy - d[1] * hx;
    var ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= ul; uy /= ul; uz /= ul;
    var vx = d[1] * uz - d[2] * uy, vy = d[2] * ux - d[0] * uz, vz = d[0] * uy - d[1] * ux;
    for (var i = 0; i < MANTEL; i++) {
      var b0 = 2 * Math.PI * i / MANTEL, b1 = 2 * Math.PI * (i + 1) / MANTEL;
      var p0x = ux * Math.cos(b0) + vx * Math.sin(b0), p0y = uy * Math.cos(b0) + vy * Math.sin(b0), p0z = uz * Math.cos(b0) + vz * Math.sin(b0);
      var p1x = ux * Math.cos(b1) + vx * Math.sin(b1), p1y = uy * Math.cos(b1) + vy * Math.sin(b1), p1z = uz * Math.cos(b1) + vz * Math.sin(b1);
      ev(z[0], z[1], z[2], d[0], d[1], d[2], f);
      ev(z[0] + p0x * r, z[1] + p0y * r, z[2] + p0z * r, d[0], d[1], d[2], f);
      ev(z[0] + p1x * r, z[1] + p1y * r, z[2] + p1z * r, d[0], d[1], d[2], f);
    }
  }

  /* ---- WebGL ------------------------------------------------------------ */
  var flaeche = null, gl = null, prog = null;
  var bufStat = null, bufSpitze = null, statVert = 0;
  var uMVP, uAuge, uBlend, aPos, aNor, aFarbe;

  var QUELLE_V = 'attribute vec3 aPos;attribute vec3 aNor;attribute vec3 aFarbe;' +
    'uniform mat4 uMVP;varying vec3 vNor;varying vec3 vFarbe;varying vec3 vPos;' +
    'void main(){vNor=aNor;vFarbe=aFarbe;vPos=aPos;gl_Position=uMVP*vec4(aPos,1.0);}';

  var QUELLE_F = 'precision mediump float;' +
    'varying vec3 vNor;varying vec3 vFarbe;varying vec3 vPos;' +
    'uniform vec3 uAuge;uniform float uBlend;' +
    'void main(){' +
    'vec3 n=normalize(vNor);vec3 v=normalize(uAuge-vPos);' +
    'vec3 l=normalize(vec3(0.44,0.80,-0.62));' +
    'vec3 l2=normalize(vec3(-0.62,0.18,0.60));' +
    'float d=max(dot(n,l),0.0);float d2=max(dot(n,l2),0.0);' +
    'vec3 h=normalize(l+v);' +
    'float glanz=pow(max(dot(n,h),0.0),20.0)*0.38;' +
    'float um=0.32+0.14*(n.y*0.5+0.5);' +
    'vec3 c=vFarbe*(um+0.72*d+0.18*d2)+vec3(glanz);' +
    'gl_FragColor=vec4(c*uBlend,1.0);}';

  function stufe(art, quelle) {
    var s = gl.createShader(art);
    gl.shaderSource(s, quelle);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  function aufbauen() {
    flaeche = document.getElementById('roehren');
    if (!flaeche) return false;
    var versuch = { antialias: true, alpha: false, depth: true, powerPreference: 'high-performance' };
    gl = flaeche.getContext('webgl', versuch) || flaeche.getContext('experimental-webgl', versuch);
    if (!gl) return false;                    /* ohne WebGL bleibt der Grund schwarz */
    var vs = stufe(gl.VERTEX_SHADER, QUELLE_V), fs = stufe(gl.FRAGMENT_SHADER, QUELLE_F);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    uMVP = gl.getUniformLocation(prog, 'uMVP');
    uAuge = gl.getUniformLocation(prog, 'uAuge');
    uBlend = gl.getUniformLocation(prog, 'uBlend');
    aPos = gl.getAttribLocation(prog, 'aPos');
    aNor = gl.getAttribLocation(prog, 'aNor');
    aFarbe = gl.getAttribLocation(prog, 'aFarbe');
    bufStat = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStat);
    gl.bufferData(gl.ARRAY_BUFFER, STAT_MAX * F * 4, gl.DYNAMIC_DRAW);
    bufSpitze = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSpitze);
    gl.bufferData(gl.ARRAY_BUFFER, SPITZ_MAX * F * 4, gl.DYNAMIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);                 /* die Normalen zeigen ohnehin nach aussen */
    gl.clearColor(0, 0, 0, 1);
    return true;
  }

  /* ---- Matrizen, Spaltenmajoritaet wie WebGL sie erwartet --------------- */
  var mProj = new Float32Array(16), mBlick = new Float32Array(16), mMVP = new Float32Array(16);
  var augeF = new Float32Array(3);
  var auge = [0, 0, 0];

  function perspektive(m, fovy, asp, nah, fern) {
    var t = 1 / Math.tan(fovy / 2);
    m[0] = t / asp; m[1] = 0; m[2] = 0; m[3] = 0;
    m[4] = 0; m[5] = t; m[6] = 0; m[7] = 0;
    m[8] = 0; m[9] = 0; m[10] = (fern + nah) / (nah - fern); m[11] = -1;
    m[12] = 0; m[13] = 0; m[14] = 2 * fern * nah / (nah - fern); m[15] = 0;
    return m;
  }

  function blickrichtung(m, auge, mitte, oben) {
    var zx = auge[0] - mitte[0], zy = auge[1] - mitte[1], zz = auge[2] - mitte[2];
    var l = Math.sqrt(zx * zx + zy * zy + zz * zz);
    zx /= l; zy /= l; zz /= l;
    var xx = oben[1] * zz - oben[2] * zy, xy = oben[2] * zx - oben[0] * zz, xz = oben[0] * zy - oben[1] * zx;
    l = Math.sqrt(xx * xx + xy * xy + xz * xz);
    xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
    m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0;
    m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
    m[12] = -(xx * auge[0] + xy * auge[1] + xz * auge[2]);
    m[13] = -(yx * auge[0] + yy * auge[1] + yz * auge[2]);
    m[14] = -(zx * auge[0] + zy * auge[1] + zz * auge[2]);
    m[15] = 1;
    return m;
  }

  function mal(o, a, b) {
    for (var i = 0; i < 4; i++) {
      var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      o[i * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      o[i * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[i * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }

  /* ---- Zustand ---------------------------------------------------------- */
  var rohren = [], segmente = 0, blend = 1, wachstum = false;
  var zustand = 'waechst', uhr = 0, dauer = 1;
  var winkel = 0.6;
  var mitte = [0, 0, 0], zielMitte = [0, 0, 0];
  var abstand = 0;                                        // Kameraradius
  var klein = [1e9, 1e9, 1e9], gross = [-1e9, -1e9, -1e9]; // Huelle aller Punkte
  var ecken = new Float32Array((MAX_SEG * 2 + 64) * 3);    // alle Knickpunkte
  var eckZahl = 0;

  function merken(p) {
    ecken[eckZahl * 3] = p[0];
    ecken[eckZahl * 3 + 1] = p[1];
    ecken[eckZahl * 3 + 2] = p[2];
    eckZahl++;
  }

  function rahmung(p, r) {
    for (var k = 0; k < 3; k++) {
      if (p[k] - r < klein[k]) klein[k] = p[k] - r;
      if (p[k] + r > gross[k]) gross[k] = p[k] + r;
      zielMitte[k] = (klein[k] + gross[k]) * 0.5;
    }
  }

  function punkt(rohr, g) {
    return [g[0] + rohr.o[0], g[1] + rohr.o[1], g[2] + rohr.o[2]];
  }

  /* neue Richtung: rechtwinklig, kein 180-Grad-Knick, im Rahmen bleibend */
  function richtungWaehlen(p, alt) {
    var liste = [], k, s, d;
    for (k = 0; k < 3; k++) {
      for (s = -1; s <= 1; s += 2) {
        d = [0, 0, 0];
        d[k] = s;
        if (d[0] === -alt[0] && d[1] === -alt[1] && d[2] === -alt[2]) continue;
        if (Math.abs(p[0] + d[0] * S) > RAHMEN) continue;
        if (Math.abs(p[1] + d[1] * S) > RAHMEN) continue;
        if (Math.abs(p[2] + d[2] * S) > RAHMEN) continue;
        liste.push(d);
      }
    }
    if (!liste.length) {                        /* Notausgang an der Rahmenecke */
      for (k = 0; k < 3; k++) {                 /* lieber hinaus als zurueck */
        for (s = -1; s <= 1; s += 2) {
          d = [0, 0, 0];
          d[k] = s;
          if (d[0] === -alt[0] && d[1] === -alt[1] && d[2] === -alt[2]) continue;
          liste.push(d);
        }
      }
    }
    if (!liste.length) return [-alt[0], -alt[1], -alt[2]];
    var aussen = Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2])) > RAHMEN * 0.62;
    if (aussen) {                               /* am Rand wieder zur Mitte biegen */
      var innen = [];
      for (k = 0; k < liste.length; k++) {
        d = liste[k];
        if (d[0] * p[0] + d[1] * p[1] + d[2] * p[2] < 0) innen.push(d);
      }
      if (innen.length) liste = innen;
    }
    return liste[(Math.random() * liste.length) | 0];
  }

  function rohrNeu(gitter, richtung, farbeNr, versatz) {
    var r = {
      p: gitter, d: richtung, fi: farbeNr, farbe: FARBEN[farbeNr],
      o: versatz || [(Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002],
      rest: 2 + ((Math.random() * 5) | 0),
      f: 0, t: T_MIN + Math.random() * (T_MAX - T_MIN)
    };
    EZ = daten; EI = fuellung;
    deckel(punkt(r, gitter), [-richtung[0], -richtung[1], -richtung[2]], r.farbe, R);
    fuellung = EI;
    merken(gitter);
    rohren.push(r);
    rahmung(gitter, R);
  }

  /* einen Schritt fertig stellen: Zylinder anhaengen, bei Biegung eine Kugel */
  function schritt(rohr) {
    var a = rohr.p;
    var b = [a[0] + rohr.d[0] * S, a[1] + rohr.d[1] * S, a[2] + rohr.d[2] * S];
    if (Math.abs(b[0]) > RAHMEN || Math.abs(b[1]) > RAHMEN || Math.abs(b[2]) > RAHMEN) {
      rohr.d = richtungWaehlen(a, rohr.d);   /* am Rand sofort umbiegen */
      rohr.rest = 2 + ((Math.random() * 5) | 0);
      rohr.biegt = true;
      b = [a[0] + rohr.d[0] * S, a[1] + rohr.d[1] * S, a[2] + rohr.d[2] * S];
    }
    EZ = daten; EI = fuellung;
    if (rohr.biegt) kugel(punkt(rohr, a), rohr.farbe, R);
    zylinder(punkt(rohr, a), punkt(rohr, b), rohr.farbe, R);
    fuellung = EI;
    merken(a); merken(b);
    rahmung(a, R);
    rahmung(b, R);
    segmente++;
    rohr.p = b;
    rohr.rest--;
    rohr.biegt = false;
    if (rohr.rest > 0) return;
    rohr.d = richtungWaehlen(b, rohr.d);       /* Biegung beschliessen */
    rohr.rest = 2 + ((Math.random() * 5) | 0);
    rohr.biegt = true;
    if (rohren.length >= MAX_ROHR || Math.random() >= 0.22) return;
    var k, moeglich = [];                      /* Zweig rechtwinklig abzweigen */
    for (k = 0; k < 3; k++) {
      if (rohr.d[k] !== 0) continue;
      var d1 = [0, 0, 0], d2 = [0, 0, 0];
      d1[k] = 1; d2[k] = -1;
      moeglich.push(d1, d2);
    }
    if (!moeglich.length) return;
    var nd = moeglich[(Math.random() * moeglich.length) | 0];
    var fn = Math.random() < 0.35 ? rohr.fi : ((Math.random() * FARBEN.length) | 0);
    rohrNeu(b, nd, fn, rohr.o);
  }

  function neu() {
    var i;
    rohren = []; segmente = 0;
    fuellung = 0; EI = 0; statVert = 0; blend = 0; eckZahl = 0;
    klein = [1e9, 1e9, 1e9]; gross = [-1e9, -1e9, -1e9];
    var achsen = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    EZ = daten;
    for (i = 0; i < 3; i++) {
      var g = [(Math.random() * 8 - 4) | 0, (Math.random() * 8 - 4) | 0, (Math.random() * 8 - 4) | 0];
      rohrNeu(g, achsen[(Math.random() * 6) | 0], (Math.random() * FARBEN.length) | 0, null);
    }
    for (i = 0; i < 3; i++) {
      mitte[i] = zielMitte[i];
    }
    abstand = 0;
    wachstum = true;
  }

  /* ---- Bild ------------------------------------------------------------- */
  var breite = 0, hoehe = 0, dpr = 1;

  function groessePruefen() {
    var w = flaeche.clientWidth || 1, h = flaeche.clientHeight || 1;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    if (w === breite && h === hoehe && d === dpr) return;
    breite = w; hoehe = h; dpr = d;
    flaeche.width = Math.round(w * d);
    flaeche.height = Math.round(h * d);
    gl.viewport(0, 0, flaeche.width, flaeche.height);
  }

  /* die wachsenden Enden, jedes Bild neu */
  function spitzenSchreiben() {
    EZ = spitze; EI = 0;
    for (var i = 0; i < rohren.length; i++) {
      var r = rohren[i];
      if (r.f <= 0) continue;
      var a = r.p;
      var b = [a[0] + r.d[0] * S * r.f, a[1] + r.d[1] * S * r.f, a[2] + r.d[2] * S * r.f];
      zylinder(punkt(r, a), punkt(r, b), r.farbe, R);
      deckel(punkt(r, b), r.d, r.farbe, R);
    }
    if (EI > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufSpitze);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, spitze.subarray(0, EI));
    }
    return EI / F;
  }

  function zeiger() {
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 36, 12);
    gl.vertexAttribPointer(aFarbe, 3, gl.FLOAT, false, 36, 24);
  }

  function zeichnen(dt) {
    var i, r;
    if (wachstum) {
      for (i = 0; i < rohren.length; i++) {
        r = rohren[i];
        r.f += dt / r.t;
        while (r.f >= 1 && segmente < MAX_SEG) { r.f -= 1; schritt(r); }
        if (r.f > 1) r.f = 1;
      }
      if (segmente >= MAX_SEG) {                /* Bild ist voll */
        wachstum = false; zustand = 'ausblenden'; uhr = 0; dauer = 2.0;
      }
    }
    if (zustand === 'ausblenden') {
      uhr += dt;
      blend = 1 - uhr / dauer;
      if (blend <= 0) { neu(); zustand = 'einblenden'; uhr = 0; dauer = 1.0; }
    } else if (zustand === 'einblenden') {
      uhr += dt;
      blend = uhr / dauer;
      if (blend >= 1) { blend = 1; zustand = 'waechst'; }
    }

    winkel += dt * 0.075;                       /* langsamer Schwenk */
    var k = 1 - Math.exp(-dt * 0.9);
    for (i = 0; i < 3; i++) mitte[i] += (zielMitte[i] - mitte[i]) * k;

    groessePruefen();
    /* Fensterhoehe 0 (Seite noch nicht sichtbar) darf die Kamera nicht vergiften */
    var asp = flaeche.height > 0 ? flaeche.width / flaeche.height : 1;
    var neigung = 0.34 + 0.13 * Math.sin(winkel * 0.63);
    var cw = Math.cos(winkel), sw = Math.sin(winkel);
    var cn = Math.cos(neigung), sn = Math.sin(neigung);
    var br = [cw * cn, sn, sw * cn];            /* Einheitsvektor Mitte -> Auge */
    var achseR = [-sw, 0, cw];                  /* waagerechte Sichtachse */
    var achseH = [-sn * cw, cn, -sn * sw];      /* senkrechte Sichtachse */
    var t2 = 1 / Math.tan(FOV / 2);            /* so skaliert auch die Projektion */
    var wunsch = 0, o0, o1, o2, zc, xr, yu, d1, d2, e;
    /* Fuer jeden Knickpunkt der Roehren den Abstand ausrechnen, bei dem er
       gerade am Bildrand liegt. Der groesste Wert haelt alles im Bild. */
    for (e = 0; e < eckZahl; e++) {
      o0 = ecken[e * 3] - mitte[0];
      o1 = ecken[e * 3 + 1] - mitte[1];
      o2 = ecken[e * 3 + 2] - mitte[2];
      zc = o0 * br[0] + o1 * br[1] + o2 * br[2];
      xr = o0 * achseR[0] + o1 * achseR[1] + o2 * achseR[2];
      yu = o0 * achseH[0] + o1 * achseH[1] + o2 * achseH[2];
      d1 = zc + (t2 / asp) * Math.abs(xr);
      d2 = zc + t2 * Math.abs(yu);
      if (d1 > wunsch) wunsch = d1;
      if (d2 > wunsch) wunsch = d2;
    }
    wunsch = wunsch * 1.02 + R * (1 + t2) + 0.4;   /* Zugabe fuer die Rohrwand */
    var groesste = 1.6;
    for (i = 0; i < 3; i++) {
      var hb = (gross[i] - klein[i]) * 0.5;
      if (hb > groesste) groesste = hb;
    }
    if (wunsch < groesste * 1.5) wunsch = groesste * 1.5;   /* nicht zu dicht heran */
    /* Weiter weg wird sofort, naeher nur langsam — so schneidet nichts ab. */
    if (wunsch > abstand) abstand = wunsch;
    else abstand += (wunsch - abstand) * k;
    auge[0] = mitte[0] + br[0] * abstand;
    auge[1] = mitte[1] + br[1] * abstand;
    auge[2] = mitte[2] + br[2] * abstand;
    perspektive(mProj, FOV, asp, 0.5, abstand * 2 + 60);
    blickrichtung(mBlick, auge, mitte, [0, 1, 0]);
    mal(mMVP, mProj, mBlick);

    var n = fuellung / F;                       /* neue feste Geometrie nachladen */
    if (n > statVert) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufStat);
      gl.bufferSubData(gl.ARRAY_BUFFER, statVert * F * 4, daten.subarray(statVert * F, fuellung));
      statVert = n;
    }
    var nSpitze = spitzenSchreiben();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVP, false, mMVP);
    augeF[0] = auge[0]; augeF[1] = auge[1]; augeF[2] = auge[2];
    gl.uniform3fv(uAuge, augeF);
    gl.uniform1f(uBlend, blend);
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aNor);
    gl.enableVertexAttribArray(aFarbe);
    if (statVert > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufStat);
      zeiger();
      gl.drawArrays(gl.TRIANGLES, 0, statVert);
    }
    if (nSpitze > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufSpitze);
      zeiger();
      gl.drawArrays(gl.TRIANGLES, 0, nSpitze);
    }
  }

  /* ---- Zeitgeber -------------------------------------------------------- */
  var letzte = 0;

  function takt(jetzt) {
    var dt = letzte ? (jetzt - letzte) / 1000 : 1 / 60;
    letzte = jetzt;
    if (!(dt > 0)) dt = 1 / 60;
    if (dt > 0.05) dt = 0.05;
    zeichnen(dt);
    window.requestAnimationFrame(takt);
  }

  /* ein Tipp oder Klick setzt neu an */
  function neuanfang() {
    if (zustand !== 'waechst') return;
    wachstum = false;
    zustand = 'ausblenden';
    uhr = 0;
    dauer = 0.55;
  }

  /* Auskunft fuer die Pruefung */
  window.roehrenStand = function () {
    return { segmente: segmente, rohren: rohren.length, farben: FARBEN.length,
      blend: Math.round(blend * 1000) / 1000, zustand: zustand, wachstum: wachstum,
      huelle: { min: klein.slice(), max: gross.slice() }, auge: auge.slice(), mitte: mitte.slice() };
  };

  if (aufbauen()) {
    neu();
    zustand = 'waechst';
    blend = 1;
    document.addEventListener('pointerdown', neuanfang, false);
    window.requestAnimationFrame(takt);
  }
})();
