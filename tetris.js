(() => {
  const canvas = document.querySelector('#tetris-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const columns = 10;
  const rows = 20;
  const cellSize = 22;
  const offsetX = (canvas.width - columns * cellSize) / 2;
  const offsetY = 4;
  const dropRate = 500;
  const highScoreKey = 'leo-dongchul-tetris-best';
  const colors = { I: '#5ee7f7', J: '#7b8cff', L: '#ffad66', O: '#ffe27a', S: '#8cf0c2', T: '#c58cff', Z: '#ff7f9f' };
  const pieces = {
    I: [[1, 1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[0, 1, 0], [1, 1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]],
  };
  const scoreElement = document.querySelector('#tetris-score');
  const highScoreElement = document.querySelector('#tetris-high-score');
  const statusElement = document.querySelector('#tetris-status');
  const startButton = document.querySelector('#tetris-start');
  const pauseButton = document.querySelector('#tetris-pause');
  const restartButton = document.querySelector('#tetris-restart');
  let board;
  let active;
  let bag;
  let nextType;
  let score = 0;
  let lines = 0;
  let highScore = readHighScore();
  let gameState = 'ready';
  let timerId = null;

  function readHighScore() {
    try { return Number.parseInt(localStorage.getItem(highScoreKey) || '0', 10) || 0; } catch { return 0; }
  }

  function writeHighScore() {
    try { localStorage.setItem(highScoreKey, String(highScore)); } catch { /* Storage is optional. */ }
  }

  function cloneMatrix(matrix) { return matrix.map((row) => [...row]); }

  function refillBag() {
    bag = Object.keys(pieces).sort(() => Math.random() - 0.5);
  }

  function takeType() {
    if (!bag.length) refillBag();
    return bag.pop();
  }

  function makePiece(type) {
    const matrix = cloneMatrix(pieces[type]);
    return { type, matrix, x: Math.floor((columns - matrix[0].length) / 2), y: 0 };
  }

  function resetBoard() {
    board = Array.from({ length: rows }, () => Array(columns).fill(null));
    bag = [];
    nextType = takeType();
    active = makePiece(takeType());
    score = 0;
    lines = 0;
    updateScore();
    draw();
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
  }

  function updateStatus(message) { statusElement.textContent = message; }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startGame() {
    stopTimer();
    resetBoard();
    gameState = 'playing';
    updateStatus('Playing');
    pauseButton.disabled = false;
    pauseButton.textContent = 'Pause';
    timerId = window.setInterval(drop, dropRate);
    canvas.focus();
  }

  function togglePause() {
    if (gameState === 'playing') {
      stopTimer();
      gameState = 'paused';
      updateStatus('Paused');
      pauseButton.textContent = 'Resume';
    } else if (gameState === 'paused') {
      gameState = 'playing';
      updateStatus('Playing');
      pauseButton.textContent = 'Pause';
      stopTimer();
      timerId = window.setInterval(drop, dropRate);
    }
    draw();
  }

  function collides(piece, dx = 0, dy = 0, matrix = piece.matrix) {
    return matrix.some((row, rowIndex) => row.some((filled, columnIndex) => {
      if (!filled) return false;
      const x = piece.x + columnIndex + dx;
      const y = piece.y + rowIndex + dy;
      return x < 0 || x >= columns || y >= rows || (y >= 0 && board[y][x]);
    }));
  }

  function move(dx, dy) {
    if (gameState !== 'playing' || collides(active, dx, dy)) return false;
    active.x += dx;
    active.y += dy;
    draw();
    return true;
  }

  function rotate() {
    if (gameState !== 'playing') return;
    const rotated = active.matrix[0].map((_, columnIndex) => active.matrix.map((row) => row[columnIndex]).reverse());
    for (const offset of [0, -1, 1]) {
      if (!collides(active, offset, 0, rotated)) {
        active.x += offset;
        active.matrix = rotated;
        draw();
        return;
      }
    }
  }

  function drop() {
    if (!move(0, 1)) lockPiece();
  }

  function lockPiece() {
    active.matrix.forEach((row, rowIndex) => row.forEach((filled, columnIndex) => {
      const y = active.y + rowIndex;
      const x = active.x + columnIndex;
      if (filled && y >= 0) board[y][x] = active.type;
    }));
    clearLines();
    active = makePiece(nextType);
    nextType = takeType();
    if (collides(active)) endGame();
    draw();
  }

  function clearLines() {
    const remaining = board.filter((row) => row.some((cell) => !cell));
    const cleared = rows - remaining.length;
    while (remaining.length < rows) remaining.unshift(Array(columns).fill(null));
    board = remaining;
    if (cleared) {
      lines += cleared;
      score += [0, 100, 300, 500, 800][cleared];
      if (score > highScore) {
        highScore = score;
        writeHighScore();
      }
      updateScore();
    }
  }

  function endGame() {
    stopTimer();
    gameState = 'gameover';
    pauseButton.disabled = true;
    updateStatus('Game over — press Restart');
    draw();
  }

  function drawCell(x, y, color) {
    context.fillStyle = color;
    context.fillRect(offsetX + x * cellSize + 1, offsetY + y * cellSize + 1, cellSize - 2, cellSize - 2);
  }

  function draw() {
    context.fillStyle = '#0a0c10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#161c26';
    for (let y = 0; y <= rows; y += 1) {
      context.beginPath(); context.moveTo(offsetX, offsetY + y * cellSize); context.lineTo(offsetX + columns * cellSize, offsetY + y * cellSize); context.stroke();
    }
    for (let x = 0; x <= columns; x += 1) {
      context.beginPath(); context.moveTo(offsetX + x * cellSize, offsetY); context.lineTo(offsetX + x * cellSize, offsetY + rows * cellSize); context.stroke();
    }
    board.forEach((row, y) => row.forEach((type, x) => { if (type) drawCell(x, y, colors[type]); }));
    if (active) active.matrix.forEach((row, y) => row.forEach((filled, x) => { if (filled && active.y + y >= 0) drawCell(active.x + x, active.y + y, colors[active.type]); }));
    if (gameState === 'paused' || gameState === 'gameover') {
      context.fillStyle = 'rgba(10, 12, 16, 0.72)';
      context.fillRect(offsetX, offsetY, columns * cellSize, rows * cellSize);
    }
  }

  canvas.addEventListener('keydown', (event) => {
    const actions = { ArrowLeft: () => move(-1, 0), ArrowRight: () => move(1, 0), ArrowDown: () => move(0, 1), ArrowUp: rotate };
    if (actions[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      actions[event.key]();
    } else if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      togglePause();
    }
  });
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', startGame);
  resetBoard();
  updateStatus('Ready to play');
})();
