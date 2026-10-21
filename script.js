// Interactive letter explosions, slicing physics, synthesized sound and procedural endless text loop.
(() => {
  const heading = document.querySelector('.main-text');
  const subline = document.querySelector('.subline');
  if (!heading || !subline) return;
  const originalLines = heading.innerHTML.split(/<br\s*\/?\s*>/i);
  heading.replaceChildren();
  originalLines.forEach((line, lineIndex) => {
    if (lineIndex) heading.append(document.createElement('br'));
    const holder = document.createElement('span');
    holder.className = 'letter-line';
    for (const character of line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')) {
      if (character === ' ') { holder.append(document.createTextNode(' ')); continue; }
      const letter = document.createElement('span');
      letter.className = 'explodable-letter';
      letter.textContent = character;
      letter.tabIndex = 0;
      letter.setAttribute('role', 'button');
      letter.setAttribute('aria-label', `Explode letter ${character}`);
      holder.append(letter);
    }
    heading.append(holder);
  });
  const initialSubline = subline.textContent;
  const words = {
    openings: ['THE INTERNET', 'REALITY', 'THIS WEBSITE', 'YOUR BROWSER', 'THE ALGORITHM', 'SOMEONE ON THE INTERNET', 'THE FUTURE', 'MY LAST BRAIN CELL', 'THE SIMULATION', 'DIGITAL CHAOS'],
    verbs: ['HAS ACCIDENTALLY', 'JUST', 'SOMEHOW', 'ONCE AGAIN', 'PROBABLY', 'SUCCESSFULLY', 'UNEXPECTEDLY', 'ABSOLUTELY'],
    actions: ['BROKEN EVERYTHING', 'ACHIEVED NOTHING', 'INVENTED A NEW PROBLEM', 'REACHED PEAK NONSENSE', 'ESCAPED THE TIMELINE', 'REBOOTED THE UNIVERSE', 'DELETED COMMON SENSE', 'DISCOVERED ANOTHER BUG', 'MADE THINGS WEIRDER', 'CHALLENGED THE LAWS OF PHYSICS'],
    endings: ['AND NOBODY NOTICED.', 'THIS IS FINE.', 'PLEASE STAND BY.', 'WE CALL THIS PROGRESS.', 'NO FURTHER QUESTIONS.', 'IT WAS LIKE THIS WHEN I GOT HERE.', 'THAT WAS NOT IN THE SPECIFICATION.', 'THE COMPUTERS ARE CONFUSED.', 'THANK YOU FOR PARTICIPATING.', 'SOME ASSEMBLY REQUIRED.', 'THERE IS NO PATCH FOR THAT.', 'ERROR 404: EXPLANATION NOT FOUND.']
  };
  const pick = list => list[Math.floor(Math.random() * list.length)];
  let previousMessage = initialSubline;
  function generateMessage() {
    let message;
    do {
      const style = Math.random();
      if (style < .34) message = `${pick(words.openings)} ${pick(words.verbs)} ${pick(words.actions)}.`;
      else if (style < .67) message = `${pick(words.actions)}. ${pick(words.endings)}`;
      else message = `${pick(words.openings)}: ${pick(words.actions)}. ${pick(words.endings)}`;
    } while (message === previousMessage);
    previousMessage = message;
    return message;
  }
  let cycleRunning = false;
  function checkCompletion() {
    if (cycleRunning || letters().length !== 0) return;
    cycleRunning = true;
    subline.classList.remove('subline-shake');
    void subline.offsetWidth;
    subline.classList.add('subline-shake');
    window.setTimeout(() => {
      subline.classList.remove('subline-shake');
      subline.textContent = generateMessage();
      window.setTimeout(() => {
        heading.querySelectorAll('.explodable-letter').forEach(letter => letter.classList.remove('gone'));
        cycleRunning = false;
      }, 500);
    }, 650);
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'explosion-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  let ctx = canvas.getContext('2d');
  let width = 0, height = 0, dpr = 1, lastFrame = 0, audio = null;
  const particles = [];
  const colors = ['#ffffff', '#a6f7ff', '#ff4fd8', '#ffe66d', '#8b7bff', '#ff875e'];
  const letters = () => [...heading.querySelectorAll('.explodable-letter:not(.gone)')];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function sound(big = false) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime;
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = big ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(big ? 150 : 520, now);
      osc.frequency.exponentialRampToValueAtTime(big ? 38 : 95, now + (big ? .42 : .16));
      gain.gain.setValueAtTime(big ? .16 : .07, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + (big ? .44 : .18));
      osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + (big ? .45 : .19));
    } catch (_) {}
  }
  function burstAt(cx, cy, big = false, source = null) {
    if (cycleRunning) return;
    const radius = big ? Math.max(260, Math.min(width, height) * .48) : 105;
    const targets = letters().map(el => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }).filter(p => Math.hypot(p.x - cx, p.y - cy) <= radius);
    if (source && !source.classList.contains('gone') && !targets.some(p => p.el === source)) {
      const r = source.getBoundingClientRect(); targets.push({ el: source, x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    if (!targets.length && source && !source.classList.contains('gone')) {
      const r = source.getBoundingClientRect(); targets.push({ el: source, x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    for (const target of targets) {
      const el = target.el;
      if (el.classList.contains('gone')) continue;
      const r = el.getBoundingClientRect();
      el.classList.add('gone');
      const count = (big ? 34 : 16) + Math.floor(Math.random() * (big ? 28 : 12));
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (big ? 3.2 : 1.8) + Math.random() * (big ? 12 : 7);
        particles.push({ x: target.x + (Math.random() - .5) * r.width, y: target.y + (Math.random() - .5) * r.height,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - Math.random() * 2,
          size: 1.5 + Math.random() * (big ? 6 : 4), rotation: Math.random() * Math.PI,
          spin: (Math.random() - .5) * .25, life: 1, decay: .009 + Math.random() * .014,
          color: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() > .7 });
      }
    }
    if (targets.length) sound(big);
    if (particles.length > 1800) particles.splice(0, particles.length - 1800);
    if (particles.length && !lastFrame) requestAnimationFrame(frame);
    checkCompletion();
  }
  function burst(letter, big = false) {
    if (!letter || letter.classList.contains('gone') || cycleRunning) return;
    const r = letter.getBoundingClientRect();
    burstAt(r.left + r.width / 2, r.top + r.height / 2, big, letter);
  }

  // Slice letters with a held pointer. Each cut letter becomes two independently
  // clipped fragments that slide apart, rotate and fall under simulated gravity.
  let slicing = false;
  let lastPointer = null;
  const sliced = new WeakSet();
  const fragments = [];
  function makeSlice(letter, x, y, dx, dy) {
    if (!letter || letter.classList.contains('gone') || sliced.has(letter) || cycleRunning) return;
    const r = letter.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    sliced.add(letter);
    letter.classList.add('gone');
    const cutAngle = Math.atan2(dy, dx);
    const direction = Math.random() < .5 ? -1 : 1;
    for (let side = 0; side < 2; side++) {
      const piece = {
        x: r.left, y: r.top, w: r.width, h: r.height,
        vx: Math.cos(cutAngle) * direction * (2.4 + Math.random() * 2.5) + (side ? 1 : -1) * .8,
        vy: -1.8 - Math.random() * 2.2,
        angle: 0, spin: (Math.random() - .5) * .14,
        life: 1, char: letter.textContent,
        font: getComputedStyle(letter).font,
        color: getComputedStyle(letter).color,
        side
      };
      piece.clip = side === 0
        ? [[0,0],[100,0],[0,100]]
        : [[100,0],[100,100],[0,100]];
      fragments.push(piece);
    }
    sound(false);
    if (!lastFrame) requestAnimationFrame(frame);
    checkCompletion();
  }
  function sliceAt(x, y, dx, dy) {
    if (!slicing || cycleRunning) return;
    const el = document.elementFromPoint(x, y);
    const letter = el && el.closest ? el.closest('.explodable-letter') : null;
    if (letter && heading.contains(letter)) makeSlice(letter, x, y, dx, dy);
  }
  heading.addEventListener('pointerdown', event => {
    if (event.button !== 0 || cycleRunning) return;
    slicing = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    heading.setPointerCapture?.(event.pointerId);
  });
  heading.addEventListener('pointermove', event => {
    if (!slicing || !lastPointer) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 4));
    for (let i = 1; i <= steps; i++) {
      const x = lastPointer.x + dx * i / steps;
      const y = lastPointer.y + dy * i / steps;
      sliceAt(x, y, dx || 1, dy || 1);
    }
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  function stopSlicing() { slicing = false; lastPointer = null; }
  heading.addEventListener('pointerup', stopSlicing);
  heading.addEventListener('pointercancel', stopSlicing);
  heading.addEventListener('lostpointercapture', stopSlicing);

  heading.addEventListener('click', event => {
    const letter = event.target.closest('.explodable-letter');
    if (letter && !sliced.has(letter)) burst(letter);
  });
  heading.addEventListener('contextmenu', event => {
    event.preventDefault();
    if (cycleRunning) return;
    const letter = event.target.closest('.explodable-letter');
    burstAt(event.clientX, event.clientY, true, letter);
  });
  heading.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('explodable-letter')) {
      event.preventDefault(); burst(event.target);
    }
  });

  const originalFrame = frame;
  function frame(time) {
    if (time - lastFrame < 16 && lastFrame) { requestAnimationFrame(frame); return; }
    const dt = lastFrame ? Math.min(2, (time - lastFrame) / 16.67) : 1;
    lastFrame = time;
    ctx.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .13 * dt;
      p.vx *= Math.pow(.992, dt); p.rotation += p.spin * dt; p.life -= p.decay * dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      if (p.shape) ctx.fillRect(-p.size / 2, -p.size / 2, p.size * 1.8, p.size * .7);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    for (let i = fragments.length - 1; i >= 0; i--) {
      const p = fragments[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += .22 * dt; p.vx *= Math.pow(.995, dt);
      p.angle += p.spin * dt; p.life -= .008 * dt;
      if (p.life <= 0 || p.y > height + 100 || p.x < -150 || p.x > width + 150) {
        fragments.splice(i, 1); continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.angle);
      ctx.font = p.font; ctx.fillStyle = p.color;
      ctx.beginPath();
      const points = p.side === 0
        ? [[-p.w/2,-p.h/2],[p.w/2,-p.h/2],[-p.w/2,p.h/2]]
        : [[p.w/2,-p.h/2],[p.w/2,p.h/2],[-p.w/2,p.h/2]];
      ctx.moveTo(points[0][0], points[0][1]);
      ctx.lineTo(points[1][0], points[1][1]);
      ctx.lineTo(points[2][0], points[2][1]); ctx.closePath(); ctx.clip();
      ctx.fillText(p.char, -p.w / 2, p.h * .34);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (particles.length || fragments.length) requestAnimationFrame(frame);
    else { lastFrame = 0; ctx.clearRect(0, 0, width, height); }
  }
  window.addEventListener('resize', resize);
  resize();
})();