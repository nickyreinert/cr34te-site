(function() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const bubble = document.getElementById('speech-bubble');
  const hint = document.getElementById('hint');

  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  setTimeout(() => {
    if (hint) hint.style.opacity = '0';
  }, 6000);

  const numStars = 150;
  const stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random() * 0.55,
      size: Math.random() * 1.8 + 0.5,
      alpha: Math.random(),
      speed: 0.01 + Math.random() * 0.03
    });
  }

  let sunAngle = Math.PI * 0.25;
  const sunSpeed = 0.0008;
  let bearTime = 0;
  let waterTime = 0;

  let bearPos = { x: 0, y: 0, radius: 25, angle: 0 };
  let splashes = [];

  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSynthRelax() {
    try {
      initAudio();
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      [220, 277.18, 329.63, 440].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.15);
        gain.gain.setValueAtTime(0, t + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.08, t + idx * 0.15 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.15 + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t + idx * 0.15);
        osc.stop(t + idx * 0.15 + 1.3);
      });
    } catch(e) {}
  }

  function speakRelax() {
    playSynthRelax();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance('relax, relax');
      utter.rate = 0.75;
      utter.pitch = 0.85;
      utter.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en'));
      if (engVoice) utter.voice = engVoice;
      window.speechSynthesis.speak(utter);
    }
  }

  function triggerBearInteraction(clickX, clickY) {
    speakRelax();
    if (bubble) {
      bubble.classList.add('visible');
      updateBubblePosition();
      clearTimeout(bubble.timer);
      bubble.timer = setTimeout(() => {
        bubble.classList.remove('visible');
      }, 2800);
    }
    splashes.push({
      x: bearPos.x,
      y: bearPos.y,
      radius: 10,
      alpha: 1.0
    });
  }

  function updateBubblePosition() {
    if (bubble) {
      bubble.style.left = `${bearPos.x}px`;
      bubble.style.top = `${bearPos.y - 35}px`;
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    initAudio();
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const dx = clickX - bearPos.x;
    const dy = clickY - bearPos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bearPos.radius * 2.5) {
      triggerBearInteraction(clickX, clickY);
    }
  });

  function drawMatterhorn(cx, cy, scale, daylight, sunX) {
    ctx.save();
    ctx.translate(cx, cy);
    const sunRelX = (sunX - cx) / width;
    const isSunLeft = sunRelX < 0;

    const apex = { x: -0.05 * scale, y: -0.8 * scale };
    const leftBase = { x: -0.85 * scale, y: 0.1 * scale };
    const rightBase = { x: 0.8 * scale, y: 0.1 * scale };
    const centerRidge = { x: -0.15 * scale, y: 0.0 * scale };

    const rockLit = `rgb(${Math.round(140 * daylight + 25)}, ${Math.round(125 * daylight + 25)}, ${Math.round(135 * daylight + 35)})`;
    const rockShadow = `rgb(${Math.round(30 * daylight + 10)}, ${Math.round(30 * daylight + 12)}, ${Math.round(40 * daylight + 20)})`;
    const snowLit = `rgb(${Math.round(245 * daylight + 40)}, ${Math.round(240 * daylight + 50)}, ${Math.round(250 * daylight + 70)})`;
    const snowShadow = `rgb(${Math.round(130 * daylight + 25)}, ${Math.round(140 * daylight + 35)}, ${Math.round(175 * daylight + 55)})`;

    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.bezierCurveTo(-0.02 * scale, -0.5 * scale, -0.08 * scale, -0.2 * scale, centerRidge.x, centerRidge.y);
    ctx.lineTo(rightBase.x, rightBase.y);
    ctx.lineTo(apex.x, apex.y);
    ctx.fillStyle = isSunLeft ? rockShadow : rockLit;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.bezierCurveTo(-0.02 * scale, -0.5 * scale, -0.08 * scale, -0.2 * scale, centerRidge.x, centerRidge.y);
    ctx.bezierCurveTo(-0.4 * scale, -0.05 * scale, -0.6 * scale, 0.05 * scale, leftBase.x, leftBase.y);
    ctx.lineTo(apex.x, apex.y);
    ctx.fillStyle = isSunLeft ? rockLit : rockShadow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x - 0.08 * scale, apex.y + 0.15 * scale);
    ctx.lineTo(apex.x - 0.03 * scale, apex.y + 0.22 * scale);
    ctx.lineTo(centerRidge.x - 0.05 * scale, centerRidge.y - 0.3 * scale);
    ctx.bezierCurveTo(-0.35 * scale, -0.3 * scale, -0.5 * scale, -0.15 * scale, leftBase.x + 0.15 * scale, leftBase.y - 0.1 * scale);
    ctx.lineTo(centerRidge.x, centerRidge.y);
    ctx.closePath();
    ctx.fillStyle = isSunLeft ? snowLit : snowShadow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x + 0.05 * scale, apex.y + 0.18 * scale);
    ctx.lineTo(apex.x + 0.02 * scale, apex.y + 0.25 * scale);
    ctx.lineTo(centerRidge.x + 0.18 * scale, centerRidge.y - 0.2 * scale);
    ctx.lineTo(rightBase.x - 0.2 * scale, rightBase.y - 0.05 * scale);
    ctx.lineTo(centerRidge.x, centerRidge.y);
    ctx.closePath();
    ctx.fillStyle = isSunLeft ? snowShadow : snowLit;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(centerRidge.x, centerRidge.y);
    ctx.strokeStyle = snowLit;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function render() {
    waterTime += 0.03;
    bearTime += 0.008;
    sunAngle += sunSpeed;
    if (sunAngle > Math.PI * 2) sunAngle -= Math.PI * 2;

    const horizonY = height * 0.58;
    const sunRadiusX = width * 0.42;
    const sunRadiusY = height * 0.38;
    const sunCenterX = width * 0.5;
    const sunCenterY = horizonY - height * 0.05;

    const sunX = sunCenterX + Math.cos(sunAngle) * sunRadiusX;
    const sunY = sunCenterY - Math.sin(sunAngle) * sunRadiusY;

    const rawSunHeight = (horizonY - sunY) / sunRadiusY;
    const daylight = Math.max(0, Math.min(1, (rawSunHeight + 0.2) / 1.2));

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    if (daylight > 0.5) {
      const factor = (daylight - 0.5) * 2;
      skyGrad.addColorStop(0, `rgb(${Math.round(20 + 40*factor)}, ${Math.round(70 + 100*factor)}, ${Math.round(150 + 95*factor)})`);
      skyGrad.addColorStop(0.7, `rgb(${Math.round(110 + 75*factor)}, ${Math.round(170 + 60*factor)}, ${Math.round(220 + 30*factor)})`);
      skyGrad.addColorStop(1, `rgb(${Math.round(190 + 40*factor)}, ${Math.round(215 + 30*factor)}, ${Math.round(230 + 20*factor)})`);
    } else if (daylight > 0) {
      const factor = daylight * 2;
      skyGrad.addColorStop(0, `rgb(${Math.round(15 + 30*factor)}, ${Math.round(20 + 40*factor)}, ${Math.round(60 + 80*factor)})`);
      skyGrad.addColorStop(0.5, `rgb(${Math.round(120 - 20*factor)}, ${Math.round(50 + 40*factor)}, ${Math.round(80 + 80*factor)})`);
      skyGrad.addColorStop(0.85, `rgb(${Math.round(230 - 30*factor)}, ${Math.round(120 + 30*factor)}, ${Math.round(70 + 80*factor)})`);
      skyGrad.addColorStop(1, `rgb(${Math.round(255 - 40*factor)}, ${Math.round(180 + 20*factor)}, ${Math.round(100 + 100*factor)})`);
    } else {
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.7, '#0a1128');
      skyGrad.addColorStop(1, '#1c2541');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    if (daylight < 0.6) {
      const starAlpha = (1 - daylight / 0.6);
      ctx.save();
      for (let s of stars) {
        s.alpha += s.speed;
        const currentAlpha = (Math.sin(s.alpha) * 0.4 + 0.6) * starAlpha;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * horizonY, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (sunY < horizonY + 50) {
      ctx.save();
      if (daylight > 0) {
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 120);
        sunGlow.addColorStop(0, 'rgba(255, 253, 220, 1)');
        sunGlow.addColorStop(0.2, 'rgba(255, 220, 130, 0.8)');
        sunGlow.addColorStop(0.6, 'rgba(255, 140, 50, 0.3)');
        sunGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const moonY = sunY + height * 0.12;
        const moonGlow = ctx.createRadialGradient(sunX, moonY, 5, sunX, moonY, 45);
        moonGlow.addColorStop(0, 'rgba(230, 240, 255, 0.9)');
        moonGlow.addColorStop(0.5, 'rgba(180, 210, 255, 0.3)');
        moonGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(sunX, moonY, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f0f5ff';
        ctx.beginPath();
        ctx.arc(sunX, moonY, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.fillStyle = `rgb(${Math.round(25*daylight + 10)}, ${Math.round(35*daylight + 15)}, ${Math.round(55*daylight + 30)})`;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width * 0.15, horizonY - height * 0.18);
    ctx.lineTo(width * 0.35, horizonY - height * 0.12);
    ctx.lineTo(width * 0.7, horizonY - height * 0.22);
    ctx.lineTo(width, horizonY - height * 0.1);
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    const matterhornScale = Math.min(width, height) * 0.55;
    drawMatterhorn(width * 0.5, horizonY - height * 0.02, matterhornScale, daylight, sunX);

    const ridgeGrad = ctx.createLinearGradient(0, horizonY - 60, 0, horizonY);
    const rR = Math.round(15 * daylight + 5);
    const rG = Math.round(25 * daylight + 10);
    const rB = Math.round(20 * daylight + 15);
    ridgeGrad.addColorStop(0, `rgb(${rR}, ${rG}, ${rB})`);
    ridgeGrad.addColorStop(1, `rgb(${Math.round(rR*0.5)}, ${Math.round(rG*0.5)}, ${Math.round(rB*0.5)})`);

    ctx.fillStyle = ridgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(0, horizonY - height * 0.12);
    ctx.bezierCurveTo(width * 0.1, horizonY - height * 0.15, width * 0.2, horizonY - height * 0.08, width * 0.32, horizonY);
    ctx.moveTo(width * 0.68, horizonY);
    ctx.bezierCurveTo(width * 0.8, horizonY - height * 0.1, width * 0.9, horizonY - height * 0.14, width, horizonY - height * 0.11);
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    const lakeHeight = height - horizonY;
    const lakeGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    if (daylight > 0.4) {
      lakeGrad.addColorStop(0, `rgb(${Math.round(20 + 30*daylight)}, ${Math.round(60 + 70*daylight)}, ${Math.round(80 + 60*daylight)})`);
      lakeGrad.addColorStop(0.5, `rgb(${Math.round(15 + 20*daylight)}, ${Math.round(45 + 50*daylight)}, ${Math.round(65 + 40*daylight)})`);
      lakeGrad.addColorStop(1, `rgb(${Math.round(10 + 10*daylight)}, ${Math.round(30 + 30*daylight)}, ${Math.round(45 + 25*daylight)})`);
    } else {
      lakeGrad.addColorStop(0, '#0f2027');
      lakeGrad.addColorStop(0.5, '#203a43');
      lakeGrad.addColorStop(1, '#2c5364');
    }
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(0, horizonY, width, lakeHeight);

    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let y = horizonY; y < height; y += 4) {
      const rowProgress = (y - horizonY) / lakeHeight;
      const waveOffset = Math.sin(waterTime * 2 + y * 0.08) * (2 + rowProgress * 6);
      const shimmer = Math.sin(waterTime * 3 + y * 0.15) * 0.5 + 0.5;
      if (daylight > 0.1) {
        ctx.fillStyle = `rgba(255, 230, 180, ${0.15 * daylight * shimmer})`;
        ctx.fillRect(sunX - 40 * (1 + rowProgress) + waveOffset, y, 80 * (1 + rowProgress), 2);
      } else {
        ctx.fillStyle = `rgba(200, 230, 255, ${0.12 * shimmer})`;
        ctx.fillRect(sunX - 30 * (1 + rowProgress) + waveOffset, y, 60 * (1 + rowProgress), 2);
      }
    }
    ctx.restore();

    ctx.fillStyle = `rgb(${Math.round(10*daylight+4)}, ${Math.round(15*daylight+6)}, ${Math.round(12*daylight+8)})`;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height - lakeHeight * 0.3);
    ctx.bezierCurveTo(width * 0.15, height - lakeHeight * 0.25, width * 0.25, height, width * 0.3, height);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width, height - lakeHeight * 0.35);
    ctx.bezierCurveTo(width * 0.85, height - lakeHeight * 0.28, width * 0.75, height, width * 0.68, height);
    ctx.closePath();
    ctx.fill();

    const bearCenterX = width * 0.5;
    const bearCenterY = horizonY + lakeHeight * 0.55;
    const bearRadiusX = width * 0.28;
    const bearRadiusY = lakeHeight * 0.28;

    const bX = bearCenterX + Math.cos(bearTime) * bearRadiusX + Math.sin(bearTime * 2) * 20;
    const bY = bearCenterY + Math.sin(bearTime) * bearRadiusY;

    const nextBX = bearCenterX + Math.cos(bearTime + 0.02) * bearRadiusX + Math.sin((bearTime + 0.02) * 2) * 20;
    const nextBY = bearCenterY + Math.sin(bearTime + 0.02) * bearRadiusY;
    const bearHeading = Math.atan2(nextBY - bY, nextBX - bX);

    bearPos.x = bX;
    bearPos.y = bY;
    bearPos.radius = Math.min(width, height) * 0.045;
    bearPos.angle = bearHeading;

    updateBubblePosition();

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (0.3 + 0.7*daylight)})`;
    ctx.lineWidth = 1.8;
    const wakeLen = 35;
    const wakeAngle1 = bearHeading + Math.PI - 0.4;
    const wakeAngle2 = bearHeading + Math.PI + 0.4;
    ctx.beginPath();
    ctx.moveTo(bX, bY);
    ctx.lineTo(bX + Math.cos(wakeAngle1) * wakeLen, bY + Math.sin(wakeAngle1) * wakeLen * 0.5);
    ctx.moveTo(bX, bY);
    ctx.lineTo(bX + Math.cos(wakeAngle2) * wakeLen, bY + Math.sin(wakeAngle2) * wakeLen * 0.5);
    ctx.stroke();

    const ripplePhase = (waterTime * 2) % 1;
    ctx.beginPath();
    ctx.ellipse(bX, bY + 5, 22 * ripplePhase + 8, (22 * ripplePhase + 8) * 0.4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - ripplePhase) * 0.35})`;
    ctx.stroke();
    ctx.restore();

    for (let i = splashes.length - 1; i >= 0; i--) {
      let sp = splashes[i];
      sp.radius += 1.5;
      sp.alpha -= 0.025;
      if (sp.alpha <= 0) {
        splashes.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${sp.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.radius, sp.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(bX, bY);
    ctx.rotate(bearHeading);
    const scale = bearPos.radius / 25;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#4a2e1b';
    ctx.beginPath();
    ctx.ellipse(-18, 2, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(-18, 5, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3d2312';
    ctx.beginPath();
    ctx.arc(-2, -12, 5, 0, Math.PI * 2);
    ctx.arc(-2, 12, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6e482f';
    ctx.beginPath();
    ctx.arc(-2, -12, 2.5, 0, Math.PI * 2);
    ctx.arc(-2, 12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const headGrad = ctx.createRadialGradient(2, 0, 2, 0, 0, 16);
    headGrad.addColorStop(0, '#664228');
    headGrad.addColorStop(1, '#3b2211');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8c6343';
    ctx.beginPath();
    ctx.ellipse(9, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(15, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.arc(5, -6, 2, 0, Math.PI * 2);
    ctx.arc(5, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -6.5, 0.7, 0, Math.PI * 2);
    ctx.arc(6, 5.5, 0.7, 0, Math.PI * 2);
    ctx.fill();

    const stroke1 = Math.sin(waterTime * 5) * 8;
    const stroke2 = Math.cos(waterTime * 5) * 8;
    ctx.fillStyle = 'rgba(61, 35, 18, 0.7)';
    ctx.beginPath();
    ctx.ellipse(12 + stroke1, -14, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.ellipse(12 + stroke2, 14, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(10, 0, 11, -Math.PI*0.4, Math.PI*0.4);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.stroke();

    ctx.restore();

    requestAnimationFrame(render);
  }

  render();
})();
