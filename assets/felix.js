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
    busy = true;
    var name = document.createElement('div');
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

(function () {
  'use strict';

  var ANIMALS = ['🦊', '🐺', '🐱', '🐶', '🐰', '🐻', '🐯', '🦝', '🐼', '🐨', '🐹', '🦁'];
  var WORDS = ['Ordnung muss sein!', 'Feierabend!', 'Bratwurst!', 'Schadenfreude!', 'Kindergarten!', 'Donnerwetter!', 'Gemütlichkeit!', 'Fernweh!', 'Lebkuchen!', 'Achtung!', 'Prost!', 'Gesundheit!', 'Zeitgeist!', 'Kartoffelsalat!', 'Brezel!', 'Autobahn!', 'Sauerkraut!', 'Weltschmerz!', 'Fingerspitzengefühl!', 'Backpfeifengesicht!', 'Datenschutz!', 'Papierkram!', 'Pünktlichkeit!', 'Wanderlust!', 'Kuckucksuhr!', 'Gründlichkeit!', 'Mülltrennung!', 'Jawohl!', 'Biergarten!', 'Schnitzel!', 'Lederhosen!', 'Gemütlich!'];
  var AVOID = ['.controls', '#play'];
  var COLORS = ['#39ff14', '#00fff0', '#ff00e6', '#fff200', '#b026ff', '#ffffff'];

  var style = document.createElement('style');
  style.textContent = [
    '.furry-layer{position:fixed;left:0;top:0;width:100%;height:100%;z-index:15;overflow:hidden;pointer-events:none}',
    '.furry{position:absolute;display:grid;place-items:center;width:var(--s);height:var(--s);padding:0;border:0;background:none;color:inherit;font-size:calc(var(--s) * .82);line-height:1;font-family:system-ui,sans-serif;cursor:pointer;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transform-origin:50% 60%;animation:furIn .5s cubic-bezier(.2,1.4,.4,1) both,furBob var(--d) ease-in-out .5s infinite alternate}',
    '.furry:focus{outline:none}',
    '.furry-face{display:block;filter:drop-shadow(0 0 6px rgba(0,255,240,.55));pointer-events:none}',
    '.furry-shell{position:absolute;left:-18%;top:-18%;width:136%;height:136%;border-radius:50%;opacity:0;pointer-events:none;background:radial-gradient(circle at 30% 26%,rgba(255,255,255,.9),rgba(255,255,255,0) 20%),radial-gradient(circle,rgba(255,255,255,0) 55%,rgba(255,0,230,.32) 70%,rgba(0,255,240,.38) 84%,rgba(255,242,0,.32) 100%);box-shadow:inset 0 0 10px rgba(255,255,255,.55),0 0 12px rgba(0,255,240,.55)}',
    '.furry-say{position:absolute;left:50%;bottom:110%;max-width:90vw;padding:5px 9px;white-space:nowrap;font:800 clamp(.62rem,2.8vw,.85rem)/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#39ff14;background:#07060b;border:1px solid #39ff14;box-shadow:2px 2px 0 #ff00e6;opacity:0;pointer-events:none;transform:translateX(calc(-50% + var(--sx,0px)))}',
    '.furry.below .furry-say{bottom:auto;top:110%}',
    '.furry.talk{animation:furRise 1.05s ease-in forwards}',
    '.furry.talk .furry-shell{animation:shellGrow 1.05s ease-out forwards}',
    '.furry.talk .furry-say{opacity:1}',
    '.bub-ring{position:fixed;z-index:19;border-radius:50%;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 10px #00fff0,inset 0 0 8px #ff00e6;pointer-events:none;animation:ringPop .45s ease-out forwards}',
    '.bub-drop{position:fixed;z-index:19;width:clamp(4px,1.2vmin,9px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--c));box-shadow:0 0 6px var(--c);pointer-events:none;animation:dropFly .7s cubic-bezier(.15,.7,.3,1) forwards}',
    '@keyframes furIn{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}',
    '@keyframes furBob{from{transform:translate(0,0) rotate(-6deg)}to{transform:translate(var(--bx),var(--by)) rotate(6deg)}}',
    '@keyframes furRise{0%{transform:scale(1)}60%{transform:translateY(-3vmin) scale(1.12,1.2)}100%{transform:translateY(-6vmin) scale(1.25,1.15)}}',
    '@keyframes shellGrow{0%{opacity:0}25%{opacity:1}100%{opacity:1;transform:scale(1.1,1.05)}}',
    '@keyframes ringPop{from{transform:translate(-50%,-50%) scale(1);opacity:1}to{transform:translate(-50%,-50%) scale(2);opacity:0}}',
    '@keyframes dropFly{from{transform:translate(-50%,-50%);opacity:1}to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3);opacity:0}}',
    '@media(prefers-reduced-motion:reduce){.furry{animation:none}.furry.talk{animation:none}.furry.talk .furry-shell{animation:none;opacity:1}.bub-ring,.bub-drop{animation-duration:.01ms}}'
  ].join('');
  document.head.appendChild(style);

  var layer = document.createElement('div');
  layer.className = 'furry-layer';
  document.body.appendChild(layer);

  var lastWord = -1;

  function rnd(n) { return Math.floor(Math.random() * n); }

  function furrySize() {
    return Math.max(34, Math.min(66, Math.round(Math.min(window.innerWidth, window.innerHeight) * .1)));
  }

  function blocked(x, y, s) {
    for (var i = 0; i < AVOID.length; i++) {
      var el = document.querySelector(AVOID[i]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.width && x + s / 2 > r.left - 4 && x - s / 2 < r.right + 4 && y + s / 2 > r.top - 4 && y - s / 2 < r.bottom + 4) return true;
    }
    return false;
  }

  function pickSpot(s) {
    var x = 0, y = 0;
    for (var i = 0; i < 14; i++) {
      x = s / 2 + 6 + Math.random() * Math.max(1, window.innerWidth - s - 12);
      y = s / 2 + 6 + Math.random() * Math.max(1, window.innerHeight - s - 12);
      if (!blocked(x, y, s)) break;
    }
    return { x: x, y: y };
  }

  function pop(f) {
    var r = f.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var ring = document.createElement('i');
    ring.className = 'bub-ring';
    ring.style.left = cx + 'px';
    ring.style.top = cy + 'px';
    ring.style.width = r.width * 1.1 + 'px';
    ring.style.height = r.width * 1.1 + 'px';
    ring.addEventListener('animationend', function () { ring.remove(); });
    layer.appendChild(ring);
    for (var i = 0; i < 16; i++) {
      var drop = document.createElement('i');
      var angle = Math.random() * Math.PI * 2;
      var distance = 20 + Math.random() * (r.width * 1.1 + 30);
      drop.className = 'bub-drop';
      drop.style.left = cx + 'px';
      drop.style.top = cy + 'px';
      drop.style.setProperty('--c', COLORS[i % COLORS.length]);
      drop.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
      drop.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
      drop.addEventListener('animationend', function (event) { event.currentTarget.remove(); });
      layer.appendChild(drop);
    }
    f.remove();
    spawn(3500 + Math.random() * 4500);
  }

  function talk(f, say) {
    if (f.getAttribute('data-busy')) return;
    f.setAttribute('data-busy', '1');
    var w = rnd(WORDS.length);
    if (w === lastWord) w = (w + 1) % WORDS.length;
    lastWord = w;
    say.textContent = WORDS[w];
    var r = say.getBoundingClientRect();
    var half = r.width * .65;
    var mid = r.left + r.width / 2;
    var shift = 0;
    if (mid - half < 6) shift = 6 + half - mid;
    else if (mid + half > window.innerWidth - 6) shift = window.innerWidth - 6 - half - mid;
    say.style.setProperty('--sx', shift / 1.25 + 'px');
    f.classList.add('talk');
    window.setTimeout(function () { pop(f); }, 1050);
  }

  function spawn(delay) {
    window.setTimeout(function () {
      var s = furrySize();
      var spot = pickSpot(s);
      var f = document.createElement('button');
      f.type = 'button';
      f.className = 'furry';
      f.tabIndex = -1;
      f.setAttribute('aria-label', 'Furry');
      f.style.setProperty('--s', s + 'px');
      f.style.setProperty('--d', (2.4 + Math.random() * 2.4) + 's');
      f.style.setProperty('--bx', (Math.random() * 16 - 8) + 'px');
      f.style.setProperty('--by', (Math.random() * 16 - 8) + 'px');
      f.style.left = (spot.x / window.innerWidth * 100) + '%';
      f.style.top = (spot.y / window.innerHeight * 100) + '%';
      f.style.margin = (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px';
      if (spot.y < Math.max(70, window.innerHeight * .16)) f.classList.add('below');
      var shell = document.createElement('span');
      shell.className = 'furry-shell';
      var face = document.createElement('span');
      face.className = 'furry-face';
      face.textContent = ANIMALS[rnd(ANIMALS.length)];
      face.setAttribute('aria-hidden', 'true');
      if (Math.random() < .5) face.style.transform = 'scaleX(-1)';
      var say = document.createElement('span');
      say.className = 'furry-say';
      say.setAttribute('aria-hidden', 'true');
      f.appendChild(shell);
      f.appendChild(face);
      f.appendChild(say);
      f.addEventListener('click', function () { talk(f, say); });
      layer.appendChild(f);
    }, delay);
  }

  var count = Math.max(8, Math.min(20, Math.round(window.innerWidth * window.innerHeight / 55000)));
  for (var i = 0; i < count; i++) spawn(i * 120);
}());
