// Space Invaders Game
// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 750;
const PLAYER_SPEED = 5;
const PLAYER_SIZE = 40;
const ALIEN_ROWS = 5;
const ALIENS_PER_ROW = 11;
const ALIEN_PADDING = 15;

// Game state
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        
        // Initialize game state
        this.resetState();
        
        // Bind event handlers
        this.initInput();
        this.bindUI();
        
        // Start animation loop
        this.animate();
    }
    
    resetState() {
        this.player = null;
        this.aliens = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // Alien movement state
        this.alienDirection = 1;
        this.alienSpeed = 0.4;  // Start slow at level 1
        this.alienDropAmount = 12;
        this.alienDropAmount = 20;
        
        // Game flags
        this.gameActive = false;
    }
    
    startGame() {
        this.resetState();
        this.player = new Player(this);
        this.spawnAliens();
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.gameActive = true;
        
        // Hide screens
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        this.updateUI();
    }
    
    spawnAliens() {
        const startX = 50;
        const startY = 40;
        
        for (let row = 0; row < ALIEN_ROWS; row++) {
            // Adjust number of aliens based on level
            let aliensInRow = ALIENS_PER_ROW;
            if (this.level >= 3 && row > 2) aliensInRow -= 1;
            if (this.level >= 5 && row > 0) aliensInRow -= 2;
            
            for (let col = 0; col < aliensInRow; col++) {
                const x = startX + col * (40 + ALIEN_PADDING);
                const y = startY + row * (35 + ALIEN_PADDING);
                
                // Determine alien type based on row
                let AlienType;
                if (row === 0) AlienType = TopAlien;
                else if (row < 3) AlienType = MiddleAlien;
                else AlienType = BottomAlien;
                
                this.aliens.push(new AlienType(x, y));
            }
        }
        
        // Update alien speed based on level (gentler progression, properly capped)
        this.alienSpeed = Math.min(0.4 + (this.level - 1) * 0.1, 1.5);
    }
    
    gameOver() {
        this.gameActive = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    levelUp() {
        this.level++;
        
        // Pause game to prevent movement during transition
        this.gameActive = false;
        
        // Clear old invaders before spawning new ones
        this.aliens = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        
        // Reset alien movement direction for fresh start
        this.alienDirection = 1;
        
        const levelScreen = document.getElementById('levelScreen');
        levelScreen.classList.remove('hidden');
        
        setTimeout(() => {
            this.spawnAliens();
            this.gameActive = true;
            levelScreen.classList.add('hidden');
        }, 1500);
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }
    
    initInput() {
        const keys = {};
        
        window.addEventListener('keydown', (e) => {
            if (!this.gameActive && e.code === 'Space') {
                if (!document.getElementById('startScreen').classList.contains('hidden')) {
                    this.startGame();
                } else if (!document.getElementById('gameOverScreen').classList.contains('hidden')) {
                    this.startGame();
                }
            }
            
            keys[e.code] = true;
            
            if (e.code === 'Space' && this.gameActive) {
                e.preventDefault();
                if (this.player && !this.player.cooldown) {
                    this.player.shoot();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });
        
        this.keys = () => keys;
    }
    
    bindUI() {
        document.getElementById('startBtn').addEventListener('click', () => {
            if (!this.gameActive) {
                this.startGame();
            }
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });
    }
    
    checkCollisions() {
        // Player projectiles hitting aliens
        this.projectiles.forEach((proj, index) => {
            this.aliens.forEach((alien, alienIndex) => {
                if (rectIntersect(proj.x, proj.y, proj.width, proj.height,
                                 alien.x, alien.y, alien.width, alien.height)) {
                    // Remove projectile and alien
                    this.projectiles.splice(index, 1);
                    this.aliens.splice(alienIndex, 1);
                    
                    // Add score based on alien type
                    this.score += alien.points;
                    this.updateUI();
                    
                    // Create explosion effect
                    this.createExplosion(alien.x + alien.width/2, alien.y + alien.height/2);
                }
            });
        });
        
        // Enemy projectiles hitting player
        this.enemyProjectiles.forEach((proj, index) => {
            if (this.player && rectIntersect(proj.x, proj.y, proj.width, proj.height,
                                             this.player.x, this.player.y, this.player.size, this.player.size)) {
                this.enemyProjectiles.splice(index, 1);
                this.lives--;
                this.updateUI();
                this.createExplosion(this.player.x + this.player.size/2, 
                                    this.player.y + this.player.size/2);
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });
    }
    
    update() {
        if (!this.gameActive || !this.player) return;
        
        // Update player
        const keys = this.keys();
        
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.player.move(-1);
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.player.move(1);
        }
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(p => p.y > 0);
        this.projectiles.forEach(p => p.y -= p.speed);
        
        this.enemyProjectiles = this.enemyProjectiles.filter(p => p.y < CANVAS_HEIGHT);
        this.enemyProjectiles.forEach(p => p.y += p.speed);
        
        // Update particles
        this.particles.forEach((p, index) => {
            if (p.life <= 0) {
                this.particles.splice(index, 1);
            } else {
                p.update();
            }
        });
        
        // Check win condition and move aliens
        if (this.aliens.length === 0) {
            this.levelUp();
        } else {
            this.moveAliens();
            
            // Random alien shooting - capped by current level for fair progression
            const maxShooterChance = Math.min(0.08, this.level * 0.01);
            if (Math.random() < maxShooterChance && this.aliens.length > 0) {
                const randomAlien = this.aliens[Math.floor(Math.random() * this.aliens.length)];
                this.enemyProjectiles.push(new Projectile(randomAlien.x + randomAlien.width/2, 
                                                         randomAlien.y + randomAlien.height,
                                                         4, 6, 3));  // Speed reduced to 3 (from default 6)
            }
        }
        
        // Check collisions
        this.checkCollisions();
    }
    
    moveAliens() {
        if (this.aliens.length === 0) return;
        
        let shouldDrop = false;
        const edgeDistance = 30;
        
        this.aliens.forEach(alien => {
            if ((alien.x + alien.width > CANVAS_WIDTH - edgeDistance && this.alienDirection === 1) ||
                (alien.x < edgeDistance && this.alienDirection === -1)) {
                shouldDrop = true;
            }
        });
        
        if (shouldDrop) {
            this.aliens.forEach(alien => alien.y += this.alienDropAmount);
            this.alienDirection *= -1;
        } else {
            this.aliens.forEach(alien => alien.x += this.alienSpeed * this.alienDirection);
        }
        
        // Check if aliens reached the bottom
        const playerY = CANVAS_HEIGHT - PLAYER_SIZE - 20;
        this.aliens.forEach(alien => {
            if (alien.y + alien.height >= playerY) {
                this.lives = 0;
                this.updateUI();
                this.gameOver();
            }
        });
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y));
        }
    }
    
    draw() {
        // Clear canvas with starfield background
        this.ctx.fillStyle = 'rgba(0, 0, 20, 1)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw stars
        this.drawStars();
        
        if (!this.gameActive || !this.player) return;
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw aliens
        this.aliens.forEach(alien => alien.draw(this.ctx));
        
        // Draw projectiles
        this.ctx.fillStyle = '#4ecdc4';
        this.projectiles.forEach(proj => {
            this.ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        });
        
        // Draw enemy projectiles
        this.ctx.fillStyle = '#ff6b6b';
        this.enemyProjectiles.forEach(proj => {
            this.ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        });
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
    }
    
    drawStars() {
        // Simple starfield effect with pseudo-random positions based on frame
        const seed = Math.floor(Date.now() / 1000);
        for (let i = 0; i < 50; i++) {
            const x = ((seed * 37 + i * 97) % CANVAS_WIDTH);
            const y = ((seed * 17 + i * 73) % CANVAS_HEIGHT);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${(Math.sin(seed + i) + 1) / 4})`;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Player ship class
class Player {
    constructor(game) {
        this.game = game;
        this.size = PLAYER_SIZE;
        this.x = CANVAS_WIDTH / 2 - this.size / 2;
        this.y = CANVAS_HEIGHT - this.size - 20;
        this.cooldown = false;
        
        // Animation state
        this.animationFrame = 0;
    }
    
    move(direction) {
        const newX = this.x + direction * PLAYER_SPEED;
        if (newX >= 0 && newX <= CANVAS_WIDTH - this.size) {
            this.x = newX;
        }
    }
    
    shoot() {
        this.cooldown = true;
        this.game.projectiles.push(new Projectile(this.x + this.size / 2,
                                                  this.y,
                                                  3, 8));
        setTimeout(() => { this.cooldown = false; }, 250);
    }
    
    draw(ctx) {
        ctx.save();
        
        // Ship body
        ctx.fillStyle = '#4ecdc4';
        
        // Animated ship shape with glow effect
        const glowSize = this.animationFrame % 20 < 10 ? 5 : 3;
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = glowSize;
        
        // Draw ship using triangle shape
        ctx.beginPath();
        ctx.moveTo(this.x + this.size / 2, this.y);
        ctx.lineTo(this.x + this.size, this.y + this.size);
        ctx.lineTo(this.x + this.size * 0.7, this.y + this.size * 0.85);
        ctx.lineTo(this.x + this.size * 0.3, this.y + this.size * 0.85);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.closePath();
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#1a9c9e';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.x + this.size / 2, this.y + this.size * 0.6, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Engine glow
        ctx.fillStyle = '#ff6b6b';
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 10;
        const engineHeight = (this.animationFrame % 15 < 8) ? 12 : 8;
        ctx.fillRect(this.x + this.size * 0.4, this.y + this.size - 3,
                    this.size * 0.2, engineHeight);
        
        ctx.restore();
        this.animationFrame++;
    }
}

// Projectile class
class Projectile {
    constructor(x, y, width = 4, height = 8, speed = 6) {
        this.x = x - width / 2;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;  // Player projectiles: 6, Enemy projectiles: slower
    }
}

// Alien base class
class Alien {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 25;
        this.animationFrame = 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#fff';
        
        // Alternate between two animation frames
        const frame = Math.floor(this.animationFrame / 10) % 2;
        
        this.drawAlienShape(ctx, frame);
        
        ctx.restore();
    }
    
    drawAlienShape(ctx, frame) {
        // Abstract alien shape - to be overridden
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Top row aliens (worth most points)
class TopAlien extends Alien {
    constructor(x, y) {
        super(x, y);
        this.points = 30;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ff6b6b';
        
        const frame = Math.floor(this.animationFrame / 15) % 2;
        const px = this.x;
        const py = this.y;
        
        // Draw octopus-like alien
        if (frame === 0) {
            // Top body
            ctx.fillRect(px + 6, py, 18, 8);
            ctx.fillRect(px + 3, py + 8, 24, 8);
            // Tentacles down
            ctx.fillRect(px, py + 16, 4, 5);
            ctx.fillRect(px + 6, py + 16, 4, 6);
            ctx.fillRect(px + 13, py + 16, 4, 6);
            ctx.fillRect(px + 20, py + 16, 4, 5);
        } else {
            // Top body
            ctx.fillRect(px + 6, py, 18, 8);
            ctx.fillRect(px + 3, py + 8, 24, 8);
            // Tentacles up
            ctx.fillRect(px, py + 16, 4, 5);
            ctx.fillRect(px + 6, py + 11, 4, 7);
            ctx.fillRect(px + 13, py + 11, 4, 7);
            ctx.fillRect(px + 20, py + 16, 4, 5);
        }
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 8, py + 10, 3, 3);
        ctx.fillRect(px + 19, py + 10, 3, 3);
        
        ctx.restore();
        this.animationFrame++;
    }
}

// Middle row aliens
class MiddleAlien extends Alien {
    constructor(x, y) {
        super(x, y);
        this.points = 20;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#feca57';
        
        const frame = Math.floor(this.animationFrame / 15) % 2;
        const px = this.x;
        const py = this.y;
        
        if (frame === 0) {
            // Main body
            ctx.fillRect(px + 4, py, 22, 16);
            ctx.fillRect(px, py + 8, 4, 6);
            ctx.fillRect(px + 26, py + 8, 4, 6);
            // Legs
            ctx.fillRect(px + 3, py + 16, 5, 5);
            ctx.fillRect(px + 12, py + 16, 6, 4);
            ctx.fillRect(px + 21, py + 16, 5, 5);
        } else {
            // Main body
            ctx.fillRect(px + 4, py, 22, 16);
            ctx.fillRect(px, py + 8, 4, 6);
            ctx.fillRect(px + 26, py + 8, 4, 6);
            // Legs alternate
            ctx.fillRect(px + 3, py + 16, 5, 5);
            ctx.fillRect(px + 12, py + 17, 6, 3);
            ctx.fillRect(px + 21, py + 16, 5, 5);
        }
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 8, py + 4, 4, 4);
        ctx.fillRect(px + 18, py + 4, 4, 4);
        
        ctx.restore();
        this.animationFrame++;
    }
}

// Bottom row aliens (worth least points)
class BottomAlien extends Alien {
    constructor(x, y) {
        super(x, y);
        this.points = 10;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#4ecdc4';
        
        const frame = Math.floor(this.animationFrame / 15) % 2;
        const px = this.x;
        const py = this.y;
        
        if (frame === 0) {
            // Body
            ctx.fillRect(px + 5, py + 4, 20, 16);
            ctx.fillRect(px + 8, py, 14, 4);
            // Legs down
            ctx.fillRect(px + 2, py + 20, 6, 4);
            ctx.fillRect(px + 12, py + 19, 6, 5);
            ctx.fillRect(px + 22, py + 20, 6, 4);
        } else {
            // Body
            ctx.fillRect(px + 5, py + 4, 20, 16);
            ctx.fillRect(px + 8, py, 14, 4);
            // Legs up
            ctx.fillRect(px + 2, py + 19, 6, 5);
            ctx.fillRect(px + 12, py + 20, 6, 4);
            ctx.fillRect(px + 22, py + 19, 6, 5);
        }
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 10, py + 8, 4, 3);
        ctx.fillRect(px + 16, py + 8, 4, 3);
        
        ctx.restore();
        this.animationFrame++;
    }
}

// Particle effect for explosions
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = Math.random() * 0.4 + 0.2;
        this.maxLife = this.life;
        this.color = `hsl(${Math.random() * 60 + 10}, 100%, 70%)`;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        const size = Math.random() * 4 + 2;
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
        ctx.restore();
    }
}

// Utility function for collision detection
function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 &&
           y1 < y2 + h2 && y1 + h1 > y2;
}

// Initialize game when page loads
window.onload = () => {
    new Game();
};
