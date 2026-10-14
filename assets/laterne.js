(function () {
  'use strict';
  var el = document.getElementById('laterne');
  if (!el) return;
  var lines = [
    'TRANSMISSION // SEKTOR 07 // JAHR 2089',
    'Ich bin die letzte analoge Laterne dieser Stadt.',
    'Seit 1946 sehe ich Menschen. Jetzt sehe ich Drohnen.',
    'Der Mann da unten braucht vermutlich einen Raumanzug.',
    'Dort oben fahren die letzten Züge ohne Gleise.',
    'Die Sterne sind echt. Die Werbung leider auch.',
    'Die Stadt kann Gedanken lesen. Meine nicht.',
    'SYSTEM: Menschlichkeit weiterhin erkannt.',
    'Der Regen ist das Einzige, das noch kostenlos ist.'
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
