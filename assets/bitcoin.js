(() => {
'use strict';
const clock = document.getElementById('clock');
const tick = document.getElementById('tick');
let count = 0;
function refreshDisplay() {
  count = (count + 1) % 1000000;
  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  clock.textContent = 'DISPLAY REFRESH: 500 MS // LOCAL TIME ' + time;
  tick.textContent = 'TICK ' + String(count).padStart(6, '0');
}
refreshDisplay();
setInterval(refreshDisplay, 500);
})();
