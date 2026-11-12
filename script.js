'use strict';

function drawRaster({ width, palette, rows }, alphabet) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = rows.length;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  const colors = new Map(palette.map((hex, index) => [alphabet[index], Number.parseInt(hex, 16)]));
  let offset = 0;
  for (const row of rows) {
    const pixels = row.replace(/~(\d+)~(.)/g, (_, count, color) => color.repeat(Number(count)));
    for (const pixel of pixels) {
      const rgba = colors.get(pixel);
      image.data[offset++] = rgba >>> 24;
      image.data[offset++] = (rgba >>> 16) & 255;
      image.data[offset++] = (rgba >>> 8) & 255;
      image.data[offset++] = rgba & 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function mountPuzzle(game, pixels) {
  const status = game.querySelector('.status');
  const board = game.querySelector('.board');
  const reference = game.querySelector('.reference');
  const victory = game.querySelector('.victory');
  const shuffleButton = game.querySelector('.shuffle');
  const hintButton = game.querySelector('.hint');
  const side = 6;
  let artwork;
  let dog;
  try {
    artwork = drawRaster(pixels.poster, pixels.alphabet);
    dog = drawRaster(pixels.dog, pixels.alphabet);
  } catch {
    status.textContent = 'This browser could not draw the pixel artwork.';
    return false;
  }
  const cellWidth = artwork.width / side;
  const cellHeight = artwork.height / side;
  const solvedOrder = Array.from({ length: side * side }, (_, index) => index);
  const tiles = solvedOrder.map((index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.dataset.index = index;
    button.tabIndex = index === 0 ? 0 : -1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(cellWidth);
    canvas.height = Math.ceil(cellHeight);
    canvas.setAttribute('aria-hidden', 'true');
    button.append(canvas);
    board.append(button);
    return button;
  });

  function drawFull(canvas, image) {
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
  }
  drawFull(reference, artwork);
  victory.style.setProperty('--dog-aspect', dog.width + ' / ' + dog.height);
  victory.querySelectorAll('canvas').forEach((canvas) => drawFull(canvas, dog));

  let order;
  let selected;
  let moves;
  let completed;
  let hintOpen;
  let drag = null;
  let ignorePointerClick = false;
  let tabIndex = 0;

  function solved() {
    return order.every((piece, index) => piece === index);
  }

  function render() {
    tiles.forEach((tile, index) => {
      const piece = order[index];
      if (tile.dataset.piece !== String(piece)) {
        tile.dataset.piece = piece;
        const canvas = tile.firstElementChild;
        const context = canvas.getContext('2d');
        context.drawImage(artwork, (piece % side) * cellWidth, Math.floor(piece / side) * cellHeight,
          cellWidth, cellHeight, 0, 0, canvas.width, canvas.height);
        tile.setAttribute('aria-label', 'Row ' + (Math.floor(index / side) + 1) +
          ', column ' + (index % side + 1) + ', piece ' + (piece + 1));
      }
      tile.setAttribute('aria-pressed', selected === index);
      tile.setAttribute('aria-disabled', hintOpen || completed);
    });
    reference.hidden = !hintOpen && !completed;
    hintButton.disabled = completed;
    hintButton.setAttribute('aria-pressed', hintOpen);
    hintButton.textContent = hintOpen ? 'Hide hint' : 'Hint';
    const count = moves + (moves === 1 ? ' move' : ' moves');
    if (completed) {
      status.textContent = 'LEGEND! Solved in ' + count;
    } else {
      status.textContent = count;
    }
  }

  function shuffle() {
    finishDrag();
    order = [...solvedOrder];
    for (let index = order.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    if (solved()) [order[0], order[1]] = [order[1], order[0]];
    selected = null;
    moves = 0;
    completed = false;
    hintOpen = false;
    victory.hidden = true;
    render();
  }

  function swap(from, to) {
    [order[from], order[to]] = [order[to], order[from]];
    selected = null;
    moves++;
    completed = solved();
    render();
    if (completed) victory.hidden = false;
  }

  function getTile(element) {
    const tile = element?.closest('.tile');
    return tile?.parentElement === board ? tile : null;
  }

  board.addEventListener('focusin', (event) => {
    const tile = getTile(event.target);
    if (!tile) return;
    tiles[tabIndex].tabIndex = -1;
    tabIndex = Number(tile.dataset.index);
    tile.tabIndex = 0;
  });

  board.addEventListener('keydown', (event) => {
    const tile = getTile(event.target);
    const step = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
    if (!tile || !step) return;
    event.preventDefault();
    const index = Number(tile.dataset.index);
    const row = (Math.floor(index / side) + step[0] + side) % side;
    const col = (index % side + step[1] + side) % side;
    tiles[row * side + col].focus();
  });

  board.addEventListener('click', (event) => {
    const tile = getTile(event.target);
    if (!tile || hintOpen || completed || (ignorePointerClick && event.detail > 0)) return;
    finishDrag();
    const index = Number(tile.dataset.index);
    if (selected !== null && selected !== index) {
      swap(selected, index);
    } else {
      selected = selected === index ? null : index;
      render();
    }
  });

  board.addEventListener('pointerdown', (event) => {
    const tile = getTile(event.target);
    if (!tile || hintOpen || completed || drag || !event.isPrimary || event.button !== 0) return;
    ignorePointerClick = false;
    drag = { id: event.pointerId, tile, x: event.clientX, y: event.clientY, ghost: null, target: null };
    tile.setPointerCapture(event.pointerId);
  });

  function distance(event) {
    return Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
  }

  board.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.ghost) {
      if (distance(event) < 5) return;
      const rect = drag.tile.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'drag-image';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.setAttribute('aria-hidden', 'true');
      const canvas = document.createElement('canvas');
      drawFull(canvas, drag.tile.firstElementChild);
      ghost.append(canvas);
      document.body.append(ghost);
      drag.ghost = ghost;
    }
    drag.ghost.style.left = event.clientX + 'px';
    drag.ghost.style.top = event.clientY + 'px';
    drag.target?.classList.remove('drop-target');
    drag.target = getTile(document.elementFromPoint(event.clientX, event.clientY));
    drag.target?.classList.add('drop-target');
  });

  function finishDrag() {
    if (!drag) return;
    const current = drag;
    drag = null;
    current.ghost?.remove();
    current.target?.classList.remove('drop-target');
    if (current.tile.hasPointerCapture(current.id)) current.tile.releasePointerCapture(current.id);
  }

  board.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.ghost || distance(event) >= 5) {
      ignorePointerClick = true;
      const target = getTile(document.elementFromPoint(event.clientX, event.clientY));
      if (target && target !== drag.tile) swap(Number(drag.tile.dataset.index), Number(target.dataset.index));
    }
    finishDrag();
  });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    board.addEventListener(type, (event) => {
      if (drag?.id === event.pointerId) finishDrag();
    });
  }

  shuffleButton.addEventListener('click', shuffle);
  hintButton.addEventListener('click', () => {
    finishDrag();
    hintOpen = !hintOpen;
    selected = null;
    render();
  });
  shuffleButton.disabled = false;
  shuffle();
  return true;
}

mountPuzzle(document.querySelector('.game'), legendPixels);
