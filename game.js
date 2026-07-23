(() => {
  const canvas = document.querySelector('#snake-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const columns = 20;
  const rows = 14;
  const cellSize = 32;
  const tickRate = 160;
  const highScoreKey = 'leo-dongchul-snake-best';
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const statusElement = document.querySelector('#game-status');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  let snake;
  let food;
  let enemy;
  let direction;
  let nextDirection;
  let score = 0;
  let highScore = readHighScore();
  let gameState = 'ready';
  let timerId = null;

  function readHighScore() {
    try {
      return Number.parseInt(localStorage.getItem(highScoreKey) || '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function writeHighScore() {
    try {
      localStorage.setItem(highScoreKey, String(highScore));
    } catch {
      // A blocked localStorage should not stop the game.
    }
  }

  function samePosition(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function isOccupied(position) {
    return snake.some((segment) => samePosition(segment, position))
      || samePosition(enemy, position);
  }

  function randomFreeCell() {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const candidate = {
        x: Math.floor(Math.random() * columns),
        y: Math.floor(Math.random() * rows),
      };
      if (!isOccupied(candidate)) return candidate;
    }
    return { x: 1, y: 1 };
  }

  function resetBoard() {
    snake = [
      { x: 9, y: 7 },
      { x: 8, y: 7 },
      { x: 7, y: 7 },
    ];
    direction = directions.right;
    nextDirection = directions.right;
    enemy = { x: 16, y: 4, direction: directions.down };
    score = 0;
    food = randomFreeCell();
    updateScore();
    draw();
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
  }

  function updateStatus(message) {
    statusElement.textContent = message;
  }

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
    timerId = window.setInterval(tick, tickRate);
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
      timerId = window.setInterval(tick, tickRate);
    }
  }

  function setDirection(name) {
    if (gameState !== 'playing') return;
    const candidate = directions[name];
    if (!candidate) return;
    if (candidate.x === -nextDirection.x && candidate.y === -nextDirection.y) return;
    nextDirection = candidate;
  }

  function reflectedHead(head, currentDirection) {
    const reflected = { x: currentDirection.x, y: currentDirection.y };
    if (head.x < 0 || head.x >= columns) reflected.x *= -1;
    if (head.y < 0 || head.y >= rows) reflected.y *= -1;
    return {
      head: {
        x: Math.max(0, Math.min(columns - 1, head.x)),
        y: Math.max(0, Math.min(rows - 1, head.y)),
      },
      direction: reflected,
    };
  }

  function moveEnemy() {
    const choices = Object.values(directions).filter((candidate) => (
      candidate.x !== -enemy.direction.x || candidate.y !== -enemy.direction.y
    ));
    if (Math.random() < 0.4) {
      enemy.direction = choices[Math.floor(Math.random() * choices.length)];
    }
    const proposed = {
      x: enemy.x + enemy.direction.x,
      y: enemy.y + enemy.direction.y,
    };
    const result = reflectedHead(proposed, enemy.direction);
    enemy.x = result.head.x;
    enemy.y = result.head.y;
    enemy.direction = result.direction;
  }

  function tick() {
    direction = nextDirection;
    const proposedHead = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };
    const result = reflectedHead(proposedHead, direction);
    direction = result.direction;
    nextDirection = direction;
    const newHead = result.head;
    moveEnemy();

    if (snake.some((segment) => samePosition(segment, newHead)) || samePosition(enemy, newHead)) {
      endGame();
      return;
    }

    snake.unshift(newHead);
    if (samePosition(newHead, food)) {
      score += 10;
      if (score > highScore) {
        highScore = score;
        writeHighScore();
      }
      food = randomFreeCell();
    } else {
      snake.pop();
    }
    updateScore();
    draw();
  }

  function endGame() {
    stopTimer();
    gameState = 'gameover';
    pauseButton.disabled = true;
    updateStatus('Game over — press Restart');
    draw();
  }

  function drawCell(position, color, radius = 0.18) {
    const inset = cellSize * radius;
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(
      position.x * cellSize + inset,
      position.y * cellSize + inset,
      cellSize - inset * 2,
      cellSize - inset * 2,
      cellSize * 0.16,
    );
    context.fill();
  }

  function draw() {
    context.fillStyle = '#0a0c10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#161c26';
    context.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) {
      context.beginPath();
      context.moveTo(x * cellSize, 0);
      context.lineTo(x * cellSize, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
      context.beginPath();
      context.moveTo(0, y * cellSize);
      context.lineTo(canvas.width, y * cellSize);
      context.stroke();
    }
    drawCell(food, '#ffb86b', 0.24);
    drawCell(enemy, '#ff6b8a', 0.18);
    snake.forEach((segment, index) => drawCell(segment, index === 0 ? '#f4f6fb' : '#8cf0c2', 0.16));
  }

  document.addEventListener('keydown', (event) => {
    const keyMap = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (keyMap[key]) {
      event.preventDefault();
      setDirection(keyMap[key]);
    } else if (key === ' ') {
      event.preventDefault();
      togglePause();
    }
  });

  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      setDirection(button.dataset.direction);
    });
  });
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', startGame);

  resetBoard();
  updateStatus('Ready to play');
})();
