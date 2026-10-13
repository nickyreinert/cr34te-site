(function () {
  'use strict';
  var el = document.getElementById('laterne');
  if (!el) return;
  var lines = [
    'Ich stehe hier seit 1946.',
    'Ich habe alles gesehen. Gesagt habe ich nie etwas.',
    'Der Mann da unten steht seit Stunden im Regen.',
    'Badehose. Oktober. Ich urteile nicht.',
    'Manchmal frage ich mich, ob er auf den Sommer wartet.',
    'Oder ob der Sommer auf ihn wartet.',
    'Ich flackere, wenn mich etwas bewegt.',
    'Gerade flackere ich ein bisschen.',
    'Der Regen hört auf. Irgendwann. Meistens.'
  ];
  var calm = false;
  try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var li = 0, ci = 0;
  function next() { li = (li + 1) % lines.length; ci = 0; el.textContent = ''; setTimeout(type, 600); }
  function type() {
    if (calm) { el.textContent = lines[li]; setTimeout(next, 6000); return; }
    ci++;
    el.textContent = lines[li].slice(0, ci);
    if (ci < lines[li].length) setTimeout(type, 55);
    else setTimeout(next, 3600);
  }
  setTimeout(type, 1200);
})();
