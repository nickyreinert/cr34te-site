(function () {
  'use strict';
  var canvas = document.getElementById('buehne');
  if (!canvas) return;

  var style = document.createElement('style');
  style.textContent = '.smile-burst-layer{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:20;contain:layout paint}.smile-fragment{position:absolute;left:var(--sx);top:var(--sy);width:clamp(35px,9vw,66px);height:clamp(48px,12vw,86px);border:2px solid #ffffffd9;border-radius:8px 8px 12px 12px;background:linear-gradient(110deg,#777,#eee 18%,#999 34%,#f9f5e9 52%,#777 72%,#d8d8d8);box-shadow:0 5px 12px #0003,inset 0 0 5px #fff9;transform:translate(-50%,-50%);animation:smile-can-split 720ms cubic-bezier(.2,.7,.25,1) forwards}.smile-face{position:absolute;left:var(--sx);top:var(--sy);font-family:system-ui,sans-serif;font-size:clamp(25px,6vw,43px);line-height:1;transform:translate(-50%,-50%);filter:drop-shadow(0 3px 3px #0003);animation:smile-fly var(--duration) cubic-bezier(.15,.65,.35,1) forwards;will-change:transform,opacity}@keyframes smile-can-split{0%{opacity:1;transform:translate(-50%,-50%) rotate(0) scale(1)}25%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--spin)) scale(.65)}}@keyframes smile-fly{0%{opacity:0;transform:translate(-50%,-50%) scale(.25) rotate(0)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.25) rotate(12deg)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.7) rotate(var(--spin))}}@media(prefers-reduced-motion:reduce){.smile-fragment,.smile-face{animation-duration:250ms}}';
  document.head.appendChild(style);

  var layer = null;
  var lastBurst = 0;
  var faces = ['😂','🤪','😎','🥴','🤡','😹','😵‍💫','🙃','👽','🫠','🤣','😜'];

  function burst(x, y) {
    var now = Date.now();
    if (now - lastBurst < 650) return;
    lastBurst = now;
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'smile-burst-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    layer.replaceChildren();
    var rect = canvas.getBoundingClientRect();
    for (var i = 0; i < 3; i++) {
      var shard = document.createElement('span');
      shard.className = 'smile-fragment';
      shard.style.setProperty('--sx', x + 'px');
      shard.style.setProperty('--sy', y + 'px');
      shard.style.setProperty('--dx', ((i - 1) * Math.min(rect.width * .24, 150)) + 'px');
      shard.style.setProperty('--dy', (i === 1 ? -115 : 95) + 'px');
      shard.style.setProperty('--spin', ((i - 1) * 210) + 'deg');
      layer.appendChild(shard);
    }
    for (var j = 0; j < 12; j++) {
      var face = document.createElement('span');
      var angle = Math.PI * 2 * j / 12 + (Math.random() - .5) * .45;
      var distance = 85 + Math.random() * Math.min(180, rect.width * .24);
      face.className = 'smile-face';
      face.textContent = faces[Math.floor(Math.random() * faces.length)];
      face.style.setProperty('--sx', x + 'px');
      face.style.setProperty('--sy', y + 'px');
      face.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
      face.style.setProperty('--dy', (Math.sin(angle) * distance - 25) + 'px');
      face.style.setProperty('--spin', ((Math.random() * 2 - 1) * 100) + 'deg');
      face.style.setProperty('--duration', (650 + Math.random() * 550) + 'ms');
      face.style.animationDelay = Math.random() * 100 + 'ms';
      layer.appendChild(face);
    }
    window.setTimeout(function () { if (layer) layer.replaceChildren(); }, 1500);
  }

  var down = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;
    down = { x: e.clientX, y: e.clientY, moved: false };
  });
  canvas.addEventListener('pointermove', function (e) {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 9) down.moved = true;
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!down) return;
    if (!down.moved) burst(e.clientX, e.clientY);
    down = null;
  });
  canvas.addEventListener('pointercancel', function () { down = null; });

  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (!touchStart || e.changedTouches.length !== 1) return;
    var t = e.changedTouches[0];
    if (Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) < 9) burst(t.clientX, t.clientY);
    touchStart = null;
  }, { passive: true });
  canvas.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });
})();
