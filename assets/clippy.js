(function () {
  var clippy = document.createElement('button');
  clippy.id = 'clippy';
  clippy.type = 'button';
  clippy.setAttribute('aria-label', 'Clippy');
  clippy.innerHTML =
    '<svg viewBox="0 0 56 90" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M18 62V24a10 10 0 0 1 20 0v46a16 16 0 0 1-32 0V30" fill="none" stroke="#6b6b6b" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M18 62V24a10 10 0 0 1 20 0v46a16 16 0 0 1-32 0V30" fill="none" stroke="#d8d8d8" stroke-width="4" stroke-linecap="round"/>' +
    '<ellipse cx="21" cy="22" rx="6" ry="7" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
    '<ellipse cx="35" cy="22" rx="6" ry="7" fill="#fff" stroke="#000" stroke-width="1.5"/>' +
    '<circle cx="22" cy="24" r="2.5" fill="#000"/><circle cx="36" cy="24" r="2.5" fill="#000"/>' +
    '<g class="clippy-lid"><ellipse cx="21" cy="22" rx="6.5" ry="7.5" fill="#d8d8d8"/><ellipse cx="35" cy="22" rx="6.5" ry="7.5" fill="#d8d8d8"/></g>' +
    '<path d="M14 12q7-5 13-1M30 11q6-4 13 1" fill="none" stroke="#000" stroke-width="1.5"/>' +
    '</svg>';

  var tip = document.createElement('div');
  tip.id = 'clippy-tip';
  tip.textContent = 'It looks like you want to see a cat. Click me!';

  var win = document.createElement('div');
  win.id = 'nyan-win';
  var stars = '';
  for (var i = 0; i < 14; i++) {
    stars += '<span class="nyan-star" style="left:' + (i * 27 % 360) + 'px;top:' + ((i * 53) % 150) + 'px;animation-delay:' + (-(i % 5) * 0.4) + 's"></span>';
  }
  win.innerHTML =
    '<div class="nyan-title"><span>Nyan Cat</span><button type="button" id="nyan-close" aria-label="Close">X</button></div>' +
    '<div id="nyan-stage">' + stars +
    '<div id="nyan-cat">' +
    '<div class="nyan-rainbow"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
    '<div class="nyan-tail"></div>' +
    '<div class="nyan-tart"></div>' +
    '<div class="nyan-leg" style="left:18px"></div><div class="nyan-leg" style="left:62px"></div>' +
    '<div class="nyan-head"><span class="nyan-eye l"></span><span class="nyan-eye r"></span>' +
    '<span class="nyan-cheek l"></span><span class="nyan-cheek r"></span><span class="nyan-mouth"></span></div>' +
    '</div></div>';

  document.getElementById('desktop').appendChild(clippy);
  document.getElementById('desktop').appendChild(tip);
  document.getElementById('desktop').appendChild(win);

  clippy.addEventListener('click', function () { win.classList.toggle('open'); });
  document.getElementById('nyan-close').addEventListener('click', function () { win.classList.remove('open'); });
})();
