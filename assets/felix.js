(function () {
  'use strict';

  var style = document.createElement('style');
  style.textContent = [
    '.maker-button{position:fixed;right:clamp(10px,2vw,24px);bottom:clamp(10px,2dvh,20px);z-index:20;padding:9px 13px;border:1px solid #39ff14;background:#07060b;color:#39ff14;font:800 .65rem ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;box-shadow:3px 3px 0 #ff00e6;cursor:pointer}',
    '.maker-button:hover,.maker-button:focus-visible{color:#050505;background:#39ff14;outline:2px solid #fff;outline-offset:3px}',
    '.felix-fall{position:fixed;left:50%;top:0;z-index:19;margin:0;color:#fff;font:1000 clamp(4rem,22vw,13rem)/.75 system-ui,sans-serif;letter-spacing:-.1em;text-shadow:0 0 10px #00fff0,6px 0 #ff00e6;pointer-events:none;transform:translate(-50%,-120%);animation:felixDrop .78s cubic-bezier(.45,.02,.85,.55) forwards}',
    '.felix-pixel{position:fixed;z-index:19;width:clamp(5px,1vw,11px);aspect-ratio:1;background:var(--c);box-shadow:0 0 8px var(--c);pointer-events:none;animation:felixSplatter .95s cubic-bezier(.12,.65,.26,1) forwards}',
    '@keyframes felixDrop{75%{transform:translate(-50%,calc(100dvh - 1.45em)) scaleY(1)}90%{transform:translate(-50%,calc(100dvh - .92em)) scale(1.18,.38)}100%{transform:translate(-50%,calc(100dvh - .88em)) scale(1.3,.08);opacity:0}}',
    '@keyframes felixSplatter{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--r)) scale(.25);opacity:0}}',
    '@media(prefers-reduced-motion:reduce){.felix-fall{animation-duration:.01ms}.felix-pixel{animation-duration:.01ms}}'
  ].join('');
  document.head.appendChild(style);

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'maker-button';
  button.textContent = 'Who made this?';
  button.setAttribute('aria-label', 'Reveal who made this');
  document.body.appendChild(button);

  var busy = false;
  button.addEventListener('click', function () {
    if (busy) return;
    busyent.createElement('div');
    name.className = 'felix-fall';
    name.textContent = 'FELIX';
    name.setAttribute('aria-hidden', 'true');
    document.body.appendChild(name);

    window.setTimeout(function () {
      name.remove();
      var colors = ['#39ff14', '#00fff0', '#ff00e6', '#fff200', '#b026ff', '#ffffff'];
      var originX = window.innerWidth / 2;
      var originY = Math.max(20, window.innerHeight - button.offsetHeight - 18);
      for (var i = 0; i < 88; i++) {
        var pixel = document.createElement('i');
        var angle = Math.PI + Math.random() * Math.PI;
        var distance = 45 + Math.random() * Math.min(260, window.innerWidth * .42);
        pixel.className = 'felix-pixel';
        pixel.style.left = originX + 'px';
        pixel.style.top = originY + 'px';
        pixel.style.setProperty('--c', colors[i % colors.length]);
        pixel.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
        pixel.style.setProperty('--dy', Math.sin(angle) * distance * .7 + Math.random() * 65 + 'px');
        pixel.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
        document.body.appendChild(pixel);
        pixel.addEventListener('animationend', function (event) { event.currentTarget.remove(); });
      }
      window.setTimeout(function () { busy = false; }, 950);
    }, 780);
  });
}());
