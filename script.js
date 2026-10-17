(function () {
  'use strict';

  var WGSL = `// Uniform layout: every field is a vec4f, see script.js fillUniforms()
struct U {
  a: vec4f,    // res.x, res.y, time, unused
  b: vec4f,    // hop, squash, headDip, sway
  c: vec4f,    // eyeOpen, smile, tail, arm
  d: vec4f,    // gazeX, gazeY, mouthOpen, earFlop
  e: vec4f,    // earAngle, earLen, bodyW, headS
  f: vec4f,    // tailL, horn, eyeSize, stage
  g: vec4f,    // timeOfDay, dark, rain, hat
  h: vec4f,    // overlay x, y, size, kind
  i: vec4f,    // apple xyz, on
  j: vec4f,    // ball xyz, on
  k: vec4f,    // bubbleT, patch, rainbow, dirt
  fur: vec4f,
  belly: vec4f,
  acc: vec4f,
  iris: vec4f,
};
@group(0) @binding(0) var<uniform> u: U;

fn rotz(p: vec3f, a: f32) -> vec3f {
  let c = cos(a);
  let s = sin(a);
  return vec3f(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

fn roty(p: vec3f, a: f32) -> vec3f {
  let c = cos(a);
  let s = sin(a);
  return vec3f(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

fn ell(p: vec3f, r: vec3f) -> f32 {
  let k0 = length(p / r);
  let k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 0.0001);
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

fn caps(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t) - r;
}

fn h12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn h13(p: vec3f) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 = p3 + dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

fn vn2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2f(1.0, 0.0)), w.x),
             mix(h12(i + vec2f(0.0, 1.0)), h12(i + vec2f(1.0, 1.0)), w.x), w.y);
}

fn vn3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  let x0 = mix(mix(h13(i), h13(i + vec3f(1.0, 0.0, 0.0)), w.x),
               mix(h13(i + vec3f(0.0, 1.0, 0.0)), h13(i + vec3f(1.0, 1.0, 0.0)), w.x), w.y);
  let x1 = mix(mix(h13(i + vec3f(0.0, 0.0, 1.0)), h13(i + vec3f(1.0, 0.0, 1.0)), w.x),
               mix(h13(i + vec3f(0.0, 1.0, 1.0)), h13(i + vec3f(1.0, 1.0, 1.0)), w.x), w.y);
  return mix(x0, x1, w.z);
}

fn fbm2(p: vec2f) -> f32 {
  var a = 0.5;
  var s = 0.0;
  var q = p;
  for (var n = 0; n < 4; n++) {
    s += a * vn2(q);
    q = q * 2.03 + 11.7;
    a *= 0.5;
  }
  return s;
}

// world point to critter-local space (feet on ground, scaled by growth stage)
fn localPos(p: vec3f) -> vec3f {
  let s = 0.75 + 0.3 * u.f.w;
  var q = p - vec3f(0.0, 0.62 * s + u.b.x, 0.0);
  q = rotz(q, u.b.w * 0.12);
  let sx = 1.0 + 0.5 * u.b.y;
  q = vec3f(q.x / sx, q.y / (1.0 - u.b.y), q.z / sx);
  return q / s;
}

fn headQ(q: vec3f) -> vec3f {
  return roty(q - vec3f(0.0, 0.66 - u.b.z, 0.10), -u.d.x * 0.35);
}

fn critter(q: vec3f) -> vec2f {
  let bw = u.e.z;
  let hs = u.e.w;
  let hq = headQ(q);
  let body = ell(q, vec3f(0.60 * bw, 0.52, 0.52));
  let head = ell(hq, vec3f(0.46, 0.40, 0.42) * hs);
  var d = smin(body, head, 0.22);
  var m = 1.0;

  var ep = vec3f(abs(hq.x) - 0.27 * hs, hq.y - 0.26 * hs, hq.z);
  ep = rotz(ep, u.e.x + u.d.w);
  let ear = ell(ep - vec3f(0.0, 0.2 * u.e.y, 0.0), vec3f(0.13, 0.22 * u.e.y, 0.07));
  if (ear < d) { m = 8.0; }
  d = smin(d, ear, 0.07);

  let tl = u.f.x;
  let tail = caps(q, vec3f(0.0, -0.12, -0.42), vec3f(u.c.z * 0.5, 0.15 + 0.2 * tl, -0.50 - tl), 0.085 + 0.04 * (0.7 - tl));
  d = smin(d, tail, 0.1);

  let fp = vec3f(abs(q.x) - 0.28 * bw, q.y + 0.50, q.z - 0.18);
  d = smin(d, ell(fp, vec3f(0.17, 0.11, 0.23)), 0.12);

  var ap = vec3f(abs(q.x) - 0.50 * bw, q.y - 0.12, q.z - 0.18);
  ap = rotz(ap, -u.c.w);
  d = smin(d, ell(ap - vec3f(0.06, -0.15, 0.0), vec3f(0.11, 0.2, 0.11)), 0.08);

  let hn = u.f.y;
  if (hn > 0.02 && u.g.w < 0.5) {
    let horn = caps(hq, vec3f(0.0, 0.36 * hs, 0.06), vec3f(0.0, 0.36 * hs + 0.4 * hn, 0.12), 0.055);
    if (horn < d) { m = 3.0; }
    d = smin(d, horn, 0.04);
  }

  let ex = vec3f(abs(hq.x) - 0.20 * hs, hq.y - 0.07 * hs, hq.z - 0.33 * hs);
  let er = 0.10 * u.f.z * hs;
  let eye = ell(ex, vec3f(er, er * max(u.c.x, 0.07), er * 0.8));
  if (eye < d) { d = eye; m = 2.0; }

  let nose = ell(hq - vec3f(0.0, -0.07 * hs, 0.40 * hs), vec3f(0.06, 0.045, 0.05));
  if (nose < d) { d = nose; m = 7.0; }

  if (u.g.w > 0.5) {
    let hp = rotz(hq - vec3f(0.0, 0.36 * hs, -0.02), 0.25);
    let hat = max(dot(vec2f(length(hp.xz), hp.y - 0.5), normalize(vec2f(0.5, 0.2))), -hp.y);
    if (hat < d) { d = hat; m = 4.0; }
  }
  return vec2f(d, m);
}

fn map(p: vec3f) -> vec2f {
  let s = 0.75 + 0.3 * u.f.w;
  var r = critter(localPos(p));
  r.x = r.x * s * 0.8;
  if (u.i.w > 0.5) {
    let a = length(p - u.i.xyz) - 0.14;
    if (a < r.x) { r = vec2f(a, 5.0); }
  }
  if (u.j.w > 0.5) {
    let b = length(p - u.j.xyz) - 0.2;
    if (b < r.x) { r = vec2f(b, 6.0); }
  }
  return r;
}

fn calcN(p: vec3f) -> vec3f {
  let e = vec2f(1.0, -1.0) * 0.0015;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x +
                   e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}

fn shadow(ro: vec3f, rd: vec3f) -> f32 {
  var res = 1.0;
  var t = 0.05;
  for (var n = 0; n < 24; n++) {
    let h = map(ro + rd * t).x;
    res = min(res, 8.0 * h / t);
    t += clamp(h, 0.03, 0.4);
    if (res < 0.01 || t > 4.0) { break; }
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}

fn ao(p: vec3f, n: vec3f) -> f32 {
  var o = 0.0;
  var s = 1.0;
  for (var k = 1; k <= 4; k++) {
    let hh = 0.03 + 0.07 * f32(k);
    o += (hh - map(p + n * hh).x) * s;
    s *= 0.7;
  }
  return clamp(1.0 - 2.5 * o, 0.0, 1.0);
}

fn skyCol(rd: vec3f, sd: vec3f, day: f32) -> vec3f {
  let t = u.a.z;
  let hor = pow(1.0 - max(rd.y, 0.0), 4.0);
  var c = mix(vec3f(0.01, 0.015, 0.05), vec3f(0.18, 0.38, 0.8), day);
  c = mix(c, mix(vec3f(0.03, 0.05, 0.12), vec3f(0.7, 0.8, 0.9), day), hor);
  let sunset = clamp(1.0 - abs(sd.y) * 4.0, 0.0, 1.0);
  c = mix(c, vec3f(1.0, 0.5, 0.25), sunset * hor * 0.8);
  let sdot = dot(rd, sd);
  c += vec3f(1.0, 0.85, 0.6) * (smoothstep(0.9995, 0.9998, sdot) * 4.0 + pow(max(sdot, 0.0), 64.0) * 0.5) * step(0.0, sd.y + 0.05);
  let md = dot(rd, -sd);
  c += vec3f(0.9, 0.93, 1.0) * smoothstep(0.9993, 0.9995, md) * (1.0 - day) * 1.5;
  if (rd.y > 0.0) {
    let sp = rd * 220.0;
    let sh = h13(floor(sp));
    c += vec3f(1.0) * step(0.9965, sh) * smoothstep(0.4, 0.1, length(fract(sp) - 0.5)) * (0.5 + 0.5 * sin(t * 2.0 + sh * 40.0)) * (1.0 - day);
    let cp = rd.xz / (rd.y + 0.15) * 1.2 + vec2f(t * 0.015, 0.0);
    let cl = smoothstep(0.52, 0.85, fbm2(cp)) * smoothstep(0.0, 0.15, rd.y);
    let ccol = mix(vec3f(0.06, 0.07, 0.12), vec3f(1.0, 0.98, 0.95), day);
    c = mix(c, ccol, cl * 0.85);
  }
  return c;
}

fn groundCol(p: vec3f) -> vec3f {
  let g1 = fbm2(p.xz * 2.5);
  let bl = vn2(p.xz * 70.0);
  var c = mix(vec3f(0.035, 0.12, 0.03), vec3f(0.12, 0.30, 0.05), g1) * (0.7 + 0.6 * bl);
  let cell = floor(p.xz * 2.5);
  let hv = h12(cell);
  if (hv > 0.9) {
    let ctr = (cell + 0.5 + (vec2f(h12(cell + 7.0), h12(cell + 13.0)) - 0.5) * 0.6) / 2.5;
    let fl = smoothstep(0.06, 0.04, length(p.xz - ctr));
    let fc = 0.5 + 0.5 * cos(6.2832 * (hv * 9.0 + vec3f(0.0, 0.33, 0.67)));
    c = mix(c, fc * fc, fl);
  }
  return c;
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let res = u.a.xy;
  let t = u.a.z;
  var uv = (fc.xy - 0.5 * res) / min(res.x, res.y);
  uv.y = -uv.y;

  let ro = vec3f(0.0, 1.3, 4.6);
  let fw = normalize(vec3f(0.0, 0.95, 0.0) - ro);
  let rt = normalize(cross(fw, vec3f(0.0, 1.0, 0.0)));
  let upv = cross(rt, fw);
  let rd = normalize(uv.x * rt + uv.y * upv + 1.8 * fw);

  let ang = u.g.x * 6.2832 - 1.5708;
  let sd = normalize(vec3f(cos(ang) * 0.7, sin(ang), 0.45));
  let day = smoothstep(-0.12, 0.25, sd.y);
  var L = normalize(mix(-sd, sd, day));
  L = normalize(vec3f(L.x, max(L.y, 0.3), L.z));
  let Lc = mix(vec3f(0.45, 0.55, 1.0) * 1.0, vec3f(1.0, 0.92, 0.78) * 3.0, day);
  let amb = mix(vec3f(0.05, 0.07, 0.15), vec3f(0.30, 0.42, 0.65), day);

  var tg = 1e9;
  if (rd.y < -0.0005) { tg = -ro.y / rd.y; }
  var tm = -1.0;
  var mt = 0.0;
  let oc = ro - vec3f(0.0, 1.0, 0.0);
  let bq = dot(oc, rd);
  let hh = bq * bq - (dot(oc, oc) - 4.0);
  if (hh > 0.0) {
    let sq = sqrt(hh);
    var tt = max(-bq - sq, 0.0);
    let te = min(-bq + sq, tg);
    for (var n = 0; n < 80; n++) {
      let hit = map(ro + rd * tt);
      if (hit.x < 0.0015 * tt) { tm = tt; mt = hit.y; break; }
      tt += hit.x * 0.85;
      if (tt > te) { break; }
    }
  }

  var col = vec3f(0.0);
  if (tm > 0.0) {
    let p = ro + rd * tm;
    var n = calcN(p);
    let q = localPos(p);
    let hq = headQ(q);
    var alb = u.fur.xyz;
    var furry = 0.0;
    var shin = 0.0;
    var spw = 60.0;

    if (mt == 1.0 || mt == 8.0 || mt == 3.0) {
      furry = 1.0;
      let fz = q * 38.0;
      let strand = vn3(fz);
      let flow = vn3(fz * 0.4 + 5.0);
      n = normalize(n + (vec3f(vn3(fz + 3.1), vn3(fz + 7.7), vn3(fz + 1.3)) - 0.5) * 0.55);
      let bel = (1.0 - smoothstep(0.65, 1.0, length(vec2f(q.x / (0.42 * u.e.z), (q.y + 0.12) / 0.45)))) * smoothstep(0.0, 0.25, q.z);
      alb = mix(alb, u.belly.xyz, bel);
      let sp = smoothstep(0.62, 0.7, vn3(q * 3.2 + 4.0)) * u.k.y;
      alb = mix(alb, alb * 0.45, sp);
      if (mt == 8.0) { alb = mix(alb, u.acc.xyz, 0.6 * smoothstep(0.1, 0.8, n.z)); }
      if (mt == 3.0) { alb = mix(u.belly.xyz, vec3f(0.8, 0.75, 0.6), 0.5); furry = 0.2; }
      let chk = vec3f(abs(hq.x) - 0.27 * u.e.w, hq.y + 0.08 * u.e.w, hq.z - 0.28 * u.e.w);
      alb = mix(alb, u.acc.xyz, 0.5 * exp(-dot(chk, chk) * 90.0) * step(0.0, hq.z));
      let mx = hq.x;
      let my = hq.y + 0.19 * u.e.w;
      let curve = u.c.y * 3.5 * mx * mx;
      let front = step(0.15 * u.e.w, hq.z) * step(length(hq), 0.62);
      let lineM = smoothstep(0.016, 0.009, abs(my - curve)) * step(abs(mx), 0.13) * (1.0 - u.d.z);
      let ox = mx / 0.075;
      let oy = (my - curve + 0.03 * u.d.z) / (0.07 * u.d.z + 0.001);
      let openM = (1.0 - smoothstep(0.85, 1.0, ox * ox + oy * oy)) * step(0.05, u.d.z);
      alb = mix(alb, vec3f(0.04, 0.01, 0.01), lineM * front);
      alb = mix(alb, vec3f(0.12, 0.015, 0.025), openM * front);
      let dirt = u.k.w * smoothstep(0.45, 0.65, vn3(q * 5.0 + 9.0));
      alb = mix(alb, vec3f(0.12, 0.07, 0.04), dirt * 0.8);
      alb = alb * (0.78 + 0.4 * strand) * (0.85 + 0.3 * flow);
    } else if (mt == 2.0) {
      let nh = roty(n, -u.d.x * 0.35);
      let gd = normalize(vec3f(u.d.x * 0.3, u.d.y * 0.3, 1.0));
      let cd = dot(nh, gd);
      let ir = smoothstep(0.86, 0.88, cd);
      let pu = smoothstep(0.955, 0.965, cd);
      alb = mix(vec3f(0.85, 0.83, 0.78), u.iris.xyz * (0.5 + 1.2 * (1.0 - cd) * 6.0), ir);
      alb = mix(alb, vec3f(0.004), pu);
      if (u.c.x < 0.2) { alb = u.fur.xyz * 0.12; }
      shin = 1.0;
      spw = 220.0;
    } else if (mt == 7.0) {
      alb = u.acc.xyz * 0.35 + 0.02;
      shin = 0.6;
    } else if (mt == 4.0) {
      alb = mix(u.iris.xyz, vec3f(0.85), step(0.5, fract(hq.y * 10.0)));
      shin = 0.15;
    } else if (mt == 5.0) {
      alb = vec3f(0.55, 0.02, 0.015);
      shin = 0.8;
    } else {
      alb = mix(vec3f(0.8, 0.06, 0.05), vec3f(0.85), step(0.5, fract(dot(p - u.j.xyz, vec3f(0.7, 0.5, 0.3)) * 6.0)));
      shin = 0.7;
    }

    let sh = shadow(p + n * 0.02, L);
    let aov = ao(p, n);
    let wrap = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
    let lit = wrap * wrap * mix(0.2, 1.0, sh);
    col = alb * (Lc * lit * 0.55 + amb * (0.55 + 0.45 * n.y) * aov);
    let fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col += (amb * 0.8 + Lc * 0.08 * sh) * fres * (0.1 + 0.5 * furry) * aov;
    let spec = pow(max(dot(reflect(rd, n), L), 0.0), spw) * shin * sh;
    col += Lc * spec * 0.6;
  } else if (tg < 1e8) {
    let p = ro + rd * tg;
    let alb = groundCol(p);
    var sh = 1.0;
    var aov = 1.0;
    if (length(p.xz) < 3.5) {
      sh = shadow(p + vec3f(0.0, 0.03, 0.0), L);
      aov = ao(p, vec3f(0.0, 1.0, 0.0));
    }
    col = alb * (Lc * L.y * mix(0.15, 1.0, sh) * 0.55 + amb * aov);
    let fog = 1.0 - exp(-tg * 0.045);
    col = mix(col, skyCol(vec3f(rd.x, 0.02, rd.z), sd, day), fog);
  } else {
    col = skyCol(rd, sd, day);
    let band = (length(uv - vec2f(0.15, -0.9)) - 1.55) / 0.14;
    let rb = 0.5 + 0.5 * cos(6.2832 * (band * 0.75 + vec3f(0.0, 0.33, 0.67)));
    col += rb * 0.5 * u.k.z * smoothstep(0.0, 0.15, band) * smoothstep(1.0, 0.85, band);
  }

  let night = 1.0 - day;
  if (night > 0.05) {
    for (var k = 0; k < 10; k++) {
      let fi = f32(k);
      let fp = vec3f(sin(fi * 5.1 + t * 0.3 + fi) * 2.6,
                     0.4 + 0.5 * (0.5 + 0.5 * sin(fi * 1.7 + t * 0.5)),
                     cos(fi * 3.7 + t * 0.23) * 1.5 - 0.5);
      let v = fp - ro;
      let d3 = length(cross(rd, v));
      let glow = 0.0006 / (d3 * d3 + 0.0006) * (0.5 + 0.5 * sin(t * 3.0 + fi * 2.0));
      col += vec3f(1.0, 0.9, 0.4) * glow * night * step(0.0, dot(rd, v));
    }
  }

  if (u.k.x >= 0.0) {
    let fade = smoothstep(0.0, 0.1, u.k.x) * (1.0 - smoothstep(0.85, 1.0, u.k.x));
    for (var k = 0; k < 12; k++) {
      let bi = f32(k);
      let bp = vec3f(sin(bi * 2.4 + t) * 0.8, 0.2 + fract(bi * 0.173 + u.k.x * 0.8) * 1.7, 0.4 + 0.5 * sin(bi * 1.3));
      let br = 0.07 + 0.05 * fract(bi * 0.31);
      let v = bp - ro;
      let d3 = length(cross(rd, v));
      let x = (d3 - br) * 70.0;
      let ring = exp(-x * x);
      let inner = smoothstep(br, 0.0, d3) * 0.08;
      col += vec3f(0.7, 0.9, 1.0) * (ring * 0.9 + inner) * fade * step(0.0, dot(rd, v));
    }
  }

  let kind = u.h.w;
  if (kind > 0.5) {
    let pp = (uv - u.h.xy) / max(u.h.z, 0.001);
    if (kind < 1.5) {
      let dd = abs(pp.x) * 0.85 + abs(pp.y);
      let ins = smoothstep(1.0, 0.92, dd);
      let facet = 0.65 + 0.35 * sin(atan2(pp.y, pp.x) * 5.0 + t * 2.0);
      col += vec3f(0.3, 0.8, 1.0) * facet * ins * 1.6;
      col += vec3f(0.4, 0.8, 1.0) * 0.04 / (dot(pp, pp) * 0.2 + 0.05);
      col += vec3f(1.0) * 0.02 / (abs(pp.x * pp.y) * 6.0 + 0.02) * smoothstep(2.5, 0.5, length(pp)) * (0.5 + 0.5 * sin(t * 4.0));
    } else {
      let fl = 0.25 + 0.75 * abs(sin(t * 13.0));
      let wp = vec2f(abs(pp.x), pp.y);
      let w1 = length((wp - vec2f(0.55 * fl, 0.25)) / vec2f(0.55 * fl + 0.05, 0.5));
      let w2 = length((wp - vec2f(0.4 * fl, -0.4)) / vec2f(0.4 * fl + 0.05, 0.35));
      let wing = max(smoothstep(1.0, 0.9, w1), smoothstep(1.0, 0.9, w2));
      let bd = smoothstep(0.12, 0.08, abs(pp.x)) * smoothstep(0.9, 0.8, abs(pp.y));
      let wc = mix(u.acc.xyz * 1.5, u.iris.xyz * 1.5, smoothstep(0.0, 1.0, w1));
      col = mix(col, wc, wing * 0.95);
      col = mix(col, vec3f(0.05), bd);
    }
  }

  let rn = u.g.z;
  if (rn > 0.01) {
    col *= 1.0 - 0.35 * rn;
    let rcell = floor(uv.x * 46.0);
    let rh = h12(vec2f(rcell, 3.0));
    let ry = fract(uv.y * 1.6 + t * (1.8 + rh * 1.6) + rh * 9.0);
    let rx = abs(fract(uv.x * 46.0) - 0.5);
    let streak = smoothstep(0.0, 0.03, ry) * smoothstep(0.16, 0.05, ry) * smoothstep(0.07, 0.0, rx) * step(0.4, rh);
    col += vec3f(0.6, 0.7, 0.9) * streak * 0.35 * rn;
  }

  col = mix(col, col * vec3f(0.35, 0.4, 0.7), u.g.y * 0.6);
  col *= 1.0 - 0.3 * smoothstep(0.3, 1.2, length(uv));
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  col = pow(col, vec3f(1.0 / 2.2));
  return vec4f(col, 1.0);
}
`;

  var gpuCv = document.getElementById('gpu');
  var flatCv = document.getElementById('flat');
  var whoEl = document.getElementById('who');
  var scoreEl = document.getElementById('score');
  var msgEl = document.getElementById('msg');
  var zzEl = document.getElementById('zz');
  var barEls = [0, 1, 2, 3].map(function (i) { return document.getElementById('b' + i); });
  var btn = {
    feed: document.getElementById('feed'),
    play: document.getElementById('play'),
    wash: document.getElementById('wash'),
    rest: document.getElementById('rest'),
    egg: document.getElementById('egg')
  };

  var U = new Float32Array(60);
  var W = 1;
  var H = 1;
  var M = 1;
  var gpu = null;
  var ctx2d = null;
  var last = 0;

  var crit, s, born, act, evt, sleeping, hatUntil, nextEvt, lastEvt;
  var nextBlink, blinkT, pokeT, msgText, msgUntil, stageSeen;
  var gx = 0;
  var gy = 0;
  var lookX = 0;
  var lookY = 0;
  var lookAt = -99;
  var dark = 0;
  var gems = 0;
  var flies = 0;
  var P = {};

  // seeded generator so one seed always gives the same critter
  function rng(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(x, a, b) {
    return Math.min(b, Math.max(a, x));
  }

  function smooth(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function hsl(h, sa, l) {
    h = (((h % 360) + 360) % 360) / 360;
    var a = sa * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }
    return [f(0), f(8), f(4)];
  }

  function makeCritter(seed) {
    var r = rng(seed);
    var syl = ['bo', 'mi', 'zu', 'ka', 'pi', 'lo', 'tu', 'ne', 'fi', 'ra', 'do', 'sa'];
    var name = '';
    var n = 2 + Math.floor(r() * 2);
    for (var i = 0; i < n; i++) { name += syl[Math.floor(r() * syl.length)]; }
    var hue = r() * 360;
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      earAngle: 0.05 + r() * 1.4,
      earLen: 0.6 + r() * 1.0,
      bodyW: 0.85 + r() * 0.5,
      headS: 0.9 + r() * 0.35,
      tailL: 0.1 + r() * 0.6,
      horn: r() < 0.4 ? 1 : 0,
      eyeSize: 0.9 + r() * 0.5,
      patch: r() < 0.6 ? 0.4 + r() * 0.5 : 0,
      fur: hsl(hue, 0.45 + r() * 0.3, 0.42 + r() * 0.15),
      belly: hsl(hue + (r() - 0.5) * 30, 0.35, 0.82),
      acc: hsl(hue + 150 + r() * 60, 0.6, 0.6),
      iris: hsl(r() * 360, 0.7, 0.45)
    };
  }

  function say(text, secs) {
    msgText = text;
    msgUntil = last + secs;
  }

  function reset() {
    var t = last;
    crit = makeCritter(Math.floor(Math.random() * 4294967295));
    s = { hunger: 0.75, joy: 0.7, energy: 0.9, clean: 0.95 };
    born = t;
    act = { id: 0, t0: 0, dur: 0 };
    evt = { id: 0, t0: 0, dur: 0, x: 0, y: 0, said: 0 };
    sleeping = false;
    hatUntil = 0;
    nextEvt = t + 10;
    lastEvt = 0;
    nextBlink = t + 2;
    blinkT = -9;
    pokeT = -9;
    stageSeen = 0;
    say('A critter hatched: ' + crit.name + '. Say hello by tapping it.', 5);
  }

  function busy() {
    return act.id !== 0 || sleeping;
  }

  function startAct(id, dur) {
    act = { id: id, t0: last, dur: dur };
  }

  function stage() {
    return clamp((last - born) / 240, 0, 1);
  }

  var EVENTS = [
    { id: 1, w: 3, dur: 9 },
    { id: 2, w: 3, dur: 10 },
    { id: 3, w: 2, dur: 6 },
    { id: 4, w: 2, dur: 3.5 },
    { id: 5, w: 2, dur: 7 },
    { id: 6, w: 2, dur: 21 },
    { id: 7, w: 1.5, dur: 0.1 }
  ];

  function startEvt() {
    var pool = EVENTS.filter(function (e) { return e.id !== lastEvt; });
    var total = pool.reduce(function (a, e) { return a + e.w; }, 0);
    var pick = Math.random() * total;
    var e = pool[0];
    for (var i = 0; i < pool.length; i++) {
      pick -= pool[i].w;
      if (pick <= 0) { e = pool[i]; break; }
    }
    var span = Math.max(0.1, W / M / 2 - 0.15);
    evt = { id: e.id, t0: last, dur: e.dur, x: (Math.random() * 2 - 1) * Math.min(span, 0.45), y: 0.3 + Math.random() * 0.3, said: 0 };
    lastEvt = e.id;
    var texts = {
      1: 'Something is glittering. Tap it!',
      2: 'A butterfly! Tap to catch it.',
      3: 'Hic! The critter has hiccups.',
      4: 'The critter scrunches its nose...',
      5: 'The critter feels like dancing!',
      6: 'It is starting to rain.',
      7: 'The critter found a party hat!'
    };
    say(texts[e.id], 4);
    if (e.id === 7) { hatUntil = last + 45; }
  }

  function endEvt() {
    if (evt.id === 1) { say('The gem vanished.', 2.5); }
    if (evt.id === 2) { say('It fluttered away.', 2.5); }
    evt.id = 0;
    nextEvt = last + 14 + Math.random() * 20;
  }

  function bfPos(et) {
    var ax = W / M / 2 + 0.1;
    return [-ax + (et / 10) * 2 * ax, 0.4 + 0.18 * Math.sin(et * 1.7) + 0.07 * Math.sin(et * 5.3)];
  }

  function status() {
    if (sleeping) { return 'Sleeping...'; }
    var names = ['hungry', 'bored', 'tired', 'dirty'];
    var vals = [s.hunger, s.joy, s.energy, s.clean];
    var m = 0;
    for (var i = 1; i < 4; i++) { if (vals[i] < vals[m]) { m = i; } }
    return vals[m] < 0.3 ? crit.name + ' is ' + names[m] + '.' : '';
  }

  function update(t, dt) {
    var k = sleeping ? 0.3 : 1;
    s.hunger -= 0.010 * dt * k;
    s.joy -= (0.008 + (s.hunger < 0.2 ? 0.01 : 0)) * dt * k;
    s.clean -= 0.006 * dt * k;
    s.energy += sleeping ? 0.05 * dt : -0.006 * dt;
    Object.keys(s).forEach(function (key) { s[key] = clamp(s[key], 0, 1); });
    if (sleeping && s.energy >= 1) {
      sleeping = false;
      say('Fully rested!', 3);
    }
    if (act.id && t > act.t0 + act.dur) { act.id = 0; }
    if (evt.id && t > evt.t0 + evt.dur) { endEvt(); }
    if (!sleeping && !act.id && !evt.id && t > nextEvt) { startEvt(); }
    var age = t - born;
    if (stageSeen === 0 && age > 60) { stageSeen = 1; say(crit.name + ' is growing up!', 4); }
    if (stageSeen === 1 && age > 150) { stageSeen = 2; say(crit.name + ' is almost fully grown!', 4); }
  }

  // derives every animated value from state and the running action or event
  function computePose(t, dt) {
    var at = act.id ? t - act.t0 : 0;
    var et = evt.id ? t - evt.t0 : 0;
    var mood = (s.hunger + s.joy + s.energy + s.clean) / 4;
    var low = Math.min(s.hunger, s.joy, s.energy, s.clean);
    var joy = s.joy;
    var sg = stage();
    var sc = 0.75 + 0.3 * sg;
    var hop = 0.012 * Math.abs(Math.sin(t * 3)) * joy;
    var squash = Math.sin(t * (sleeping ? 1.3 : 2.4)) * 0.012;
    var dip = 0;
    var sway = 0;
    var arm = 0.1 + 0.1 * Math.sin(t * 1.7);
    var mouth = 0;
    var smile = low < 0.25 ? -0.8 : (mood > 0.6 ? 0.9 : 0.25);
    var eye = sleeping ? 0.05 : 0.35 + 0.65 * Math.sqrt(s.energy);
    var wag = Math.sin(t * (2 + joy * 7)) * (0.15 + 0.85 * joy);
    var flop = 0.12 * Math.sin(t * 1.9 + 1) * joy + (low < 0.25 ? 0.35 : 0);
    var tx = (t - lookAt > 4) ? 0.3 * Math.sin(t * 0.4) : lookX;
    var ty = (t - lookAt > 4) ? 0.1 : lookY;
    var apple = [0, 0, 0, 0];
    var ball = [0, 0, 0, 0];
    var bub = -1;
    var rain = 0;
    var rainbow = 0;
    var ov = [0, 0, 0, 0];

    if (sleeping) { dip = 0.12; smile = 0.3; wag = 0; arm = 0; tx = 0; ty = 0; }

    if (act.id === 1) {
      var mz = (0.1 + 0.40 * crit.headS) * sc;
      var my = (1.28 - 0.19 * crit.headS) * sc + hop;
      if (at < 0.9) {
        var e = smooth(0, 0.9, at);
        apple = [0.8 * (1 - e), 1.9 + (my - 1.9) * e, 1.0 + (mz - 1.0) * e, 1];
        tx = 0.5 * (1 - e);
        ty = 0.4 * (1 - e);
      } else if (at < 1.7) {
        apple = [0, my, mz - 0.4 * smooth(0.9, 1.4, at), 1];
      }
      if (at > 0.8 && at < 2.3) {
        mouth = 0.5 + 0.5 * Math.sin(at * 11);
        dip += 0.06 * Math.sin(at * 11);
      }
      arm = 0.5;
      smile = 0.9;
    } else if (act.id === 2) {
      var bx = Math.sin(at * 2.2);
      var by = 0.22 + Math.abs(Math.sin(at * 4.4)) * 0.9;
      ball = [bx, by, 0.8, 1];
      tx = bx * 0.6;
      ty = (by - 0.9) * 0.5;
      hop += Math.abs(Math.sin(at * 4.4 + 1)) * 0.18;
      arm = 0.9 * Math.abs(Math.sin(at * 4.4));
      smile = 1;
      wag = Math.sin(t * 12);
    } else if (act.id === 3) {
      bub = at / act.dur;
      if (at > 1.8) { sway = Math.sin(at * 25) * 0.6 * Math.max(0, 1 - (at - 1.8)); }
      eye *= 0.5;
      smile = 0.8;
    }

    if (evt.id === 1 || evt.id === 2) {
      var pos;
      if (evt.id === 1) {
        var pop = Math.min(1, et * 2.5) * Math.min(1, (evt.dur - et) * 2);
        pos = [evt.x, evt.y + 0.015 * Math.sin(t * 3)];
        ov = [pos[0], pos[1], 0.09 * pop, 1];
      } else {
        pos = bfPos(et);
        ov = [pos[0], pos[1], 0.09, 2];
      }
      if (!sleeping && !act.id) {
        tx = pos[0] * 1.6;
        ty = (pos[1] - 0.45) * 1.2;
      }
    } else if (evt.id === 3) {
      var f = (et / 1.2) % 1;
      if (f < 0.35) {
        hop += 0.22 * Math.sin(Math.PI * f / 0.35);
        squash -= 0.04;
      }
    } else if (evt.id === 4) {
      if (et < 1.0) {
        dip = -0.12 * et;
      } else if (et < 1.3) {
        dip = 0.28;
        squash = 0.14;
        mouth = 0.8;
        if (!evt.said) { evt.said = 1; say('Achoo!', 2); }
      } else {
        dip = 0.28 * Math.max(0, 1 - (et - 1.3) / 0.8);
      }
    } else if (evt.id === 5) {
      var ramp = Math.min(1, et) * Math.min(1, evt.dur - et);
      sway = Math.sin(et * 5.5) * ramp;
      hop += Math.abs(Math.sin(et * 5.5)) * 0.22 * ramp;
      arm = 1.0 + 0.4 * Math.sin(et * 11) * ramp;
      wag = Math.sin(t * 14);
      smile = 1;
    } else if (evt.id === 6) {
      rain = smooth(0, 1.5, et) * (1 - smooth(9, 11, et));
      rainbow = smooth(10, 12, et) * (1 - smooth(17, 20, et));
      hop += 0.04 * Math.abs(Math.sin(et * 4)) * rain;
      if (et > 10 && !evt.said) { evt.said = 1; say('A rainbow!', 3); }
    }

    var pt = t - pokeT;
    if (pt < 0.6) { hop += 0.14 * Math.abs(Math.sin(pt * Math.PI / 0.3)) * (1 - pt / 0.6); }

    if (!sleeping) {
      if (t > nextBlink) { blinkT = t; nextBlink = t + 2 + Math.random() * 4; }
      var bt = t - blinkT;
      if (bt < 0.16) { eye *= 1 - 0.93 * Math.sin(Math.PI * bt / 0.16); }
    }

    gx += (clamp(tx, -1, 1) - gx) * Math.min(1, dt * 5);
    gy += (clamp(ty, -1, 1) - gy) * Math.min(1, dt * 5);
    dark += ((sleeping ? 1 : 0) - dark) * Math.min(1, dt * 1.5);

    P = {
      hop: hop, squash: squash, dip: dip, sway: sway, eye: eye, smile: smile, wag: wag,
      arm: arm, mouth: mouth, flop: flop, apple: apple, ball: ball, bub: bub,
      rain: rain, rainbow: rainbow, ov: ov, stage: sg, hat: t < hatUntil ? 1 : 0
    };
  }

  function lin(c) {
    return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)];
  }

  function fillUniforms(t, w, h) {
    var d = new Date();
    var tod = (d.getHours() + d.getMinutes() / 60) / 24;
    var vals = [
      w, h, t, 0,
      P.hop, P.squash, P.dip, P.sway,
      P.eye, P.smile, P.wag, P.arm,
      gx, gy, P.mouth, P.flop,
      crit.earAngle, crit.earLen, crit.bodyW, crit.headS,
      crit.tailL, crit.horn * smooth(0.5, 0.8, P.stage), crit.eyeSize, P.stage,
      tod, dark, P.rain, P.hat,
      P.ov[0], P.ov[1], P.ov[2], P.ov[3],
      P.apple[0], P.apple[1], P.apple[2], P.apple[3],
      P.ball[0], P.ball[1], P.ball[2], P.ball[3],
      P.bub, crit.patch, P.rainbow, 1 - s.clean
    ];
    [crit.fur, crit.belly, crit.acc, crit.iris].forEach(function (c) {
      var l = lin(c);
      vals.push(l[0], l[1], l[2], 0);
    });
    for (var i = 0; i < vals.length; i++) { U[i] = vals[i]; }
    return tod;
  }

  function css(c, mul) {
    var m = mul || 1;
    return 'rgb(' + c.map(function (x) { return Math.round(clamp(x * m, 0, 1) * 255); }).join(',') + ')';
  }

  // plain 2D version of the scene, used when WebGPU is unavailable or fails
  function render2d(tod) {
    var c = ctx2d;
    var cw = flatCv.width;
    var ch = flatCv.height;
    var mu = Math.min(cw, ch);
    function X(x) { return cw / 2 + x * mu; }
    function Y(y) { return ch / 2 - y * mu; }
    function ell(x, y, rx, ry, rot) {
      c.beginPath();
      c.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rot || 0, 0, Math.PI * 2);
      c.fill();
    }
    function pr(p) {
      var k = 1.8 / (4.6 - p[2]);
      return [X(p[0] * k), Y((p[1] - 1.12) * k)];
    }
    var day = clamp(Math.sin(tod * 6.2832 - 1.5708) * 1.5 + 0.5, 0, 1);
    var g = c.createLinearGradient(0, 0, 0, Y(0.13));
    g.addColorStop(0, css([0.05 + 0.3 * day, 0.07 + 0.5 * day, 0.2 + 0.7 * day]));
    g.addColorStop(1, css([0.2 + 0.6 * day, 0.25 + 0.6 * day, 0.35 + 0.55 * day]));
    c.fillStyle = g;
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = css([0.15 + 0.1 * day, 0.35 + 0.25 * day, 0.12 + 0.1 * day]);
    c.fillRect(0, Y(0.13), cw, ch);
    var k = mu * 0.42 * (0.8 + 0.25 * P.stage);
    var cx = X(P.sway * 0.02);
    var base = Y(-0.44) - P.hop * mu * 0.4;
    var hs = crit.headS;
    var bw = crit.bodyW;
    c.fillStyle = '#0004';
    ell(X(0), Y(-0.44), 0.7 * k, 0.12 * k);
    c.fillStyle = css(crit.fur, 0.8);
    ell(cx + (0.25 + 0.2 * P.wag) * k, base - 0.5 * k, 0.12 * k, 0.12 * k + crit.tailL * 0.1 * k);
    ell(cx - 0.28 * bw * k, base - 0.08 * k, 0.17 * k, 0.1 * k);
    ell(cx + 0.28 * bw * k, base - 0.08 * k, 0.17 * k, 0.1 * k);
    c.fillStyle = css(crit.fur);
    ell(cx, base - 0.6 * k, 0.6 * bw * k, 0.52 * k * (1 - P.squash));
    c.fillStyle = css(crit.belly);
    ell(cx, base - 0.5 * k, 0.34 * bw * k, 0.34 * k);
    c.fillStyle = css(crit.fur);
    ell(cx - 0.55 * bw * k, base - 0.5 * k, 0.11 * k, 0.2 * k, 0.4 + P.arm * 0.4);
    ell(cx + 0.55 * bw * k, base - 0.5 * k, 0.11 * k, 0.2 * k, -0.4 - P.arm * 0.4);
    var hy = base - 1.25 * k + P.dip * k;
    [-1, 1].forEach(function (sd) {
      c.fillStyle = css(crit.fur, 0.9);
      ell(cx + sd * 0.3 * hs * k, hy - 0.4 * hs * k, 0.13 * k, 0.22 * crit.earLen * k, sd * (crit.earAngle + P.flop));
    });
    c.fillStyle = css(crit.fur);
    ell(cx, hy, 0.46 * hs * k, 0.4 * hs * k);
    [-1, 1].forEach(function (sd) {
      var ex = cx + sd * 0.2 * hs * k + gx * 0.02 * k;
      c.fillStyle = '#eee';
      ell(ex, hy - 0.05 * k, 0.1 * crit.eyeSize * k, 0.1 * crit.eyeSize * k * Math.max(P.eye, 0.08));
      c.fillStyle = css(crit.iris);
      ell(ex + gx * 0.03 * k, hy - 0.05 * k, 0.06 * k, 0.06 * k * Math.max(P.eye, 0.08));
    });
    c.fillStyle = css(crit.acc, 0.5);
    ell(cx, hy + 0.06 * k, 0.05 * k, 0.04 * k);
    c.strokeStyle = '#300';
    c.lineWidth = Math.max(1.5, k * 0.02);
    c.beginPath();
    c.moveTo(cx - 0.12 * k, hy + 0.14 * k - P.smile * 0.03 * k);
    c.quadraticCurveTo(cx, hy + 0.14 * k + P.smile * 0.06 * k + P.mouth * 0.05 * k, cx + 0.12 * k, hy + 0.14 * k - P.smile * 0.03 * k);
    c.stroke();
    if (P.hat) {
      c.fillStyle = css(crit.iris);
      c.beginPath();
      c.moveTo(cx - 0.14 * k, hy - 0.36 * hs * k);
      c.lineTo(cx + 0.02 * k, hy - 0.36 * hs * k - 0.5 * k);
      c.lineTo(cx + 0.16 * k, hy - 0.34 * hs * k);
      c.fill();
    }
    if (P.apple[3]) {
      var a = pr(P.apple);
      c.fillStyle = '#c0201c';
      ell(a[0], a[1], 0.05 * mu, 0.05 * mu);
    }
    if (P.ball[3]) {
      var b = pr(P.ball);
      c.fillStyle = '#d82a22';
      ell(b[0], b[1], 0.07 * mu, 0.07 * mu);
    }
    if (P.ov[3] === 1) {
      c.fillStyle = '#58d0ff';
      c.beginPath();
      c.moveTo(X(P.ov[0]), Y(P.ov[1] + P.ov[2]));
      c.lineTo(X(P.ov[0] + P.ov[2] * 0.85), Y(P.ov[1]));
      c.lineTo(X(P.ov[0]), Y(P.ov[1] - P.ov[2]));
      c.lineTo(X(P.ov[0] - P.ov[2] * 0.85), Y(P.ov[1]));
      c.fill();
    } else if (P.ov[3] === 2) {
      c.fillStyle = css(crit.acc);
      var fl = 0.3 + 0.7 * Math.abs(Math.sin(last * 13));
      ell(X(P.ov[0]) - 0.04 * mu * fl, Y(P.ov[1]), 0.05 * mu * fl, 0.04 * mu);
      ell(X(P.ov[0]) + 0.04 * mu * fl, Y(P.ov[1]), 0.05 * mu * fl, 0.04 * mu);
    }
    if (P.rain > 0.01) {
      c.strokeStyle = 'rgba(180,200,255,' + 0.5 * P.rain + ')';
      c.lineWidth = 1;
      c.beginPath();
      for (var i = 0; i < 60; i++) {
        var rx = (i * 97.3 % cw);
        var ry = ((i * 53.1 + last * 500) % ch);
        c.moveTo(rx, ry);
        c.lineTo(rx - 3, ry + 14);
      }
      c.stroke();
    }
    c.fillStyle = 'rgba(10,15,40,' + clamp((1 - day) * 0.5 + dark * 0.4, 0, 0.8) + ')';
    c.fillRect(0, 0, cw, ch);
  }

  function renderGpu() {
    var g = gpu;
    g.device.queue.writeBuffer(g.buf, 0, U);
    var enc = g.device.createCommandEncoder();
    var pass = enc.beginRenderPass({
      colorAttachments: [{
        view: g.ctx.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }]
    });
    pass.setPipeline(g.pipe);
    pass.setBindGroup(0, g.bind);
    pass.draw(3);
    pass.end();
    g.device.queue.submit([enc.finish()]);
  }

  async function initGpu() {
    if (!navigator.gpu) { return null; }
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { return null; }
    var device = await adapter.requestDevice();
    var format = navigator.gpu.getPreferredCanvasFormat();
    var ctx = gpuCv.getContext('webgpu');
    if (!ctx) { return null; }
    ctx.configure({ device: device, format: format, alphaMode: 'opaque' });
    var mod = device.createShaderModule({ code: WGSL });
    var info = await mod.getCompilationInfo();
    if (info.messages.some(function (m) { return m.type === 'error'; })) { return null; }
    device.pushErrorScope('validation');
    var pipe = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: mod, entryPoint: 'vs' },
      fragment: { module: mod, entryPoint: 'fs', targets: [{ format: format }] },
      primitive: { topology: 'triangle-list' }
    });
    var err = await device.popErrorScope();
    if (err) { return null; }
    var buf = device.createBuffer({ size: 240, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    var bind = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: buf } }] });
    device.lost.then(function () { useFlat(); });
    return { device: device, ctx: ctx, pipe: pipe, buf: buf, bind: bind };
  }

  function useFlat() {
    gpu = null;
    gpuCv.hidden = true;
    flatCv.hidden = false;
    ctx2d = flatCv.getContext('2d');
    resize();
  }

  function resize() {
    W = document.documentElement.clientWidth || window.innerWidth;
    H = document.documentElement.clientHeight || window.innerHeight;
    M = Math.min(W, H);
    var sc = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.4e6 / (W * H)));
    [gpuCv, flatCv].forEach(function (cv) {
      cv.width = Math.max(1, Math.round(W * sc));
      cv.height = Math.max(1, Math.round(H * sc));
    });
  }

  function updateHud(t) {
    var vals = [s.hunger, s.joy, s.energy, s.clean];
    var cols = ['#f0a04b', '#f06fa8', '#6fa8f0', '#5fd0c8'];
    barEls.forEach(function (b, i) {
      b.style.width = Math.round(vals[i] * 100) + '%';
      b.style.background = vals[i] < 0.25 ? '#e5484d' : cols[i];
    });
    var stageName = (t - born) < 60 ? 'baby' : ((t - born) < 150 ? 'young' : 'grown');
    whoEl.textContent = crit.name + ' (' + stageName + ')';
    scoreEl.textContent = 'Gems ' + gems + '  Butterflies ' + flies;
    msgEl.textContent = t < msgUntil ? msgText : status();
    zzEl.hidden = !sleeping;
    btn.feed.disabled = busy();
    btn.play.disabled = busy() || s.energy < 0.1;
    btn.wash.disabled = busy();
    btn.rest.disabled = act.id !== 0;
    btn.rest.textContent = sleeping ? 'Wake' : 'Sleep';
  }

  function frame(ms) {
    var t = ms / 1000;
    var dt = Math.min(0.1, t - last);
    last = t;
    update(t, dt);
    computePose(t, dt);
    var tod = fillUniforms(t, gpuCv.width, gpuCv.height);
    updateHud(t);
    if (gpu) {
      renderGpu();
    } else if (ctx2d) {
      render2d(tod);
    }
    requestAnimationFrame(frame);
  }

  btn.feed.addEventListener('click', function () {
    if (busy()) { return; }
    s.hunger = clamp(s.hunger + 0.4, 0, 1);
    s.clean = clamp(s.clean - 0.05, 0, 1);
    startAct(1, 2.6);
    say('Nom nom nom.', 2.5);
  });
  btn.play.addEventListener('click', function () {
    if (busy()) { return; }
    s.joy = clamp(s.joy + 0.4, 0, 1);
    s.energy = clamp(s.energy - 0.1, 0, 1);
    s.hunger = clamp(s.hunger - 0.06, 0, 1);
    startAct(2, 3.4);
    say('Catch!', 2.5);
  });
  btn.wash.addEventListener('click', function () {
    if (busy()) { return; }
    s.clean = clamp(s.clean + 0.6, 0, 1);
    startAct(3, 2.8);
    say('Splish splash.', 2.5);
  });
  btn.rest.addEventListener('click', function () {
    if (act.id) { return; }
    sleeping = !sleeping;
    if (sleeping) {
      evt.id = 0;
      hatUntil = 0;
      nextEvt = last + 15;
      say('Good night.', 2.5);
    } else {
      say('Good morning!', 2.5);
    }
  });
  btn.egg.addEventListener('click', reset);

  window.addEventListener('pointermove', function (e) {
    lookX = clamp((e.clientX - W / 2) / (W / 2), -1, 1);
    lookY = clamp(-(e.clientY - H * 0.4) / (H / 2), -1, 1);
    lookAt = last;
  });

  window.addEventListener('pointerdown', function (e) {
    if (e.target !== gpuCv && e.target !== flatCv) { return; }
    var ux = (e.clientX - W / 2) / M;
    var uy = -(e.clientY - H / 2) / M;
    var et = last - evt.t0;
    if (evt.id === 1 && Math.hypot(ux - evt.x, uy - evt.y) < 0.13) {
      gems++;
      s.joy = clamp(s.joy + 0.15, 0, 1);
      say('Collected a gem!', 3);
      evt.id = 0;
      nextEvt = last + 14 + Math.random() * 20;
      return;
    }
    if (evt.id === 2) {
      var b = bfPos(et);
      if (Math.hypot(ux - b[0], uy - b[1]) < 0.13) {
        flies++;
        s.joy = clamp(s.joy + 0.15, 0, 1);
        say('Caught a butterfly, then let it go.', 3);
        evt.id = 0;
        nextEvt = last + 14 + Math.random() * 20;
        return;
      }
    }
    if (!sleeping && Math.hypot(ux, uy + 0.05) < 0.3) {
      pokeT = last;
      s.joy = clamp(s.joy + 0.03, 0, 1);
      var lines = ['Giggle!', 'Hehe.', 'That tickles.', 'Boop!'];
      say(lines[Math.floor(Math.random() * lines.length)], 1.5);
    }
  });

  window.addEventListener('resize', resize);

  last = performance.now() / 1000;
  resize();
  reset();
  initGpu().then(function (g) {
    if (g) {
      gpu = g;
    } else {
      useFlat();
    }
  }).catch(function () {
    useFlat();
  });
  requestAnimationFrame(frame);
})();
