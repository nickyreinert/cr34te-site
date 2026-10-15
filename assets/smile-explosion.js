(function () {
  'use strict';
  var canvas = document.getElementById('buehne');
  if (!canvas) return;
  var style = document.createElement('style');
  style.textContent = '.smile-burst-layer{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:20;contain:layout paint}.smile-fragment{position:absolute;left:var(--sx);top:var(--sy);width:clamp(35px,9vw,66px);height:clamp(48px,12vw,86px);border:2px solid #ffffffd9;border-radius:8px 8px 12px 12px;background:linear-gradient(110deg,#777,#eee 18%,#999 34%,#f9f5e9 52%,#777 72%,#d8d8d8);box-shadow:0 5px 12px #0003,inset 0 0 5px #fff9;transform:translate(-50%,-50%);animation:smile-can-split 720ms cubic-bezier(.2,.7,.25,1) forwards}.smile-face{position:absolute;left:var(--sx);top:var(--sy);font-family:system-ui,sans-serif;font-size:clamp(25px,6vw,43px);line-height:1;transform:translate(-50%,-50%);filter:drop-shadow(0 3px 3px #0003);animation:smile-fly var(--duration) cubic-bezier(.15,.65,.35,1) forwards;will-change:transform,opacity}@keyframes smile-can-split{0%{opacity:1;transform:translate(-50%,-50%) rotate(0) scale(1)}25%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--spin)) scale(.65)}}@keyframes smile-fly{0%{opacity:0;transform:translate(-50%,-50%) scale(.25) rotate(0)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.25) rotate(12deg)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.7) rotate(var(--spin))}}@media(prefers-reduced-motion:reduce){.smile-fragment,.smile-face{animation-duration:250ms}}';
  document.head.appendChild(style);
  var layer = null;
  var lastBurst = 0;
  var emojiRanges = [
    [0x1F300, 0x1F5FF],
    [0x1F600, 0x1F64F],
    [0x1F680, 0x1F6FF],
    [0x1F900, 0x1F9FF],
    [0x1FA70, 0x1FAFF]
  ];
  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(1);
      var limit = Math.floor(4294967296 / max) * max;
      do { window.crypto.getRandomValues(values); } while (values[0] >= limit);
      return values[0] % max;
    }
    return Math.floor(Math.random() * max);
  }
  function randomEmoji() {
    var range = emojiRanges[randomInt(emojiRanges.length)];
    return String.fromCodePoint(range[0] + randomInt(range[1] - range[0] + 1));
  }
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
    for (var j = 0; j < 18; j++) {
      var face = document.createElement('span');
      var angle = Math.PI * 2 * j / 18 + (Math.random() - .5) * .45;
      var distance = 85 + Math.random() * Math.min(180, rect.width * .24);
      face.className = 'smile-face';
      face.textContent = randomEmoji();
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
  var pointerStart = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.isPrimary === false || e.button !== 0) return;
    pointerStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }, { passive: true });
  canvas.addEventListener('pointerup', function (e) {
    if (!pointerStart || e.pointerId !== pointerStart.id) return;
    var start = pointerStart;
    pointerStart = null;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) return;
    var rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    burst(e.clientX, e.clientY);
  }, { passive: true });
  canvas.addEventListener('pointercancel', function () { pointerStart = null; }, { passive: true });
  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    burst(e.clientX, e.clientY);
  });
})();