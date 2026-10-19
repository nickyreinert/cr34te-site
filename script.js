/* Jack-in-the-Box — 3D, ohne Bibliothek.
 *
 * Eigener WebGL-1-Renderer. Alle Koerper werden hier gerechnet:
 * Quader, Zylinder, Kegel, Kugeln, ein Rohr auf der Kugel (Mund) und ein Rohr
 * entlang einer Schraubenlinie (Feder). Keine Textur, keine Bilddatei.
 * Farbe kommt je Scheitelpunkt, das Licht rechnet der Fragment-Shader in Stufen.
 *
 * Bedienung: Tippen / Leertaste / Eingabetaste zieht auf und laesst die Figur
 * herausspringen; ein zweites Tippen faehrt alles wieder ein.
 *
 * Fuer pruefbare Aufnahmen liest die Seite ?springen=1&zeit=<sekunden>
 * (siehe DOKU.md, Abschnitt "Pruefbare Ansicht").
 */
(function () {
  'use strict';

  var canvas = document.getElementById('buehne');
  var hinweis = document.getElementById('hinweis');

  /* --------------------------------------------------------------- Matrizen -- */
  /* Spaltenweise gespeichert, wie WebGL es erwartet. */

  function einheit() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  function mal(a, b) {
    var o = new Float32Array(16), r, c, k, s;
    for (c = 0; c < 4; c++) {
      for (r = 0; r < 4; r++) {
        s = 0;
        for (k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    }
    return o;
  }

  function schiebe(x, y, z) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  }

  function drehX(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  }

  function drehY(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  }

  function drehZ(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  function skaliere(x, y, z) {
    return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
  }

  function perspektive(winkel, seiten, nah, fern) {
    var f = 1 / Math.tan(winkel / 2), nf = 1 / (nah - fern);
    return new Float32Array([
      f / seiten, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (fern + nah) * nf, -1,
      0, 0, 2 * fern * nah * nf, 0
    ]);
  }

  function blick(augen, ziel, oben) {
    var zx = augen[0] - ziel[0], zy = augen[1] - ziel[1], zz = augen[2] - ziel[2];
    var l = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1;
    zx /= l; zy /= l; zz /= l;
    var xx = oben[1] * zz - oben[2] * zy, xy = oben[2] * zx - oben[0] * zz, xz = oben[0] * zy - oben[1] * zx;
    l = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
    xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * augen[0] + xy * augen[1] + xz * augen[2]),
      -(yx * augen[0] + yy * augen[1] + yz * augen[2]),
      -(zx * augen[0] + zy * augen[1] + zz * augen[2]),
      1
    ]);
  }

  /* Inverse Transponierte der oberen 3x3 — noetig, weil die Figur beim
     Zusammendruecken ungleich skaliert wird. */
  function normalenMatrix(m) {
    var a00 = m[0], a10 = m[1], a20 = m[2],
        a01 = m[4], a11 = m[5], a21 = m[6],
        a02 = m[8], a12 = m[9], a22 = m[10];
    var c00 = a11 * a22 - a12 * a21,
        c01 = -(a10 * a22 - a12 * a20),
        c02 = a10 * a21 - a11 * a20,
        c10 = -(a01 * a22 - a02 * a21),
        c11 = a00 * a22 - a02 * a20,
        c12 = -(a00 * a21 - a01 * a20),
        c20 = a01 * a12 - a02 * a11,
        c21 = -(a00 * a12 - a02 * a10),
        c22 = a00 * a11 - a01 * a10;
    var det = a00 * c00 + a01 * c01 + a02 * c02;
    if (Math.abs(det) < 1e-9) det = 1e-9;
    det = 1 / det;
    return new Float32Array([
      c00 * det, c10 * det, c20 * det,
      c01 * det, c11 * det, c21 * det,
      c02 * det, c12 * det, c22 * det
    ]);
  }

  /* -------------------------------------------------------------- Geometrie -- */

  function Geo() { this.p = []; this.n = []; this.c = []; }

  Geo.prototype.dreieck = function (a, b, c, na, nb, nc, f) {
    var p = this.p, n = this.n, o = this.c;
    p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    n.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
    o.push(f[0], f[1], f[2], f[3], f[0], f[1], f[2], f[3], f[0], f[1], f[2], f[3]);
  };

  Geo.prototype.viereck = function (a, b, c, d, nrm, f) {
    this.dreieck(a, b, c, nrm, nrm, nrm, f);
    this.dreieck(a, c, d, nrm, nrm, nrm, f);
  };

  /* Viereck mit vier eigenen Normalen (Rohrkrümmung). */
  Geo.prototype.viereckN = function (a, b, c, d, na, nb, nc, nd, f) {
    this.dreieck(a, b, c, na, nb, nc, f);
    this.dreieck(a, c, d, na, nc, nd, f);
  };

  /* Haengt eine fertige Geometrie an eine andere an. */
  Geo.prototype.anhaengen = function (g) {
    var i;
    for (i = 0; i < g.p.length; i++) this.p.push(g.p[i]);
    for (i = 0; i < g.n.length; i++) this.n.push(g.n[i]);
    for (i = 0; i < g.c.length; i++) this.c.push(g.c[i]);
  };

  function farbe(r, g, b, a) { return [r, g, b, a === undefined ? 1 : a]; }

  function norm(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  /* Quader zwischen zwei Eckpunkten. */
  function quader(g, x0, x1, y0, y1, z0, z1, f, fOben) {
    var o = fOben || f;
    g.viereck([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], f);
    g.viereck([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], f);
    g.viereck([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], f);
    g.viereck([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], f);
    g.viereck([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], o);
    g.viereck([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], f);
  }

  /* Zylinder/Kegel von y0 nach y1. r0 unten, r1 oben. */
  function zylinder(g, y0, y1, r0, r1, segmente, f, deckelOben, deckelUnten) {
    var i, a0, a1, x0, z0, x1, z1, i0, n0, n1, stufe;
    stufe = (r0 - r1) / ((y1 - y0) || 1);
    for (i = 0; i < segmente; i++) {
      a0 = i / segmente * Math.PI * 2;
      a1 = (i + 1) / segmente * Math.PI * 2;
      x0 = Math.cos(a0); z0 = Math.sin(a0);
      x1 = Math.cos(a1); z1 = Math.sin(a1);
      n0 = norm([x0, stufe, z0]);
      n1 = norm([x1, stufe, z1]);
      g.dreieck([r0 * x0, y0, r0 * z0], [r0 * x1, y0, r0 * z1], [r1 * x1, y1, r1 * z1], n0, n1, n1, f);
      g.dreieck([r0 * x0, y0, r0 * z0], [r1 * x1, y1, r1 * z1], [r1 * x0, y1, r1 * z0], n0, n1, n0, f);
    }
    if (deckelOben) {
      i0 = [0, 1, 0];
      for (i = 0; i < segmente; i++) {
        a0 = i / segmente * Math.PI * 2;
        a1 = (i + 1) / segmente * Math.PI * 2;
        g.dreieck([0, y1, 0],
          [r1 * Math.cos(a0), y1, r1 * Math.sin(a0)],
          [r1 * Math.cos(a1), y1, r1 * Math.sin(a1)], i0, i0, i0, deckelOben);
      }
    }
    if (deckelUnten) {
      i0 = [0, -1, 0];
      for (i = 0; i < segmente; i++) {
        a0 = i / segmente * Math.PI * 2;
        a1 = (i + 1) / segmente * Math.PI * 2;
        g.dreieck([0, y0, 0],
          [r0 * Math.cos(a1), y0, r0 * Math.sin(a1)],
          [r0 * Math.cos(a0), y0, r0 * Math.sin(a0)], i0, i0, i0, deckelUnten);
      }
    }
  }

  /* Flache Scheibe, Normalen nach -Y (Unterseite). */
  function scheibeUnten(g, r, y, segmente, f) {
    var i, a0, a1, i0 = [0, -1, 0];
    for (i = 0; i < segmente; i++) {
      a0 = i / segmente * Math.PI * 2;
      a1 = (i + 1) / segmente * Math.PI * 2;
      g.dreieck([0, y, 0],
        [r * Math.cos(a1), y, r * Math.sin(a1)],
        [r * Math.cos(a0), y, r * Math.sin(a0)], i0, i0, i0, f);
    }
  }

  /* Zylinder von y nach x umlegen: Achse zeigt danach nach +X. */
  function achseX(g) {
    var i, h;
    for (i = 0; i < g.p.length; i += 3) {
      h = g.p[i]; g.p[i] = g.p[i + 1]; g.p[i + 1] = h;
    }
    for (i = 0; i < g.n.length; i += 3) {
      h = g.n[i]; g.n[i] = g.n[i + 1]; g.n[i + 1] = h;
    }
    return g;
  }

  /* Ellipsoid um den Ursprung. */
  function kugel(g, rx, ry, rz, segmente, ringe, f) {
    var i, j, u0, u1, v0, v1, a, b, c, d;
    function p(u, v) {
      return [rx * Math.cos(v) * Math.cos(u), ry * Math.sin(v), rz * Math.cos(v) * Math.sin(u)];
    }
    function nn(u, v) {
      return norm([
        Math.cos(v) * Math.cos(u) / (rx || 1),
        Math.sin(v) / (ry || 1),
        Math.cos(v) * Math.sin(u) / (rz || 1)
      ]);
    }
    for (j = 0; j < ringe; j++) {
      v0 = j / ringe * Math.PI - Math.PI / 2;
      v1 = (j + 1) / ringe * Math.PI - Math.PI / 2;
      for (i = 0; i < segmente; i++) {
        u0 = i / segmente * Math.PI * 2;
        u1 = (i + 1) / segmente * Math.PI * 2;
        a = p(u0, v0); b = p(u1, v0); c = p(u1, v1); d = p(u0, v1);
        g.dreieck(a, b, c, nn(u0, v0), nn(u1, v0), nn(u1, v1), f);
        g.dreieck(a, c, d, nn(u0, v0), nn(u1, v1), nn(u0, v1), f);
      }
    }
  }

  /* Rohr entlang eines Bogens, der auf einer Kugel liegt — der Mund. */
  function bogenAufKugel(g, kugelR, bogenR, mitteY, staerke, von, bis, schritte, ringe, f) {
    var i, j, w0, w1, u0, u1, f0, f1, a0, a1, b0, b1, na0, na1, nb0, nb1, ecken, k;

    function punkt(w) {
      var px = bogenR * Math.sin(w);
      var py = mitteY - bogenR * Math.cos(w) * 0.92;
      var pz = Math.sqrt(Math.max(0.0004, kugelR * kugelR - px * px - py * py));
      return [px, py, pz];
    }
    function rahmen(w) {
      var c = punkt(w);
      var vor = punkt(w + 0.004), zur = punkt(w - 0.004);
      var t = norm([vor[0] - zur[0], vor[1] - zur[1], vor[2] - zur[2]]);
      var n1 = norm(c);
      var n2 = norm([t[1] * n1[2] - t[2] * n1[1], t[2] * n1[0] - t[0] * n1[2], t[0] * n1[1] - t[1] * n1[0]]);
      return { c: c, n1: n1, n2: n2 };
    }
    function rp(fr, w) {
      var cc = Math.cos(w) * staerke, ss = Math.sin(w) * staerke;
      return [fr.c[0] + fr.n1[0] * cc + fr.n2[0] * ss,
              fr.c[1] + fr.n1[1] * cc + fr.n2[1] * ss,
              fr.c[2] + fr.n1[2] * cc + fr.n2[2] * ss];
    }
    function rn(fr, w) {
      var cc = Math.cos(w), ss = Math.sin(w);
      return [fr.n1[0] * cc + fr.n2[0] * ss, fr.n1[1] * cc + fr.n2[1] * ss, fr.n1[2] * cc + fr.n2[2] * ss];
    }

    for (i = 0; i < schritte; i++) {
      u0 = von + (bis - von) * (i / schritte);
      u1 = von + (bis - von) * ((i + 1) / schritte);
      f0 = rahmen(u0);
      f1 = rahmen(u1);
      for (j = 0; j < ringe; j++) {
        w0 = j / ringe * Math.PI * 2;
        w1 = (j + 1) / ringe * Math.PI * 2;
        a0 = rp(f0, w0); a1 = rp(f0, w1);
        b0 = rp(f1, w0); b1 = rp(f1, w1);
        na0 = rn(f0, w0); na1 = rn(f0, w1);
        nb0 = rn(f1, w0); nb1 = rn(f1, w1);
        g.viereckN(a0, a1, b1, b0, na0, na1, nb1, nb0, f);
      }
    }
  }

  /* ------------------------------------------------------------- Shaderquellen -- */

  var VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNrm;',
    'attribute vec4 aCol;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'uniform mat4 uModel;',
    'uniform mat3 uNrmMat;',
    'varying vec3 vN;',
    'varying vec4 vC;',
    'varying vec3 vW;',
    'void main() {',
    '  vec4 w = uModel * vec4(aPos, 1.0);',
    '  vW = w.xyz;',
    '  vN = uNrmMat * aNrm;',
    '  vC = aCol;',
    '  gl_Position = uProj * uView * w;',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'varying vec3 vN;',
    'varying vec4 vC;',
    'varying vec3 vW;',
    'uniform vec3 uAuge;',
    'void main() {',
    '  vec3 n = normalize(vN);',
    '  vec3 v = normalize(uAuge - vW);',
    '  vec3 l1 = normalize(vec3(-0.42, 0.86, 0.62));',
    '  vec3 l2 = normalize(vec3(0.78, 0.18, 0.55));',
    '  float d1 = max(dot(n, l1), 0.0);',
    '  float d2 = max(dot(n, l2), 0.0);',
    // drei Stufen statt Verlauf: flaechiger Comic-Look
    '  float s1 = floor(d1 * 3.0 + 0.18) / 3.0;',
    '  float s2 = floor(d2 * 2.0 + 0.05) / 2.0;',
    '  float licht = 0.56 + 0.40 * s1 + 0.14 * s2;',
    '  float kante = pow(1.0 - max(dot(n, v), 0.0), 2.4);',
    '  vec3 f = vC.rgb * licht + vec3(0.86, 0.94, 1.0) * kante * 0.20;',
    '  gl_FragColor = vec4(clamp(f, 0.0, 1.0), vC.a);',
    '}'
  ].join('\n');

  /* --------------------------------------------------------------- WebGL-Aufbau -- */

  var gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false, depth: true })
      || canvas.getContext('experimental-webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  } catch (e) { gl = null; }

  if (!gl) {
    hinweis.hidden = false;
    return;
  }

  function shader(typ, quelle) {
    var s = gl.createShader(typ);
    gl.shaderSource(s, quelle);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'Shader');
    return s;
  }

  var programm;
  try {
    programm = gl.createProgram();
    gl.attachShader(programm, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(programm, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(programm);
    if (!gl.getProgramParameter(programm, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programm) || 'Programm');
  } catch (fehler) {
    hinweis.hidden = false;
    return;
  }
  gl.useProgram(programm);

  var ort = {
    aPos: gl.getAttribLocation(programm, 'aPos'),
    aNrm: gl.getAttribLocation(programm, 'aNrm'),
    aCol: gl.getAttribLocation(programm, 'aCol'),
    uProj: gl.getUniformLocation(programm, 'uProj'),
    uView: gl.getUniformLocation(programm, 'uView'),
    uModel: gl.getUniformLocation(programm, 'uModel'),
    uNrmMat: gl.getUniformLocation(programm, 'uNrmMat'),
    uAuge: gl.getUniformLocation(programm, 'uAuge')
  };

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  function Mesh(geo) {
    this.anzahl = geo.p.length / 3;
    this.pufferP = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pufferP);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.p), gl.STATIC_DRAW);
    this.pufferN = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pufferN);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.n), gl.STATIC_DRAW);
    this.pufferC = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pufferC);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.c), gl.STATIC_DRAW);
  }

  function binde(m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pufferP);
    gl.enableVertexAttribArray(ort.aPos);
    gl.vertexAttribPointer(ort.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pufferN);
    gl.enableVertexAttribArray(ort.aNrm);
    gl.vertexAttribPointer(ort.aNrm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pufferC);
    gl.enableVertexAttribArray(ort.aCol);
    gl.vertexAttribPointer(ort.aCol, 4, gl.FLOAT, false, 0, 0);
  }

  /* --------------------------------------------------------------- Farben -- */

  var ROT      = farbe(0.85, 0.20, 0.16);
  var GELB     = farbe(0.99, 0.76, 0.20);
  var PETROL   = farbe(0.10, 0.55, 0.62);
  var DUNKEL   = farbe(0.19, 0.06, 0.09);
  var GOLD     = farbe(0.98, 0.78, 0.30);
  var STAHL    = farbe(0.66, 0.83, 0.94);
  var STAHL2   = farbe(0.80, 0.91, 0.98);
  var HAUT     = farbe(1.00, 0.84, 0.54);
  var GRUEN    = farbe(0.16, 0.66, 0.40);
  var LILA     = farbe(0.52, 0.22, 0.70);
  var LILAHELL = farbe(0.74, 0.38, 0.88);
  var WEISS    = farbe(1.00, 1.00, 1.00);
  var SCHWARZ  = farbe(0.07, 0.05, 0.09);
  var NASEROT  = farbe(0.92, 0.20, 0.22);
  var MUND     = farbe(0.32, 0.05, 0.11);
  var ZUNGE    = farbe(0.95, 0.32, 0.44);
  var WANGE    = farbe(0.98, 0.50, 0.50);

  /* ---------------------------------------------------------------- Szene -- */

  var KB = 0.75;          // halbe Kantenlaenge des Kastens
  var KH = 1.05;          // Oberkante des Kastens
  var FIGUR_RUHE = 1.72;  // Fuss der Figur im ausgefahrenen Zustand
  var FIGUR_ZU = 0.14;    // Fuss der Figur im Kasten
  var QUETSCH_ZU = 0.40;  // Stauchung im Kasten
  var FEDER_FUSS = 0.14;

  /* --- Kasten --- */
  var gKasten = new Geo();
  (function () {
    var xs = [-0.45, 0, 0.45], i;
    quader(gKasten, -KB, KB, 0, KH, -KB, KB, ROT);
    // Mittelband rundum, leicht vorstehend
    quader(gKasten, -KB - 0.012, KB + 0.012, 0.42, 0.68, -KB - 0.012, KB + 0.012, PETROL);
    // gelbe Streifen vorn und hinten
    for (i = 0; i < 3; i++) {
      quader(gKasten, xs[i] - 0.075, xs[i] + 0.075, 0.04, 1.00, KB, KB + 0.026, GELB);
      quader(gKasten, xs[i] - 0.075, xs[i] + 0.075, 0.04, 1.00, -KB - 0.026, -KB, GELB);
    }
    // Streifen auf den Seiten
    for (i = 0; i < 3; i++) {
      quader(gKasten, KB, KB + 0.026, 0.04, 1.00, xs[i] - 0.075, xs[i] + 0.075, GELB);
      quader(gKasten, -KB - 0.026, -KB, 0.04, 1.00, xs[i] - 0.075, xs[i] + 0.075, GELB);
    }
    // Eckpfosten
    var e = 0.085;
    quader(gKasten, -KB - 0.02, -KB + e, 0, KH, KB - e, KB + 0.02, PETROL);
    quader(gKasten, KB - e, KB + 0.02, 0, KH, KB - e, KB + 0.02, PETROL);
    quader(gKasten, -KB - 0.02, -KB + e, 0, KH, -KB - 0.02, -KB + e, PETROL);
    quader(gKasten, KB - e, KB + 0.02, 0, KH, -KB - 0.02, -KB + e, PETROL);
    // Deckflaeche dunkel, darum ein flacher goldener Rahmen (liegt auf, steht nicht ab)
    quader(gKasten, -KB + 0.055, KB - 0.055, KH, KH + 0.004, -KB + 0.055, KB - 0.055, DUNKEL);
    quader(gKasten, -KB + 0.004, KB - 0.004, KH + 0.004, KH + 0.016, -KB + 0.004, -KB + 0.055, GOLD);
    quader(gKasten, -KB + 0.004, KB - 0.004, KH + 0.004, KH + 0.016, KB - 0.055, KB - 0.004, GOLD);
    quader(gKasten, -KB + 0.004, -KB + 0.055, KH + 0.004, KH + 0.016, -KB + 0.055, KB - 0.055, GOLD);
    quader(gKasten, KB - 0.055, KB - 0.004, KH + 0.004, KH + 0.016, -KB + 0.055, KB - 0.055, GOLD);
  })();
  var mKasten = new Mesh(gKasten);

  /* --- Deckel: Ursprung an der Scharnierkante (z = -KB, y = KH) ---
     Die Unterseite bekommt ein Muster, weil sie beim Aufklappen zu sehen ist. */
  var gDeckel = new Geo();
  (function () {
    var xs = [-0.45, 0, 0.45], i;
    quader(gDeckel, -KB, KB, 0, 0.13, 0, KB * 2, GELB);
    quader(gDeckel, -KB - 0.012, KB + 0.012, 0.13, 0.155, KB * 0.72, KB * 1.28, ROT);
    for (i = 0; i < 3; i++) {
      quader(gDeckel, xs[i] - 0.075, xs[i] + 0.075, 0.13, 0.148, 0.10, KB * 2 - 0.10, PETROL);
    }
    // Unterseite: rotes Feld mit goldenem Ring und dunklem Kern, in der Mitte
    scheibeUnten(gDeckel, 0.62, -0.004, 30, ROT);
    scheibeUnten(gDeckel, 0.44, -0.008, 30, GOLD);
    scheibeUnten(gDeckel, 0.26, -0.012, 26, DUNKEL);
    // Griff: kurzer Zylinder auf der Deckelmitte, nach vorn versetzt
    var griff = new Geo();
    zylinder(griff, 0.148, 0.205, 0.085, 0.075, 14, GOLD, GOLD, null);
    var k;
    for (k = 0; k < griff.p.length; k += 3) griff.p[k + 2] += KB * 1.42;
    gDeckel.anhaengen(griff);
  })();
  /* Die Unterseitenringe sitzen am Scharnier (Ursprung). Sie gehoeren in die
     Deckelmitte, also um KB nach vorn. */
  (function () {
    var i;
    for (i = 0; i < gDeckel.p.length; i += 3) {
      if (gDeckel.p[i + 1] < 0) gDeckel.p[i + 2] += KB;
    }
  })();
  var mDeckel = new Mesh(gDeckel);

  /* --- Kurbel: Ursprung am Achsaustritt (x = KB, y = 0.34, z = 0.26), Achse nach +X --- */
  var gKurbel = new Geo();
  (function () {
    var achse = new Geo(), nabe = new Geo();
    zylinder(achse, 0, 0.20, 0.048, 0.048, 14, farbe(0.55, 0.56, 0.60), null, null);
    gKurbel.anhaengen(achseX(achse));

    zylinder(nabe, 0.16, 0.225, 0.145, 0.145, 18, ROT, GOLD, null);
    gKurbel.anhaengen(achseX(nabe));

    // Arm vom Nabenmittelpunkt nach oben
    quader(gKurbel, 0.19, 0.255, -0.03, 0.34, -0.045, 0.045, GELB);

    // Griff am Armende, Achse nach +X
    var griff = new Geo(), i;
    zylinder(griff, 0.10, 0.34, 0.055, 0.055, 12, PETROL, PETROL, PETROL);
    achseX(griff);
    for (i = 0; i < griff.p.length; i += 3) griff.p[i + 1] += 0.34;
    gKurbel.anhaengen(griff);
  })();
  var mKurbel = new Mesh(gKurbel);

  /* --- Figur --- */
  var gKoerper = new Geo();
  kugel(gKoerper, 0.25, 0.27, 0.23, 22, 14, GRUEN);
  zylinder(gKoerper, 0.40, 0.46, 0.20, 0.185, 18, GOLD, GOLD, null);
  var mKoerper = new Mesh(gKoerper);

  var gKopf = new Geo();
  kugel(gKopf, 0.43, 0.41, 0.41, 30, 20, HAUT);
  var mKopf = new Mesh(gKopf);

  var gAuge = new Geo();
  kugel(gAuge, 0.148, 0.148, 0.148, 18, 12, WEISS);
  var mAug = new Mesh(gAuge);

  var gPupille = new Geo();
  kugel(gPupille, 0.062, 0.062, 0.062, 14, 10, SCHWARZ);
  var mPupille = new Mesh(gPupille);

  var gBraue = new Geo();
  quader(gBraue, -0.085, 0.085, -0.018, 0.018, -0.016, 0.016, SCHWARZ);
  var mBraue = new Mesh(gBraue);

  var gNase = new Geo();
  kugel(gNase, 0.078, 0.072, 0.075, 16, 12, NASEROT);
  var mNase = new Mesh(gNase);

  var gWange = new Geo();
  kugel(gWange, 0.088, 0.066, 0.045, 14, 10, WANGE);
  var mWange = new Mesh(gWange);

  var gOhr = new Geo();
  kugel(gOhr, 0.075, 0.085, 0.05, 14, 10, HAUT);
  var mOhr = new Mesh(gOhr);

  var gMund = new Geo();
  bogenAufKugel(gMund, 0.430, 0.245, -0.108, 0.043, -1.16, 1.16, 28, 9, MUND);
  var mMund = new Mesh(gMund);

  var gZahn = new Geo();
  quader(gZahn, -0.075, 0.075, -0.035, 0.035, -0.022, 0.022, WEISS);
  var mZahn = new Mesh(gZahn);

  var gZunge = new Geo();
  kugel(gZunge, 0.085, 0.048, 0.035, 14, 10, ZUNGE);
  var mZunge = new Mesh(gZunge);

  /* Hut: Krempe, Kegel mit Streifen, drei Zipfel mit Glocken */
  var gHut = new Geo();
  (function () {
    var i, a0, a1, n = 12, r0 = 0.40, r1 = 0.155, y0 = 0.235, y1 = 0.62;
    zylinder(gHut, 0.19, 0.235, 0.415, 0.415, 24, GOLD, GOLD, null);
    var stufe = (r0 - r1) / (y1 - y0);
    for (i = 0; i < n; i++) {
      a0 = i / n * Math.PI * 2;
      a1 = (i + 1) / n * Math.PI * 2;
      var f = (i % 2 === 0) ? LILA : LILAHELL;
      var x0 = Math.cos(a0), z0 = Math.sin(a0), x1 = Math.cos(a1), z1 = Math.sin(a1);
      var n0 = norm([x0, stufe, z0]), n1 = norm([x1, stufe, z1]);
      gHut.dreieck([r0 * x0, y0, r0 * z0], [r0 * x1, y0, r0 * z1], [r1 * x1, y1, r1 * z1], n0, n1, n1, f);
      gHut.dreieck([r0 * x0, y0, r0 * z0], [r1 * x1, y1, r1 * z1], [r1 * x0, y1, r1 * z0], n0, n1, n0, f);
    }
    zylinder(gHut, 0.615, 0.625, 0.155, 0.13, 14, LILA, LILA, null);
  })();
  var mHut = new Mesh(gHut);

  var gZipfel = new Geo();
  zylinder(gZipfel, 0, 0.46, 0.105, 0.012, 14, LILAHELL, null, null);
  var mZipfel = new Mesh(gZipfel);

  var gGlocke = new Geo();
  kugel(gGlocke, 0.082, 0.082, 0.082, 16, 12, GOLD);
  zylinder(gGlocke, -0.10, -0.06, 0.045, 0.055, 12, farbe(0.80, 0.60, 0.20), null, null);
  kugel(gGlocke, 0.026, 0.026, 0.026, 10, 8, farbe(0.70, 0.52, 0.16));
  var mGlocke = new Mesh(gGlocke);

  /* Arm: Ursprung an der Schulter, zeigt nach unten (-Y). */
  var gArm = new Geo();
  (function () {
    var i;
    zylinder(gArm, -0.24, 0, 0.052, 0.058, 12, HAUT, null, null);
    var hand = new Geo();
    kugel(hand, 0.085, 0.085, 0.085, 14, 10, HAUT);
    for (i = 0; i < hand.p.length; i += 3) hand.p[i + 1] -= 0.265;
    gArm.anhaengen(hand);
  })();
  var mArm = new Mesh(gArm);

  /* Schatten: flache Scheibe mit weichem Rand, Deckkraft je Scheitelpunkt. */
  var gSchatten = new Geo();
  (function () {
    var i, j, n = 40, ringe = [[0.00, 0.30], [0.45, 0.20], [0.75, 0.09], [1.00, 0.0]];
    var oben = [0, 1, 0];
    for (i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      for (j = 0; j < ringe.length - 1; j++) {
        var r0 = ringe[j][0], r1 = ringe[j + 1][0];
        var f0 = farbe(0.13, 0.24, 0.23, ringe[j][1]);
        var p0 = [Math.cos(a0) * r0, 0, Math.sin(a0) * r0];
        var p1 = [Math.cos(a1) * r0, 0, Math.sin(a1) * r0];
        var p2 = [Math.cos(a1) * r1, 0, Math.sin(a1) * r1];
        var p3 = [Math.cos(a0) * r1, 0, Math.sin(a0) * r1];
        gSchatten.dreieck(p0, p1, p2, oben, oben, oben, f0);
        gSchatten.dreieck(p0, p2, p3, oben, oben, oben, f0);
      }
    }
  })();
  var mSchatten = new Mesh(gSchatten);

  /* --- Feder: wird bei jeder Aenderung der Hoehe neu gerechnet --- */
  var FED_N = 150, FED_M = 8, FED_WINDUNGEN = 4.0, FED_R = 0.245, FED_ROHR = 0.052;
  var FED_ECKEN = FED_N * FED_M * 6;
  var federP = new Float32Array(FED_ECKEN * 3);
  var federN = new Float32Array(FED_ECKEN * 3);
  var federC = new Float32Array(FED_ECKEN * 4);
  (function () {
    var i, j;
    for (i = 0; i < FED_ECKEN; i++) {
      var f = (Math.floor(i / 6) % 22 < 11) ? STAHL : STAHL2;
      for (j = 0; j < 4; j++) federC[i * 4 + j] = f[j];
    }
  })();
  var pufferFederP = gl.createBuffer();
  var pufferFederN = gl.createBuffer();
  var pufferFederC = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pufferFederC);
  gl.bufferData(gl.ARRAY_BUFFER, federC, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, pufferFederP);
  gl.bufferData(gl.ARRAY_BUFFER, federP.byteLength, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, pufferFederN);
  gl.bufferData(gl.ARRAY_BUFFER, federN.byteLength, gl.DYNAMIC_DRAW);
  var mFeder = { pufferP: pufferFederP, pufferN: pufferFederN, pufferC: pufferFederC, anzahl: FED_ECKEN };

  var federHoehe = -1;

  function federBauen(hoehe) {
    if (Math.abs(hoehe - federHoehe) < 0.0006) return;
    federHoehe = hoehe;
    var p = federP, n = federN;
    var i, j, k, idx = 0, nidx = 0;
    var umlauf = FED_WINDUNGEN * Math.PI * 2;
    var R = FED_R, r = FED_ROHR;

    function punkt(u) {
      var a = u * umlauf;
      return [R * Math.cos(a), hoehe * u, R * Math.sin(a)];
    }
    function rahmen(u) {
      var a = u * umlauf;
      var c = punkt(u);
      var vor = punkt(Math.min(1, u + 0.0015));
      var zur = punkt(Math.max(0, u - 0.0015));
      var t = norm([vor[0] - zur[0], vor[1] - zur[1], vor[2] - zur[2]]);
      var radial = [Math.cos(a), 0, Math.sin(a)];
      var d = radial[0] * t[0] + radial[1] * t[1] + radial[2] * t[2];
      var n1 = norm([radial[0] - t[0] * d, radial[1] - t[1] * d, radial[2] - t[2] * d]);
      var n2 = norm([t[1] * n1[2] - t[2] * n1[1], t[2] * n1[0] - t[0] * n1[2], t[0] * n1[1] - t[1] * n1[0]]);
      return { c: c, n1: n1, n2: n2 };
    }
    function rp(fr, w) {
      var cc = Math.cos(w) * r, ss = Math.sin(w) * r;
      return [fr.c[0] + fr.n1[0] * cc + fr.n2[0] * ss,
              fr.c[1] + fr.n1[1] * cc + fr.n2[1] * ss,
              fr.c[2] + fr.n1[2] * cc + fr.n2[2] * ss];
    }
    function rn(fr, w) {
      var cc = Math.cos(w), ss = Math.sin(w);
      return [fr.n1[0] * cc + fr.n2[0] * ss, fr.n1[1] * cc + fr.n2[1] * ss, fr.n1[2] * cc + fr.n2[2] * ss];
    }

    for (i = 0; i < FED_N; i++) {
      var f0 = rahmen(i / FED_N), f1 = rahmen((i + 1) / FED_N);
      for (j = 0; j < FED_M; j++) {
        var w0 = j / FED_M * Math.PI * 2, w1 = (j + 1) / FED_M * Math.PI * 2;
        var a0 = rp(f0, w0), a1 = rp(f0, w1);
        var b0 = rp(f1, w0), b1 = rp(f1, w1);
        var na0 = rn(f0, w0), na1 = rn(f0, w1);
        var nb0 = rn(f1, w0), nb1 = rn(f1, w1);
        var ecken = [[a0, na0], [a1, na1], [b1, nb1], [a0, na0], [b1, nb1], [b0, nb0]];
        for (k = 0; k < 6; k++) {
          p[idx] = ecken[k][0][0];
          p[idx + 1] = ecken[k][0][1] + FEDER_FUSS;
          p[idx + 2] = ecken[k][0][2];
          n[nidx] = ecken[k][1][0];
          n[nidx + 1] = ecken[k][1][1];
          n[nidx + 2] = ecken[k][1][2];
          idx += 3; nidx += 3;
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, pufferFederP);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, p);
    gl.bindBuffer(gl.ARRAY_BUFFER, pufferFederN);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, n);
  }

  /* -------------------------------------------------------------- Ton -- */

  var AC = null, MEISTER = null;

  /* Eine Kette fuer den laufenden Ton und fuer die Messung: Pegel, dann ein
     Begrenzer, damit Knall und Boing zusammen nicht uebersteuern. */
  function kette(ctx) {
    var g = ctx.createGain();
    g.gain.value = 0.50;
    var begrenzer = ctx.createDynamicsCompressor();
    begrenzer.threshold.value = -10;
    begrenzer.knee.value = 8;
    begrenzer.ratio.value = 12;
    begrenzer.attack.value = 0.002;
    begrenzer.release.value = 0.12;
    g.connect(begrenzer);
    begrenzer.connect(ctx.destination);
    return g;
  }

  function tonWecken() {
    if (!AC) {
      try {
        var C = window.AudioContext || window.webkitAudioContext;
        if (C) {
          AC = new C();
          MEISTER = kette(AC);
        }
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') {
      try { AC.resume(); } catch (e) { /* ohne Ton weiter */ }
    }
  }

  function note(ctx, ziel, start, dauer, midi, laut) {
    var f = 440 * Math.pow(2, (midi - 69) / 12);
    var g = ctx.createGain();
    g.connect(ziel);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(laut, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dauer);
    g.gain.linearRampToValueAtTime(0, start + dauer + 0.012);
    var o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(f, start);
    o1.connect(g);
    var o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.setValueAtTime(f * 2.002, start);
    var g2 = ctx.createGain();
    g2.gain.value = 0.11;
    o2.connect(g2);
    g2.connect(g);
    o1.start(start); o2.start(start);
    o1.stop(start + dauer + 0.03); o2.stop(start + dauer + 0.03);
  }

  function melodie(start) {
    if (!AC) return;
    // "Pop Goes the Weasel", erste Phrase und Schluss, in 1,16 s gepresst
    var noten = [67, 67, 69, 69, 71, 71, 69, 74, 71, 67];
    var schritt = 1.16 / noten.length;
    var i;
    for (i = 0; i < noten.length; i++) {
      note(AC, MEISTER, start + i * schritt, schritt * 0.86, noten[i], i === noten.length - 1 ? 0.26 : 0.19);
    }
  }

  function knall(ctx, ziel, start) {
    var sr = ctx.sampleRate;
    var laenge = Math.floor(sr * 0.5);
    var puffer = ctx.createBuffer(1, laenge, sr);
    var d = puffer.getChannelData(0);
    var i, t, huelle, rest;
    for (i = 0; i < laenge; i++) {
      t = i / sr;
      huelle = Math.min(1, t / 0.0015) * Math.exp(-t * 10.5);
      rest = t < 0.34 ? 1 : Math.max(0, 1 - (t - 0.34) / 0.14);
      d[i] = (Math.random() * 2 - 1) * huelle * rest;
    }
    var quelle = ctx.createBufferSource();
    quelle.buffer = puffer;
    var tiefpass = ctx.createBiquadFilter();
    tiefpass.type = 'lowpass';
    tiefpass.frequency.setValueAtTime(5200, start);
    tiefpass.frequency.exponentialRampToValueAtTime(360, start + 0.30);
    var gn = ctx.createGain();
    gn.gain.value = 0.9;
    quelle.connect(tiefpass);
    tiefpass.connect(gn);
    gn.connect(ziel);
    quelle.start(start);

    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, start);
    o.frequency.exponentialRampToValueAtTime(46, start + 0.28);
    var go = ctx.createGain();
    go.gain.setValueAtTime(0.0001, start);
    go.gain.linearRampToValueAtTime(0.95, start + 0.005);
    go.gain.exponentialRampToValueAtTime(0.0008, start + 0.30);
    go.gain.linearRampToValueAtTime(0, start + 0.40);
    o.connect(go);
    go.connect(ziel);
    o.start(start);
    o.stop(start + 0.42);
  }

  function boing(ctx, ziel, start) {
    var o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(330, start);
    o.frequency.exponentialRampToValueAtTime(118, start + 0.42);
    var lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(19, start);
    var lg = ctx.createGain();
    lg.gain.setValueAtTime(34, start);
    lg.gain.linearRampToValueAtTime(0, start + 0.5);
    lfo.connect(lg);
    lg.connect(o.frequency);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.26, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, start + 0.46);
    g.gain.linearRampToValueAtTime(0, start + 0.55);
    o.connect(g);
    g.connect(ziel);
    o.start(start); lfo.start(start);
    o.stop(start + 0.57); lfo.stop(start + 0.57);
  }

  function knallSpielen() {
    if (!AC) return;
    var t = AC.currentTime + 0.01;
    knall(AC, MEISTER, t);
    boing(AC, MEISTER, t + 0.01);
  }

  /* Messbarer Ausgang fuer die Pruefung: rechnet Knall und Boing offline und
     liefert Spitzenwert, Laenge und die Werte an den Raendern. */
  window.jackTon = function () {
    var O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!O) return null;
    var sr = 44100;
    var ctx = new O(1, Math.floor(sr * 1.2), sr);
    var ziel = kette(ctx);
    knall(ctx, ziel, 0.02);
    boing(ctx, ziel, 0.03);
    return ctx.startRendering().then(function (puffer) {
      var d = puffer.getChannelData(0), i, peak = 0, sprung = 0, ende = 0;
      var ueber = 0, sprungStelle = 0, naheAnfang = 0, naheEnde = 0;
      for (i = 0; i < d.length; i++) {
        if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
        if (Math.abs(d[i]) > 1) ueber++;
        if (i > 0) {
          var s = Math.abs(d[i] - d[i - 1]);
          if (s > sprung) { sprung = s; sprungStelle = i; }
        }
        if (Math.abs(d[i]) > 0.0002) ende = i;
      }
      // Sprung an den Raendern: erster und letzter Hoerwert gegen null
      for (i = 1; i <= 64; i++) naheAnfang = Math.max(naheAnfang, Math.abs(d[i] - d[i - 1]));
      for (i = Math.max(1, ende - 63); i <= ende; i++) naheEnde = Math.max(naheEnde, Math.abs(d[i] - d[i - 1]));
      return {
        spitze: peak,
        uebersteuert: ueber,
        laenge: ende / sr,
        ersterWert: d[0],
        letzterWert: d[ende],
        sprung: sprung,
        sprungBeiSekunde: sprungStelle / sr,
        sprungAmAnfang: naheAnfang,
        sprungAmEnde: naheEnde,
        abtastrate: sr
      };
    });
  };

  /* ------------------------------------------------------------ Ablauf -- */

  var S = {
    zustand: 'zu',
    t: 0,
    figY: FIGUR_ZU,
    figV: 0,
    quetsch: QUETSCH_ZU,
    quetschV: 0,
    deckel: 0,
    deckelV: 0,
    arm: 0.22,
    armV: 0,
    kurbel: 0,
    kurbelV: 0,
    wackeln: 0,
    augenT: -1
  };

  var OMEGA_FIGUR = 12.0, ZETA_FIGUR = 0.34;
  var OMEGA_QUETSCH = 19.0, ZETA_QUETSCH = 0.30;
  var OMEGA_DECKEL = 17.0, ZETA_DECKEL = 0.55;
  var OMEGA_ARM = 15.0, ZETA_ARM = 0.52;
  var AUFZIEHEN = 1.2;

  function federSchritt(wert, ziel, v, omega, zeta, dt) {
    var a = -omega * omega * (wert - ziel) - 2 * zeta * omega * v;
    v += a * dt;
    wert += v * dt;
    return [wert, v];
  }

  function ausloesen() {
    if (S.zustand === 'aufziehen' || S.zustand === 'einfahren') return;
    tonWecken();
    if (S.zustand === 'zu') {
      S.zustand = 'aufziehen';
      S.t = 0;
      if (AC) melodie(AC.currentTime + 0.02);
    } else if (S.zustand === 'offen') {
      S.zustand = 'einfahren';
      S.t = 0;
    }
  }

  function platzen() {
    S.zustand = 'offen';
    S.t = 0;
    S.augenT = -0.28;
    S.kurbelV = 9.0;
    knallSpielen();
  }

  function schritt(dt) {
    var r, zielY, zielQ, zielD, zielA;

    if (S.zustand === 'aufziehen') {
      S.t += dt;
      var q = Math.min(1, S.t / AUFZIEHEN);
      S.kurbel = q * Math.PI * 2 * 2.2;
      S.kurbelV = Math.PI * 2 * 2.2 / AUFZIEHEN;
      S.wackeln = Math.sin(S.t * 47) * 0.011 * Math.min(1, S.t / 0.2)
                + Math.sin(S.t * 19) * 0.004;
      if (S.t >= AUFZIEHEN) platzen();
    } else if (S.zustand === 'einfahren') {
      S.t += dt;
    } else if (S.zustand === 'offen') {
      S.t += dt;
      S.kurbel += S.kurbelV * dt;
      S.kurbelV *= Math.pow(0.12, dt);
      S.wackeln *= Math.pow(0.05, dt);
      if (S.augenT > -1) S.augenT += dt;
    }

    zielY = (S.zustand === 'offen') ? FIGUR_RUHE : FIGUR_ZU;
    zielQ = (S.zustand === 'offen') ? 1.0 : QUETSCH_ZU;
    zielA = (S.zustand === 'offen') ? 1.95 : 0.22;
    zielD = (S.zustand === 'offen') ? -2.48 : 0;
    // Beim Einfahren bleibt der Deckel offen, bis die Figur drin ist
    if (S.zustand === 'einfahren' && S.t < 0.55) zielD = -2.48;

    r = federSchritt(S.figY, zielY, S.figV, OMEGA_FIGUR, ZETA_FIGUR, dt);
    S.figY = r[0]; S.figV = r[1];

    r = federSchritt(S.quetsch, zielQ, S.quetschV, OMEGA_QUETSCH, ZETA_QUETSCH, dt);
    S.quetsch = r[0]; S.quetschV = r[1];

    r = federSchritt(S.deckel, zielD, S.deckelV, OMEGA_DECKEL, ZETA_DECKEL, dt);
    S.deckel = r[0]; S.deckelV = r[1];

    r = federSchritt(S.arm, zielA, S.armV, OMEGA_ARM, ZETA_ARM, dt);
    S.arm = r[0]; S.armV = r[1];

    if (S.zustand === 'einfahren' && S.t > 1.05) {
      S.zustand = 'zu';
      S.t = 0;
    }
  }

  /* --------------------------------------------------------------- Zeichnen -- */

  var stapel = [];
  var aktuell = einheit();

  function schieb(m) { stapel.push(aktuell); aktuell = mal(aktuell, m); }
  function zieh() { aktuell = stapel.pop() || einheit(); }

  var sicht = { breite: 1, hoehe: 1, seiten: 1 };
  var proj = einheit(), anschau = einheit(), augenPunkt = [0, 2, 6];

  function ansichtSetzen() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    sicht.breite = w; sicht.hoehe = h; sicht.seiten = w / h;

    var fov = 40 * Math.PI / 180;
    // Die Kamera faehrt mit, wenn die Figur herauskommt: im Ruhezustand sitzt
    // der Kasten gross im Bild, beim Aufspringen wird das Bild weiter.
    var offen = Math.max(0, Math.min(1, (S.figY - FIGUR_ZU) / (FIGUR_RUHE - FIGUR_ZU)));
    offen = offen * offen * (3 - 2 * offen);
    var halbeHoehe = 1.50 + 1.02 * offen;
    var halbeBreite = 1.20 + 0.26 * offen;
    var abstand = Math.max(halbeHoehe, halbeBreite / sicht.seiten) / Math.tan(fov / 2);

    var ziel = [0.05, 0.60 + 1.20 * offen, 0];
    var gier = 0.26, nick = 0.19 - 0.14 * offen;
    augenPunkt = [
      ziel[0] + Math.sin(gier) * Math.cos(nick) * abstand,
      ziel[1] + Math.sin(nick) * abstand,
      ziel[2] + Math.cos(gier) * Math.cos(nick) * abstand
    ];
    proj = perspektive(fov, sicht.seiten, 0.1, 40);
    anschau = blick(augenPunkt, ziel, [0, 1, 0]);

    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function zeichne(mesh) {
    if (!mesh.anzahl) return;
    gl.uniformMatrix4fv(ort.uModel, false, aktuell);
    gl.uniformMatrix3fv(ort.uNrmMat, false, normalenMatrix(aktuell));
    binde(mesh);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.anzahl);
  }

  function figurZeichnen() {
    var i, sx, k, wackeln = 0;

    // Koerper
    schieb(schiebe(0, 0.26, 0));
    zeichne(mKoerper);
    zieh();

    // Arme — beim Aufspringen fliegen sie hoch
    schieb(mal(schiebe(0.21, 0.40, 0), drehZ(S.arm)));
    zeichne(mArm);
    zieh();
    schieb(mal(schiebe(-0.21, 0.40, 0), drehZ(-S.arm)));
    zeichne(mArm);
    zieh();

    // Kopf
    schieb(schiebe(0, 0.86, 0));
    zeichne(mKopf);

    if (S.augenT > 0) {
      wackeln = Math.sin(S.augenT * 17.5) * 0.42 * Math.exp(-S.augenT * 2.4);
    }
    for (i = 0; i < 2; i++) {
      sx = i === 0 ? 1 : -1;

      schieb(mal(schiebe(sx * 0.175, 0.085, 0.325), drehZ(wackeln * sx)));
      zeichne(mAug);
      schieb(schiebe(-sx * 0.028, wackeln * 0.02, 0.118));
      zeichne(mPupille);
      zieh();
      zieh();

      schieb(mal(schiebe(sx * 0.185, 0.255, 0.315), drehZ(sx * (0.28 + wackeln * 0.3))));
      zeichne(mBraue);
      zieh();

      schieb(schiebe(sx * 0.295, -0.115, 0.215));
      zeichne(mWange);
      zieh();

      schieb(mal(schiebe(sx * 0.405, 0.015, 0.0), drehZ(sx * 0.2)));
      zeichne(mOhr);
      zieh();
    }

    schieb(schiebe(0, -0.035, 0.395));
    zeichne(mNase);
    zieh();

    zeichne(mMund);
    schieb(schiebe(0, -0.245, 0.352));
    zeichne(mZahn);
    zieh();
    schieb(schiebe(0, -0.325, 0.325));
    zeichne(mZunge);
    zieh();

    // Hut mit drei Zipfeln
    schieb(drehY(0.2));
    zeichne(mHut);
    var azimute = [1.57, 3.67, 5.76], tilt = 1.02;
    for (k = 0; k < 3; k++) {
      var phi = azimute[k];
      var bx = 0.135 * Math.sin(phi), bz = 0.135 * Math.cos(phi);
      schieb(mal(mal(schiebe(bx, 0.575, bz), drehY(phi)), drehX(tilt)));
      zeichne(mZipfel);
      schieb(schiebe(0, 0.46, 0));
      zeichne(mGlocke);
      zieh();
      zieh();
    }
    zieh();

    zieh(); // Kopf
  }

  function zeichneSzene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(ort.uProj, false, proj);
    gl.uniformMatrix4fv(ort.uView, false, anschau);
    gl.uniform3fv(ort.uAuge, new Float32Array(augenPunkt));

    // Schatten zuerst, ohne Tiefenschreiben
    gl.depthMask(false);
    schieb(mal(schiebe(0, 0.006, 0), skaliere(1.35, 1, 1.15)));
    zeichne(mSchatten);
    zieh();
    gl.depthMask(true);

    /* Kasten, wackelt beim Aufziehen */
    schieb(mal(schiebe(0, Math.abs(S.wackeln) * 0.6, 0), drehZ(S.wackeln)));
    zeichne(mKasten);

    /* Deckel, Scharnier an der hinteren Kante */
    schieb(mal(schiebe(0, KH, -KB), drehX(S.deckel)));
    zeichne(mDeckel);
    zieh();

    /* Kurbel */
    schieb(mal(schiebe(KB, 0.34, 0.26), drehX(S.kurbel)));
    zeichne(mKurbel);
    zieh();
    zieh();

    /* Feder */
    federBauen(Math.max(0.10, S.figY - FEDER_FUSS));
    gl.uniformMatrix4fv(ort.uModel, false, einheit());
    gl.uniformMatrix3fv(ort.uNrmMat, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
    binde(mFeder);
    gl.drawArrays(gl.TRIANGLES, 0, mFeder.anzahl);

    /* Figur */
    var q = Math.max(0.22, Math.min(1.25, S.quetsch));
    // Beim Stauchen wird die Figur schmaler, nicht breiter — sonst quellen
    // Haende und Ohren durch die Kastenwand.
    var breit = Math.pow(q, 0.33);
    var neigung = Math.max(-0.14, Math.min(0.14, -S.figV * 0.012));
    schieb(mal(schiebe(0, S.figY, 0), drehZ(neigung)));
    schieb(mal(skaliere(breit, q, breit),
      drehY(-0.20 + Math.sin(S.t * 0.9) * 0.06)));
    figurZeichnen();
    zieh();
    zieh();
  }

  /* --------------------------------------------------------------- Schleife -- */

  var letzte = 0, laeuft = false, eingefroren = false;

  function rahmen(zeit) {
    var dt = letzte ? (zeit - letzte) / 1000 : 1 / 60;
    letzte = zeit;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    if (!eingefroren) schritt(dt);
    ansichtSetzen();
    zeichneSzene();
    if (laeuft) requestAnimationFrame(rahmen);
  }

  /* Adresswerte fuer pruefbare Aufnahmen: ?springen=1&zeit=<sekunden> */
  var suche = location.search || '';
  var mZeit = /[?&]zeit=([0-9.]+)/.exec(suche);

  if (/[?&]springen=1/.test(suche)) {
    S.zustand = 'aufziehen';
    S.t = 0;
    if (mZeit) {
      var rest = Math.min(30, parseFloat(mZeit[1]) || 0);
      var schritte = Math.round(rest * 120);
      var n;
      for (n = 0; n < schritte; n++) schritt(1 / 120);
      eingefroren = true;
    }
  }

  function starten() {
    if (laeuft) return;
    laeuft = true;
    letzte = 0;
    requestAnimationFrame(rahmen);
  }

  window.addEventListener('resize', function () { ansichtSetzen(); });

  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    ausloesen();
  });

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter' ||
        e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      ausloesen();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) letzte = 0;
  });

  /* Zustand fuer die Pruefung ablesbar machen */
  window.jackSchritt = function (dt) { schritt(dt); };
  window.jackStand = function () {
    return {
      zustand: S.zustand,
      figY: S.figY,
      deckel: S.deckel,
      quetsch: S.quetsch,
      arm: S.arm,
      federHoehe: federHoehe,
      rollbalken: document.documentElement.scrollHeight > document.documentElement.clientHeight
    };
  };

  ansichtSetzen();
  starten();
})();
