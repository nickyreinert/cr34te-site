document.addEventListener('DOMContentLoaded', () => {
  const leftPupil = document.getElementById('leftPupil');
  const rightPupil = document.getElementById('rightPupil');
  const noseHotspot = document.getElementById('noseHotspot');
  const sneezeEffect = document.getElementById('sneezeEffect');
  const paintingFrame = document.getElementById('paintingFrame');
  const monaLisaPainting = document.getElementById('monaLisaPainting');
  const geishaPainting = document.getElementById('geishaPainting');
  const robbersGroup = document.getElementById('robbersGroup');
  const menGroup = document.getElementById('menGroup');
  const replayBtn = document.getElementById('replayBtn');
  const speechBubbles = document.querySelectorAll('.speech-bubble');

  let isAnimating = false;

  // Eye tracking logic
  const leftEyeCenter = { x: 178, y: 202 };
  const rightEyeCenter = { x: 222, y: 202 };
  const maxRadius = 5.5;

  function updateEyePosition(e) {
    if (isAnimating) return;

    const rect = monaLisaPainting.getBoundingClientRect();
    // Normalize mouse coords relative to SVG viewBox (400x550)
    const mouseX = ((e.clientX - rect.left) / rect.width) * 400;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 550;

    movePupil(leftPupil, leftEyeCenter, mouseX, mouseY);
    movePupil(rightPupil, rightEyeCenter, mouseX, mouseY);
  }

  function movePupil(pupilElem, center, targetX, targetY) {
    const dx = targetX - center.x;
    const dy = targetY - center.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy) / 15, maxRadius);

    const newX = center.x + Math.cos(angle) * dist;
    const newY = center.y + Math.sin(angle) * dist;

    pupilElem.setAttribute('cx', newX);
    pupilElem.setAttribute('cy', newY);
  }

  window.addEventListener('mousemove', updateEyePosition);

  // Trigger Sneeze and Heist Sequence
  noseHotspot.addEventListener('click', triggerSneezeSequence);
  noseHotspot.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerSneezeSequence();
  });

  function triggerSneezeSequence() {
    if (isAnimating) return;
    isAnimating = true;

    // 1. Sneeze
    sneezeEffect.classList.add('active');
    paintingFrame.style.transform = 'rotate(-3deg) scale(1.02)';

    setTimeout(() => {
      sneezeEffect.classList.remove('active');
      paintingFrame.style.transform = 'none';
      startRobbery();
    }, 1000);
  }

  function startRobbery() {
    const robber1 = robbersGroup.querySelector('.robber1');
    const robber2 = robbersGroup.querySelector('.robber2');
    const bubble = robber1.querySelector('.speech-bubble');

    // Robbers enter from right
    robber1.style.right = '45%';
    robber2.style.right = '38%';

    setTimeout(() => {
      if (bubble) bubble.style.opacity = '1';
    }, 800);

    // Robbers take Mona Lisa away
    setTimeout(() => {
      paintingFrame.style.transform = 'translateX(100vw) rotate(15deg)';
      paintingFrame.style.opacity = '0';
      robber1.style.right = '-300px';
      robber2.style.right = '-300px';

      setTimeout(startMenSequence, 1200);
    }, 2000);
  }

  function startMenSequence() {
    const grandpa = menGroup.querySelector('.grandpa');
    const son = menGroup.querySelector('.son');
    const laughBubble = menGroup.querySelector('.men-laugh');

    // Reset frame off-screen on the left to bring Geisha
    monaLisaPainting.style.display = 'none';
    geishaPainting.style.display = 'block';
    paintingFrame.style.transform = 'translateX(-100vw) rotate(-15deg)';

    // Men enter from left
    grandpa.style.left = '40%';
    son.style.left = '48%';

    setTimeout(() => {
      // Hang the new picture (Geisha)
      paintingFrame.style.opacity = '1';
      paintingFrame.style.transform = 'none';
    }, 800);

    setTimeout(() => {
      // Men laugh and exit to right
      if (laughBubble) laughBubble.style.opacity = '1';
      
      setTimeout(() => {
        grandpa.style.left = '120vw';
        son.style.left = '120vw';

        // Show Replay Button
        setTimeout(() => {
          replayBtn.classList.add('visible');
        }, 1200);
      }, 1200);
    }, 2000);
  }

  // Replay Reset
  replayBtn.addEventListener('click', resetAll);

  function resetAll() {
    replayBtn.classList.remove('visible');
    
    // Reset paintings
    monaLisaPainting.style.display = 'block';
    geishaPainting.style.display = 'none';
    paintingFrame.style.transform = 'none';
    paintingFrame.style.opacity = '1';

    // Reset positions
    const robber1 = robbersGroup.querySelector('.robber1');
    const robber2 = robbersGroup.querySelector('.robber2');
    const grandpa = menGroup.querySelector('.grandpa');
    const son = menGroup.querySelector('.son');

    robber1.style.right = '-200px';
    robber2.style.right = '-200px';
    grandpa.style.left = '-250px';
    son.style.left = '-250px';

    speechBubbles.forEach(b => b.style.opacity = '0');

    // Reset pupils
    leftPupil.setAttribute('cx', leftEyeCenter.x);
    leftPupil.setAttribute('cy', leftEyeCenter.y);
    rightPupil.setAttribute('cx', rightEyeCenter.x);
    rightPupil.setAttribute('cy', rightEyeCenter.y);

    isAnimating = false;
  }
});