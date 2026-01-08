"use strict";

const GAME_W = 800;
const GAME_H = 600;

let spaceKey;
let bird, ground, pipes, scoreText, messageText;
let score = 0;
let gameStarted = false;
let gameOver = false;

const PIPE_SPEED = 220;
const PIPE_GAP = 170;
const PIPE_SPAWN_MS = 1400;

const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    physics: {
        default: "arcade",
        arcade: { gravity: { y: 900 }, debug: false },
    },
    scene: { preload, create, update },
};

new Phaser.Game(config);

function preload() {
    this.load.image("background", "assets/background.png");
    this.load.image("road", "assets/road.png");
    this.load.image("column", "assets/column.png");

    // Your bird.png is a single tiny image (17x12), so load as IMAGE not spritesheet
    this.load.image("bird", "assets/bird.png");
}

function create() {
    // Background
    this.add.image(0, 0, "background").setOrigin(0, 0);


    // Ground
    ground = this.physics.add.staticImage(GAME_W / 2, 568, "road").setScale(2);
    ground.refreshBody();

    // Pipes
    pipes = this.physics.add.group();

    // Bird
    bird = this.physics.add.sprite(160, 220, "bird").setScale(3);
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;

    // UI
    scoreText = this.add.text(16, 16, "Score: 0", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 },
    });

    messageText = this.add
        .text(GAME_W / 2, GAME_H / 2, "Click to start\nSPACE to flap", {
            fontFamily: "Arial",
            fontSize: "28px",
            color: "#ffffff",
            align: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: { x: 14, y: 12 },
        })
        .setOrigin(0.5);

    // Collisions
    this.physics.add.collider(bird, ground, () => endGame.call(this), null, this);
    this.physics.add.overlap(bird, pipes, () => endGame.call(this), null, this);

    // Make canvas focusable and focus it so keyboard works
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.focus();

    // Create SPACE key (for polling in update)
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Capture SPACE key to prevent page scrolling
    this.input.keyboard.addCapture("SPACE");

    // Direct DOM event listener as backup for space key (web compatibility)
    const scene = this;
    const handleSpaceKey = (e) => {
        if (e.code === "Space" || e.keyCode === 32) {
            e.preventDefault();
            e.stopPropagation();
            if (!gameStarted) {
                startGame.call(scene);
            } else if (!gameOver) {
                flap();
            }
        }
    };
    window.addEventListener("keydown", handleSpaceKey, true);

    // Click to start/restart only (also refocus canvas)
    // Use both pointerdown and pointerup to ensure it works
    this.input.on("pointerdown", () => {
        this.game.canvas.focus();
        if (!gameStarted) {
            startGame.call(this);
        } else if (gameOver) {
            restart.call(this);
        }
        // Note: Click does NOT flap during gameplay - only SPACE does
    });
}

function startGame() {
    console.log("✅ startGame() called");
    if (gameStarted) return;

    gameStarted = true;
    gameOver = false;
    score = 0;

    scoreText.setText("Score: 0");
    messageText.setVisible(false);

    bird.clearTint();
    bird.setAngle(0);
    bird.setVelocity(0, 0);
    bird.body.allowGravity = true;

    this.pipeTimer = this.time.addEvent({
        delay: PIPE_SPAWN_MS,
        loop: true,
        callback: () => spawnPipePair.call(this),
    });

    spawnPipePair.call(this);
}

function flap() {
    bird.setVelocityY(-320);
}

function spawnPipePair() {
    if (gameOver) return;

    const x = GAME_W + 80;
    const gapCenter = Phaser.Math.Between(170, 420);

    const topPipeY = gapCenter - PIPE_GAP / 2;
    const bottomPipeY = gapCenter + PIPE_GAP / 2;

    // Top pipe (flipped)
    const topPipe = pipes.create(x, topPipeY, "column");
    topPipe.setOrigin(0.5, 1);
    topPipe.setFlipY(true);
    topPipe.body.allowGravity = false;
    topPipe.setImmovable(true);
    topPipe.setVelocityX(-PIPE_SPEED);

    // Bottom pipe
    const bottomPipe = pipes.create(x, bottomPipeY, "column");
    bottomPipe.setOrigin(0.5, 0);
    bottomPipe.body.allowGravity = false;
    bottomPipe.setImmovable(true);
    bottomPipe.setVelocityX(-PIPE_SPEED);

    // Score zone (invisible)
    const scoreZone = this.add.zone(x + 30, GAME_H / 2, 10, GAME_H);
    this.physics.add.existing(scoreZone);
    scoreZone.body.allowGravity = false;
    scoreZone.body.setVelocityX(-PIPE_SPEED);

    this.physics.add.overlap(bird, scoreZone, () => {
        score += 1;
        scoreText.setText(`Score: ${score}`);
        scoreZone.destroy();
    });
}

function endGame() {
    if (gameOver) return;

    gameOver = true;
    bird.setTint(0xff4444);
    bird.setVelocity(0, 0);

    pipes.getChildren().forEach((p) => p.body && p.body.setVelocityX(0));
    if (this.pipeTimer) this.pipeTimer.remove(false);

    messageText.setText("Game Over!\nClick to restart");
    messageText.setVisible(true);
}

function restart() {
    pipes.clear(true, true);
    this.children.list.filter((o) => o.type === "Zone").forEach((z) => z.destroy());

    bird.clearTint();
    bird.setPosition(160, 220);
    bird.setVelocity(0, 0);
    bird.setAngle(0);
    bird.body.allowGravity = false;

    gameStarted = false;
    gameOver = false;
    score = 0;

    scoreText.setText("Score: 0");
    messageText.setText("Click to start\nSPACE to flap");
    messageText.setVisible(true);

    // keep keyboard focus
    this.game.canvas.focus();
}

function update() {
    if (!gameStarted) {
        bird.y += Math.sin(this.time.now / 220) * 0.15;

        // OPTIONAL: allow SPACE to start even if keydown events don't fire
        if (spaceKey && Phaser.Input.Keyboard.JustDown(spaceKey)) {
            startGame.call(this);
        }
        return;
    }

    if (gameOver) return;

    // ✅ SPACE flaps (reliable)
    if (spaceKey && Phaser.Input.Keyboard.JustDown(spaceKey)) {
        flap();
    }

    bird.setAngle(Phaser.Math.Clamp(bird.body.velocity.y / 8, -25, 50));

    pipes.getChildren().forEach((p) => {
        if (p.x < -120) p.destroy();
    });
}