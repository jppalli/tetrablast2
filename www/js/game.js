// Load the Google Font
WebFontConfig = {
    google: {
        families: ['Exo 2:400,700']
    }
};
(function() {
    const webFontScript = document.createElement('script');
    webFontScript.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
    webFontScript.async = 'true';
    document.head.appendChild(webFontScript);
}());
class BlockBlaster extends Phaser.Scene {
    constructor() {
        super();
        this.GRID_SIZE = 40; // Increased from 25 for better touch interaction
        this.GRID_WIDTH = 8;
        this.GRID_HEIGHT = 8; // Keep original 8×8 grid layout
        this.PADDING = 15; // Slightly increased padding for better spacing
        this.shapes = [{
                shape: [
                    [1, 1, 1, 1]
                ],
                color: 0x00e0e0
            }, // I - Cyan
            {
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: 0xffd000
            }, // O - Yellow
            {
                shape: [
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                color: 0xc050c0
            }, // T - Purple
            {
                shape: [
                    [1, 1, 1],
                    [1, 0, 0]
                ],
                color: 0x00d000
            }, // J - Green
            {
                shape: [
                    [1, 1, 1],
                    [0, 0, 1]
                ],
                color: 0xff2020
            }, // L - Red
            {
                shape: [
                    [1, 1, 0],
                    [0, 1, 1]
                ],
                color: 0x00d000
            }, // S - Green
            {
                shape: [
                    [0, 1, 1],
                    [1, 1, 0]
                ],
                color: 0xff2020
            }, // Z - Red
            {
                shape: [
                    [1, 1]
                ],
                color: 0x00e0e0
            }, // 2-block line - Cyan
            {
                shape: [
                    [1]
                ],
                color: 0xffd000
            }, // Single square - Yellow
            {
                shape: [
                    [1, 0],
                    [1, 1]
                ],
                color: 0xff7722 // Orange
            } // Small L - Orange (3 blocks)
        ];
        this.availableShapes = [];
        this.draggingShape = null;
        this.draggingShapePosition = {
            x: 0,
            y: 0
        };
        this.dragStartPosition = null;
        this.lastPlacedShapeColor = null;
        this.grid = [];
        this.gameOver = false;
        this.score = 0;
        this.scoreText = null;
        this.highestScore = 0; // Track highest score
        this.highestScoreText = null;
        this.achievedNewHighScore = false; // Flag to track if new high score was achieved
        this.oldHighScore = null; // Store previous high score for comparison
        this.linesCleared = 0;
        this.flashingLines = [];
        this.levelUpText = null;
        this.inventoryArea = null;
        this.gameOverText = null;
        this.restartButton = null;
        this.lineClearSound = null;
        this.backgroundMusic = null;
        this.stuckSound = null;
        this.blockMoveSound = null;
        this.gameOverSound = null;
        this.doubleSound = null;
        this.tripleSound = null;
        this.quadrupleSound = null;
        this.legendarySound = null;
        this.comboSound = null;
        this.shapeBeingDragged = null;
        this.lastTapTime = null; // For double tap detection
        this.lastTappedShapeIndex = null; // Track which shape was tapped

        // Combo system variables
        this.consecutiveCombo = 0; // For tracking consecutive line clears
        this.comboText = null; // Text object to display combo message
        this.lastMoveCleared = false; // Did the previous move clear a line?
        this.comboParticles = null; // Particle emitter for combo effects
        // High score celebration
        this.highScoreCelebration = false;
        this.confettiParticles = null;
        this.newHighScoreText = null;
        // Ad tracking
        this.playCount = 0; // Track number of games played
        this.adReady = false; // Track if an ad is ready to show
        this.showingAd = false; // Track if we're currently showing an ad
        this.adTimer = null; // Timer for mock ad display
    }

    preload() {
        this.load.image('square', 'https://play.rosebud.ai/assets/white square.png?uTut');
        this.load.audio('lineClear', 'https://play.rosebud.ai/assets/line.wav?wFUT');
        this.load.audio('drop', 'https://play.rosebud.ai/assets/drop.wav?V27E');
        this.load.audio('blockMove', 'https://play.rosebud.ai/assets/block.wav?4vtn');
        this.load.audio('gameOver', 'https://play.rosebud.ai/assets/game-over-arcade-6435.mp3?HOMq');
        this.load.audio('double', 'https://play.rosebud.ai/assets/double.wav?QJtt');
        this.load.audio('triple', 'https://play.rosebud.ai/assets/triple.wav?4BrS');
        this.load.audio('quadruple', 'https://play.rosebud.ai/assets/cuadruple.wav?HBRg');
        this.load.audio('legendary', 'https://play.rosebud.ai/assets/legendary.wav?vuLy');
        this.load.audio('combo', 'https://play.rosebud.ai/assets/combo.wav?B7Ag');
        this.load.audio('stuck', 'https://play.rosebud.ai/assets/stuck.wav?qjFZ');
        this.load.audio('hooray', 'https://play.rosebud.ai/assets/Hooray-sound-effect.mp3?xOiq');
    }

    create() {
        // Configure high-performance rendering
        this.game.renderer.config.powerPreference = 'high-performance';
        // Configure camera for high quality
        this.cameras.main.setBackgroundColor('#001F3F');
        this.cameras.main.setRoundPixels(false);

        // Load play count from local storage
        const savedPlayCount = localStorage.getItem('blockBlasterPlayCount');
        if (savedPlayCount !== null) {
            this.playCount = parseInt(savedPlayCount, 10);
        }

        // Load the highest score from localStorage if it exists
        const savedHighScore = localStorage.getItem('blockBlasterHighScore');
        if (savedHighScore !== null) {
            this.highestScore = parseInt(savedHighScore, 10);
        }
        // Initialize ad system
        this.initAdSystem();
        this.initGrid();
        this.drawAnimalShape(); // Add a random animal shape to the grid
        this.generateAvailableShapes(3); // Generate 3 initial shapes for the inventory
        // Set up input for dragging - use a more direct approach
        this.input.setTopOnly(false); // Allow input to propagate

        // Add key press for confetti testing
        this.input.keyboard.on('keydown-C', () => {
            // Get current pointer position for confetti location
            const x = this.input.activePointer.x;
            const y = this.input.activePointer.y;

            // Trigger confetti using all available colors
            const colors = [0x00e0e0, 0xffd000, 0xff2020, 0x00d000, 0xc050c0];
            colors.forEach((color, index) => {
                // Stagger the bursts slightly
                this.time.delayedCall(index * 100, () => {
                    this.confettiParticles.setPosition(x, y);
                    this.confettiParticles.setTint(color);
                    // Use a proper explosion method
                    this.confettiParticles.explode(30 - (index * 5)); // Decreasing particles for each burst

                    // Add a subtle screen flash for visual impact
                    if (index === 0) {
                        const flash = this.add.rectangle(0, 0, this.sys.game.config.width, this.sys.game.config.height, color, 0.2);
                        flash.setOrigin(0, 0);
                        flash.setDepth(2000);
                        this.tweens.add({
                            targets: flash,
                            alpha: 0,
                            duration: 300,
                            onComplete: () => flash.destroy()
                        });
                    }
                });
            });
        });

        // Add key press to delete high score (D key)
        this.input.keyboard.on('keydown-D', () => {
            // Reset high score to 0
            this.highestScore = 0;
            this.highestScoreText.setText('0');

            // Clear high score from localStorage
            localStorage.removeItem('blockBlasterHighScore');

            // Show a quick confirmation message
            const confirmText = this.add.text(
                this.sys.game.config.width / 2,
                50,
                'High Score Reset!', {
                    fontSize: '24px',
                    fontFamily: '"Exo 2", sans-serif',
                    color: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 2,
                    resolution: 2
                }
            ).setOrigin(0.5, 0.5).setAlpha(1).setDepth(9999);

            // Flash the confirmation message and fade it out
            this.tweens.add({
                targets: confirmText,
                alpha: 0,
                y: 30,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => confirmText.destroy()
            });

            // Play a sound effect for feedback
            if (this.stuckSound) {
                this.stuckSound.play();
            }
        });
        this.input.on('pointerdown', this.startDrag, this);
        this.input.on('pointermove', this.doDrag, this);
        this.input.on('pointerup', this.stopDrag, this);

        // Create a rectangle zone for the game area that will have higher priority for inputs
        const gameAreaWidth = this.GRID_WIDTH * this.GRID_SIZE + 50; // Extra padding
        const gameAreaHeight = this.sys.game.config.height - (this.sys.game.config.height * 0.1) - 20; // Exclude banner
        const gameAreaX = (this.sys.game.config.width - gameAreaWidth) / 2;
        const gameAreaY = 20;

        this.gameInteractionZone = this.add.zone(gameAreaX, gameAreaY, gameAreaWidth, gameAreaHeight)
            .setOrigin(0, 0)
            .setInteractive()
            .setDepth(1000); // Higher than banners


        // Create particle emitter for combo effects
        // Create particle managers
        const particleManager = this.add.particles('square');

        // Combo particles
        this.comboParticles = particleManager.createEmitter({
            scale: {
                start: 0.5,
                end: 0
            },
            speed: {
                min: 50,
                max: 150
            },
            lifespan: 1000,
            blendMode: 'ADD',
            on: false
        });

        // Confetti particles - improved configuration with more particles and effects
        this.confettiParticles = particleManager.createEmitter({
            scale: {
                start: 0.3, // Slightly larger particles
                end: 0
            },
            speed: {
                min: 150, // Faster movement
                max: 450
            },
            angle: {
                min: 0,
                max: 360
            },
            rotate: {
                min: 0,
                max: 360
            }, // Particles rotate for better visual effect
            lifespan: 3500, // Longer lifespan
            blendMode: 'ADD',
            frequency: -1, // Manually controlled
            quantity: 30, // More particles per explosion
            gravityY: 250, // Slighter lower gravity for slower falling
            emitCallback: particle => {
                // Make each particle unique
                const tint = particle.emitter.tint;
                const variation = Phaser.Math.Between(-0x222222, 0x222222);
                particle.tint = tint + variation;

                // Random size variation
                const sizeVar = Phaser.Math.FloatBetween(0.8, 1.2);
                particle.scaleX *= sizeVar;
                particle.scaleY *= sizeVar;
            },
            on: false // Start disabled, will be enabled when triggered
        });
        const textStyle = {
            fontSize: '22px',
            fontFamily: '"Exo 2", sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            resolution: 2 // Higher resolution for sharper text
        };
        // Score now only shows value without text
        this.scoreText = this.add.text(this.sys.game.config.width / 2, this.PADDING, '0', textStyle)
            .setOrigin(0.5, 0);
        // Initially hide the score text
        this.scoreText.setAlpha(0);

        // Initialize highest score text in top left
        this.highestScoreText = this.add.text(this.PADDING, this.PADDING, 'Best: 0', textStyle)
            .setOrigin(0, 0);
        this.highestScoreText.setAlpha(0);

        this.levelUpText = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2, 'LEVEL UP!', {
            fontSize: '48px',
            fontFamily: '"Exo 2", sans-serif',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        }).setOrigin(0.5).setAlpha(0);
        // Add combo text (initially hidden)
        this.comboText = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2, '', {
            fontSize: '32px',
            fontFamily: '"Exo 2", sans-serif',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        }).setOrigin(0.5).setAlpha(0);
        // Create game over text background with a placeholder color (will be randomized later)
        this.gameOverBg = this.add.graphics();
        // Initial color will be replaced when game over occurs
        this.gameOverBg.fillRoundedRect(
            this.sys.game.config.width / 2 - 180,
            this.sys.game.config.height / 2 - 85,
            360,
            80,
            16
        );
        // Add a glow effect for game over text
        this.gameOverGlow = this.add.graphics();
        // Initial color will be replaced when game over occurs
        this.gameOverGlow.fillRoundedRect(
            this.sys.game.config.width / 2 - 185,
            this.sys.game.config.height / 2 - 90,
            370,
            90,
            20
        );

        // Set both to invisible initially
        this.gameOverBg.setAlpha(0);
        this.gameOverGlow.setAlpha(0);

        // Create background for new high score text (hidden initially)
        this.newHighScoreBg = this.add.graphics();
        // Initial color will be replaced when high score celebration occurs
        this.newHighScoreBg.fillRoundedRect(
            this.sys.game.config.width / 2 - 220,
            this.sys.game.config.height / 2 - 85,
            440,
            80,
            16
        );

        // Add a glow effect for high score text
        this.newHighScoreGlow = this.add.graphics();
        // Initial color will be replaced when high score celebration occurs
        this.newHighScoreGlow.fillRoundedRect(
            this.sys.game.config.width / 2 - 225,
            this.sys.game.config.height / 2 - 90,
            450,
            90,
            20
        );

        // Set both to invisible initially
        this.newHighScoreBg.setAlpha(0);
        this.newHighScoreGlow.setAlpha(0);

        // Create new high score celebration text (hidden initially)
        this.newHighScoreText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 - 50,
            'NEW HIGH SCORE!', {
                fontSize: '32px', // Reduced from 42px to fit better on screen
                fontFamily: '"Exo 2", sans-serif',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                resolution: 2
            }
        ).setOrigin(0.5).setAlpha(0);

        // Game over text
        this.gameOverText = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2 - 50, 'Game Over!', {
            fontSize: '48px',
            fontFamily: '"Exo 2", sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        }).setOrigin(0.5).setAlpha(0);

        // Create a more visually appealing restart button
        const buttonWidth = 160;
        const buttonHeight = 60;
        const buttonX = this.sys.game.config.width / 2;
        const buttonY = this.sys.game.config.height / 2 + 50;

        // Create the button background with rounded corners (color will be set dynamically)
        this.restartButtonBg = this.add.graphics();
        // Initial color will be replaced
        this.restartButtonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            16 // corner radius
        );
        // Add a glow effect (color will be set dynamically)
        this.restartButtonGlow = this.add.graphics();
        // Initial color will be replaced
        this.restartButtonGlow.fillRoundedRect(
            buttonX - buttonWidth / 2 - 5,
            buttonY - buttonHeight / 2 - 5,
            buttonWidth + 10,
            buttonHeight + 10,
            20
        );

        // Create the button text
        this.restartButton = this.add.text(buttonX, buttonY, 'RESTART', {
            fontSize: '28px',
            fontFamily: '"Exo 2", sans-serif',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            resolution: 2
        }).setOrigin(0.5).setInteractive();

        // Set initial alpha
        this.restartButtonBg.setAlpha(0);
        this.restartButtonGlow.setAlpha(0);
        this.restartButton.setAlpha(0);

        // Add help text for rotation instructions - will fade out
        this.rotationHelpText = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height - 5,
            'Double-tap shapes to rotate', {
                fontSize: '16px',
                fontFamily: '"Exo 2", sans-serif',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1,
                resolution: 2
            }).setOrigin(0.5, 1);

        // Set up a timer to fade out the help text after a few seconds
        this.time.delayedCall(5000, () => {
            if (this.rotationHelpText && this.rotationHelpText.active) {
                this.rotationHelpText.setAlpha(0);
            }
        });

        // Add hover effects to the restart button
        this.restartButton.on('pointerover', () => {
            // Get current color and make it lighter for hover effect
            const currentColorInt = this.currentGameOverColor || 0x4488ff;
            const lighterColor = Phaser.Display.Color.ValueToColor(currentColorInt).lighten(20).color;

            this.restartButtonBg.clear();
            this.restartButtonBg.fillStyle(lighterColor, 1);
            this.restartButtonBg.fillRoundedRect(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                16
            );
            // Use a more subtle hover effect to prevent too much movement
            this.tweens.add({
                targets: [this.restartButton, this.restartButtonBg, this.restartButtonGlow],
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 100
            });
        });

        this.restartButton.on('pointerout', () => {
            // Return to the current theme color (not hardcoded)
            this.restartButtonBg.clear();
            this.restartButtonBg.fillStyle(this.currentGameOverColor || 0x4488ff, 1);
            this.restartButtonBg.fillRoundedRect(
                buttonX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                16
            );
            // Scale back to normal size with a shorter duration
            this.tweens.add({
                targets: [this.restartButton, this.restartButtonBg, this.restartButtonGlow],
                scaleX: 1,
                scaleY: 1,
                duration: 80
            });
        });

        this.restartButton.on('pointerdown', () => {
            // Scale down when clicked for tactile feedback
            this.tweens.add({
                targets: [this.restartButton, this.restartButtonBg],
                scaleX: 0.98, // Less scaling down for a more subtle effect
                scaleY: 0.98,
                duration: 50,
                yoyo: true,
                onComplete: () => this.restartGame()
            });
        });

        // Load all game sounds
        const soundConfig = [{
            key: 'lineClear',
            volume: 0.5
        }, {
            key: 'drop',
            volume: 0.4
        }, {
            key: 'blockMove',
            volume: 0.3
        }, {
            key: 'gameOver',
            volume: 1.0
        }, {
            key: 'double',
            volume: 1.0
        }, {
            key: 'triple',
            volume: 1.0
        }, {
            key: 'quadruple',
            volume: 1.0
        }, {
            key: 'legendary',
            volume: 1.0
        }, {
            key: 'combo',
            volume: 1.0
        }, {
            key: 'stuck',
            volume: 0.5
        }, {
            key: 'hooray',
            volume: 0.6
        }];

        // Create all sound objects
        soundConfig.forEach(sound => {
            this[sound.key + 'Sound'] = this.sound.add(sound.key, {
                volume: sound.volume
            });
        });
        this.drawGame();
    }

    generateAvailableShapes(count) {
        // Clear the array first to ensure we don't have stale references
        if (this.availableShapes.length === 0) {
            this.availableShapes = [];
            // Always generate exactly the requested number of shapes (3)
            for (let i = 0; i < count; i++) {
                const shape = this.getRandomShape();
                shape.rotationIndex = 0; // Track current rotation state
                this.availableShapes.push(shape);
            }
        }
    }
    rotateShape(shape) {
        // Get the current shape matrix
        const matrix = shape.shape;
        const n = matrix.length;
        const m = matrix[0].length;

        // Create a new matrix for the rotated shape (columns become rows)
        const rotated = new Array(m).fill().map(() => new Array(n).fill(0));

        // Rotate the shape clockwise
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                rotated[j][n - 1 - i] = matrix[i][j];
            }
        }

        shape.shape = rotated;
        shape.rotationIndex = (shape.rotationIndex + 1) % 4; // Track rotation state (0-3)

        return shape;
    }
    startDrag(pointer) {
        if (this.gameOver) return;

        // Check if this is a banner click - if so, ignore drag operations
        if (pointer.y > this.sys.game.config.height - (this.sys.game.config.height * 0.1)) {
            return; // This is in the banner area, don't start drag
        }

        // Calculate inventory area dimensions - must match drawGame
        const inventoryHeight = this.GRID_SIZE * 4;
        const inventoryY = this.sys.game.config.height - this.PADDING - inventoryHeight - (this.sys.game.config.height * 0.1);
        // Calculate the shape positions the same way as drawGame for consistent behavior
        const shapeSpacing = 20;
        const scaleFactor = 0.7; // Same scale factor as in drawGame
        const totalShapesWidth = this.availableShapes.reduce((width, shape) => {
            return width + shape.shape[0].length * this.GRID_SIZE * scaleFactor;
        }, 0);
        const totalSpacingWidth = shapeSpacing * (this.availableShapes.length - 1);
        const totalWidth = totalShapesWidth + totalSpacingWidth;
        const startX = this.PADDING + (this.sys.game.config.width - 2 * this.PADDING - totalWidth) / 2;
        let currentX = startX;
        // Check if we're clicking on a shape in the inventory
        for (let i = 0; i < this.availableShapes.length; i++) {
            const shape = this.availableShapes[i];
            const shapeWidth = shape.shape[0].length * this.GRID_SIZE * scaleFactor;
            const shapeHeight = shape.shape.length * this.GRID_SIZE * scaleFactor;
            const shapeStartY = inventoryY + (inventoryHeight - shapeHeight) / 2; // Center vertically
            if (pointer.x >= currentX && pointer.x <= currentX + shapeWidth &&
                pointer.y >= shapeStartY && pointer.y <= shapeStartY + shapeHeight) {
                // Check if this is a double tap on the same shape for rotation
                const currentTime = this.time.now;
                if (this.lastTapTime &&
                    currentTime - this.lastTapTime < 300 &&
                    this.lastTappedShapeIndex === i) {
                    // Rotate the shape on double tap
                    this.rotateShape(shape);
                    this.blockMoveSound.play();
                    // Hide the rotation help text immediately when a rotation occurs
                    if (this.rotationHelpText && this.rotationHelpText.active) {
                        this.rotationHelpText.setAlpha(0);
                    }
                    this.drawGame();
                    // Reset tap tracking after rotation
                    this.lastTapTime = null;
                    this.lastTappedShapeIndex = null;
                } else {
                    // Start dragging this shape
                    this.draggingShape = JSON.parse(JSON.stringify(shape));
                    // Position it so the shape is centered on the pointer
                    // Calculate full-size shape dimensions (at 100% scale for dragging)
                    const fullShapeWidth = shape.shape[0].length * this.GRID_SIZE;
                    const fullShapeHeight = shape.shape.length * this.GRID_SIZE;
                    this.draggingShapePosition = {
                        x: pointer.x - (fullShapeWidth / 2),
                        y: pointer.y - (fullShapeHeight / 2)
                    };
                    this.dragStartPosition = {
                        inventoryIndex: i
                    };
                    this.blockMoveSound.play();

                    // Track for double tap detection
                    this.lastTapTime = currentTime;
                    this.lastTappedShapeIndex = i;
                }
                break;
            }

            // Move to the next shape position (same logic as in drawGame)
            currentX += shapeWidth + shapeSpacing;
        }
    }
    doDrag(pointer) {
        if (this.draggingShape) {
            // Calculate the center offset for the shape for smooth dragging
            const shapeWidth = this.draggingShape.shape[0].length * this.GRID_SIZE;
            const shapeHeight = this.draggingShape.shape.length * this.GRID_SIZE;
            // Keep the shape centered on the pointer during dragging
            this.draggingShapePosition = {
                x: pointer.x - (shapeWidth / 2),
                y: pointer.y - (shapeHeight / 2)
            };
            this.drawGame();
        }
    }
    stopDrag(pointer) {
        if (!this.draggingShape) return;
        const gridWidth = this.GRID_WIDTH * this.GRID_SIZE;
        const gridHeight = this.GRID_HEIGHT * this.GRID_SIZE;
        const gridX = (this.sys.game.config.width - gridWidth) / 2;
        const gridY = (this.sys.game.config.height - gridHeight) / 2 - 60; // IMPORTANT: Match the exact grid position from drawGame
        // Calculate the center of the dragging shape with the full scale
        const shapeWidth = this.draggingShape.shape[0].length * this.GRID_SIZE;
        const shapeHeight = this.draggingShape.shape.length * this.GRID_SIZE;
        const shapeCenterX = this.draggingShapePosition.x + (shapeWidth / 2);
        const shapeCenterY = this.draggingShapePosition.y + (shapeHeight / 2);
        // Get shape dimensions in grid cells
        const shapeColCount = this.draggingShape.shape[0].length;
        const shapeRowCount = this.draggingShape.shape.length;

        let gridPosX = Math.round((shapeCenterX - gridX) / this.GRID_SIZE - shapeColCount / 2);
        let gridPosY = Math.round((shapeCenterY - gridY) / this.GRID_SIZE - shapeRowCount / 2);
        let isValidPlacement = this.canPlaceShapeAt(gridPosX, gridPosY, this.draggingShape.shape);
        // If we have a valid preview position stored, use that instead
        if (this.previewGridPosX !== undefined && this.previewGridPosY !== undefined) {
            // Check if the preview position is valid
            const previewIsValid = this.canPlaceShapeAt(
                this.previewGridPosX,
                this.previewGridPosY,
                this.draggingShape.shape
            );
            if (previewIsValid) {
                // Use the preview position (which is what the player sees highlighted)
                gridPosX = this.previewGridPosX;
                gridPosY = this.previewGridPosY;
                isValidPlacement = true;
            }
        }

        // Check if the shape can be placed here
        if (isValidPlacement) {
            // Place the shape on the grid at the same position shown in the preview
            this.placeShapeOnGrid(gridPosX, gridPosY, this.draggingShape);
            // Remove the shape from available shapes
            this.availableShapes.splice(this.dragStartPosition.inventoryIndex, 1);
            // If no shapes left, generate more
            if (this.availableShapes.length === 0) {
                this.generateAvailableShapes(3);
                // Game over will be checked after line clearing is done
            }
            // Game over check will happen after lines are cleared
        } else {
            // If we can't place the shape, reset combo counter
            this.lastMoveCleared = false;
            this.consecutiveCombo = 0;
        }

        // Stop dragging and clean up
        this.draggingShape = null;
        this.dragStartPosition = null;
        this.previewGridPosX = undefined;
        this.previewGridPosY = undefined;
        this.drawGame();
    }
    canPlaceShapeAt(x, y, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    // Check if the position is within grid bounds and the cell is empty
                    if (newX < 0 || newX >= this.GRID_WIDTH || newY < 0 || newY >= this.GRID_HEIGHT || this.grid[newY][newX] !== null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    placeShapeOnGrid(x, y, shape) {
        this.dropSound.play();
        // Store the shape's color for use in line clearing animations
        this.lastPlacedShapeColor = shape.color;
        // Count the blocks in the shape for scoring
        let blockCount = 0;
        // Place the shape on the grid using the shape's assigned color
        for (let row = 0; row < shape.shape.length; row++) {
            for (let col = 0; col < shape.shape[row].length; col++) {
                if (shape.shape[row][col]) {
                    blockCount++; // Increment block count for scoring
                    const gridY = y + row;
                    const gridX = x + col;
                    this.grid[gridY][gridX] = shape.color; // Use the shape's color for all blocks
                }
            }
        }
        // Award 5 points per block in the shape
        const blockPoints = blockCount * 5;
        this.score += blockPoints;
        // Calculate position for floating score text (above placed shape)
        const gridWidth = this.GRID_WIDTH * this.GRID_SIZE;
        const gridHeight = this.GRID_HEIGHT * this.GRID_SIZE;
        const gridX = (this.sys.game.config.width - gridWidth) / 2;
        const gridY = (this.sys.game.config.height - gridHeight) / 2 - 60;

        // Find center of placed shape
        const shapeWidth = shape.shape[0].length * this.GRID_SIZE;
        const shapeHeight = shape.shape.length * this.GRID_SIZE;
        const posX = gridX + (x * this.GRID_SIZE) + (shapeWidth / 2);
        const posY = gridY + (y * this.GRID_SIZE) + (shapeHeight / 2);
        // Convert hex color to CSS string
        const colorToCSS = (hex) => {
            const r = (hex >> 16) & 0xFF;
            const g = (hex >> 8) & 0xFF;
            const b = hex & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        // Show floating score at the position of the placed shape
        this.showFloatingScore(blockPoints, posX, posY, colorToCSS(shape.color));
        // Update score display
        this.scoreText.setText(this.score.toString());

        // Check if new score is a high score
        if (this.score > this.highestScore) {
            // Store old high score to check at game over
            this.oldHighScore = this.highestScore;

            // Update to new high score
            this.highestScore = this.score;
            this.highestScoreText.setText(this.highestScore.toString());

            // Save the new high score to localStorage
            localStorage.setItem('blockBlasterHighScore', this.highestScore.toString());

            // Flag for end-game celebration
            this.achievedNewHighScore = true;
        }

        // Check for completed lines
        this.clearLines();
    }

    initGrid() {
        this.grid = Array(this.GRID_HEIGHT).fill().map(() => Array(this.GRID_WIDTH).fill(null));
    }
    drawAnimalShape() {
        // Helper function to check if a pattern has any full rows or columns
        const hasFullRowOrColumn = (pattern) => {
            // Check rows
            for (let row of pattern) {
                if (row.every(cell => cell > 0)) {
                    return true;
                }
            }

            // Check columns
            for (let col = 0; col < pattern[0].length; col++) {
                let fullColumn = true;
                for (let row = 0; row < pattern.length; row++) {
                    if (pattern[row][col] === 0) {
                        fullColumn = false;
                        break;
                    }
                }
                if (fullColumn) return true;
            }

            return false;
        };

        // Define colorful animal shapes with mixed colors for more visual appeal
        const animalShapes = [
            // Cat face - multicolored
            {
                pattern: [
                    [0, 0, 2, 0, 0, 2, 0, 0], // Eyes - yellow
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [3, 0, 0, 0, 0, 0, 0, 3], // Whiskers - red
                    [0, 4, 0, 0, 0, 0, 4, 0], // Face contour - green
                    [0, 0, 1, 1, 1, 1, 0, 0], // Smile - cyan
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    1: 0x00e0e0, // Cyan
                    2: 0xffd000, // Yellow
                    3: 0xff2020, // Red
                    4: 0x00d000 // Green
                }
            },
            // Fish - gradient colors
            {
                pattern: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 3, 0, 0, 0, 0], // Eye - red
                    [0, 0, 4, 0, 2, 0, 0, 0], // Head mix - green and yellow
                    [0, 1, 1, 1, 1, 2, 0, 0], // Body - cyan and yellow
                    [5, 0, 5, 5, 5, 0, 5, 0], // Tail - purple
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    1: 0x00e0e0, // Cyan
                    2: 0xffd000, // Yellow
                    3: 0xff2020, // Red
                    4: 0x00d000, // Green
                    5: 0xc050c0 // Purple
                }
            },
            // Duck - yellow body, orange bill
            {
                pattern: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 3, 3, 0, 0, 0], // Bill - orange (custom)
                    [0, 0, 2, 2, 0, 0, 0, 0], // Head - yellow
                    [0, 0, 2, 2, 2, 2, 0, 0], // Body - yellow
                    [0, 0, 0, 2, 2, 2, 2, 0], // Body - yellow
                    [0, 0, 0, 4, 4, 0, 0, 0], // Feet - green
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    2: 0xffd000, // Yellow
                    3: 0xff8000, // Orange (custom)
                    4: 0x00d000 // Green
                }
            },
            // Butterfly - colorful wings
            {
                pattern: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [2, 0, 0, 0, 0, 0, 0, 2], // Top wings - yellow
                    [5, 2, 0, 0, 0, 0, 2, 5], // Wing gradient - purple to yellow
                    [0, 5, 0, 1, 1, 0, 5, 0], // Lower wings - purple
                    [0, 0, 3, 0, 0, 3, 0, 0], // Bottom details - red
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    1: 0x00e0e0, // Cyan
                    2: 0xffd000, // Yellow
                    3: 0xff2020, // Red
                    5: 0xc050c0 // Purple
                }
            },
            // Octopus - purple body with tentacles
            {
                pattern: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 5, 5, 5, 5, 0, 0], // Head - purple
                    [0, 5, 5, 1, 1, 5, 5, 0], // Head with eyes - cyan eyes
                    [5, 5, 5, 0, 0, 5, 5, 5], // Body (gap in middle) - purple
                    [5, 0, 5, 0, 0, 5, 0, 5], // Tentacles - purple
                    [0, 5, 0, 5, 5, 0, 5, 0], // More tentacles - purple
                    [5, 0, 5, 0, 0, 5, 0, 5], // Bottom tentacles - purple
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    1: 0x00e0e0, // Cyan (eyes)
                    5: 0xc050c0 // Purple (body & tentacles)
                }
            },
            // Fox - orange and white
            {
                pattern: [
                    [0, 3, 0, 0, 0, 0, 3, 0], // Ears - orange
                    [0, 3, 3, 0, 0, 3, 3, 0], // Head - orange
                    [0, 3, 3, 3, 3, 3, 3, 0], // Face - orange
                    [0, 3, 1, 3, 3, 1, 3, 0], // Eyes - cyan
                    [0, 0, 3, 3, 3, 3, 0, 0], // Snout - orange
                    [0, 0, 0, 3, 3, 0, 0, 0], // Nose - orange
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    1: 0x00e0e0, // Cyan (eyes)
                    3: 0xff7722 // Orange (body)
                }
            },
            // Owl - wise looking
            {
                pattern: [
                    [0, 0, 0, 5, 5, 0, 0, 0], // Top feathers - purple
                    [0, 0, 5, 5, 5, 5, 0, 0], // Head - purple
                    [0, 5, 2, 5, 5, 2, 5, 0], // Eyes with yellow irises
                    [0, 5, 5, 3, 3, 5, 5, 0], // Face with beak - red beak
                    [0, 0, 5, 5, 5, 5, 0, 0], // Body - purple
                    [0, 0, 5, 0, 0, 5, 0, 0], // Claws - purple
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    2: 0xffd000, // Yellow (eyes)
                    3: 0xff2020, // Red (beak)
                    5: 0xc050c0 // Purple (body)
                }
            },
            // Turtle - green shell
            {
                pattern: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 4, 4, 0, 0, 0], // Head - green
                    [0, 0, 4, 4, 4, 4, 0, 0], // Shell top - green
                    [4, 4, 4, 4, 4, 4, 0, 4], // Shell middle (gap) - green
                    [0, 4, 4, 4, 4, 4, 4, 0], // Shell bottom - green
                    [0, 0, 4, 0, 0, 4, 0, 0], // Legs - green
                    [0, 4, 0, 0, 0, 0, 4, 0], // More legs - green
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    4: 0x00d000 // Green (body & shell)
                }
            },
            // Crab - red with pincers
            {
                pattern: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [3, 0, 0, 0, 0, 0, 0, 3], // Pincers - red
                    [0, 3, 0, 3, 3, 0, 3, 0], // Claws and eyes - red
                    [0, 0, 3, 3, 3, 3, 0, 0], // Body - red
                    [0, 3, 3, 3, 3, 3, 3, 0], // Main body - red
                    [3, 0, 3, 0, 0, 3, 0, 3], // Legs - red
                    [0, 0, 3, 0, 0, 3, 0, 0], // Bottom legs - red
                    [0, 0, 0, 0, 0, 0, 0, 0]
                ],
                colorMap: {
                    3: 0xff2020 // Red (entire crab)
                }
            }
        ];

        // Filter shapes to ensure none have full rows or columns
        const validShapes = animalShapes.filter(shape => !hasFullRowOrColumn(shape.pattern));

        // Randomly select an animal shape from valid shapes
        const selectedAnimal = validShapes[Phaser.Math.Between(0, validShapes.length - 1)];
        // Double check full row/column prevention
        const tempGrid = Array(this.GRID_HEIGHT).fill().map(() => Array(this.GRID_WIDTH).fill(null));

        // Place pattern on temporary grid first
        for (let y = 0; y < selectedAnimal.pattern.length; y++) {
            for (let x = 0; x < selectedAnimal.pattern[y].length; x++) {
                const colorIndex = selectedAnimal.pattern[y][x];
                if (colorIndex > 0) {
                    tempGrid[y][x] = selectedAnimal.colorMap[colorIndex];
                }
            }
        }

        // Check if any row or column is completely filled
        let needsAdjustment = false;

        // Check rows
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            if (tempGrid[y].every(cell => cell !== null)) {
                // Make a gap in the row
                const randomX = Phaser.Math.Between(0, this.GRID_WIDTH - 1);
                tempGrid[y][randomX] = null;
                needsAdjustment = true;
            }
        }

        // Check columns
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            let fullColumn = true;
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                if (tempGrid[y][x] === null) {
                    fullColumn = false;
                    break;
                }
            }
            if (fullColumn) {
                // Make a gap in the column
                const gapPosition = Phaser.Math.Between(0, this.GRID_HEIGHT - 1);
                tempGrid[gapPosition][x] = null;
                needsAdjustment = true;
            }
        }

        // Copy temp grid to actual grid
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                this.grid[y][x] = tempGrid[y][x];
            }
        }
    }
    getRandomShape() {
        const randomIndex = Phaser.Math.Between(0, this.shapes.length - 1);
        const shape = JSON.parse(JSON.stringify(this.shapes[randomIndex])); // Deep copy to prevent modifications

        // Array of 5 vibrant colors for shapes (limited palette)
        const shapeColors = [
            0x00e0e0, // Cyan
            0xffd000, // Yellow
            0xff2020, // Red
            0x00d000, // Green
            0xc050c0 // Purple
        ];

        // Assign a random color to the shape
        shape.color = shapeColors[Phaser.Math.Between(0, shapeColors.length - 1)];

        return shape;
    }
    clearLines() {
        this.flashingLines = []; // Horizontal lines to clear
        this.flashingColumns = []; // Vertical lines to clear

        // Check for completed horizontal lines
        for (let y = this.GRID_HEIGHT - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== null)) {
                this.flashingLines.push({
                    type: 'horizontal',
                    index: y
                });
            }
        }

        // Check for completed vertical lines
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            let isComplete = true;
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                if (this.grid[y][x] === null) {
                    isComplete = false;
                    break;
                }
            }
            if (isComplete) {
                this.flashingLines.push({
                    type: 'vertical',
                    index: x
                });
            }
        }
        if (this.flashingLines.length > 0) {
            // Don't play sound here - we'll play specific sounds in removeLines
            this.flashLines();
        } else {
            this.updateScore(0);
            // If no lines were cleared, check for game over immediately
            this.time.delayedCall(100, () => {
                this.checkForGameOver();
            });
        }
    }

    flashLines() {
        // Store the color of the shape that caused the line clear
        const clearingColor = this.lastPlacedShapeColor || 0xffffff;
        // Set up alternating colors - use the shape's color and white
        const flashColors = [clearingColor, 0xffffff, clearingColor, 0xffffff];
        let flashCount = 0;
        // Mark this move as having cleared lines (for sequential combo tracking)
        this.lastMoveCleared = true;
        const flashInterval = this.time.addEvent({
            delay: 120,
            callback: () => {
                this.flashingLines.forEach(line => {
                    // Get current flash color - alternate between shape color and white
                    const flashColor = flashColors[flashCount % flashColors.length];

                    if (line.type === 'horizontal') {
                        // Flash horizontal line with shape's color
                        for (let x = 0; x < this.GRID_WIDTH; x++) {
                            this.grid[line.index][x] = flashColor;
                        }
                    } else if (line.type === 'vertical') {
                        // Flash vertical line with shape's color
                        for (let y = 0; y < this.GRID_HEIGHT; y++) {
                            this.grid[y][line.index] = flashColor;
                        }
                    }
                });
                this.drawGame();
                flashCount++;
                if (flashCount >= 6) { // Increased flashes for better effect
                    flashInterval.remove();
                    this.removeLines();
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    removeLines() {
        // Count horizontal and vertical lines separately
        const horizontalLines = this.flashingLines.filter(line => line.type === 'horizontal');
        const verticalLines = this.flashingLines.filter(line => line.type === 'vertical');
        // Get indices of lines to remove
        const horizontalIndices = horizontalLines.map(line => line.index);
        const verticalIndices = verticalLines.map(line => line.index);
        // Clear horizontal lines by setting cells to null (without shifting blocks down)
        for (let rowIndex of horizontalIndices) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                this.grid[rowIndex][x] = null;
            }
        }
        // Clear vertical lines by setting cells to null (without shifting blocks to the side)
        for (let colIndex of verticalIndices) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                this.grid[y][colIndex] = null;
            }
        }
        // Update score based on total lines cleared
        const totalLinesCleared = horizontalIndices.length + verticalIndices.length;

        // Play the appropriate sound based on number of lines cleared
        if (totalLinesCleared > 4) {
            this.legendarySound.play({
                seek: 0 // Start 1 second into the sound
            });
        } else if (totalLinesCleared === 4) {
            this.quadrupleSound.play({
                seek: 0 // Start 1 second into the sound
            });
        } else if (totalLinesCleared === 3) {
            this.tripleSound.play({
                seek: 0 // Start 1 second into the sound
            });
        } else if (totalLinesCleared === 2) {
            // Play double sound starting 1 second into the track
            this.doubleSound.play({
                seek: 1 // Start 1 second into the sound
            });
        } else if (totalLinesCleared === 1) {
            this.lineClearSound.play();
        }

        // Calculate the center position for combo effects
        const gridWidth = this.GRID_WIDTH * this.GRID_SIZE;
        const gridHeight = this.GRID_HEIGHT * this.GRID_SIZE;
        const gridX = (this.sys.game.config.width - gridWidth) / 2;
        const gridY = (this.sys.game.config.height - gridHeight) / 2;
        const centerX = gridX + gridWidth / 2;
        const centerY = gridY + gridHeight / 2;

        // Update combo status and score
        if (totalLinesCleared > 0) {
            // Increment consecutive combo if last move also cleared lines
            if (this.lastMoveCleared) {
                this.consecutiveCombo++;
                // Play combo sound for consecutive clears (2 or more in a row)
                if (this.consecutiveCombo >= 2) {
                    this.comboSound.play({
                        seek: 1 // Start 1 second into the sound
                    });
                }
            } else {
                this.consecutiveCombo = 1;
            }
            // Show combo effect based on number of lines cleared and combo count
            this.showComboEffect(totalLinesCleared, centerX, centerY);
        } else {
            // Reset combo if no lines cleared
            this.consecutiveCombo = 0;
            this.lastMoveCleared = false;
        }

        this.updateScore(totalLinesCleared);

        // Reset flashing lines
        this.flashingLines = [];
        // Redraw the game
        this.drawGame();

        // NOW check if game is over due to no available placements
        // This ensures we evaluate game over only after the line clearing is complete
        this.time.delayedCall(200, () => {
            this.checkForGameOver();
        });
    }

    showComboEffect(linesCleared, x, y) {
        if (linesCleared === 0) return;

        let comboMessage = '';
        let textColor = '#ffffff';
        let particleCount = 0;
        let particleColor = 0xffffff;

        // Get the color of the last placed shape for consistency
        const lastColorHex = this.lastPlacedShapeColor || 0xd8a0d8; // Default to purple if no shape yet

        // Convert hex color to CSS color string
        const colorToCSS = (hex) => {
            const r = (hex >> 16) & 0xFF;
            const g = (hex >> 8) & 0xFF;
            const b = hex & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

        // Use the exact piece color for messages with no adjustments
        textColor = colorToCSS(lastColorHex);
        particleColor = lastColorHex;

        // Define combo message and effects based on combo level (using consistent colors)
        if (this.consecutiveCombo >= 3) {
            comboMessage = `COMBO x${this.consecutiveCombo}!`;
            particleCount = 100;
        } else if (this.consecutiveCombo === 2) {
            comboMessage = 'DOUBLE COMBO!';
            particleCount = 50;
        } else if (linesCleared > 4) {
            comboMessage = 'LEGENDARY CLEAR!';
            particleCount = 150;
        } else if (linesCleared === 4) {
            comboMessage = 'QUADRUPLE CLEAR!';
            particleCount = 100;
        } else if (linesCleared === 3) {
            comboMessage = 'TRIPLE CLEAR!';
            particleCount = 75;
        } else if (linesCleared === 2) {
            comboMessage = 'DOUBLE CLEAR!';
            particleCount = 30;
        }

        // Only show effect if we have a message
        if (comboMessage !== '') {
            // Display combo text with the exact color of the piece that cleared the lines
            this.comboText.setText(comboMessage);
            this.comboText.setColor(colorToCSS(this.lastPlacedShapeColor));
            this.comboText.setAlpha(1);

            // Animate the combo text with improved animation
            this.comboText.setScale(0.5);
            this.comboText.angle = -5; // Start with a slight tilt

            this.tweens.add({
                targets: this.comboText,
                scale: {
                    from: 0.5,
                    to: 1.4
                },
                angle: {
                    from: -5,
                    to: 5
                },
                alpha: {
                    from: 1,
                    to: 0,
                    delay: 1500 // Increased from 800ms to 1500ms for much longer display at full opacity
                },
                y: {
                    from: y,
                    to: y - 80 // Larger movement range
                },
                ease: 'Back.Out',
                duration: 5000, // Extended from 3500ms to 5000ms for significantly longer visibility
                onComplete: () => {
                    this.comboText.setScale(1);
                    this.comboText.angle = 0;
                }
            });

            // Create particle effect
            if (particleCount > 0) {
                // Set the emitter properties - use exact shape color
                this.comboParticles.setPosition(x, y);
                this.comboParticles.setTint(this.lastPlacedShapeColor);

                // Emit particles with a burst effect
                this.comboParticles.setQuantity(particleCount);
                this.comboParticles.explode();

                // Add screen shake for big combos
                if (this.consecutiveCombo >= 3 || linesCleared >= 3) {
                    this.cameras.main.shake(200, 0.005);
                }
            }
        }
    }
    // Create animated floating score text
    showFloatingScore(points, x, y, color) {
        // Default position if not specified is center of screen
        if (x === undefined) {
            x = this.sys.game.config.width / 2;
        }
        if (y === undefined) {
            y = this.sys.game.config.height / 2;
        }
        if (color === undefined) {
            color = '#ffffff';
        }
        // Create text with + sign to indicate addition
        const floatingText = this.add.text(x, y, `+${points}`, {
            fontSize: '28px',
            fontFamily: '"Exo 2", sans-serif',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        }).setOrigin(0.5, 0.5);
        // Create float-up and fade-out animation
        this.tweens.add({
            targets: floatingText,
            y: y - 80, // Float upward
            alpha: 0,
            scale: 1.5, // Grow slightly
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                floatingText.destroy(); // Remove when animation completes
            }
        });
        return floatingText;
    }
    updateScore(linesCleared) {
        if (linesCleared > 0) {
            let basePoints;
            // Base points for simultaneous line clears
            switch (linesCleared) {
                case 1:
                    basePoints = 100;
                    break;
                case 2:
                    basePoints = 300;
                    break;
                case 3:
                    basePoints = 500;
                    break;
                case 4:
                    basePoints = 800;
                    break;
                default:
                    basePoints = 1000;
            }
            // Apply sequential combo multiplier
            let comboMultiplier = 1;
            if (this.consecutiveCombo >= 4) {
                comboMultiplier = 4; // Maximum 4x multiplier
            } else if (this.consecutiveCombo >= 1) {
                comboMultiplier = this.consecutiveCombo;
            }
            const totalPoints = basePoints * comboMultiplier;
            this.score += totalPoints;
            this.linesCleared += linesCleared;
            // Calculate center of grid for floating score text
            const gridWidth = this.GRID_WIDTH * this.GRID_SIZE;
            const gridHeight = this.GRID_HEIGHT * this.GRID_SIZE;
            const gridX = (this.sys.game.config.width - gridWidth) / 2;
            const gridY = (this.sys.game.config.height - gridHeight) / 2 - 60;
            const centerX = gridX + gridWidth / 2;
            const centerY = gridY + gridHeight / 2;
            // Convert the color of the last placed shape to a CSS color string
            const lastColorHex = this.lastPlacedShapeColor || 0xffffff;
            const colorToCSS = (hex) => {
                const r = (hex >> 16) & 0xFF;
                const g = (hex >> 8) & 0xFF;
                const b = hex & 0xFF;
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            };
            const scoreColor = colorToCSS(lastColorHex);
            // Show the floating score with the appropriate color
            this.showFloatingScore(totalPoints, centerX, centerY, scoreColor);
            // Update score text with just the number
            this.scoreText.setText(this.score.toString());
            // Check and update highest score if current score is higher
            const wasHighScore = this.score > this.highestScore;
            if (wasHighScore) {
                // Store old high score to check at game over
                this.oldHighScore = this.highestScore;

                // Update to new high score
                this.highestScore = this.score;
                this.highestScoreText.setText(this.highestScore.toString());
                // Log for debugging
                console.log(`New high score achieved during play: ${this.score}`);
                // Save the new high score to localStorage
                localStorage.setItem('blockBlasterHighScore', this.highestScore.toString());

                // Flag for end-game celebration
                this.achievedNewHighScore = true;
            }
        }
    }

    showLevelUpAnimation() {
        this.levelUpText.setAlpha(1);
        this.tweens.add({
            targets: this.levelUpText,
            alpha: 0,
            y: this.levelUpText.y - 100,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                this.levelUpText.y = this.sys.game.config.height / 2;
            }
        });
    }
    showGameOver() {
        // Reset this flag to ensure celebration can trigger
        this.highScoreCelebration = false;

        // Check if we achieved a new high score during this game
        if (this.achievedNewHighScore === true) {
            console.log("Triggering high score celebration at game over!");
            this.highScoreCelebration = true;
            this.showHighScoreCelebration();
            return; // Exit here - the regular game over will be called after celebration
        }
        // If not a high score, just show regular game over
        if (this.gameOverSound) {
            this.gameOverSound.play();
        }

        // Select a random shape color for the game over UI
        const shapeColors = [
            0x00e0e0, // Cyan
            0xffd000, // Yellow
            0xff2020, // Red
            0x00d000, // Green
            0xc050c0 // Purple
        ];
        this.currentGameOverColor = shapeColors[Phaser.Math.Between(0, shapeColors.length - 1)];

        // Make sure we recreate the button graphics in case they were removed
        const buttonWidth = 160;
        const buttonHeight = 60;
        const buttonX = this.sys.game.config.width / 2;
        const buttonY = this.sys.game.config.height / 2 + 50;

        // Recreate button background
        if (!this.restartButtonBg) {
            this.restartButtonBg = this.add.graphics();
        }
        this.restartButtonBg.clear();
        this.restartButtonBg.fillStyle(this.currentGameOverColor, 1);
        this.restartButtonBg.fillRoundedRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            16
        );
        // Recreate button glow
        if (!this.restartButtonGlow) {
            this.restartButtonGlow = this.add.graphics();
        }
        this.restartButtonGlow.clear();
        this.restartButtonGlow.fillStyle(this.currentGameOverColor, 0.5);
        this.restartButtonGlow.fillRoundedRect(
            buttonX - buttonWidth / 2 - 5,
            buttonY - buttonHeight / 2 - 5,
            buttonWidth + 10,
            buttonHeight + 10,
            20
        );

        // Also update the game over background with the same color
        this.gameOverBg.clear();
        this.gameOverBg.fillStyle(this.currentGameOverColor, 1);
        this.gameOverBg.fillRoundedRect(
            this.sys.game.config.width / 2 - 180,
            this.sys.game.config.height / 2 - 85,
            360,
            80,
            16
        );

        // And the game over glow
        this.gameOverGlow.clear();
        this.gameOverGlow.fillStyle(this.currentGameOverColor, 0.5);
        this.gameOverGlow.fillRoundedRect(
            this.sys.game.config.width / 2 - 185,
            this.sys.game.config.height / 2 - 90,
            370,
            90,
            20
        );

        // Reset all game over elements
        const gameOverElements = [
            this.gameOverGlow, this.gameOverBg, this.gameOverText,
            this.restartButton, this.restartButtonBg, this.restartButtonGlow
        ];
        gameOverElements.forEach(element => element.setAlpha(0));

        // Animate the game over elements
        this.tweens.add({
            targets: [this.gameOverGlow, this.gameOverBg],
            alpha: {
                from: 0,
                to: 1
            },
            duration: 500,
            ease: 'Power2'
        });

        this.tweens.add({
            targets: this.gameOverText,
            alpha: {
                from: 0,
                to: 1
            },
            y: {
                from: this.sys.game.config.height / 2 - 70,
                to: this.sys.game.config.height / 2 - 50
            },
            duration: 600,
            ease: 'Power2'
        });

        // Animate the restart button with a slight delay
        this.tweens.add({
            targets: [this.restartButtonGlow, this.restartButtonBg, this.restartButton],
            alpha: {
                from: 0,
                to: 1
            },
            delay: 200,
            duration: 500,
            ease: 'Power2'
        });
        // Add them to the scene explicitly in the correct order
        this.add.existing(this.gameOverGlow);
        this.add.existing(this.gameOverBg);
        this.add.existing(this.gameOverText);
        this.add.existing(this.restartButtonGlow);
        this.add.existing(this.restartButtonBg);
        this.add.existing(this.restartButton);
        // Clear any dragging states
        this.draggingShape = null;
    }
    showHighScoreCelebration() {
        console.log("Showing high score celebration for score: ", this.score);
        this.highestScoreText.setText(this.highestScore.toString());
        // In case it wasn't saved earlier
        localStorage.setItem('blockBlasterHighScore', this.highestScore.toString());
        // Play celebration sounds - combine them for more impact
        if (this.lineClearSound && this.lineClearSound.isPlaying) {
            this.lineClearSound.stop();
        }
        if (this.hooraySound && this.hooraySound.isPlaying) {
            this.hooraySound.stop();
        }
        // Play in sequence for better audio effect
        if (this.lineClearSound) {
            this.lineClearSound.play();
            // For an even bigger celebration, play the hooray sound right after
            this.time.delayedCall(300, () => {
                if (this.hooraySound) {
                    this.hooraySound.play();
                }
            });
        }

        // Select a color for the high score background (use a different color from game over)
        const celebrationColors = [
            0xffd000, // Yellow
            0x00e0e0, // Cyan
            0xc050c0 // Purple
        ];
        const celebrationColor = celebrationColors[Phaser.Math.Between(0, celebrationColors.length - 1)];

        // Set the background colors
        this.newHighScoreBg.clear();
        this.newHighScoreBg.fillStyle(celebrationColor, 1);
        this.newHighScoreBg.fillRoundedRect(
            this.sys.game.config.width / 2 - 220,
            this.sys.game.config.height / 2 - 85,
            440,
            80,
            16
        );

        this.newHighScoreGlow.clear();
        this.newHighScoreGlow.fillStyle(celebrationColor, 0.5);
        this.newHighScoreGlow.fillRoundedRect(
            this.sys.game.config.width / 2 - 225,
            this.sys.game.config.height / 2 - 90,
            450,
            90,
            20
        );
        // Make sure all high score elements are visible and properly positioned
        this.newHighScoreText.setPosition(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 - 50
        );
        // Reset any existing tweens on the high score elements
        this.tweens.killTweensOf(this.newHighScoreText);
        this.tweens.killTweensOf(this.newHighScoreBg);
        this.tweens.killTweensOf(this.newHighScoreGlow);
        // Get screen dimensions for positioning confetti
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        // Improved confetti function with particle check
        const emitConfetti = (x, y, color) => {
            if (this.confettiParticles) {
                this.confettiParticles.setPosition(x, y);
                this.confettiParticles.setTint(color);
                // Make sure the particles are visible and active
                this.confettiParticles.setVisible(true);
                this.confettiParticles.active = true;
                this.confettiParticles.explode(30); // More particles per burst

                // Add a small screen flash for impact
                const flash = this.add.rectangle(0, 0, width, height, color, 0.2);
                flash.setOrigin(0, 0);
                flash.setDepth(1000);
                this.tweens.add({
                    targets: flash,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => flash.destroy()
                });
            }
        };
        // Game color palette
        const colors = [0x00e0e0, 0xffd000, 0xff2020, 0x00d000, 0xc050c0];
        console.log("Preparing to emit confetti with colors:", colors);

        // Emit confetti bursts with staggered timing for better visual effect
        colors.forEach((color, index) => {
            this.time.delayedCall(index * 200, () => {
                // Random position with specific patterns for better coverage
                const x = width * [0.2, 0.8, 0.5, 0.3, 0.7][index];
                const y = height * [0.2, 0.2, 0.3, 0.4, 0.4][index];
                console.log(`Emitting confetti burst ${index+1} at position ${x},${y} with color ${color}`);
                emitConfetti(x, y, color);
                // Create additional bursts with wider spread
                this.time.delayedCall(500, () => {
                    const randomX = Phaser.Math.Between(width * 0.1, width * 0.9);
                    const randomY = Phaser.Math.Between(height * 0.1, height * 0.4);
                    console.log(`Emitting additional confetti at ${randomX},${randomY}`);
                    emitConfetti(randomX, randomY, color);
                });
            });
        });
        // Animate the background elements first
        this.tweens.add({
            targets: [this.newHighScoreGlow, this.newHighScoreBg],
            alpha: {
                from: 0,
                to: 1
            },
            duration: 500,
            ease: 'Power2'
        });

        // Show high score text with animation
        this.newHighScoreText.setAlpha(0);
        this.newHighScoreText.setScale(0.5);

        // Animate the text after background appears
        this.tweens.add({
            targets: this.newHighScoreText,
            alpha: 1,
            scale: 1.3, // Reduced from 1.5 to keep text within bounds
            duration: 600,
            delay: 100, // Slight delay after background appears
            ease: 'Bounce.Out',
            onComplete: () => {
                // Add a subtle pulsing effect
                this.tweens.add({
                    targets: this.newHighScoreText,
                    scale: {
                        from: 1.3, // Reduced from 1.5
                        to: 1.1 // Reduced from 1.2
                    },
                    yoyo: true,
                    repeat: 3, // More pulses
                    duration: 300,
                    ease: 'Sine.InOut'
                });
            }
        });
        // Add stronger camera shake
        this.cameras.main.shake(400, 0.015);

        // After celebration, show the regular game over screen
        // Increased delay to 3000ms to give more time for celebration
        this.time.delayedCall(3000, () => {
            console.log("High score celebration completed, transitioning to game over screen");

            // Fade out the high score elements
            this.tweens.add({
                targets: [this.newHighScoreText, this.newHighScoreBg, this.newHighScoreGlow],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    // Reset flag to prevent recursion
                    this.highScoreCelebration = false;
                    this.achievedNewHighScore = false;
                    // Now show the regular game over screen with recursion prevention
                    console.log("Showing regular game over screen after high score celebration");
                    this.showGameOver();
                }
            });
        });
    }

    restartGame() {
        // Increment play count
        this.playCount++;
        localStorage.setItem('blockBlasterPlayCount', this.playCount.toString());

        // Check if we should show an ad (every 3 games)
        if (this.playCount % 3 === 0) {
            this.showInterstitialAd();
        }
        this.gameOver = false;
        this.score = 0;
        this.linesCleared = 0;
        this.flashingLines = [];
        this.lastPlacedShapeColor = null;
        this.highScoreCelebration = false;
        this.achievedNewHighScore = false;
        this.oldHighScore = null;

        // Reset high score bg/glow
        if (this.newHighScoreBg) this.newHighScoreBg.setAlpha(0);
        if (this.newHighScoreGlow) this.newHighScoreGlow.setAlpha(0);

        // Choose a new random color for the game over elements for next time
        const shapeColors = [
            0x00e0e0, // Cyan
            0xffd000, // Yellow
            0xff2020, // Red
            0x00d000, // Green
            0xc050c0 // Purple
        ];
        this.currentGameOverColor = shapeColors[Phaser.Math.Between(0, shapeColors.length - 1)];
        this.initGrid();
        // Reset available shapes
        this.availableShapes = [];
        this.generateAvailableShapes(3);
        this.scoreText.setText('0');
        // Don't reset highest score - it persists between games
        this.gameOverText.setAlpha(0);
        this.gameOverBg.setAlpha(0);
        this.gameOverGlow.setAlpha(0);
        this.restartButton.setAlpha(0);
        this.restartButtonBg.setAlpha(0);
        this.restartButtonGlow.setAlpha(0);
        this.levelUpText.setAlpha(0);
        this.levelUpText.y = this.sys.game.config.height / 2;
        this.newHighScoreText.setAlpha(0);

        // Show the rotation help text again when restarting
        if (this.rotationHelpText) {
            this.rotationHelpText.setAlpha(1);
            // Set up a simple timer to hide it again after 5 seconds
            this.time.delayedCall(5000, () => {
                if (this.rotationHelpText && this.rotationHelpText.active) {
                    this.rotationHelpText.setAlpha(0);
                }
            });
        }

        // Add a new random animal shape for this game
        this.drawAnimalShape();

        // Reset combo tracking
        this.consecutiveCombo = 0;
        this.lastMoveCleared = false;
        this.comboText.setAlpha(0);
        // Reset rotation tracking
        this.lastTapTime = null;
        this.lastTappedShapeIndex = null;
        // No need to restart background music (removed)
        this.drawGame();
    }
    checkForGameOver() {
        if (this.gameOver) return;
        if (this.availableShapes.length === 0) {
            return;
        }
        // Check if any available shape can be placed anywhere on the grid in any rotation
        let canPlaceAnyShape = false;
        // For each available shape in the inventory
        for (let shapeIndex = 0; shapeIndex < this.availableShapes.length; shapeIndex++) {
            const originalShape = this.availableShapes[shapeIndex];

            // Try all 4 possible rotations
            for (let rotation = 0; rotation < 4; rotation++) {
                // Create a fresh copy for this rotation
                let testShape = JSON.parse(JSON.stringify(originalShape.shape));

                // Apply rotations as needed
                for (let r = 0; r < rotation; r++) {
                    testShape = this.rotateShapeCopy(testShape);
                }

                // Try every possible position on the grid with this rotation
                for (let y = 0; y < this.GRID_HEIGHT && !canPlaceAnyShape; y++) {
                    for (let x = 0; x < this.GRID_WIDTH && !canPlaceAnyShape; x++) {
                        if (this.canPlaceShapeAt(x, y, testShape)) {
                            canPlaceAnyShape = true;
                        }
                    }
                }
                if (canPlaceAnyShape) break;
            }
            if (canPlaceAnyShape) break;
        }
        if (!canPlaceAnyShape) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    // Helper method to rotate a shape without modifying the original
    rotateShapeCopy(matrix) {
        const n = matrix.length;
        const m = matrix[0].length;

        // Create a new matrix for the rotated shape
        const rotated = new Array(m).fill().map(() => new Array(n).fill(0));

        // Rotate the shape clockwise
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                rotated[j][n - 1 - i] = matrix[i][j];
            }
        }

        return rotated;
    }

    drawGame() {
        this.children.removeAll();

        const gridWidth = this.GRID_WIDTH * this.GRID_SIZE;
        const gridHeight = this.GRID_HEIGHT * this.GRID_SIZE;
        const gridX = (this.sys.game.config.width - gridWidth) / 2;
        const gridY = (this.sys.game.config.height - gridHeight) / 2 - 60; // CRITICAL: Must match value in stopDrag()

        // Style for high score text (smaller)
        const textStyle = {
            fontSize: '22px',
            fontFamily: '"Exo 2", sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            resolution: 2 // Higher resolution for sharper text
        };

        // Style for current score text (larger)
        const scoreTextStyle = {
            fontSize: '36px',
            fontFamily: '"Exo 2", sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3, // Slightly thicker stroke for larger font
            resolution: 2
        };

        // Current score - just the number, centered above grid
        // Current score - using larger font size
        this.scoreText = this.add.text(this.sys.game.config.width / 2, gridY - 35, this.score.toString(), scoreTextStyle)
            .setOrigin(0.5, 0.5)
            .setAlpha(1);

        // Draw crown icon instead of "Best:" text
        const crownGraphics = this.add.graphics();

        // Calculate better vertical alignment with the score text
        const crownY = this.PADDING + 15; // Lowered position for better alignment with score
        // Use colors that match the game's shape colors
        // Always use yellow for the crown regardless of last shape
        const crownBaseColor = 0xffd000; // Always yellow for consistent branding
        const crownLightColor = Phaser.Display.Color.ValueToColor(crownBaseColor).lighten(30).color;
        const crownDarkColor = Phaser.Display.Color.ValueToColor(crownBaseColor).darken(15).color;

        // Create a more detailed crown using game colors
        crownGraphics.fillStyle(crownBaseColor, 1);

        // Define crown dimensions for better alignment
        const crownWidth = 28;
        const crownBaseWidth = 24;
        const crownCenterX = this.PADDING + crownWidth / 2;

        // Crown base (with rounded corners) - centered
        crownGraphics.fillRoundedRect(
            crownCenterX - crownBaseWidth / 2,
            crownY + 5,
            crownBaseWidth,
            6,
            2
        );

        // Darker shade for dimension - centered
        crownGraphics.fillStyle(crownDarkColor, 1);
        crownGraphics.fillRect(
            crownCenterX - (crownBaseWidth - 2) / 2,
            crownY + 8,
            crownBaseWidth - 2,
            2
        );

        // Light reflection on top - centered
        crownGraphics.fillStyle(crownLightColor, 1);
        crownGraphics.fillRect(
            crownCenterX - (crownBaseWidth - 4) / 2,
            crownY + 5,
            crownBaseWidth - 4,
            1
        );

        // Return to main color for crown points
        crownGraphics.fillStyle(crownBaseColor, 1);

        // Center point (tallest)
        crownGraphics.fillTriangle(
            crownCenterX - 4, crownY + 5, // bottom left
            crownCenterX, crownY - 10, // top point
            crownCenterX + 4, crownY + 5 // bottom right
        );

        // Left point
        crownGraphics.fillTriangle(
            crownCenterX - 12, crownY + 5, // bottom left
            crownCenterX - 8, crownY - 8, // top point
            crownCenterX - 4, crownY + 5 // bottom right
        );

        // Right point
        crownGraphics.fillTriangle(
            crownCenterX + 4, crownY + 5, // bottom left
            crownCenterX + 8, crownY - 8, // top point
            crownCenterX + 12, crownY + 5 // bottom right
        );

        // Add jewels (using game colors instead of fixed colors)
        // Use the shape colors from the game for the jewels
        crownGraphics.fillStyle(0xff2020, 0.9); // Red (from shape colors)
        crownGraphics.fillCircle(crownCenterX - 8, crownY - 2, 2);
        crownGraphics.fillStyle(0x00e0e0, 0.9); // Cyan (from shape colors)
        crownGraphics.fillCircle(crownCenterX, crownY - 4, 2.5);
        crownGraphics.fillStyle(0x00d000, 0.9); // Green (from shape colors)
        crownGraphics.fillCircle(crownCenterX + 8, crownY - 2, 2);

        // Add the highest score value text - moved slightly higher but keeping the crown in place
        this.highestScoreText = this.add.text(this.PADDING + crownWidth + 6, crownY - 12, this.highestScore.toString(), textStyle)
            .setOrigin(0, 0)
            .setAlpha(1);
        // Calculate potential drop position if a shape is being dragged
        let highlightCells = [];
        let isValidPlacement = false;
        let linesToClear = {
            horizontal: [],
            vertical: []
        };
        if (this.draggingShape) {
            // Calculate the center of the dragging shape (always at 100% scale when dragging)
            const shapeWidth = this.draggingShape.shape[0].length * this.GRID_SIZE;
            const shapeHeight = this.draggingShape.shape.length * this.GRID_SIZE;
            const shapeCenterX = this.draggingShapePosition.x + (shapeWidth / 2);
            const shapeCenterY = this.draggingShapePosition.y + (shapeHeight / 2);
            // Calculate grid position based on shape center with proper centering
            const shapeColCount = this.draggingShape.shape[0].length;
            const shapeRowCount = this.draggingShape.shape.length;
            // Use the same centering logic as in stopDrag
            // Make sure we use the same grid position calculation as in stopDrag
            // EXACT SAME CALCULATION AS IN STOPDRAG FOR CONSISTENCY
            const gridPosX = Math.round((shapeCenterX - gridX) / this.GRID_SIZE - shapeColCount / 2);
            const gridPosY = Math.round((shapeCenterY - gridY) / this.GRID_SIZE - shapeRowCount / 2);

            // Store these values globally for stopDrag to use
            this.previewGridPosX = gridPosX;
            this.previewGridPosY = gridPosY;
            isValidPlacement = this.canPlaceShapeAt(gridPosX, gridPosY, this.draggingShape.shape);
            // Store cells that would be affected
            for (let row = 0; row < this.draggingShape.shape.length; row++) {
                for (let col = 0; col < this.draggingShape.shape[row].length; col++) {
                    if (this.draggingShape.shape[row][col]) {
                        highlightCells.push({
                            x: gridPosX + col,
                            y: gridPosY + row
                        });
                    }
                }
            }

            // If placement is valid, check which lines would be cleared
            if (isValidPlacement) {
                // Create a temporary grid to simulate placement
                let tempGrid = JSON.parse(JSON.stringify(this.grid));

                // Place the shape on the temp grid
                for (let row = 0; row < this.draggingShape.shape.length; row++) {
                    for (let col = 0; col < this.draggingShape.shape[row].length; col++) {
                        if (this.draggingShape.shape[row][col]) {
                            const newY = gridPosY + row;
                            const newX = gridPosX + col;
                            if (newY >= 0 && newY < this.GRID_HEIGHT && newX >= 0 && newX < this.GRID_WIDTH) {
                                tempGrid[newY][newX] = this.draggingShape.color;
                            }
                        }
                    }
                }

                // Check for completed horizontal lines
                for (let y = 0; y < this.GRID_HEIGHT; y++) {
                    if (tempGrid[y].every(cell => cell !== null)) {
                        linesToClear.horizontal.push(y);
                    }
                }

                // Check for completed vertical lines
                for (let x = 0; x < this.GRID_WIDTH; x++) {
                    let isComplete = true;
                    for (let y = 0; y < this.GRID_HEIGHT; y++) {
                        if (tempGrid[y][x] === null) {
                            isComplete = false;
                            break;
                        }
                    }
                    if (isComplete) {
                        linesToClear.vertical.push(x);
                    }
                }
            }
        }

        // Draw grid cells with highlights
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                let cellColor = this.grid[y][x] || 0x555555; // Default cell color
                let cellAlpha = this.grid[y][x] ? 1 : 0.5;
                // Check if this cell is part of a line that will be cleared
                const isInClearingLine = (
                    linesToClear.horizontal.includes(y) ||
                    linesToClear.vertical.includes(x)
                );

                // Check if this cell should be highlighted as part of the placement
                const isHighlighted = highlightCells.some(cell => cell.x === x && cell.y === y);
                if (isInClearingLine && isValidPlacement && this.draggingShape) {
                    // Use the shape's color (brighter) for lines that will be cleared
                    cellColor = this.draggingShape.color;
                    cellAlpha = 0.7; // More visible
                } else if (isHighlighted) {
                    // Use shape color with validation tint
                    if (isValidPlacement) {
                        cellColor = this.draggingShape.color; // Use the shape's own color for valid placements
                        cellAlpha = 0.8;
                    } else {
                        cellColor = 0xffa0a0; // Red for invalid placement
                        cellAlpha = 0.7;
                    }
                }
                // Draw 3D-style blocks with polygons
                const blockX = gridX + x * this.GRID_SIZE;
                const blockY = gridY + y * this.GRID_SIZE;
                const blockSize = this.GRID_SIZE - 1;

                // Create polygon for 3D block effect
                const graphics = this.add.graphics();

                // Base color and shades
                const baseColor = cellColor;
                const darkShade = Phaser.Display.Color.ValueToColor(baseColor).darken(30).color;
                const lightShade = Phaser.Display.Color.ValueToColor(baseColor).lighten(20).color;

                // Main face (slightly smaller)
                graphics.fillStyle(baseColor, cellAlpha);
                graphics.fillRect(blockX + 2, blockY + 2, blockSize - 4, blockSize - 4);

                // Top edge - lighter
                graphics.fillStyle(lightShade, cellAlpha);
                graphics.fillRect(blockX, blockY, blockSize, 2);
                graphics.fillRect(blockX, blockY, 2, blockSize);

                // Bottom edge - darker
                graphics.fillStyle(darkShade, cellAlpha);
                graphics.fillRect(blockX, blockY + blockSize - 2, blockSize, 2);
                graphics.fillRect(blockX + blockSize - 2, blockY, 2, blockSize);
            }
        }
        // Inventory area dimensions (no background)
        const inventoryHeight = this.GRID_SIZE * 4;
        // Adjust inventory Y position to be above the banner
        const bannerHeight = this.sys.game.config.height * 0.1;
        const inventoryY = this.sys.game.config.height - bannerHeight - this.PADDING - inventoryHeight;
        // Make sure the inventory area is interactable
        const inventoryInteractionZone = this.add.zone(
                this.PADDING,
                inventoryY,
                this.sys.game.config.width - (2 * this.PADDING),
                inventoryHeight
            )
            .setOrigin(0, 0)
            .setInteractive()
            .setDepth(999);
        // No inventory title (removed as requested)
        // Draw available shapes centered in inventory area
        const shapeSpacing = 20; // Space between shapes
        const scaleFactor = 0.7; // Same scale factor for consistency
        const totalShapesWidth = this.availableShapes.reduce((width, shape) => {
            return width + shape.shape[0].length * this.GRID_SIZE * scaleFactor;
        }, 0);
        const totalSpacingWidth = shapeSpacing * (this.availableShapes.length - 1);
        const totalWidth = totalShapesWidth + totalSpacingWidth;
        const startX = this.PADDING + (this.sys.game.config.width - 2 * this.PADDING - totalWidth) / 2;

        let currentX = startX;
        for (let i = 0; i < this.availableShapes.length; i++) {
            const shape = this.availableShapes[i];
            // Apply 70% scale factor to inventory shapes
            const scaleFactor = 0.7;
            const shapeWidth = shape.shape[0].length * this.GRID_SIZE * scaleFactor;
            const shapeHeight = shape.shape.length * this.GRID_SIZE * scaleFactor;
            const shapeStartY = inventoryY + (inventoryHeight - shapeHeight) / 2; // Center vertically
            // Draw the shape blocks
            for (let row = 0; row < shape.shape.length; row++) {
                for (let col = 0; col < shape.shape[row].length; col++) {
                    if (shape.shape[row][col]) {
                        const x = currentX + col * this.GRID_SIZE * scaleFactor;
                        const y = shapeStartY + row * this.GRID_SIZE * scaleFactor;
                        // Draw 3D-style blocks for inventory shapes
                        const blockSize = this.GRID_SIZE * scaleFactor - 1;
                        const graphics = this.add.graphics();

                        // Base color and shades
                        const baseColor = shape.color;
                        const darkShade = Phaser.Display.Color.ValueToColor(baseColor).darken(30).color;
                        const lightShade = Phaser.Display.Color.ValueToColor(baseColor).lighten(20).color;

                        // Main face (slightly smaller)
                        graphics.fillStyle(baseColor, 1);
                        graphics.fillRect(x + 2, y + 2, blockSize - 4, blockSize - 4);

                        // Top edge - lighter
                        graphics.fillStyle(lightShade, 1);
                        graphics.fillRect(x, y, blockSize, 2);
                        graphics.fillRect(x, y, 2, blockSize);

                        // Bottom edge - darker
                        graphics.fillStyle(darkShade, 1);
                        graphics.fillRect(x, y + blockSize - 2, blockSize, 2);
                        graphics.fillRect(x + blockSize - 2, y, 2, blockSize);
                    }
                }
            }

            // Move to the next shape position
            currentX += shapeWidth + shapeSpacing;
        }
        // Draw the shape being dragged
        if (this.draggingShape) {
            const dragWidth = this.draggingShape.shape[0].length * this.GRID_SIZE;
            const dragHeight = this.draggingShape.shape.length * this.GRID_SIZE;
            // Draw the dragging shape cells
            for (let row = 0; row < this.draggingShape.shape.length; row++) {
                for (let col = 0; col < this.draggingShape.shape[row].length; col++) {
                    if (this.draggingShape.shape[row][col]) {
                        // Calculate and display the visual position of the shape
                        const x = this.draggingShapePosition.x + col * this.GRID_SIZE;
                        const y = this.draggingShapePosition.y + row * this.GRID_SIZE;
                        // Draw 3D-style blocks for dragging shapes
                        const blockSize = this.GRID_SIZE - 1;
                        const graphics = this.add.graphics();
                        const dragAlpha = 0.8; // Semi-transparent while dragging

                        // Base color and shades
                        const baseColor = this.draggingShape.color;
                        const darkShade = Phaser.Display.Color.ValueToColor(baseColor).darken(30).color;
                        const lightShade = Phaser.Display.Color.ValueToColor(baseColor).lighten(20).color;

                        // Main face (slightly smaller)
                        graphics.fillStyle(baseColor, dragAlpha);
                        graphics.fillRect(x + 2, y + 2, blockSize - 4, blockSize - 4);

                        // Top edge - lighter
                        graphics.fillStyle(lightShade, dragAlpha);
                        graphics.fillRect(x, y, blockSize, 2);
                        graphics.fillRect(x, y, 2, blockSize);

                        // Bottom edge - darker
                        graphics.fillStyle(darkShade, dragAlpha);
                        graphics.fillRect(x, y + blockSize - 2, blockSize, 2);
                        graphics.fillRect(x + blockSize - 2, y, 2, blockSize);
                    }
                }
            }
        }

        // Add UI elements back to the scene
        this.add.existing(this.levelUpText);
        // Add high score elements in correct order
        if (this.newHighScoreGlow) this.add.existing(this.newHighScoreGlow);
        if (this.newHighScoreBg) this.add.existing(this.newHighScoreBg);
        this.add.existing(this.newHighScoreText);
        // Add game over elements in correct order
        if (this.gameOverGlow) this.add.existing(this.gameOverGlow);
        if (this.gameOverBg) this.add.existing(this.gameOverBg);
        this.add.existing(this.gameOverText);

        // Re-add the game interaction zone with highest priority
        if (this.gameInteractionZone) {
            this.add.existing(this.gameInteractionZone);
        }

        // Always add the button elements, just rely on alpha for visibility
        this.add.existing(this.restartButtonGlow);
        this.add.existing(this.restartButtonBg);
        this.add.existing(this.restartButton);
        this.add.existing(this.comboText);
        // Re-add rotation help text and preserve current alpha
        const currentAlpha = this.rotationHelpText ? this.rotationHelpText.alpha : 1;

        // Create new text object with preserved alpha
        // Position the rotation help text above the banner
        // Use the previously defined bannerHeight variable
        this.rotationHelpText = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height - bannerHeight - 5,
            'Double-tap shapes to rotate', {
                fontSize: '16px',
                fontFamily: '"Exo 2", sans-serif',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1,
                resolution: 2
            }).setOrigin(0.5, 1).setAlpha(currentAlpha);
    }

    // Ad system implementation
    initAdSystem() {
        // Check if AdMob is available (in production environment)
        if (typeof admob !== 'undefined') {
            // Real AdMob implementation
            console.log("AdMob detected, initializing...");

            // Initialize with your AdMob app ID
            // admob.start('YOUR_ADMOB_APP_ID');

            // Set up event listeners
            document.addEventListener('admob.interstitial.events.LOAD', () => {
                console.log("Interstitial ad loaded");
                this.adReady = true;
            });

            document.addEventListener('admob.interstitial.events.CLOSE', () => {
                console.log("Interstitial ad closed");
                this.showingAd = false;
                // Reload ad for next time
                this.preloadInterstitialAd();
            });

            // Initial ad preload
            this.preloadInterstitialAd();
        } else {
            // Mock ad system for testing
            console.log("Using mock ad system for testing");
            this.adReady = true;
        }
    }

    preloadInterstitialAd() {
        if (typeof admob !== 'undefined') {
            // Real implementation
            admob.interstitial.load({
                id: {
                    // Replace with your ad unit IDs for each platform
                    android: 'ca-app-pub-xxx/yyy',
                    ios: 'ca-app-pub-xxx/zzz',
                }
            });
        } else {
            // Mock implementation
            this.adReady = true;
        }
    }

    showInterstitialAd() {
        if (this.showingAd) return; // Prevent multiple ad displays

        // Show mock ad implementation only for testing
        if (this.adReady) {
            this.showingAd = true;
            this.adReady = false;
            this.showingAd = true;

            // Create ad overlay
            const width = this.sys.game.config.width;
            const height = this.sys.game.config.height;

            // Background
            const overlay = this.add.graphics()
                .fillStyle(0x000000, 0.8)
                .fillRect(0, 0, width, height)
                .setDepth(9000);

            // Ad content box
            const adBox = this.add.graphics()
                .fillStyle(0x333333, 1)
                .fillRoundedRect(width / 2 - 150, height / 2 - 200, 300, 400, 16)
                .setDepth(9001);

            // Mock ad title
            const adTitle = this.add.text(width / 2, height / 2 - 160, 'ADVERTISEMENT', {
                fontSize: '24px',
                fontFamily: '"Exo 2", sans-serif',
                color: '#FFFFFF'
            }).setOrigin(0.5).setDepth(9002);

            // Ad image (using an available asset)
            const adImage = this.add.image(width / 2, height / 2, 'match3')
                .setDisplaySize(250, 250)
                .setDepth(9002);

            // Close button
            const closeBtn = this.add.graphics()
                .fillStyle(0xCC0000, 1)
                .fillRoundedRect(width / 2 - 75, height / 2 + 140, 150, 40, 8)
                .setDepth(9002)
                .setInteractive(new Phaser.Geom.Rectangle(width / 2 - 75, height / 2 + 140, 150, 40), Phaser.Geom.Rectangle.Contains);

            const closeText = this.add.text(width / 2, height / 2 + 160, 'CLOSE AD', {
                fontSize: '18px',
                fontFamily: '"Exo 2", sans-serif',
                color: '#FFFFFF'
            }).setOrigin(0.5).setDepth(9003);

            // Bundle all elements
            const adElements = [overlay, adBox, adTitle, adImage, closeBtn, closeText];

            // Close button logic
            closeBtn.on('pointerdown', () => {
                // Remove all ad elements
                adElements.forEach(element => element.destroy());
                this.showingAd = false;
            });

            // Auto-close ad after 5 seconds
            this.adTimer = this.time.delayedCall(5000, () => {
                if (this.showingAd) {
                    adElements.forEach(element => element.destroy());
                    this.showingAd = false;
                }
            });
        }
    }
}
const container = document.getElementById('renderDiv');
const config = {
    type: Phaser.WEBGL,
    parent: 'renderDiv',
    pixelArt: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 375,
        height: 667,
        zoom: 1 / (window.devicePixelRatio || 1) // Adjust zoom based on device pixel ratio
    },
    scene: BlockBlaster,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    roundPixels: false,
    powerPreference: 'high-performance',
    backgroundColor: '#001F3F',
    render: {
        clearBeforeRender: true,
        desynchronized: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true
    }
};

window.phaserGame = new Phaser.Game(config);