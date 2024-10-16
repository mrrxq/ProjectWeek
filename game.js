// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Load images and sounds
const playerSprite = new Image();
playerSprite.src = 'player.png';
const enemySprite = new Image();
enemySprite.src = 'enemy.png';
const bossSprite = new Image();
bossSprite.src = 'boss.png';
const backgroundImage = new Image();
backgroundImage.src = 'background.png';

const hitSound = new Audio('hit.mp3');
const gameOverSound = new Audio('audio/game_over.mp3');
const backgroundMusic = new Audio('audio/background_music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 1;

// Player object
const player = {
  x: 100,
  y: 300,
  width: 50,
  height: 50,
  speed: 5,
  jumpStrength: 20,
  health: 100,
  isAttacked: false,
  bullets: [],
  fireRate: 300,
  lastShotTime: 0,
  isGameOver: false,
  velocityY: 0,
  gravity: 0.5
};

// Game variables
let round = 1;
let totalEnemies = 2;
let bossRound = getNextBossRound();
const npcs = [];
const platforms = [
  { x: 100, y: 850, width: 400, height: 20 },
  { x: 1200, y: 850, width: 400, height: 20 },
  { x: 550, y: 600, width: 300, height: 20 },
  { x: 1000, y: 600, width: 300, height: 20 },
  { x: 450, y: 450, width: 200, height: 20 },
  { x: 1100, y: 450, width: 200, height: 20 },
  { x: 0, y: canvas.height - 70, width: canvas.width, height: 20 }
];

// Function to determine the next boss round
function getNextBossRound() {
  return Math.floor(Math.random() * 6) + 10;
}

// Create NPC function
function createNpc(isBoss = false) {
  const npc = {
    x: Math.random() * (canvas.width - 50),
    y: Math.random() * (canvas.height - 50),
    width: isBoss ? 100 : 50,
    height: isBoss ? 100 : 50,
    speed: isBoss ? 1.5 : 2 + (round * 0.1),
    health: isBoss ? 500 : 100,
    attackRange: isBoss ? 150 : 100,
    isAttacking: false,
    isDead: false,
    sprite: isBoss ? bossSprite : enemySprite,
    velocityY: 0,
    gravity: 0.5
  };
  npcs.push(npc);
}

// Spawn enemies
function spawnEnemies() {
  if (round === bossRound) {
    createNpc(true);
    bossRound = getNextBossRound();
  } else {
    for (let i = 0; i < totalEnemies; i++) {
      createNpc();
    }
  }
  totalEnemies += 1;
}

spawnEnemies();

// Key press handling
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  e: false,
  r: false
};

window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

// Function to get distance between player and NPC
function getDistance(player, npc) {
  const dx = player.x - npc.x;
  const dy = player.y - npc.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Function to apply gravity to NPC
function applyGravityToNpc(npc) {
  if (!isNpcOnPlatform(npc)) {
    npc.velocityY += npc.gravity;
  } else {
    npc.velocityY = 0;
  }
  npc.y += npc.velocityY;

  if (npc.y + npc.height > canvas.height) {
    npc.y = canvas.height - npc.height;
    npc.velocityY = 0;
  }
}

// Check if NPC is on a platform
function isNpcOnPlatform(npc) {
  for (const platform of platforms) {
    if (
      npc.x < platform.x + platform.width &&
      npc.x + npc.width > platform.x &&
      npc.y + npc.height < platform.y + platform.height &&
      npc.y + npc.height + npc.velocityY >= platform.y
    ) {
      npc.y = platform.y - npc.height;
      return true;
    }
  }
  return false;
}

// Move NPCs towards player
function moveNpcsTowardsPlayer() {
  npcs.forEach(npc => {
    if (npc.isDead) return;

    applyGravityToNpc(npc);

    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const distance = getDistance(player, npc);

    if (distance > npc.attackRange) {
      const angle = Math.atan2(dy, dx);
      npc.x += npc.speed * Math.cos(angle);
      npc.y += npc.speed * Math.sin(angle);
      npc.isAttacking = false;
    } else {
      npc.isAttacking = true;
    }
  });
}

// Check if player is on a platform
function isPlayerOnPlatform() {
  for (const platform of platforms) {
    if (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x &&
      player.y + player.height < platform.y + platform.height &&
      player.y + player.height + player.velocityY >= platform.y
    ) {
      player.velocityY = 0;
      player.y = platform.y - player.height;
      return true;
    }
  }
  return false;
}

// Move player
function movePlayer() {
  if (player.isGameOver) return;

  if (keys.w && player.y > 0 && isPlayerOnPlatform()) {
    player.velocityY = -player.jumpStrength;
  }
  if (keys.a && player.x > 0) player.x -= player.speed;
  if (keys.d && player.x + player.width < canvas.width) player.x += player.speed;

  if (!isPlayerOnPlatform()) {
    player.velocityY += player.gravity;
  }

  player.y += player.velocityY;

  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
    player.velocityY = 0;
  }
}

// Function for NPC attacks on player
function attackPlayer() {
  npcs.forEach(npc => {
    if (npc.isAttacking) {
      if (!player.isAttacked) {
        player.health -= npc.isBoss ? 50 : 33.33;
        player.isAttacked = true;
        hitSound.play();

        if (player.health <= 0) {
          player.health = 0;
          gameOver();
        }

        setTimeout(() => {
          player.isAttacked = false;
        }, 1000);
      }
    }
  });
}

// Function to shoot bullets
function shootBullet() {
  const now = Date.now();
  if (keys.e && now - player.lastShotTime > player.fireRate) {
    player.bullets.push({
      x: player.x + player.width / 2 - 5,
      y: player.y + player.height / 2,
      width: 10,
      height: 10,
      speed: 7,
      direction: {
        x: keys.d ? 1 : keys.a ? -1 : 0,
        y: keys.w ? -1 : keys.s ? 1 : 0
      }
    });
    player.lastShotTime = now;
  }
}

// Move bullets and detect collisions
function moveBullets() {
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];
    bullet.x += bullet.direction.x * bullet.speed;
    bullet.y += bullet.direction.y * bullet.speed;

    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      player.bullets.splice(i, 1);
    }

    npcs.forEach(npc => {
      if (
        bullet.x < npc.x + npc.width &&
        bullet.x + bullet.width > npc.x &&
        bullet.y < npc.y + npc.height &&
        bullet.y + bullet.height > npc.y &&
        !npc.isDead
      ) {
        npc.health -= 50;
        if (npc.health <= 0) {
          npc.isDead = true;
        }
        player.bullets.splice(i, 1);
      }
    });
  }
}

// Game over function
function gameOver() {
  player.isGameOver = true;
  backgroundMusic.pause();
  gameOverSound.play();
}

// Restart the game
function restartGame() {
  player.health = 100;
  player.isGameOver = false;
  player.x = 100;
  player.y = 300;
  player.bullets = [];
  npcs.length = 0;
  totalEnemies = 2;
  round = 1;
  bossRound = getNextBossRound();
  spawnEnemies();
  backgroundMusic.currentTime = 0;
  backgroundMusic.play();
  updateGame();
}

// Event listener for restarting game
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' && player.isGameOver) {
    restartGame();
  }
});

// Draw function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.drawImage(playerSprite, player.x, player.y, player.width, player.height);

  // Draw NPCs
  npcs.forEach(npc => {
    if (!npc.isDead) {
      ctx.drawImage(npc.sprite, npc.x, npc.y, npc.width, npc.height);
    }
  });

  // Draw bullets
  player.bullets.forEach(bullet => {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw platforms
  ctx.fillStyle = 'black';
  platforms.forEach(platform => {
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  });

  // Draw health bar
  ctx.fillStyle = 'red';
  ctx.fillRect(20, 20, player.health * 2, 20);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(20, 20, 200, 20);

  // Draw round number
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText('Round: ' + round, 20, 60);

  if (player.isGameOver) {
    ctx.fillStyle = 'red';
    ctx.font = '50px Arial';
    ctx.fillText('Game Over! Press "R" to Restart', canvas.width / 2 - 250, canvas.height / 2);
  }
}

// Main game loop
function updateGame() {
  movePlayer();
  moveNpcsTowardsPlayer();
  attackPlayer();
  shootBullet();
  moveBullets();

  draw();

  if (!player.isGameOver) {
    requestAnimationFrame(updateGame);
  }
}

// Start the game
backgroundMusic.play();
updateGame();
