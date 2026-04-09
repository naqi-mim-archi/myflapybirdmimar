const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

let bird;
let pipes;
let score = 0;
let scoreText;
let gameStarted = false;
let isGameOver = false;
let particles;
let emitter;
let clouds;

const game = new Phaser.Game(config);

function preload() {
    // Create textures procedurally
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Bird Texture
    graphics.clear();
    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(24, 10, 6);
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(26, 10, 2);
    graphics.fillStyle(0xff5500, 1);
    graphics.fillTriangle(28, 16, 36, 20, 28, 24);
    graphics.generateTexture('bird', 40, 32);

    // Pipe Texture
    graphics.clear();
    graphics.fillStyle(0x73bf2e, 1);
    graphics.fillRect(0, 0, 80, 600);
    graphics.lineStyle(4, 0x558022, 1);
    graphics.strokeRect(2, 0, 76, 600);
    graphics.generateTexture('pipe', 80, 600);

    // Cloud Texture
    graphics.clear();
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(20, 20, 20);
    graphics.fillCircle(40, 20, 25);
    graphics.fillCircle(60, 20, 20);
    graphics.generateTexture('cloud', 80, 45);
}

function create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x4ec0ca).setOrigin(0);

    // Clouds
    clouds = this.add.group();
    for(let i = 0; i < 5; i++) {
        spawnCloud(this, Phaser.Math.Between(0, width));
    }

    // Particles for trail
    particles = this.add.particles(0, 0, 'bird', {
        scale: { start: 0.2, end: 0 },
        alpha: { start: 0.5, end: 0 },
        speed: 50,
        lifespan: 400,
        blendMode: 'ADD',
        frequency: 50,
        follow: null
    });
    emitter = particles.startFollow(null);
    particles.stop();

    // Pipes Group
    pipes = this.physics.add.group();

    // Bird
    bird = this.physics.add.sprite(width * 0.3, height / 2, 'bird');
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    bird.setDepth(10);

    // Score Text
    scoreText = this.add.text(width / 2, height * 0.15, 'TAP TO START', {
        fontSize: '48px',
        fill: '#fff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 6
    }).setOrigin(0.5).setDepth(20);

    // Input
    this.input.on('pointerdown', () => {
        if (isGameOver) {
            restartGame.call(this);
        } else if (!gameStarted) {
            startGame.call(this);
        } else {
            flap.call(this);
        }
    });

    this.input.keyboard.on('keydown-SPACE', () => {
        if (isGameOver) {
            restartGame.call(this);
        } else if (!gameStarted) {
            startGame.call(this);
        } else {
            flap.call(this);
        }
    });

    // Collisions
    this.physics.add.collider(bird, pipes, hitPipe, null, this);

    // Pipe Spawner
    this.pipeTimer = this.time.addEvent({
        delay: 1500,
        callback: spawnPipes,
        callbackScope: this,
        loop: true,
        paused: true
    });
}

function update() {
    if (gameStarted && !isGameOver) {
        // Rotate bird based on velocity
        let targetAngle = Phaser.Math.Clamp(bird.body.velocity.y * 0.1, -20, 90);
        bird.angle = Phaser.Math.Interpolation.Linear([bird.angle, targetAngle], 0.1);

        // Update particles
        particles.setPosition(bird.x - 10, bird.y);

        // Check if passed pipes for scoring
        pipes.getChildren().forEach(pipe => {
            if (pipe.active && !pipe.scored && pipe.x + pipe.width < bird.x) {
                pipe.scored = true;
                if (pipe.pipeType === 'top') { // Only score once per pair
                    score++;
                    scoreText.setText(score);
                    this.cameras.main.shake(100, 0.002);
                }
            }
            if (pipe.x < -100) {
                pipe.destroy();
            }
        });

        // Ground/Ceiling check
        if (bird.y <= 0 || bird.y >= this.cameras.main.height - 10) {
            hitPipe.call(this);
        }
    }

    // Move clouds
    clouds.getChildren().forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x < -100) {
            cloud.x = this.cameras.main.width + 100;
            cloud.y = Phaser.Math.Between(50, 300);
        }
    });
}

function startGame() {
    gameStarted = true;
    bird.body.allowGravity = true;
    this.pipeTimer.paused = false;
    scoreText.setText(score);
    particles.start();
}

function flap() {
    bird.setVelocityY(-350);
    
    // Juicy scale effect
    this.tweens.add({
        targets: bird,
        scaleX: 1.2,
        scaleY: 0.8,
        duration: 50,
        yoyo: true
    });
}

function spawnPipes() {
    const gap = 180;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const minPipeHeight = 100;
    const maxPipeHeight = height - gap - minPipeHeight;
    const pipeY = Phaser.Math.Between(minPipeHeight, maxPipeHeight);

    const topPipe = pipes.create(width + 50, pipeY - gap/2, 'pipe').setOrigin(0.5, 1);
    const bottomPipe = pipes.create(width + 50, pipeY + gap/2, 'pipe').setOrigin(0.5, 0);

    topPipe.body.allowGravity = false;
    bottomPipe.body.allowGravity = false;
    topPipe.setVelocityX(-250);
    bottomPipe.setVelocityX(-250);
    
    topPipe.pipeType = 'top';
    bottomPipe.pipeType = 'bottom';
    topPipe.scored = false;
    bottomPipe.scored = false;
}

function spawnCloud(scene, x) {
    const cloud = scene.add.sprite(x, Phaser.Math.Between(50, 300), 'cloud');
    cloud.setAlpha(0.5);
    cloud.speed = Phaser.Math.FloatBetween(0.2, 0.8);
    clouds.add(cloud);
}

function hitPipe() {
    if (isGameOver) return;
    
    isGameOver = true;
    this.physics.pause();
    this.pipeTimer.paused = true;
    particles.stop();
    
    this.cameras.main.shake(400, 0.03);
    this.cameras.main.flash(200, 255, 255, 255);
    
    bird.setTint(0xff0000);
    
    scoreText.setText('GAME OVER\n' + score + '\nTAP TO RESTART');
    scoreText.setAlign('center');
}

function restartGame() {
    score = 0;
    isGameOver = false;
    gameStarted = false;
    this.scene.restart();
}

window.addEventListener('error', function (e) {
    console.error("Game Error: ", e.message);
});