(function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const bubble = document.getElementById('speech-bubble');
  const hint = document.getElementById('hint');
  let width = 0, height = 0, dpr = 1, waterTime = 0, bearTime = 0;
  let sunAngle = Math.PI * 0.25, realistic = false, taps = 0, lastTap = 0;
  let bearPos = { x: 0, y: 0, radius: 25 }, splashes = [], audioCtx = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  const grainCtx = grain.getContext('2d');
  const grainPixels = grainCtx.createImageData(256, 256);
  for (let i = 0; i < grainPixels.data.length; i += 4) {
    const v = 90 + Math.random() * 165;
    grainPixels.data[i] = v;
    grainPixels.data[i + 1] = v;
    grainPixels.data[i + 2] = v;
    grainPixels.data[i + 3] = 35 + Math.random() * 55;
  }
  grainCtx.putImageData(grainPixels, 0, 0);
  const grainPattern = ctx.createPattern(grain, 'repeat');

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function speakRelax() {
    try {
      initAudio();
      if (audioCtx) {
        const t = audioCtx.currentTime;
        [220, 277.18, 329.63, 440].forEach((freq, i) => {
          const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.15);
          gain.gain.setValueAtTime(0, t + i * 0.15);
          gain.gain.linearRampToValueAtTime(0.08, t + i * 0.15 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 1.2);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 1.3);
        });
      }
    } catch (e) {}
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance('relax, relax');
      utter.rate = 0.75; utter.pitch = 0.85; utter.volume = 1;
      const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    }
  }
  function interact() {
    speakRelax();
    if (bubble) {
      bubble.classList.add('visible');
      bubble.style.left = bearPos.x + 'px';
      bubble.style.top = bearPos.y - 35 + 'px';
      clearTimeout(bubble.timer);
      bubble.timer = setTimeout(() => bubble.classList.remove('visible'), 2800);
    }
    splashes.push({ x: bearPos.x, y: bearPos.y, radius: 10, alpha: 1 });
    const now = Date.now();
    taps = now - lastTap > 2600 ? 1 : taps + 1;
    lastTap = now;
    if (taps >= 3 && !realistic) {
      realistic = true;
      if (hint) {
        hint.textContent = 'A more realistic world';
        hint.style.opacity = '1';
        setTimeout(() => { hint.style.opacity = '0'; }, 3500);
      }
    }
  }
  canvas.addEventListener('pointerdown', e => {
    initAudio();
    const r = canvas.getBoundingClientRect();
    if (Math.hypot(e.clientX - r.left - bearPos.x, e.clientY - r.top - bearPos.y) < bearPos.radius * 2.8) interact();
  });

  function pathMountain(cx, base, scale, profile) {
    ctx.beginPath();
    ctx.moveTo(cx + profile[0][0] * scale, base + profile[0][1] * scale);
    for (let i = 1; i < profile.length; i++) ctx.lineTo(cx + profile[i][0] * scale, base + profile[i][1] * scale);
    ctx.closePath();
  }
  function drawTexturedMountain(cx, base, scale, daylight, main) {
    const profile = main
      ? [[-1.05,.12],[-.78,-.08],[-.53,-.34],[-.28,-.62],[-.08,-1],[.04,-.77],[.2,-.53],[.38,-.35],[.72,-.08],[1.02,.12]]
      : [[-1.1,.12],[-.72,-.2],[-.45,-.12],[-.1,-.46],[.2,-.2],[.58,-.35],[1.1,.12]];
    const top = main ? -scale : -.46 * scale;
    const rock = ctx.createLinearGradient(cx - scale, base, cx + scale, base + top);
    rock.addColorStop(0, daylight > .25 ? '#59636a' : '#202b3b');
    rock.addColorStop(.42, daylight > .25 ? '#8b9291' : '#354052');
    rock.addColorStop(1, daylight > .25 ? '#303a43' : '#111b2a');
    pathMountain(cx, base, scale, profile);
    ctx.fillStyle = rock;
    ctx.fill();
    ctx.save();
    pathMountain(cx, base, scale, profile);
    ctx.clip();
    for (let i = 0; i < 190; i++) {
      const r1 = Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1;
      const r2 = Math.abs(Math.sin(i * 78.233) * 24634.6345) % 1;
      const r3 = Math.abs(Math.sin(i * 39.425) * 56445.234) % 1;
      const x = cx + (r1 * 2 - 1) * scale;
      const y = base - r2 * scale * (main ? .98 : .48);
      const len = scale * (.008 + r3 * .07);
      ctx.strokeStyle = `rgba(${daylight > .25 ? 205 : 115},${daylight > .25 ? 211 : 133},${daylight > .25 ? 210 : 160},${.025 + r1 * .12})`;
      ctx.lineWidth = .35 + r2 * 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * .45, y - len); ctx.stroke();
    }
    ctx.restore();
    if (main) {
      ctx.beginPath();
      ctx.moveTo(cx - scale * .43, base - scale * .36);
      ctx.lineTo(cx - scale * .08, base - scale);
      ctx.lineTo(cx + scale * .04, base - scale * .77);
      ctx.lineTo(cx + scale * .2, base - scale * .53);
      ctx.lineTo(cx + scale * .02, base - scale * .64);
      ctx.lineTo(cx - scale * .1, base - scale * .55);
      ctx.lineTo(cx - scale * .23, base - scale * .69);
      ctx.closePath();
      const snow = ctx.createLinearGradient(cx, base - scale, cx, base - scale * .32);
      snow.addColorStop(0, daylight > .2 ? '#f5f5ef' : '#c5d0df');
      snow.addColorStop(1, daylight > .2 ? '#aebbc4' : '#64748a');
      ctx.fillStyle = snow; ctx.fill();
      ctx.save();
      ctx.globalAlpha = .2;
      ctx.fillStyle = grainPattern;
      ctx.fillRect(cx - scale, base - scale, scale * 2, scale);
      ctx.restore();
    }
  }
  function drawVectorMountain(cx, base, scale) {
    ctx.fillStyle = '#657d91';
    ctx.beginPath(); ctx.moveTo(cx - scale, base); ctx.lineTo(cx - scale * .08, base - scale); ctx.lineTo(cx + scale, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8eef2';
    ctx.beginPath(); ctx.moveTo(cx - scale * .43, base - scale * .62); ctx.lineTo(cx - scale * .08, base - scale); ctx.lineTo(cx + scale * .28, base - scale * .61); ctx.lineTo(cx + scale * .03, base - scale * .72); ctx.lineTo(cx - scale * .12, base - scale * .66); ctx.closePath(); ctx.fill();
  }
  function drawBear(x, y, heading, radius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    const s = radius / 25;
    ctx.scale(s, s);
    if (!realistic) {
      ctx.fillStyle = '#4a2e1b';
      ctx.beginPath(); ctx.ellipse(-12, 0, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d2312';
      ctx.beginPath(); ctx.arc(-1, -11, 5, 0, Math.PI * 2); ctx.arc(-1, 11, 5, 0, Math.PI * 2); ctx.fill();
      const head = ctx.createRadialGradient(2, 0, 2, 0, 0, 16);
      head.addColorStop(0, '#805a3d'); head.addColorStop(1, '#3b2211');
      ctx.fillStyle = head; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8c6343'; ctx.beginPath(); ctx.ellipse(9, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(15, 0, 3, 0, Math.PI * 2); ctx.arc(5, -6, 2, 0, Math.PI * 2); ctx.arc(5, 6, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
      const body = ctx.createRadialGradient(-7, -8, 2, -5, 0, 29);
      body.addColorStop(0, '#a77b51'); body.addColorStop(.48, '#68452e'); body.addColorStop(1, '#24170f');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(-12, 1, 24, 14, -.12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#392316';
      ctx.beginPath(); ctx.arc(-2, -12, 6, 0, Math.PI * 2); ctx.arc(-2, 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a77b51';
      ctx.beginPath(); ctx.arc(-2, -12, 3.5, 0, Math.PI * 2); ctx.arc(-2, 12, 3.5, 0, Math.PI * 2); ctx.fill();
      const head = ctx.createRadialGradient(-4, -7, 1, 1, 0, 18);
      head.addColorStop(0, '#b18459'); head.addColorStop(.55, '#795333'); head.addColorStop(1, '#2a1a11');
      ctx.fillStyle = head; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      const muzzle = ctx.createRadialGradient(9, -2, 1, 10, 0, 9);
      muzzle.addColorStop(0, '#c49a70'); muzzle.addColorStop(1, '#62432e');
      ctx.fillStyle = muzzle; ctx.beginPath(); ctx.ellipse(10, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#100d0b'; ctx.beginPath(); ctx.ellipse(17, 0, 3.5, 2.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#090807'; ctx.beginPath(); ctx.arc(5, -7, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(244,211,174,.7)';
      for (let i = 0; i < 48; i++) {
        const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const r2 = Math.abs(Math.sin(i * 78.233) * 24634.6345) % 1;
        const a = r1 * Math.PI * 2, rr = Math.sqrt(r2);
        const px = Math.cos(a) * 14 * rr, py = Math.sin(a) * 12 * rr;
        ctx.strokeStyle = `rgba(${115 + r1 * 95},${75 + r2 * 65},${43 + r1 * 35},${.12 + r2 * .35})`;
        ctx.lineWidth = .35 + r1 * .65;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2, py + (r2 - .5) * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(-1, -2, 14, -2.4, -.7); ctx.stroke();
    }
    const paddle = Math.sin(waterTime * 5) * 8;
    ctx.fillStyle = realistic ? '#49301f' : 'rgba(61,35,18,.7)';
    ctx.beginPath(); ctx.ellipse(10 + paddle, -14, 6, 4, .3, 0, Math.PI * 2); ctx.ellipse(10 - paddle, 14, 6, 4, -.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render() {
    waterTime += .03; bearTime += .008; sunAngle = (sunAngle + .0008) % (Math.PI * 2);
    const horizon = height * .58, lakeH = height - horizon;
    const sunX = width * .5 + Math.cos(sunAngle) * width * .42;
    const sunY = horizon - height * .05 - Math.sin(sunAngle) * height * .38;
    const daylight = Math.max(0, Math.min(1, ((horizon - sunY) / (height * .38) + .2) / 1.2));
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    if (daylight > .5) {
      const f = (daylight - .5) * 2;
      sky.addColorStop(0, `rgb(${20 + 40*f},${70 + 100*f},${150 + 95*f})`);
      sky.addColorStop(1, `rgb(${190 + 40*f},${215 + 30*f},${230 + 20*f})`);
    } else {
      const f = daylight * 2;
      sky.addColorStop(0, '#081326'); sky.addColorStop(.65, `rgb(${100 + 25*f},${65 + 55*f},${95 + 80*f})`);
      sky.addColorStop(1, `rgb(${210 + 35*f},${115 + 65*f},${90 + 110*f})`);
    }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    if (daylight < .6) {
      for (let i = 0; i < 100; i++) {
        const x = (i * 127.13 % width), y = (i * 71.7 % (horizon * .85));
        ctx.fillStyle = `rgba(255,255,255,${(1 - daylight/.6) * (.2 + .5*Math.abs(Math.sin(i*13)))})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 115);
    sunGlow.addColorStop(0, 'rgba(255,245,215,.95)'); sunGlow.addColorStop(.3, 'rgba(255,190,120,.25)'); sunGlow.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = sunGlow; ctx.fillRect(sunX - 120, sunY - 120, 240, 240);
    ctx.fillStyle = daylight > .05 ? '#fff4d7' : '#e3eafa';
    ctx.beginPath(); ctx.arc(sunX, sunY, daylight > .05 ? 13 : 9, 0, Math.PI * 2); ctx.fill();

    if (realistic) {
      drawTexturedMountain(width * .18, horizon + 5, Math.min(width, height) * .42, daylight, false);
      drawTexturedMountain(width * .83, horizon + 4, Math.min(width, height) * .48, daylight, false);
      drawTexturedMountain(width * .5, horizon + 4, Math.min(width, height) * .56, daylight, true);
      ctx.fillStyle = 'rgba(24,35,39,.55)';
      ctx.beginPath(); ctx.moveTo(0,horizon); ctx.quadraticCurveTo(width*.2,horizon-height*.16,width*.34,horizon); ctx.lineTo(0,horizon); ctx.fill();
      ctx.beginPath(); ctx.moveTo(width,horizon); ctx.quadraticCurveTo(width*.82,horizon-height*.13,width*.67,horizon); ctx.lineTo(width,horizon); ctx.fill();
    } else {
      ctx.fillStyle = '#1c3444'; ctx.beginPath(); ctx.moveTo(0,horizon); ctx.lineTo(width*.15,horizon-height*.18); ctx.lineTo(width*.35,horizon-height*.12); ctx.lineTo(width*.7,horizon-height*.22); ctx.lineTo(width,horizon-height*.1); ctx.lineTo(width,horizon); ctx.fill();
      drawVectorMountain(width*.5, horizon + height*.02, Math.min(width,height)*.55);
    }

    const lake = ctx.createLinearGradient(0, horizon, 0, height);
    lake.addColorStop(0, daylight > .2 ? '#356b78' : '#102735');
    lake.addColorStop(.45, daylight > .2 ? '#174c60' : '#183344');
    lake.addColorStop(1, daylight > .2 ? '#092b3a' : '#091b2b');
    ctx.fillStyle = lake; ctx.fillRect(0, horizon, width, lakeH);
    ctx.save();
    for (let y = horizon + 3; y < height; y += realistic ? 2.5 : 4) {
      const p = (y - horizon) / lakeH, wave = Math.sin(waterTime * 2 + y * .08) * (2 + p * 7);
      const shimmer = Math.sin(waterTime * 3 + y * .15) * .5 + .5;
      ctx.strokeStyle = realistic
        ? `rgba(${daylight > .2 ? 190 : 130},${daylight > .2 ? 210 : 165},${daylight > .2 ? 205 : 205},${.035 + shimmer * .13})`
        : `rgba(220,235,255,${.08 + shimmer * .12})`;
      ctx.lineWidth = realistic ? .5 + p * 1.3 : 2;
      ctx.beginPath(); ctx.moveTo(sunX - 40*(1+p) + wave, y); ctx.lineTo(sunX + 40*(1+p) + wave, y); ctx.stroke();
    }
    if (realistic) {
      ctx.globalAlpha = .12; ctx.fillStyle = grainPattern; ctx.fillRect(0, horizon, width, lakeH);
    }
    ctx.restore();

    const cx = width * .5, cy = horizon + lakeH * .55;
    const rx = width * .28, ry = lakeH * .28;
    const bx = cx + Math.cos(bearTime) * rx + Math.sin(bearTime * 2) * 20;
    const by = cy + Math.sin(bearTime) * ry;
    const nx = cx + Math.cos(bearTime + .02) * rx + Math.sin((bearTime + .02) * 2) * 20;
    const ny = cy + Math.sin(bearTime + .02) * ry;
    const heading = Math.atan2(ny - by, nx - bx);
    bearPos = { x: bx, y: by, radius: Math.min(width, height) * (realistic ? .052 : .045) };
    if (bubble && bubble.classList.contains('visible')) {
      bubble.style.left = bx + 'px'; bubble.style.top = (by - 35) + 'px';
    }
    ctx.save(); ctx.strokeStyle = realistic ? 'rgba(220,238,241,.35)' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(bx - 30, by + 8, 24 + Math.sin(waterTime)*4, 5, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i]; sp.radius += 1.5; sp.alpha -= .025;
      if (sp.alpha <= 0) { splashes.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255,255,255,${sp.alpha})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, sp.radius, sp.radius*.4, 0, 0, Math.PI*2); ctx.stroke();
    }
    drawBear(bx, by, heading, bearPos.radius);
    if (realistic) {
      ctx.save(); ctx.globalAlpha = .055; ctx.fillStyle = grainPattern; ctx.fillRect(0, 0, width, height); ctx.restore();
      const vignette = ctx.createRadialGradient(width*.5,height*.48,Math.min(width,height)*.2,width*.5,height*.48,Math.max(width,height)*.72);
      vignette.addColorStop(.55,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,0,0,.34)');
      ctx.fillStyle = vignette; ctx.fillRect(0,0,width,height);
    }
    requestAnimationFrame(render);
  }

  setTimeout(() => { if (hint) hint.style.opacity = '0'; }, 6000);
  render();
})();