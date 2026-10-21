// Interactive letter explosions. WebGPU is used when available; Canvas 2D is the fallback.
(() => {
  const heading = document.querySelector('.main-text');
  if (!heading) return;

  const originalLines = heading.innerHTML.split(/<br\s*\/?>/i);
  heading.replaceChildren();
  originalLines.forEach((line, lineIndex) => {
    if (lineIndex) heading.append(document.createElement('br'));
    const holder = document.createElement('span');
    holder.className = 'letter-line';
    for (const character of line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')) {
      if (character === ' ') {
        holder.append(document.createTextNode(' '));
        continue;
      }
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

  const canvas = document.createElement('canvas');
  canvas.className = 'explosion-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  let ctx = null;
  const particles = [];
  let width = 0, height = 0, dpr = 1, lastFrame = 0, gpu = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (gpu) gpu.resize();
  }

  const colors = ['#ffffff', '#a6f7ff', '#ff4fd8', '#ffe66d', '#8b7bff', '#ff875e'];
  function burst(letter) {
    const rect = letter.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = 42 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 7.5;
      particles.push({
        x: cx + (Math.random() - .5) * rect.width * .4,
        y: cy + (Math.random() - .5) * rect.height * .4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2),
        size: 1.5 + Math.random() * 4.5,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - .5) * .22,
        life: 1,
        decay: .008 + Math.random() * .012,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > .7 ? 1 : 0
      });
    }
    letter.classList.remove('letter-pop');
    void letter.offsetWidth;
    letter.classList.add('letter-pop');
    window.setTimeout(() => letter.classList.remove('letter-pop'), 260);
    if (particles.length > 1800) particles.splice(0, particles.length - 1800);
    if (!lastFrame) requestAnimationFrame(frame);
  }

  function drawCanvas() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.shape) {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size * 1.8, p.size * .7);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  async function initWebGPU() {
    if (!navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      const device = await adapter.requestDevice();
      const format = navigator.gpu.getPreferredCanvasFormat();
      const context = canvas.getContext('webgpu');
      if (!context) return false;
      context.configure({ device, format, alphaMode: 'premultiplied' });
      const shader = device.createShaderModule({ code: `
        struct VOut { @builtin(position) position: vec4f, @location(0) color: vec4f, @location(1) local: vec2f, @location(2) shape: f32 };
        @group(0) @binding(0) var<uniform> viewport: vec2f;
        struct Particle { pos: vec2f, size: f32, rotation: f32, color: vec4f, shape: f32, pad0: f32, pad1: f32, pad2: f32 };
        @group(0) @binding(1) var<storage, read> particles: array<Particle>;
        @vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
          let corners = array<vec2f, 6>(vec2f(-1.,-1.), vec2f(1.,-1.), vec2f(-1.,1.), vec2f(-1.,1.), vec2f(1.,-1.), vec2f(1.,1.));
          let p = particles[ii]; let c = corners[vi];
          let rot = mat2x2f(cos(p.rotation), sin(p.rotation), -sin(p.rotation), cos(p.rotation));
          let local = rot * c;
          let pixel = p.pos + local * p.size;
          var out: VOut;
          out.position = vec4f(pixel.x / viewport.x * 2. - 1., 1. - pixel.y / viewport.y * 2., 0., 1.);
          out.color = p.color; out.local = c; out.shape = p.shape; return out;
        }
        @fragment fn fs(in: VOut) -> @location(0) vec4f {
          if (in.shape < 0.5 && dot(in.local, in.local) > 1.) { discard; }
          let glow = 1. - smoothstep(.45, 1., length(in.local));
          return vec4f(in.color.rgb, in.color.a * (0.65 + 0.35 * glow));
        }` });
      const pipeline = device.createRenderPipeline({
        layout: 'auto', vertex: { module: shader, entryPoint: 'vs' }, fragment: { module: shader, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] }, primitive: { topology: 'triangle-list' }
      });
      const max = 1800;
      const stride = 12;
      const buffer = device.createBuffer({ size: max * stride * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      const uniform = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }, { binding: 1, resource: { buffer } }] });
      gpu = {
        resize() { device.queue.writeBuffer(uniform, 0, new Float32Array([width, height])); },
        draw() {
          const data = new Float32Array(Math.max(1, particles.length) * stride);
          particles.forEach((p, i) => {
            const o = i * stride;
            data.set([p.x, p.y, p.size, p.rotation, parseInt(p.color.slice(1, 3), 16) / 255, parseInt(p.color.slice(3, 5), 16) / 255, parseInt(p.color.slice(5, 7), 16) / 255, p.life, p.shape, 0, 0, 0], o);
          });
          if (particles.length) device.queue.writeBuffer(buffer, 0, data);
          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
          pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); if (particles.length) pass.draw(6, particles.length); pass.end();
          device.queue.submit([encoder.finish()]);
        }
      };
      gpu.resize();
      return true;
    } catch (_) { gpu = null; return false; }
  }

  function frame(time) {
    if (time - lastFrame < 16 && lastFrame) { requestAnimationFrame(frame); return; }
    const dt = lastFrame ? Math.min(2, (time - lastFrame) / 16.67) : 1;
    lastFrame = time;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .13 * dt; p.vx *= Math.pow(.992, dt); p.rotation += p.spin * dt; p.life -= p.decay * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (gpu) gpu.draw(); else drawCanvas();
    if (particles.length) requestAnimationFrame(frame);
    else { lastFrame = 0; if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  heading.addEventListener('click', event => {
    const letter = event.target.closest('.explodable-letter');
    if (letter) burst(letter);
  });
  heading.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('explodable-letter')) {
      event.preventDefault(); burst(event.target);
    }
  });
  window.addEventListener('resize', resize);
  resize();
  initWebGPU().then(ready => {
    if (!ready) ctx = canvas.getContext('2d', { alpha: true });
    resize();
    if (particles.length && !lastFrame) requestAnimationFrame(frame);
  });
})();
