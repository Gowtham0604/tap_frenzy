/**
 * TAP FRENZY: NEON EDITION
 * Professional Game Logic
 */

const CONFIG = {
    SPAWN_INTERVAL_MIN: 400,
    SPAWN_INTERVAL_MAX: 1200,
    TARGET_LIFE_MIN: 800,
    TARGET_LIFE_MAX: 2200,
    COMBO_DECAY_RATE: 1.5, // Percent per frame at 60fps
    DIFFICULTY_RAMP: 0.05, // How fast it gets harder per point
    MAX_LIVES: 3,
    POINTS: {
        STANDARD: 10,
        GOLD: 50,
        BOMB: -25
    },
    PROBABILITIES: {
        GOLD: 0.1,
        BOMB: 0.15
    }
};

class Game {
    constructor() {
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.comboMeter = 0;
        this.lives = CONFIG.MAX_LIVES;
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.targets = [];
        this.lastSpawnTime = 0;
        this.highScore = parseInt(localStorage.getItem('tf_high_score')) || 0;
        this.leaderboard = JSON.parse(localStorage.getItem('tf_leaderboard')) || [];
        this.playerName = localStorage.getItem('tf_player_name') || '';

        // DOM Elements
        this.dom = {
            container: document.getElementById('game-container'),
            arena: document.getElementById('arena'),
            overlay: document.getElementById('screen-overlay'),
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            score: document.getElementById('score'),
            comboBadge: document.getElementById('combo-badge'),
            comboBar: document.getElementById('combo-bar'),
            lives: document.querySelectorAll('.life'),
            bestScore: document.getElementById('best-score'),
            finalScore: document.getElementById('final-score'),
            maxCombo: document.getElementById('max-combo'),
            leaderboardList: document.getElementById('leaderboard-list'),
            playerNameInput: document.getElementById('player-name'),
            startBtn: document.getElementById('start-btn'),
            restartBtn: document.getElementById('restart-btn')
        };

        this.init();
    }

    init() {
        this.dom.bestScore.textContent = this.highScore;
        this.dom.playerNameInput.value = this.playerName;

        this.dom.startBtn.addEventListener('click', () => this.start());
        this.dom.restartBtn.addEventListener('click', () => this.showMenu());
        
        // Input handling
        this.dom.playerNameInput.addEventListener('input', (e) => {
            this.playerName = e.target.value.toUpperCase();
            localStorage.setItem('tf_player_name', this.playerName);
        });

        // Start animation loop
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    start() {
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.comboMeter = 0;
        this.lives = CONFIG.MAX_LIVES;
        this.targets = [];
        this.dom.arena.innerHTML = '';
        this.updateHUD();
        
        this.state = 'PLAYING';
        this.dom.overlay.classList.remove('visible');
        this.dom.startScreen.classList.add('hidden');
        this.dom.gameOverScreen.classList.add('hidden');
    }

    showMenu() {
        this.state = 'MENU';
        this.dom.overlay.classList.add('visible');
        this.dom.startScreen.classList.remove('hidden');
        this.dom.gameOverScreen.classList.add('hidden');
        this.dom.bestScore.textContent = this.highScore;
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.dom.finalScore.textContent = this.score;
        this.dom.maxCombo.textContent = `x${this.maxCombo}`;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tf_high_score', this.highScore);
        }

        this.updateLeaderboard();
        
        this.dom.overlay.classList.add('visible');
        this.dom.gameOverScreen.classList.remove('hidden');
    }

    updateLeaderboard() {
        if (this.playerName && this.score > 0) {
            this.leaderboard.push({ name: this.playerName, score: this.score });
            this.leaderboard.sort((a, b) => b.score - a.score);
            this.leaderboard = this.leaderboard.slice(0, 5);
            localStorage.setItem('tf_leaderboard', JSON.stringify(this.leaderboard));
        }

        this.dom.leaderboardList.innerHTML = this.leaderboard.map((entry, i) => `
            <div class="leaderboard-item">
                <span class="rank">#${i + 1}</span>
                <span class="name">${entry.name}</span>
                <span class="score">${entry.score}</span>
            </div>
        `).join('') || '<div class="leaderboard-item"><span class="name">NO DATA FOUND</span></div>';
    }

    spawnTarget() {
        const typeRoll = Math.random();
        let type = 'standard';
        if (typeRoll < CONFIG.PROBABILITIES.GOLD) type = 'gold';
        else if (typeRoll < CONFIG.PROBABILITIES.GOLD + CONFIG.PROBABILITIES.BOMB) type = 'bomb';

        const size = type === 'gold' ? 40 : (type === 'bomb' ? 55 : 60);
        const padding = 20;
        const x = Math.random() * (this.dom.arena.clientWidth - size - padding * 2) + padding;
        const y = Math.random() * (this.dom.arena.clientHeight - 100 - size - padding) + 100;

        const difficultyMultiplier = Math.min(2, 1 + (this.score * CONFIG.DIFFICULTY_RAMP) / 100);
        const life = Math.max(CONFIG.TARGET_LIFE_MIN, CONFIG.TARGET_LIFE_MAX / difficultyMultiplier);

        const target = {
            id: Date.now() + Math.random(),
            type,
            x,
            y,
            size,
            startTime: Date.now(),
            life,
            element: document.createElement('div')
        };

        target.element.className = `target ${type}`;
        target.element.style.left = `${x}px`;
        target.element.style.top = `${y}px`;
        target.element.style.width = `${size}px`;
        target.element.style.height = `${size}px`;

        target.element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.handleHit(target);
        });

        target.element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleHit(target);
        });

        this.dom.arena.appendChild(target.element);
        this.targets.push(target);
    }

    handleHit(target) {
        if (this.state !== 'PLAYING') return;

        // Remove from array and DOM
        this.targets = this.targets.filter(t => t.id !== target.id);
        target.element.style.transform = 'scale(1.2)';
        target.element.style.opacity = '0';
        setTimeout(() => target.element.remove(), 200);

        if (target.type === 'bomb') {
            this.lives--;
            this.combo = 1;
            this.comboMeter = 0;
            this.score = Math.max(0, this.score + CONFIG.POINTS.BOMB);
            this.triggerShake();
            this.createFloatingText(target.x + target.size/2, target.y, 'BOMB!', '#ff0055');
        } else {
            const basePoints = target.type === 'gold' ? CONFIG.POINTS.GOLD : CONFIG.POINTS.STANDARD;
            const pointsGained = basePoints * this.combo;
            this.score += pointsGained;
            
            this.comboMeter = 100;
            if (this.comboMeter >= 100) {
                this.combo = Math.min(10, this.combo + 1);
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            }

            this.createRipple(target.x + target.size/2, target.y + target.size/2, target.type);
            this.createFloatingText(target.x + target.size/2, target.y, `+${pointsGained}`, target.type === 'gold' ? '#ffcc00' : '#00f2ff');
        }

        this.updateHUD();
        if (this.lives <= 0) this.gameOver();
    }

    handleMiss(target) {
        this.targets = this.targets.filter(t => t.id !== target.id);
        target.element.remove();

        if (target.type !== 'bomb') {
            this.lives--;
            this.combo = 1;
            this.comboMeter = 0;
            this.triggerShake();
            this.updateHUD();
            if (this.lives <= 0) this.gameOver();
        }
    }

    updateHUD() {
        this.dom.score.textContent = this.score;
        this.dom.comboBadge.textContent = `x${this.combo}`;
        this.dom.comboBar.style.width = `${this.comboMeter}%`;
        
        this.dom.lives.forEach((el, i) => {
            if (i < this.lives) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    createRipple(x, y, type) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        const color = type === 'gold' ? 'var(--color-gold)' : 'var(--color-primary)';
        ripple.style.left = `${x - 30}px`;
        ripple.style.top = `${y - 30}px`;
        ripple.style.width = '60px';
        ripple.style.height = '60px';
        ripple.style.border = `2px solid ${color}`;
        this.dom.arena.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }

    createFloatingText(x, y, text, color) {
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.textContent = text;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.color = color;
        this.dom.arena.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    triggerShake() {
        this.dom.container.classList.add('shake');
        setTimeout(() => this.dom.container.classList.remove('shake'), 400);
    }

    loop(now) {
        if (this.state === 'PLAYING') {
            // Decay combo
            if (this.comboMeter > 0) {
                this.comboMeter -= CONFIG.COMBO_DECAY_RATE;
                if (this.comboMeter <= 0) {
                    this.comboMeter = 0;
                    this.combo = Math.max(1, this.combo - 1);
                }
                this.dom.comboBar.style.width = `${this.comboMeter}%`;
                this.dom.comboBadge.textContent = `x${this.combo}`;
            }

            // Spawning
            const difficultyMultiplier = Math.min(2.5, 1 + (this.score * CONFIG.DIFFICULTY_RAMP) / 50);
            const spawnInterval = Math.max(CONFIG.SPAWN_INTERVAL_MIN, CONFIG.SPAWN_INTERVAL_MAX / difficultyMultiplier);
            
            if (now - this.lastSpawnTime > spawnInterval) {
                this.spawnTarget();
                this.lastSpawnTime = now;
            }

            // Target lifecycle
            const currentTime = Date.now();
            this.targets.forEach(target => {
                const elapsed = currentTime - target.startTime;
                if (elapsed > target.life) {
                    this.handleMiss(target);
                } else {
                    // Visual feedback for expiring targets (fade out)
                    const remainingRatio = 1 - (elapsed / target.life);
                    if (remainingRatio < 0.3) {
                        target.element.style.opacity = remainingRatio * 3;
                    }
                }
            });
        }

        requestAnimationFrame(this.loop);
    }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
