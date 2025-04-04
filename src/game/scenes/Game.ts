import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

// Define SpeechRecognition types for TypeScript
interface SpeechRecognitionEvent extends Event {
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
                confidence: number;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    path: Phaser.Curves.Path;
    hubButtons: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[] = [];
    popup: Phaser.GameObjects.Container | undefined;
    pathSquares: Phaser.GameObjects.Rectangle[] = []; // Array to store the squares
    playerCircle: Phaser.GameObjects.Arc; // Red circle representing player position
    collectedItems: {color: number, index: number, word: string}[] = []; // Array to store collected items
    continueButton: Phaser.GameObjects.Rectangle; // Button to continue after completion
    
    // Sound effects
    clickSound: Phaser.Sound.BaseSound;
    wordSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
    
    // Vocabulary list for the squares on the curve
    vocabularyWords: { word: string, description: string, audio: string, image: string }[] = [
        { word: "Amp", description: "A unit used to measure electric current", audio: 'amp-word-audio', image: 'amp.png' },
        { word: "Nut", description: "A small piece of metal with a threaded hole", audio: 'nut-word-audio', image: 'nut.png' },
        { word: "Plug", description: "To draw or drag something towards oneself", audio: 'plug-word-audio', image: 'plug.png' },
        { word: "Spark", description: "A small fiery particle thrown off from a fire", audio: 'spark-word-audio', image: 'spark.png' },
        { word: "Nut", description: "A small piece of metal with a threaded hole", audio: 'nut-word-audio', image: 'nut.png' },
        { word: "Plug", description: "To draw or drag something towards oneself", audio: 'plug-word-audio', image: 'plug.png' },
        { word: "Spark", description: "A small fiery particle thrown off from a fire", audio: 'spark-word-audio', image: 'spark.png' },
    ];
    
    // Speech recognition support
    speechRecognition: SpeechRecognition | null = null;
    isSpeechListening: boolean = false;
    feedbackText: Phaser.GameObjects.Text | null = null;
    currentWord: string = '';
    attemptsCount: number = 0; // Track pronunciation attempts

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        // Initialize sounds
        this.clickSound = this.sound.add('click');
        
        // Add word sounds to map for easy access
        this.vocabularyWords.forEach(word => {
            const soundKey = word.audio;
            this.wordSounds.set(word.word.toLowerCase(), this.sound.add(soundKey));
        });
        
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#ffffff');

        // Get the actual game width and height to make the curve responsive
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;

        // Define start (top-left) and end (bottom-right) using relative positioning
        const startX = gameWidth * 0.1;  // 10% from left edge
        const startY = gameHeight * 0.1; // 10% from top edge
        const endX = gameWidth * 0.9;    // 90% from left (10% from right edge)
        const endY = gameHeight * 0.9;   // 90% from top (10% from bottom edge)
        
        // Create the path starting from top-left
        this.path = new Phaser.Curves.Path(startX, startY);
        
        // First curve (inverted C) - horizontal then down and left
        // Using relative positioning for all control points
        this.path.cubicBezierTo(
            gameWidth * 0.7, gameHeight * 0.3,    // Target point - middle right area
            gameWidth * 0.5, startY,              // Control point 1 - pulls it right
            gameWidth * 0.8, gameHeight * 0.15    // Control point 2 - helps curve down
        );
        
        // Second curve (regular C) - down and then right
        this.path.cubicBezierTo(
            endX, endY,                       // Target point - bottom right
            gameWidth * 0.3, gameHeight * 0.6, // Control point 1 - pulls it down and left
            gameWidth * 0.01, endY             // Control point 2 - helps curve right
        );
        
        // Draw the curve
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x0088ff);
        this.path.draw(graphics);
        
        // Add a red circle at the start of the curve as player position indicator
        this.playerCircle = this.add.circle(startX, startY, 10, 0xff0000);
        this.playerCircle.setDepth(100); // Make sure it's above the squares
        
        // Add 7 squares evenly distributed along the path
        const colors = [0xff4800, 0xffff00, 0x00ff00, 0x00ffff, 0x0088ff, 0x8800ff, 0xff00ff];
        const squareSize = Math.min(gameWidth, gameHeight) * 0.02; // Responsive square size
        
        for (let i = 0; i < 7; i++) {
            // Calculate position (0 to 1) along the path
            const t = i / 6; // 0, 1/6, 2/6, ..., 6/6 (or 1)
            
            // Get point at this position
            const point = this.path.getPoint(t);
            
            // Create interactive square at this point
            const square = this.add.rectangle(
                point.x, 
                point.y,
                squareSize, 
                squareSize,
                colors[i]
            );
            
            // Initially, only the first square is available, others are locked
            if (i === 0) {
                square.setData('state', 'AVAILABLE');
                square.setAlpha(1);
                // Make it interactive
                square.setInteractive({ useHandCursor: true });
                square.on('pointerdown', () => {
                    this.clickSound.play(); // Play click sound
                    this.showSquarePopup(square, colors[i]);
                });
            } else {
                square.setData('state', 'LOCK');
                square.setAlpha(0.5); // Dimmed to indicate locked
            }
            
            // Store the square's index for easy reference
            square.setData('index', i);
            
            // Store the square in our array
            this.pathSquares.push(square);
        }

        // Create HUB buttons
        this.createHubButtons();

        // When window size changes, redraw the curve
        this.scale.on('resize', this.handleResize, this);

        // Show intro popup
        this.showIntroPopup();

        // Initialize speech recognition if available
        this.initSpeechRecognition();

        EventBus.emit('current-scene-ready', this);
    }

    createHubButtons() {
        // Clear any existing buttons
        this.hubButtons.forEach(button => button.destroy());
        this.hubButtons = [];

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const buttonSize = Math.min(gameWidth, gameHeight) * 0.06;
        const padding = buttonSize * 0.3;

        // Use sprite-based buttons instead of colored rectangles
        const buttonTypes = ['volume', 'guide', 'back', 'balo'];
        const buttonImages = ['volume-ic', 'guide-ic', 'back-ic', 'balo-ic'];
        
        // Top-right: 2 buttons
        for (let i = 0; i < 2; i++) {
            const button = this.add.image(
                gameWidth - padding - (buttonSize + padding) * (i + 0.5),
                padding + buttonSize/2,
                buttonImages[i]
            ).setDisplaySize(buttonSize, buttonSize);
            
            button.setData('buttonType', buttonTypes[i]);
            this.setupButton(button);
            this.hubButtons.push(button);
        }
        
        // Top-left: 1 button
        const topLeftButton = this.add.image(
            padding + buttonSize/2,
            padding + buttonSize/2,
            buttonImages[2]
        ).setDisplaySize(buttonSize, buttonSize);
        
        topLeftButton.setData('buttonType', buttonTypes[2]);
        this.setupButton(topLeftButton);
        this.hubButtons.push(topLeftButton);
        
        // Bottom-left: 1 button
        const bottomLeftButton = this.add.image(
            padding + buttonSize/2,
            gameHeight - padding - buttonSize/2,
            buttonImages[3]
        ).setDisplaySize(buttonSize, buttonSize);
        
        bottomLeftButton.setData('buttonType', buttonTypes[3]);
        this.setupButton(bottomLeftButton);
        this.hubButtons.push(bottomLeftButton);
    }

    setupButton(button: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle) {
        button.setInteractive({ useHandCursor: true });
        
        button.on('pointerover', () => {
            this.tweens.add({
                targets: button,
                scaleX: 0.3,
                scaleY: 0.3,
                duration: 100
            });
        });
        
        button.on('pointerout', () => {});
        
        button.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            
            // Add a small scale animation when clicked
            // this.tweens.add({});
            
            const buttonType = button.getData('buttonType');
            console.log(`Button clicked: ${buttonType}`);
            
            // Handle different button types
            if (buttonType === 'guide') {
                this.showIntroPopup();
            } else if (buttonType === 'balo') {
                this.showCollectionsPopup();
            }
            // Add other button type handlers here
        });
    }

    handleResize() {
        // Clear and redraw everything when the window is resized
        this.scene.restart();
    }

    changeScene() {
        this.scene.start('GameOver');
    }

    showIntroPopup() {
        // Remove existing popup if there is one
        if (this.popup) {
            this.popup.destroy();
        }

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const popupWidth = gameWidth * 0.7;
        const popupHeight = gameHeight * 0.5;
        
        // Create popup container
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background across the whole screen to catch clicks outside popup
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.5
        );
        background.setInteractive();
        background.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.hidePopup();
        });
        this.popup.add(background);
        
        // Add popup background
        const popupBg = this.add.rectangle(
            0, 0,
            popupWidth, popupHeight,
            0xffffff, 1
        );
        popupBg.setStrokeStyle(4, 0x000000);
        // Stop propagation for clicks on the popup itself
        popupBg.setInteractive();
        popupBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // this.clickSound.play(); // Play click sound
            pointer.event.stopPropagation();
        });
        this.popup.add(popupBg);
        
        // Add title text
        const titleText = this.add.text(
            0, -popupHeight * 0.35,
            'Welcome to the Game!',
            { fontSize: '32px', color: '#000000', fontStyle: 'bold' }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add content text
        const contentText = this.add.text(
            0, 0,
            'This is an introduction to the game.\nFollow the path and explore the hub buttons.\n\nClick outside this popup to close it.',
            { fontSize: '20px', color: '#000000', align: 'center' }
        );
        contentText.setOrigin(0.5);
        this.popup.add(contentText);
        
        // Animate popup appearance
        this.popup.setScale(0.8);
        this.tweens.add({
            targets: this.popup,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Bring popup to top
        this.popup.setDepth(1000);
    }
    
    hidePopup() {
        if (this.popup) {
            // Stop speech recognition if active
            this.stopSpeechRecognition();
            
            this.tweens.add({
                targets: this.popup,
                scale: 0.8,
                alpha: 0,
                duration: 200,
                ease: 'Back.easeIn',
                onComplete: () => {
                    if (this.popup) {
                        this.popup.destroy();
                        this.popup = undefined;
                    }
                }
            });
        }
    }

    showSquarePopup(square: Phaser.GameObjects.Rectangle, color: number) {
        // Remove existing popup if there is one
        if (this.popup) {
            this.popup.destroy();
        }

        // Reset attempts counter for new square
        this.attemptsCount = 0;

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const popupWidth = gameWidth * 0.7;
        const popupHeight = gameHeight * 0.6;
        
        // Create popup container
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.5
        );
        background.setInteractive();
        background.on('pointerdown', () => {
            // this.clickSound.play(); // Play click sound
            this.hidePopup();
        });
        this.popup.add(background);
        
        // Add popup background
        const popupBg = this.add.rectangle(
            0, 0,
            popupWidth, popupHeight,
            0xffffff, 1
        );
        popupBg.setStrokeStyle(4, 0x000000);
        // Stop propagation for clicks on the popup itself
        popupBg.setInteractive();
        popupBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // this.clickSound.play(); // Play click sound
            pointer.event.stopPropagation();
        });
        this.popup.add(popupBg);
        
        // Get the current word based on square index
        const squareIndex = square.getData('index');
        const vocabItem = this.vocabularyWords[squareIndex];
        this.currentWord = vocabItem.word;
        
        // Add title text with the word
        const titleText = this.add.text(
            0, -popupHeight * 0.4,
            vocabItem.word,
            { fontSize: '32px', color: '#000000', fontStyle: 'bold' }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Make title text interactive to play pronunciation
        titleText.setInteractive({ useHandCursor: true });
        titleText.on('pointerdown', () => {
            this.clickSound.play();
            this.playWordSound(vocabItem.word);
        });
        
        // Add sprite in the middle (using a rectangle with the same color as the square for now)
        const sprite = this.add.rectangle(0, -popupHeight * 0.15, 100, 100, color);
        sprite.setName('itemSprite'); // Give it a name to reference later
        this.popup.add(sprite);
        
        // Add word text below the sprite
        const wordText = this.add.text(
            0, -popupHeight * 0.15 + 70,
            vocabItem.word,
            { fontSize: '24px', color: '#000000', fontStyle: 'bold' }
        );
        wordText.setOrigin(0.5);
        this.popup.add(wordText);
        
        // Add description text
        const descText = this.add.text(
            0, -popupHeight * 0.15 + 100,
            vocabItem.description,
            { fontSize: '18px', color: '#333333', align: 'center', wordWrap: { width: popupWidth * 0.8 } }
        );
        descText.setOrigin(0.5);
        this.popup.add(descText);
        
        // Add feedback text area
        this.feedbackText = this.add.text(
            0, popupHeight * 0.15,
            "Press the Speech button and pronounce the word.",
            { fontSize: '18px', color: '#0066cc', align: 'center', wordWrap: { width: popupWidth * 0.8 } }
        );
        this.feedbackText.setOrigin(0.5);
        this.popup.add(this.feedbackText);
        
        // Add "Speech" button
        const buttonWidth = popupWidth * 0.4;
        const buttonHeight = 60;
        
        const speechButton = this.add.rectangle(
            0, popupHeight * 0.3,
            buttonWidth, buttonHeight,
            0x4488ff
        );
        speechButton.setStrokeStyle(2, 0x224488);
        speechButton.setInteractive({ useHandCursor: true });
        
        // Add text to the speech button
        const buttonText = this.add.text(
            0, popupHeight * 0.3,
            'Speech',
            { fontSize: '24px', color: '#ffffff' }
        );
        buttonText.setOrigin(0.5);
        
        // Add button and text to popup
        this.popup.add(speechButton);
        this.popup.add(buttonText);
        
        // Button hover effects
        speechButton.on('pointerover', () => {
            speechButton.fillColor = 0x55aaff;
        });
        speechButton.on('pointerout', () => {
            speechButton.fillColor = 0x4488ff;
        });
        
        // Speech button click - start speech recognition
        speechButton.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.startSpeechRecognition();
        });
        
        // Animate popup appearance
        this.popup.setScale(0.8);
        this.popup.setAlpha(0);
        this.tweens.add({
            targets: this.popup,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Bring popup to top
        this.popup.setDepth(1000);
        
        // Play the word sound when the popup appears
        this.time.delayedCall(300, () => {
            this.playWordSound(vocabItem.word);
        });
    }
    
    animateSprite(sprite: Phaser.GameObjects.Rectangle) {
        // Stop any existing animations on this sprite
        this.tweens.killTweensOf(sprite);
        
        // Create a sequence of animations
        
        // 1. Shake animation
        this.tweens.add({
            targets: sprite,
            x: { from: sprite.x - 5, to: sprite.x + 5 },
            duration: 50,
            yoyo: true,
            repeat: 7,
            onComplete: () => {
                // Reset position
                sprite.x = 0;
                
                // 2. Scale animation
                this.tweens.add({
                    targets: sprite,
                    scaleX: { from: 1, to: 1.3 },
                    scaleY: { from: 1, to: 1.3 },
                    duration: 200,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        // 3. Rotate animation
                        this.tweens.add({
                            targets: sprite,
                            angle: 360,
                            duration: 500,
                            ease: 'Cubic.easeInOut',
                            onComplete: () => {
                                // 4. Bounce animation
                                this.tweens.add({
                                    targets: sprite,
                                    y: { from: sprite.y, to: sprite.y - 30 },
                                    duration: 300,
                                    yoyo: true,
                                    ease: 'Bounce.easeOut',
                                    repeat: 1
                                });
                            }
                        });
                    }
                });
            }
        });
        
        // Add a particle effect
        const particles = this.add.particles(sprite.x, sprite.y, 'particle', {
            speed: 100,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 1,
            frequency: 50
        });
        
        // Add particles to the popup so they move with it
        if (this.popup) {
            this.popup.add(particles);
        }
        
        // Stop particles after 1 second
        this.time.delayedCall(1000, () => {
            particles.destroy();
        });
    }
    
    collectItemAnimation(sprite: Phaser.GameObjects.Rectangle, originalSquare: Phaser.GameObjects.Rectangle) {
        // Find the collections button (bottom-left button)
        const collectionsButton = this.hubButtons.find(button => 
            button.getData('buttonType') === 'balo'
        );
        
        if (!collectionsButton || !this.popup) return;
        
        // Create a copy of the sprite to animate outside the popup
        const spriteWorldPos = this.popup.getWorldTransformMatrix().transformPoint(sprite.x, sprite.y);
        const flyingSprite = this.add.rectangle(
            spriteWorldPos.x, 
            spriteWorldPos.y,
            sprite.width, 
            sprite.height,
            sprite.fillColor
        );
        flyingSprite.setDepth(2000);
        
        // Stop speech recognition
        this.stopSpeechRecognition();
        
        // Hide the popup
        this.hidePopup();
        
        // Set the current square to UNLOCK state
        originalSquare.setData('state', 'UNLOCK');
        originalSquare.setVisible(true); // Show it again
        originalSquare.setAlpha(0.7); // Slightly dimmed to indicate completed
        
        // Get the index of the current square
        const currentIndex = originalSquare.getData('index');
        
        // Add to collected items including the word
        this.collectedItems.push({
            color: originalSquare.fillColor,
            index: currentIndex,
            word: this.vocabularyWords[currentIndex].word
        });
        
        // Check if this is the last item
        const isLastItem = currentIndex === this.pathSquares.length - 1;
        
        // If there's a next square, set it to AVAILABLE
        if (!isLastItem) {
            const nextSquare = this.pathSquares[currentIndex + 1];
            nextSquare.setData('state', 'AVAILABLE');
            nextSquare.setAlpha(1); // Fully visible
            
            // Make the next square interactive
            nextSquare.setInteractive({ useHandCursor: true });
            nextSquare.on('pointerdown', () => {
                const nextColor = nextSquare.fillColor;
                this.showSquarePopup(nextSquare, nextColor);
            });
        }
        
        // Animate the sprite to fly to the collections button
        this.tweens.add({
            targets: flyingSprite,
            x: collectionsButton.x,
            y: collectionsButton.y,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 1000,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                // Flash the collections button
                this.tweens.add({
                    targets: collectionsButton,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        flyingSprite.destroy();
                        
                        if (isLastItem) {
                            // If this was the last item, show success popup
                            this.time.delayedCall(500, () => {
                                this.showSuccessPopup();
                            });
                        } else {
                            // Otherwise move the player to the next square
                            this.movePlayerToNextSquare(currentIndex);
                        }
                    }
                });
            }
        });
    }
    
    movePlayerToNextSquare(currentIndex: number) {
        // If there's a next square, move the player circle to it
        if (currentIndex < this.pathSquares.length - 1) {
            const nextSquare = this.pathSquares[currentIndex + 1];
            
            // Get the normalized path position of the next square
            const nextT = (currentIndex + 1) / 6;
            
            // Create a small path segment for this movement
            const points: Phaser.Math.Vector2[] = [];
            const steps = 20; // Number of points to sample for smooth movement
            
            // Calculate the current position in the overall path
            const currentT = currentIndex / 6;
            
            // Sample points between current and next position
            for (let i = 0; i <= steps; i++) {
                const t = currentT + (nextT - currentT) * (i / steps);
                points.push(this.path.getPoint(t));
            }
            
            // Animate the player along these points
            let pointIndex = 0;
            
            // Create a timer to move through the points
            const timer = this.time.addEvent({
                delay: 1000 / steps, // Total animation time: 1 second
                callback: () => {
                    if (pointIndex < points.length) {
                        this.playerCircle.setPosition(points[pointIndex].x, points[pointIndex].y);
                        pointIndex++;
                    } else {
                        timer.destroy();
                        
                        // After the player arrives at the next square, show its popup
                        this.time.delayedCall(300, () => {
                            this.showSquarePopup(nextSquare, nextSquare.fillColor);
                        });
                    }
                },
                repeat: steps
            });
        }
    }

    showCollectionsPopup() {
        // Remove existing popup if there is one
        if (this.popup) {
            this.popup.destroy();
        }

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const popupWidth = gameWidth * 0.8;
        const popupHeight = gameHeight * 0.7;
        
        // Create popup container
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.5
        );
        background.setInteractive();
        background.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.hidePopup();
        });
        this.popup.add(background);
        
        // Add popup background
        const popupBg = this.add.rectangle(
            0, 0,
            popupWidth, popupHeight,
            0xffffff, 1
        );
        popupBg.setStrokeStyle(4, 0x000000);
        // Stop propagation for clicks on the popup itself
        popupBg.setInteractive();
        popupBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.clickSound.play(); // Play click sound
            pointer.event.stopPropagation();
        });
        this.popup.add(popupBg);
        
        // Add title text
        const titleText = this.add.text(
            0, -popupHeight * 0.4,
            'Vocabulary Collections',
            { fontSize: '32px', color: '#000000', fontStyle: 'bold' }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add message if no items collected
        if (this.collectedItems.length === 0) {
            const noItemsText = this.add.text(
                0, 0,
                'No vocabulary words collected yet.\nExplore the path to collect words!',
                { fontSize: '20px', color: '#000000', align: 'center' }
            );
            noItemsText.setOrigin(0.5);
            if (this.popup) {
                this.popup.add(noItemsText);
            }
        } else {
            // Display collected items in a grid
            const itemSize = 80;
            const padding = 20;
            const itemsPerRow = 3;
            const startX = -((itemsPerRow - 1) * (itemSize + padding)) / 2;
            const startY = -popupHeight * 0.2;
            
            // Sort items by index to display them in collection order
            const sortedItems = [...this.collectedItems].sort((a, b) => a.index - b.index);
            
            sortedItems.forEach((item, i) => {
                const row = Math.floor(i / itemsPerRow);
                const col = i % itemsPerRow;
                
                const x = startX + col * (itemSize + padding);
                const y = startY + row * (itemSize + padding);
                
                // Create item display
                const itemBg = this.add.rectangle(x, y, itemSize, itemSize, 0xeeeeee);
                itemBg.setStrokeStyle(2, 0x999999);
                if (this.popup) {
                    this.popup.add(itemBg);
                }
                
                // Add the item sprite (using rectangle for now)
                const itemSprite = this.add.rectangle(x, y, itemSize * 0.7, itemSize * 0.7, item.color);
                if (this.popup) {
                    this.popup.add(itemSprite);
                }
                
                // Add item word
                const itemText = this.add.text(
                    x, y + itemSize * 0.5,
                    item.word,
                    { fontSize: '16px', color: '#000000' }
                );
                itemText.setOrigin(0.5, 0);
                if (this.popup) {
                    this.popup.add(itemText);
                }
            });
        }
        
        // Add close button
        const closeButton = this.add.rectangle(
            popupWidth * 0.4, -popupHeight * 0.4,
            40, 40,
            0xff4444
        );
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.hidePopup();
        });
        
        // Add X to close button
        const closeX = this.add.text(
            popupWidth * 0.4, -popupHeight * 0.4,
            'X',
            { fontSize: '24px', color: '#ffffff' }
        );
        closeX.setOrigin(0.5);
        
        this.popup.add(closeButton);
        this.popup.add(closeX);
        
        // Animate popup appearance
        this.popup.setScale(0.8);
        this.popup.setAlpha(0);
        this.tweens.add({
            targets: this.popup,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Bring popup to top
        this.popup.setDepth(1000);
    }

    showSuccessPopup() {
        // Remove existing popup if there is one
        if (this.popup) {
            this.popup.destroy();
        }

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const popupWidth = gameWidth * 0.7;
        const popupHeight = gameHeight * 0.5;
        
        // Create popup container
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.5
        );
        background.setInteractive();
        background.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.hidePopup();
            this.showContinueButton();
        });
        this.popup.add(background);
        
        // Add popup background
        const popupBg = this.add.rectangle(
            0, 0,
            popupWidth, popupHeight,
            0xffffff, 1
        );
        popupBg.setStrokeStyle(4, 0x000000);
        // Stop propagation for clicks on the popup itself
        popupBg.setInteractive();
        popupBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.clickSound.play(); // Play click sound
            pointer.event.stopPropagation();
        });
        this.popup.add(popupBg);
        
        // Add title text
        const titleText = this.add.text(
            0, -popupHeight * 0.3,
            'Congratulations!',
            { fontSize: '32px', color: '#000000', fontStyle: 'bold' }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add content text
        const contentText = this.add.text(
            0, -popupHeight * 0.05,
            'You have collected all vocabulary words along the path!\nThank you for playing the game.',
            { fontSize: '20px', color: '#000000', align: 'center' }
        );
        contentText.setOrigin(0.5);
        this.popup.add(contentText);
        
        // Add continue button
        const buttonWidth = popupWidth * 0.4;
        const buttonHeight = 60;
        const continueBtn = this.add.rectangle(
            0, popupHeight * 0.25,
            buttonWidth, buttonHeight,
            0x44aa44
        );
        continueBtn.setStrokeStyle(2, 0x226622);
        continueBtn.setInteractive({ useHandCursor: true });
        
        // Add text to the button
        const buttonText = this.add.text(
            0, popupHeight * 0.25,
            'Continue',
            { fontSize: '24px', color: '#ffffff' }
        );
        buttonText.setOrigin(0.5);
        
        // Add button and text to popup
        this.popup.add(continueBtn);
        this.popup.add(buttonText);
        
        // Button hover effects
        continueBtn.on('pointerover', () => {
            continueBtn.fillColor = 0x55cc55;
        });
        continueBtn.on('pointerout', () => {
            continueBtn.fillColor = 0x44aa44;
        });
        
        // Button click - navigate to MainMenu
        continueBtn.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.goToMainMenu();
        });
        
        // Animate popup appearance
        this.popup.setScale(0.8);
        this.popup.setAlpha(0);
        this.tweens.add({
            targets: this.popup,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Bring popup to top
        this.popup.setDepth(1000);
    }
    
    showContinueButton() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create a pulsing button on the right side of the screen
        this.continueButton = this.add.rectangle(
            gameWidth - 40,
            gameHeight / 2,
            60,
            60,
            0xff8800
        );
        this.continueButton.setStrokeStyle(3, 0xffffff);
        this.continueButton.setInteractive({ useHandCursor: true });
        this.continueButton.setDepth(500);
        
        // Add an arrow icon
        const arrowText = this.add.text(
            gameWidth - 40,
            gameHeight / 2,
            '→',
            { fontSize: '32px', color: '#ffffff' }
        );
        arrowText.setOrigin(0.5);
        arrowText.setDepth(501);
        
        // Create pulsing animation
        this.tweens.add({
            targets: [this.continueButton, arrowText],
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add glow effect
        this.tweens.add({
            targets: this.continueButton,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Button click - navigate to MainMenu
        this.continueButton.on('pointerdown', () => {
            this.clickSound.play(); // Play click sound
            this.goToMainMenu();
        });
    }
    
    goToMainMenu() {
        // Fade out
        this.cameras.main.fadeOut(500);
        
        this.time.delayedCall(500, () => {
            // Navigate to MainMenu scene
            this.scene.start('MainMenu');
        });
    }

    // Initialize speech recognition
    initSpeechRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            // TypeScript should now recognize these types with our declarations above
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.speechRecognition = new SpeechRecognitionAPI();
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = false;
            this.speechRecognition.lang = 'en-US';
            
            this.speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
                const result = event.results[0][0].transcript.trim().toLowerCase();
                console.log(`Speech recognized: "${result}"`);
                
                this.checkPronunciation(result);
            };
            
            this.speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                this.updateFeedback('I couldn\'t hear you. Please try again.');
            };
            
            this.speechRecognition.onend = () => {
                this.isSpeechListening = false;
                console.log('Speech recognition ended');
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
        }
    }
    
    // Start listening for speech
    startSpeechRecognition() {
        if (this.speechRecognition && !this.isSpeechListening) {
            this.speechRecognition.start();
            this.isSpeechListening = true;
            this.updateFeedback('Listening... Say the word.');
        } else {
            this.updateFeedback('Speech recognition not available. Try another browser.');
        }
    }
    
    // Stop listening for speech
    stopSpeechRecognition() {
        if (this.speechRecognition && this.isSpeechListening) {
            this.speechRecognition.stop();
            this.isSpeechListening = false;
        }
    }
    
    // Check if pronunciation is correct
    checkPronunciation(spokenText: string) {
        const spokenLower = spokenText.toLowerCase();
        const wordLower = this.currentWord.toLowerCase();
        
        // Simple string comparison - could be improved with fuzzy matching
        const isCorrect = spokenLower.includes(wordLower) || wordLower.includes(spokenLower);
        
        // Increment attempts counter
        this.attemptsCount++;
        
        if (isCorrect) {
            // Pronunciation is correct, collect item
            this.updateFeedback('Excellent pronunciation! Collecting item...');
            
            if (!this.popup) return;
            
            const sprite = this.popup.getByName('itemSprite') as Phaser.GameObjects.Rectangle;
            if (!sprite) return;
            
            const index = this.getCurrentWordIndex();
            const square = this.pathSquares[index];
            
            // Delay collecting to let user see the success message
            this.time.delayedCall(1000, () => {
                this.collectItemAnimation(sprite, square);
            });
        } else {
            // Incorrect pronunciation
            if (this.attemptsCount >= 3) {
                // After 3 attempts, automatically collect the item
                this.updateFeedback("Let's move on. Collecting item anyway...");
                
                if (!this.popup) return;
                
                const sprite = this.popup.getByName('itemSprite') as Phaser.GameObjects.Rectangle;
                if (!sprite) return;
                
                const index = this.getCurrentWordIndex();
                const square = this.pathSquares[index];
                
                // Delay collecting
                this.time.delayedCall(1500, () => {
                    this.collectItemAnimation(sprite, square);
                });
            } else {
                // Still have attempts left
                const attemptsLeft = 3 - this.attemptsCount;
                this.updateFeedback(`Not quite right. Try again! (${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left)`);
                
                if (this.popup) {
                    const sprite = this.popup.getByName('itemSprite') as Phaser.GameObjects.Rectangle;
                    if (sprite) {
                        this.animateSprite(sprite);
                    }
                }
            }
        }
    }
    
    // Update feedback text
    updateFeedback(message: string) {
        if (this.feedbackText) {
            this.feedbackText.setText(message);
            
            // Flash the text to draw attention
            this.tweens.add({
                targets: this.feedbackText,
                alpha: 0.6,
                duration: 100,
                yoyo: true,
                repeat: 1
            });
        }
    }
    
    // Get the current word's index
    getCurrentWordIndex(): number {
        for (let i = 0; i < this.vocabularyWords.length; i++) {
            if (this.vocabularyWords[i].word === this.currentWord) {
                return i;
            }
        }
        return 0;
    }

    // Play word pronunciation sound
    playWordSound(word: string) {
        const wordLower = word.toLowerCase();
        const sound = this.wordSounds.get(wordLower);
        
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound for word "${word}" not found`);
        }
    }
}
