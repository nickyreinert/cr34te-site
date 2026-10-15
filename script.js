/* Dose 340 g — drehbares 3D-Modell.
 *
 * Eigener WebGL-1-Renderer, keine Bibliothek, kein Build-Schritt.
 * Geometrie: Drehkoerper (Lathe) aus einem Profil + zwei Kreisscheiben.
 * Etikett und Deckel stecken als Daten-Adressen in dieser Datei; es wird nichts
 * nachgeladen (keine externe Datei, kein Netz, kein Speicher).
 * Das Etikett enthaelt nur die Vorderseite; die Rueckseite entsteht durch
 * gespiegeltes Wiederholen (gl.MIRRORED_REPEAT) — halbe Bilddaten, doppelte
 * Schaerfe. Der Boden hat gar keine Textur, nur einen Goldton im Shader.
 * Steuerung: Ziehen dreht, Loslassen laeuft nach, Scrollen/ zwei Finger zoomt,
 * Doppeltippen setzt zurueck, Pfeiltasten drehen ebenfalls.
 */
(function () {
  'use strict';

  var SEGMENTE = 128;              // Umfangsegmente: damit wirkt der Rand rund

  // Etikett 1024 x 256 und Deckelfläche 256 x 256, WebP, als Daten-Adresse
  var Q_ETIKETT = 'data:image/webp;base64,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';
  var Q_DECKEL = 'data:image/webp;base64,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';

  // Masse in cm: 8,6 cm Durchmesser ueber der Deckelnaht, 7,4 cm hoch.
  // Der Etikettenmantel ist 8,04 cm weit; Etikettenkanten aus dem Foto abgelesen.
  var R_BODY = 4.02, R_NAHT = 4.30, HOEHE = 7.40;
  var Y_ETIKETT_UNTEN = -3.40, Y_ETIKETT_OBEN = 2.72;
  var R_DECKEL = 3.82, R_BODEN = 3.72, R_FASE = 0.30;
  var Y_OBEN, Y_UNTEN, Y_DECKEL;   // ergeben sich aus HOEHE

  // Materialkennungen (muessen zu den Gewichten im Fragment-Shader passen)
  var MAT_PAPIER = 0, MAT_METALL = 1, MAT_DECKEL = 2, MAT_BODEN = 3;

  var canvas = document.getElementById('buehne');
  var hinweis = document.getElementById('hinweis');

  var gl = null;
  try {
    var opten = { antialias: true, alpha: true, premultipliedAlpha: true, depth: true };
    gl = canvas.getContext('webgl', opten) || canvas.getContext('experimental-webgl', opten);
  } catch (e) { gl = null; }

  // Der Hinweis steht im Markup unsichtbar (hidden, aria-hidden) und wird nur
  // gezeigt, wenn WebGL fehlt oder die Textur nicht angelegt werden kann.
  function ausfall() {
    hinweis.hidden = false;
    hinweis.removeAttribute('aria-hidden');
  }

  if (!gl) { ausfall(); return; }

  function zahlAusAdresse(name, vorgabe, min, max) {
    var m = new RegExp('[?&]' + name + '=(-?[0-9.]+)').exec(location.search);
    if (!m) return vorgabe;
    var v = parseFloat(m[1]);
    if (!isFinite(v)) return vorgabe;
    return Math.min(max, Math.max(min, v));
  }
  var ruhe = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var drehAn = !ruhe;
  if (/[?&]dreh=0/.test(location.search)) drehAn = false;
  if (/[?&]dreh=1/.test(location.search)) drehAn = true;
  HOEHE = zahlAusAdresse('hoehe', HOEHE, 5.6, 9.0);

  var VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNormal;',
    'attribute vec2 aUv;',
    'attribute float aMat;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'varying vec2 vUv;',
    'varying vec3 vN;',
    'varying vec3 vPos;',
    'varying float vMat;',
    'void main(){',
    '  vUv = aUv;',
    '  vN = aNormal;',
    '  vPos = aPos;',
    '  vMat = aMat;',
    '  gl_Position = uProj * uView * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'varying vec3 vN;',
    'varying vec3 vPos;',
    'varying float vMat;',
    'uniform sampler2D uEtikett;',
    'uniform sampler2D uDeckel;',
    'uniform vec3 uAugen;',
    'uniform vec3 uLicht;',
    'uniform vec3 uFuell;',
    'void main(){',
    // Gewichte der vier Materialien: Papier 0, Blech 1, Deckelfläche 2, Boden 3
    '  float wp = 1.0 - step(0.5, vMat);',
    '  float wm = step(0.5, vMat) * (1.0 - step(1.5, vMat));',
    '  float wd = step(1.5, vMat) * (1.0 - step(2.5, vMat));',
    '  float wb = step(2.5, vMat);',
    // Der Boden hat keine Textur, nur einen ruhigen Goldton (spart Bilddaten)
    '  vec3 goldton = vec3(0.804, 0.702, 0.384);',
    '  vec3 grund = texture2D(uEtikett, vUv).rgb * wp',
    '              + goldton * wm',
    '              + texture2D(uDeckel, vUv).rgb * wd',
    '              + goldton * wb;',
    '  vec3 n = normalize(vN);',
    '  vec3 v = normalize(uAugen - vPos);',
    '  vec3 l = normalize(uLicht);',
    '  vec3 h = normalize(l + v);',
    '  vec3 l2 = normalize(uFuell);',
    '  float nl = max(dot(n, l), 0.0);',
    '  float nl2 = max(dot(n, l2), 0.0);',
    '  float schmal = pow(max(dot(n, h), 0.0), 150.0);',   // schmale Glanzkante am Blech
    '  float breit = pow(max(dot(n, h), 0.0), 14.0);',     // mattes Streulicht des Papiers
    '  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);',
    '  vec3 gold = vec3(0.87, 0.73, 0.35);',
    '  vec3 papier = grund * (0.40 + 0.72 * nl + 0.18 * nl2)',
    '              + vec3(1.0, 0.98, 0.94) * breit * 0.035;',
    '  vec3 umgebungMetall = mix(vec3(0.30, 0.24, 0.13), vec3(1.00, 0.93, 0.66),',
    '                            smoothstep(-0.45, 0.90, n.y));',
    '  vec3 metall = gold * umgebungMetall * (0.55 + 0.55 * nl)',
    '              + vec3(1.0, 0.96, 0.85) * schmal * 1.7',
    '              + gold * fres * 0.30;',
    '  vec3 deckel = grund * (0.80 + 0.34 * nl) + vec3(1.0, 0.97, 0.90) * schmal * 0.40;',
    '  vec3 boden = grund * (0.72 + 0.42 * nl) + vec3(1.0, 0.97, 0.90) * schmal * 0.30;',
    '  vec3 farbe = papier * wp + metall * wm + deckel * wd + boden * wb;',
    '  gl_FragColor = vec4(clamp(farbe, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function shader(typ, quelle) {
    var s = gl.createShader(typ);
    gl.shaderSource(s, quelle);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('Shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  var programm;
  try {
    programm = gl.createProgram();
    gl.attachShader(programm, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(programm, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(programm);
    if (!gl.getProgramParameter(programm, gl.LINK_STATUS)) {
      throw new Error('Programm: ' + gl.getProgramInfoLog(programm));
    }
  } catch (fehler) {
    ausfall();
    return;
  }
  gl.useProgram(programm);

  var ort = {
    aPos: gl.getAttribLocation(programm, 'aPos'),
    aNormal: gl.getAttribLocation(programm, 'aNormal'),
    aUv: gl.getAttribLocation(programm, 'aUv'),
    aMat: gl.getAttribLocation(programm, 'aMat'),
    uProj: gl.getUniformLocation(programm, 'uProj'),
    uView: gl.getUniformLocation(programm, 'uView'),
    uAugen: gl.getUniformLocation(programm, 'uAugen'),
    uLicht: gl.getUniformLocation(programm, 'uLicht'),
    uFuell: gl.getUniformLocation(programm, 'uFuell'),
    uEtikett: gl.getUniformLocation(programm, 'uEtikett'),
    uDeckel: gl.getUniformLocation(programm, 'uDeckel')
  };

  /* Profil von unten nach oben: je Punkt Radius, Hoehe, Material, v-Wert.
     Untere Rundung und obere Naht sind Boegen, damit der Rand rund wirkt.
     ?hoehe= streckt oder staucht alle Hoehen gleichmaessig. */
  function profil() {
    var p = [];
    var i, a, t;

    function dazu(r, y, mat, v) { p.push({ r: r, y: y, mat: mat, v: v }); }

    for (i = 0; i <= 6; i++) {                       // untere Rundung
      a = i / 6 * Math.PI / 2;
      dazu(R_BODEN + R_FASE * Math.sin(a), -3.70 + R_FASE * (1 - Math.cos(a)), MAT_METALL, 0);
    }
    dazu(R_BODY, Y_ETIKETT_UNTEN, MAT_PAPIER, 0);    // Etikettenmantel, v 0 unten
    dazu(R_BODY, Y_ETIKETT_OBEN, MAT_PAPIER, 1);
    dazu(R_BODY, Y_ETIKETT_OBEN, MAT_METALL, 0);     // Naht: Aufweitung auf 8,60 cm
    for (i = 0; i <= 5; i++) {
      a = i / 5 * Math.PI / 2;
      dazu(R_BODY + 0.28 * Math.sin(a), 2.84 - 0.12 * Math.cos(a), MAT_METALL, 0);
    }
    dazu(4.30, 3.06, MAT_METALL, 0);
    dazu(4.30, 3.20, MAT_METALL, 0);
    for (i = 1; i <= 10; i++) {                      // Wulst bis zur Oberkante
      t = i / 10 * Math.PI / 2;
      dazu(4.05 + 0.25 * Math.cos(t), 3.20 + 0.50 * Math.sin(t), MAT_METALL, 0);
    }
    for (i = 1; i <= 5; i++) {                       // Stufe hinunter zur Wanne
      t = Math.PI / 2 + i / 5 * Math.PI / 2;
      dazu(4.05 + 0.23 * Math.cos(t), 3.55 + 0.15 * Math.sin(t), MAT_METALL, 0);
    }
    dazu(R_DECKEL, 3.55, MAT_METALL, 0);

    var k = HOEHE / 7.40;
    if (k !== 1) {
      for (i = 0; i < p.length; i++) p[i].y *= k;
    }
    Y_OBEN = 3.70 * k;
    Y_UNTEN = -3.70 * k;
    Y_DECKEL = 3.55 * k;
    return p;
  }

  // Normalen aus der Profilrichtung (dr, dy) -> (dy, -dr), also nach aussen.
  function normalenFuer(p) {
    var n = [];
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[i], k;
      for (k = i - 1; k >= 0; k--) {
        if (p[k].r !== p[i].r || p[k].y !== p[i].y) { a = p[k]; break; }
      }
      for (k = i + 1; k < p.length; k++) {
        if (p[k].r !== p[i].r || p[k].y !== p[i].y) { b = p[k]; break; }
      }
      var dr = b.r - a.r, dy = b.y - a.y;
      var laenge = Math.hypot(dr, dy);
      if (!(laenge > 1e-6)) { dr = 0; dy = 1; laenge = 1; }
      n.push({ nr: dy / laenge, ny: -dr / laenge });
    }
    return n;
  }

  function geometrieBauen() {
    var p = profil();
    var nrm = normalenFuer(p);
    var pos = [], nor = [], uv = [], mat = [], idx = [];
    var i, j, w = SEGMENTE + 1;      // Ringbreite in Scheitelpunkten
    var phi, sinp, cosp, nr, ny, a, b, c, d;

    for (i = 0; i < p.length; i++) {                 // Mantel (Drehkoerper)
      for (j = 0; j <= SEGMENTE; j++) {
        phi = j / SEGMENTE * Math.PI * 2;
        sinp = Math.sin(phi); cosp = Math.cos(phi);
        nr = nrm[i].nr; ny = nrm[i].ny;
        pos.push(p[i].r * sinp, p[i].y, p[i].r * cosp);
        nor.push(nr * sinp, ny, nr * cosp);
        // u laeuft einmal rundum, also 0 … 2: die zweite Haelfte spiegelt die erste
        uv.push(j / SEGMENTE * 2 + 0.5, p[i].v);
        mat.push(p[i].mat);
      }
    }
    for (i = 0; i < p.length - 1; i++) {
      for (j = 0; j < SEGMENTE; j++) {
        a = i * w + j; b = i * w + j + 1; c = (i + 1) * w + j; d = (i + 1) * w + j + 1;
        idx.push(a, b, c, b, d, c);
      }
    }

    var mitteOben = pos.length / 3;                  // Deckelfläche, eigene Textur
    pos.push(0, Y_DECKEL, 0); nor.push(0, 1, 0); uv.push(0.5, 0.5); mat.push(MAT_DECKEL);
    for (j = 0; j <= SEGMENTE; j++) {
      phi = j / SEGMENTE * Math.PI * 2;
      var dx = Math.sin(phi), dz = Math.cos(phi);
      pos.push(R_DECKEL * dx, Y_DECKEL, R_DECKEL * dz);
      nor.push(0, 1, 0);
      uv.push(0.5 + 0.5 * dx, 0.5 + 0.5 * dz);
      mat.push(MAT_DECKEL);
    }
    for (j = 0; j < SEGMENTE; j++) {
      idx.push(mitteOben, mitteOben + 1 + j, mitteOben + 2 + j);
    }

    var mitteUnten = pos.length / 3;                 // Bodenfläche, nur der Goldton
    pos.push(0, Y_UNTEN, 0); nor.push(0, -1, 0); uv.push(0.5, 0.5); mat.push(MAT_BODEN);
    for (j = 0; j <= SEGMENTE; j++) {
      phi = j / SEGMENTE * Math.PI * 2;
      dx = Math.sin(phi); dz = Math.cos(phi);
      pos.push(R_BODEN * dx, Y_UNTEN, R_BODEN * dz);
      nor.push(0, -1, 0);
      uv.push(0.5 + 0.5 * dx, 0.5 + 0.5 * dz);
      mat.push(MAT_BODEN);
    }
    for (j = 0; j < SEGMENTE; j++) {
      idx.push(mitteUnten, mitteUnten + 2 + j, mitteUnten + 1 + j);
    }

    return {
      pos: new Float32Array(pos), nor: new Float32Array(nor),
      uv: new Float32Array(uv), mat: new Float32Array(mat),
      idx: new Uint16Array(idx), anzahl: idx.length
    };
  }

  var g = geometrieBauen();
  var puffer = {
    pos: gl.createBuffer(), nor: gl.createBuffer(),
    uv: gl.createBuffer(), mat: gl.createBuffer(), idx: gl.createBuffer()
  };
  function fuellen(buf, daten, ziel) {
    gl.bindBuffer(ziel, buf);
    gl.bufferData(ziel, daten, gl.STATIC_DRAW);
  }
  fuellen(puffer.pos, g.pos, gl.ARRAY_BUFFER);
  fuellen(puffer.nor, g.nor, gl.ARRAY_BUFFER);
  fuellen(puffer.uv, g.uv, gl.ARRAY_BUFFER);
  fuellen(puffer.mat, g.mat, gl.ARRAY_BUFFER);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, puffer.idx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0, 0, 0, 0);

  var aniso = gl.getExtension('EXT_texture_filter_anisotropic')
    || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  var maxAniso = aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;

  function goldTon() {                             // Ersatztextur, 1 x 1 Punkt
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([230, 210, 140, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
  }

  var texEtikett = goldTon(), texDeckel = goldTon();

  function texturAusBild(bild, ziel, wiederholen) {
    gl.bindTexture(gl.TEXTURE_2D, ziel);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bild);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,
      wiederholen ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (aniso) {
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
    }
  }

  var bilder = [
    [Q_ETIKETT, function (t) { texEtikett = t; }, true],
    [Q_DECKEL, function (t) { texDeckel = t; }, false]
  ];
  var fertig = 0, geladen = 0;

  function texturStand() {
    fertig++;
    if (fertig < bilder.length || geladen === bilder.length) return;
    ausfall();
  }

  bilder.forEach(function (eintrag) {
    var bild = new Image();
    bild.onload = function () {
      try {
        var t = gl.createTexture();
        texturAusBild(bild, t, eintrag[2]);
        eintrag[1](t);
        geladen++;
      } catch (f) { /* Textur bleibt der Goldton */ }
      texturStand();
      anfordern();
    };
    bild.onerror = function () { texturStand(); };
    bild.src = eintrag[0];
  });

  function perspektive(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  function blick(auge, ziel, oben) {
    var zx = auge[0] - ziel[0], zy = auge[1] - ziel[1], zz = auge[2] - ziel[2];
    var zl = Math.hypot(zx, zy, zz) || 1;
    zx /= zl; zy /= zl; zz /= zl;
    var xx = oben[1] * zz - oben[2] * zy,
        xy = oben[2] * zx - oben[0] * zz,
        xz = oben[0] * zy - oben[1] * zx;
    var xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;
    var yx = zy * xz - zz * xy,
        yy = zz * xx - zx * xz,
        yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * auge[0] + xy * auge[1] + xz * auge[2]),
      -(yx * auge[0] + yy * auge[1] + yz * auge[2]),
      -(zx * auge[0] + zy * auge[1] + zz * auge[2]), 1
    ]);
  }

  var FOVY = 32 * Math.PI / 180;
  var yaw = zahlAusAdresse('yaw', 0.42, -Math.PI * 4, Math.PI * 4);
  var pitch = zahlAusAdresse('pitch', 0.20, -1.15, 1.15);
  var zoom = zahlAusAdresse('zoom', 1, 0.62, 2.6);
  var augenAbstand = 26;                 // wird an die Fenstergroesse angepasst
  var vYaw = 0, vPitch = 0;
  var AUTO = 0.17;                       // rad/s Selbstdrehung
  var anhalten = false;                  // waehrend des Ziehens
  var neuZeichnen = true;
  var puls = 0;                          // Restzeit der Rueckstellung

  function passendeEntfernung() {
    var w = canvas.clientWidth || 320, h = canvas.clientHeight || 480;
    var aspect = Math.max(0.2, w / h);
    var tanF = Math.tan(FOVY / 2);
    var dH = R_NAHT / (tanF * aspect);
    var dV = (Y_OBEN + R_NAHT * Math.abs(Math.sin(pitch)) + 0.15) / tanF;
    return Math.max(dH, dV) + R_NAHT * 1.1;
  }

  function ansicht() {
    var d = passendeEntfernung() * zoom;
    augenAbstand = d;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var auge = [d * Math.sin(yaw) * cp, d * sp + 0.15, d * Math.cos(yaw) * cp];
    return blick(auge, [0, 0.05, 0], [0, 1, 0]);
  }

  function groesseSetzen() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
  }

  function binden(buf, ortAttribut, groesse) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(ortAttribut);
    gl.vertexAttribPointer(ortAttribut, groesse, gl.FLOAT, false, 0, 0);
  }

  function zeichnen() {
    groesseSetzen();
    var aspect = canvas.width / Math.max(1, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programm);

    gl.uniformMatrix4fv(ort.uProj, false, perspektive(FOVY, aspect, 1, 200));
    var v = ansicht();
    gl.uniformMatrix4fv(ort.uView, false, v);
    // Auge aus der Sichtmatrix zurueckrechnen (Transponierte der Rotation)
    var augeX = -(v[0] * v[12] + v[4] * v[13] + v[8] * v[14]);
    var augeY = -(v[1] * v[12] + v[5] * v[13] + v[9] * v[14]);
    var augeZ = -(v[2] * v[12] + v[6] * v[13] + v[10] * v[14]);
    gl.uniform3f(ort.uAugen, augeX, augeY, augeZ);
    gl.uniform3f(ort.uLicht, -0.42, 0.78, 0.72);
    gl.uniform3f(ort.uFuell, 0.62, -0.18, -0.68);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texEtikett);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texDeckel);
    gl.uniform1i(ort.uEtikett, 0);
    gl.uniform1i(ort.uDeckel, 1);

    binden(puffer.pos, ort.aPos, 3);
    binden(puffer.nor, ort.aNormal, 3);
    binden(puffer.uv, ort.aUv, 2);
    binden(puffer.mat, ort.aMat, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, puffer.idx);
    gl.drawElements(gl.TRIANGLES, g.anzahl, gl.UNSIGNED_SHORT, 0);
  }

  var letzteZeit = 0;
  function schleife(zeit) {
    var dt = letzteZeit ? Math.min(0.05, (zeit - letzteZeit) / 1000) : 0;
    letzteZeit = zeit;
    var laufen = false;

    if (puls > 0) {                       // weiche Rueckstellung nach Doppeltippen
      puls = Math.max(0, puls - dt);
      var k = 1 - puls / 0.35;
      yaw = startYaw + (0.42 - startYaw) * k;
      pitch = startPitch + (0.20 - startPitch) * k;
      zoom = startZoom + (1 - startZoom) * k;
      laufen = true;
      neuZeichnen = true;
    } else if (!anhalten && (drehAn || Math.abs(vYaw) > 0.0004 || Math.abs(vPitch) > 0.0004)) {
      // vYaw/vPitch sind Rad je Sekunde und klingen nach dem Loslassen ab
      yaw += vYaw * dt;
      pitch += vPitch * dt;
      var daempfung = Math.pow(0.05, dt);
      vYaw *= daempfung; vPitch *= daempfung;
      if (drehAn) yaw += AUTO * dt;
      pitch = Math.max(-1.15, Math.min(1.15, pitch));
      if (Math.abs(vYaw) < 0.0008) vYaw = 0;
      if (Math.abs(vPitch) < 0.0008) vPitch = 0;
      laufen = true;
      neuZeichnen = true;
    }

    if (neuZeichnen) { zeichnen(); neuZeichnen = laufen; }
    requestAnimationFrame(schleife);
  }
  requestAnimationFrame(schleife);

  function anfordern() { neuZeichnen = true; }

  var zieht = false, letzteX = 0, letzteY = 0, letzteTipp = 0;
  var aktiveBeruehrungen = [], pinchStart = 0, zoomStart = 1;
  var startYaw = yaw, startPitch = pitch, startZoom = zoom;

  function zuruecksetzen() {
    startYaw = yaw; startPitch = pitch; startZoom = zoom;
    vYaw = 0; vPitch = 0;
    puls = 0.35;
    anfordern();
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;      // Beruehrungen laufen ueber touch*
    zieht = true; anhalten = true;
    letzteX = e.clientX; letzteY = e.clientY;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  window.addEventListener('pointerup', function () { zieht = false; anhalten = false; });
  window.addEventListener('pointermove', function (e) {
    if (!zieht) return;
    var dx = e.clientX - letzteX, dy = e.clientY - letzteY;
    letzteX = e.clientX; letzteY = e.clientY;
    yaw -= dx * 0.0075;
    pitch = Math.max(-1.15, Math.min(1.15, pitch + dy * 0.0055));
    vYaw = -dx * 0.45; vPitch = dy * 0.33;      // Schwung: Rad je Sekunde
    anfordern();
  });

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoom = Math.max(0.62, Math.min(2.6, zoom * Math.exp(e.deltaY * 0.0012)));
    anfordern();
  }, { passive: false });

  function abstandZweier(t) {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  }

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      var jetzt = Date.now();
      if (jetzt - letzteTipp < 320) { zuruecksetzen(); letzteTipp = 0; return; }
      letzteTipp = jetzt;
      zieht = true; anhalten = true;
      letzteX = e.touches[0].clientX; letzteY = e.touches[0].clientY;
      vYaw = 0; vPitch = 0;
    } else if (e.touches.length === 2) {
      zieht = false;
      aktiveBeruehrungen = [e.touches[0], e.touches[1]];
      pinchStart = abstandZweier(aktiveBeruehrungen);
      zoomStart = zoom;
    }
    anfordern();
  }, { passive: true });

  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 1 && zieht) {
      var dx = e.touches[0].clientX - letzteX, dy = e.touches[0].clientY - letzteY;
      letzteX = e.touches[0].clientX; letzteY = e.touches[0].clientY;
      yaw -= dx * 0.0085;
      pitch = Math.max(-1.15, Math.min(1.15, pitch + dy * 0.006));
      vYaw = -dx * 0.5; vPitch = dy * 0.36;
      e.preventDefault();
      anfordern();
    } else if (e.touches.length === 2 && pinchStart > 0) {
      var d = abstandZweier([e.touches[0], e.touches[1]]);
      zoom = Math.max(0.62, Math.min(2.6, zoomStart * pinchStart / Math.max(1, d)));
      e.preventDefault();
      anfordern();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    if (e.touches.length === 0) { zieht = false; anhalten = false; pinchStart = 0; }
    else if (e.touches.length === 1) {
      pinchStart = 0;
      zieht = true; anhalten = true;
      letzteX = e.touches[0].clientX; letzteY = e.touches[0].clientY;
    }
    anfordern();
  }, { passive: true });

  canvas.addEventListener('dblclick', function (e) { e.preventDefault(); zuruecksetzen(); });

  window.addEventListener('keydown', function (e) {
    var s = 0.12;
    if (e.key === 'ArrowLeft') { yaw -= s; }
    else if (e.key === 'ArrowRight') { yaw += s; }
    else if (e.key === 'ArrowUp') { pitch = Math.max(-1.15, Math.min(1.15, pitch + 0.08)); }
    else if (e.key === 'ArrowDown') { pitch = Math.max(-1.15, Math.min(1.15, pitch - 0.08)); }
    else if (e.key === 'Home' || e.key === 'r' || e.key === 'R') { zuruecksetzen(); }
    else { return; }
    e.preventDefault();
    anfordern();
  });

  window.addEventListener('resize', function () { anfordern(); });
  window.addEventListener('orientationchange', function () { anfordern(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) anfordern(); });

  /* Pruefhaken: liefert die tatsaechlichen Masse der gebauten Geometrie. */
  window.doseMasse = function () {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, p = g.pos;
    for (var i = 0; i < p.length; i += 3) {
      if (p[i] < x0) x0 = p[i];
      if (p[i] > x1) x1 = p[i];
      if (p[i + 1] < y0) y0 = p[i + 1];
      if (p[i + 1] > y1) y1 = p[i + 1];
    }
    return {
      durchmesser_cm: +(x1 - x0).toFixed(3),
      hoehe_cm: +(y1 - y0).toFixed(3),
      verhaeltnis: +((x1 - x0) / (y1 - y0)).toFixed(3),
      etikett_hoehe_cm: +(Y_ETIKETT_OBEN - Y_ETIKETT_UNTEN).toFixed(3),
      segmente: SEGMENTE,
      dreiecke: g.anzahl / 3,
      ansicht: { yaw: +yaw.toFixed(4), pitch: +pitch.toFixed(4), zoom: +zoom.toFixed(3) }
    };
  };
})();
