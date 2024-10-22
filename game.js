// Canvas instellen   
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Laden van afbeeldingen en geluiden
const playerSprite = new Image();
playerSprite.src = 'player.png';
const enemySprite = new Image();
enemySprite.src = 'enemy.png';
const backgroundImage = new Image();
backgroundImage.src = 'background.png';

const hitSound = new Audio('hit.mp3');
const gameOverSound = new Audio('audio/game_over.mp3');
const backgroundMusic = new Audio('audio/background_music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 1;

// Highscore bijhouden
let highscore = localStorage.getItem('highscore') || 0;
let score = 0; // Huidige score

// Speler object
const player = {
  x: 100,
  y: 300,
  width: 50,
  height: 50,
  speed: 5,
  bullets: [],
  fireRate: 300, // Milliseconden tussen schoten
  lastShotTime: 0,
  health: 100, // 100% gezondheid
  isGameOver: false,
  gravity: 0.5,
  velocityY: 0,
  onGround: true
};

// NPC objecten
let npcList = [];
let currentWave = 0;
let enemiesPerWave = 5; // Aantal vijanden per golf
let enemiesDefeated = 0; // Aantal verslagen vijanden
let bossRound = getNextBossRound(); // Bepaal de eerste bossronde

// Variabelen voor muispositie
let mouseX = 0;
let mouseY = 0;

// Event listener om muispositie te volgen
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Toetsenbeheer
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  e: false,
  r: false // Voor het resetten van de game
};

window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;

  // Reset spel bij het indrukken van de R toets
  if (e.key.toLowerCase() === 'r' && player.isGameOver) {
    resetGame();
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

// NPC creëren
function createNpc(isBoss = false) {
  const npc = {
    x: Math.random() * (canvas.width - 50),
    y: Math.random() * (canvas.height - 50),
    width: isBoss ? 100 : 50,
    height: isBoss ? 100 : 50,
    speed: isBoss ? 1.5 : 2 + (currentWave * 0.1),
    health: isBoss ? 500 : 100,
    attackRange: isBoss ? 150 : 100,
    isAttacking: false,
    isDead: false,
    sprite: isBoss ? enemySprite : enemySprite,
    velocityY: 0,
    gravity: 0.5
  };
  npcList.push(npc);
}

// Functie om nieuwe golf te spawnen
function spawnNewWave() {
  if (currentWave === bossRound) {
    createNpc(true); // Maak een boss NPC
    bossRound = getNextBossRound(); // Bepaal de volgende bossronde
  } else {
    for (let i = 0; i < enemiesPerWave; i++) {
      createNpc(); // Maak vijanden voor de nieuwe golf
    }
  }
  enemiesDefeated = 0; // Reset het aantal verslagen vijanden
}

// Functie om de volgende bossronde te bepalen
function getNextBossRound() {
  return Math.floor(Math.random() * 6) + 10;
}

// Functie om kogels te schieten
function shootBullet() {
  if (keys.e && Date.now() - player.lastShotTime > player.fireRate) {
    const angle = Math.atan2(mouseY - (player.y + player.height / 2), mouseX - (player.x + player.width / 2));
    const speed = 7;

    const bullet = {
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      width: 10,
      height: 5,
      velocityX: speed * Math.cos(angle),
      velocityY: speed * Math.sin(angle)
    };

    player.bullets.push(bullet);
    player.lastShotTime = Date.now();
  }
}

// Functie om kogels te bewegen en tekenen
function moveBullets() {
  player.bullets.forEach((bullet, bulletIndex) => {
    bullet.x += bullet.velocityX;
    bullet.y += bullet.velocityY;

    // Teken de kogel
    ctx.fillStyle = 'yellow'; // Kleur van de kogel
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height); // Teken de kogel als een rechthoek

    // Verwijder kogel als deze buiten het scherm gaat
    if (bullet.x > canvas.width || bullet.x < 0 || bullet.y > canvas.height || bullet.y < 0) {
      player.bullets.splice(bulletIndex, 1);
    } else {
      // Controleer of de kogel een NPC raakt
      npcList.forEach((npc, npcIndex) => {
        if (!npc.isDead && bullet.x < npc.x + npc.width && bullet.x + bullet.width > npc.x && 
            bullet.y < npc.y + npc.height && bullet.y + bullet.height > npc.y) {
          npc.isDead = true;
          hitSound.play(); // Speel het geluid af
          player.bullets.splice(bulletIndex, 1); // Verwijder de kogel
          enemiesDefeated++; // Verhoog het aantal verslagen vijanden
          score++; // Verhoog de score

          // Controleer of het aantal verslagen vijanden gelijk is aan het aantal vijanden per golf
          if (enemiesDefeated >= enemiesPerWave) {
            currentWave++;
            enemiesPerWave += 2; // Verhoog het aantal vijanden per golf
            spawnNewWave(); // Spawn een nieuwe golf
          }
        }
      });
    }
  });
}

// Functie om NPC's te bewegen
function moveNpcs() {
  npcList.forEach(npc => {
    if (!npc.isDead) {
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Beweeg de NPC naar de speler als ze verder dan 100 pixels zijn
      if (distance > 100) {
        npc.x += (dx / distance) * npc.speed;
        npc.y += (dy / distance) * npc.speed;
      } else {
        // Als de NPC dichtbij de speler is, raakt hij de speler
        player.health -= npc.isBoss ? 50 : 33.33; // Verminder gezondheid van de speler
        if (player.health <= 0) {
          player.health = 0;
          player.isGameOver = true; // Speler is dood
          backgroundMusic.pause(); // Stop achtergrondmuziek
          gameOverSound.play(); // Speel game over geluid
        }
      }
    }
  });
}

// Functie om speler te bewegen
function movePlayer() {
  if (keys.w && player.onGround) {
    player.velocityY = -10; // Springhoogte
    player.onGround = false;
  }
  
  // Zwaartekracht toepassen
  player.y += player.velocityY;
  player.velocityY += player.gravity; // Zwaartekracht toevoegen

  // Zorg ervoor dat de speler de grond raakt
  if (player.y + player.height >= canvas.height) {
    player.y = canvas.height - player.height; // Zet de speler op de grond
    player.velocityY = 0; // Stop de val
    player.onGround = true; // Speler is op de vloer
  }

  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;
}

// Gezondheidsbalk tekenen
function drawHealthBar() {
  ctx.fillStyle = 'red';
  ctx.fillRect(10, 10, 200, 20); // Achtergrond van de gezondheidsbalk
  ctx.fillStyle = 'green';
  ctx.fillRect(10, 10, player.health * 3, 20); // Gezondheidsbalk
}

// Huidige score, highscore en golf tekenen
function drawScoreAndWave() {
  ctx.fillStyle = 'White';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 10, 50);
  ctx.fillText('Highscore: ' + highscore, 10, 80);
  ctx.fillText('Wave: ' + currentWave, 10, 110);
}

// Reset functie
function resetGame() {
  if (score > highscore) {
    highscore = score; // Update highscore als de score hoger is
    localStorage.setItem('highscore', highscore); // Sla nieuwe highscore op in localStorage
  }
  score = 0; // Reset de score
  player.health = 100;
  player.isGameOver = false;
  player.x = 100;
  player.y = 300;
  player.bullets = [];
  
  // Reset NPC lijst
  npcList = [];
  currentWave = 0;
  enemiesPerWave = 5; // Reset vijanden per golf
  spawnNewWave(); // Spawn de eerste golf
  backgroundMusic.currentTime = 0; // Reset de achtergrondmuziek
  backgroundMusic.play(); // Speel achtergrondmuziek af
}

// Hoofdfunctie om het spel te tekenen en bij te werken
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Maak canvas leeg

  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height); // Teken achtergrond
  drawHealthBar(); // Teken gezondheidsbalk
  drawScoreAndWave(); // Teken score, highscore en huidige golf

  if (!player.isGameOver) {
    // Beweeg en teken speler
    ctx.drawImage(playerSprite, player.x, player.y, player.width, player.height);
    movePlayer();
    shootBullet();
    moveBullets(); // Kogels bewegen en tekenen
    moveNpcs();

    // Teken alle NPC's
    npcList.forEach(npc => {
      if (!npc.isDead) {
        ctx.drawImage(npc.sprite, npc.x, npc.y, npc.width, npc.height);
      }
    });

    // Controleer of de game is gewonnen of verloren
    if (player.health <= 0) {
      player.isGameOver = true;
      backgroundMusic.pause(); // Stop achtergrondmuziek
      gameOverSound.play(); // Speel game over geluid
    }
  } else {
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText('Game Over!', canvas.width / 2 - 70, canvas.height / 2);
    ctx.fillText('Druk op R om opnieuw te beginnen', canvas.width / 2 - 200, canvas.height / 2 + 50);
  }

  requestAnimationFrame(update); // Vraag de volgende frame aan
}

// Start het spel
spawnNewWave(); // Spawn de eerste golf
backgroundMusic.play(); // Speel achtergrondmuziek af
update(); // Start de update loop
