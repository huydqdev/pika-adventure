import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    path: Phaser.Curves.Path;
    hubButtons: Phaser.GameObjects.Rectangle[] = [];
    popup: Phaser.GameObjects.Container;
    pathSquares: Phaser.GameObjects.Rectangle[] = []; // Array to store the squares
    playerCircle: Phaser.GameObjects.Arc; // Red circle representing player position
    collectedItems: {color: number, index: number}[] = []; // Array to store collected items

    constructor ()
    {
        super('Game');
    }

    create ()
    {
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

        // Create button colors
        const buttonColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44];
        const buttonTypes = ['settings', 'help', 'inventory', 'collections'];
        
        // Top-right: 2 buttons
        for (let i = 0; i < 2; i++) {
            const button = this.add.rectangle(
                gameWidth - padding - (buttonSize + padding) * (i + 0.5),
                padding + buttonSize/2,
                buttonSize,
                buttonSize,
                buttonColors[i]
            );
            button.setData('buttonType', buttonTypes[i]);
            this.setupButton(button);
            this.hubButtons.push(button);
        }
        
        // Top-left: 1 button
        const topLeftButton = this.add.rectangle(
            padding + buttonSize/2,
            padding + buttonSize/2,
            buttonSize,
            buttonSize,
            buttonColors[2]
        );
        topLeftButton.setData('buttonType', buttonTypes[2]);
        this.setupButton(topLeftButton);
        this.hubButtons.push(topLeftButton);
        
        // Bottom-left: 1 button
        const bottomLeftButton = this.add.rectangle(
            padding + buttonSize/2,
            gameHeight - padding - buttonSize/2,
            buttonSize,
            buttonSize,
            buttonColors[3]
        );
        bottomLeftButton.setData('buttonType', buttonTypes[3]);
        this.setupButton(bottomLeftButton);
        this.hubButtons.push(bottomLeftButton);
    }

    setupButton(button: Phaser.GameObjects.Rectangle) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerover', () => {
            this.tweens.add({
                targets: button,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100
            });
        });
        button.on('pointerout', () => {
            this.tweens.add({
                targets: button,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });
        button.on('pointerdown', () => {
            const buttonType = button.getData('buttonType');
            console.log(`Button clicked: ${buttonType}`);
            
            // Handle different button types
            if (buttonType === 'help') {
                this.showIntroPopup();
            } else if (buttonType === 'collections') {
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
        background.on('pointerdown', () => this.hidePopup());
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
            this.tweens.add({
                targets: this.popup,
                scale: 0.8,
                alpha: 0,
                duration: 200,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.popup.destroy();
                    this.popup = null;
                }
            });
        }
    }

    showSquarePopup(square: Phaser.GameObjects.Rectangle, color: number) {
        // Remove existing popup if there is one
        if (this.popup) {
            this.popup.destroy();
        }

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
        background.on('pointerdown', () => this.hidePopup());
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
            pointer.event.stopPropagation();
        });
        this.popup.add(popupBg);
        
        // Add title text
        const titleText = this.add.text(
            0, -popupHeight * 0.4,
            'Square Item',
            { fontSize: '32px', color: '#000000', fontStyle: 'bold' }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add sprite in the middle (using a rectangle with the same color as the square for now)
        const sprite = this.add.rectangle(0, -popupHeight * 0.1, 100, 100, color);
        sprite.setName('itemSprite'); // Give it a name to reference later
        this.popup.add(sprite);
        
        // Add button at the bottom
        const buttonWidth = popupWidth * 0.4;
        const buttonHeight = 60;
        const actionButton = this.add.rectangle(
            0, popupHeight * 0.3,
            buttonWidth, buttonHeight,
            0x4444ff
        );
        actionButton.setStrokeStyle(2, 0x000088);
        actionButton.setInteractive({ useHandCursor: true });
        
        // Add text to the button
        const buttonText = this.add.text(
            0, popupHeight * 0.3,
            'Collect Item',
            { fontSize: '24px', color: '#ffffff' }
        );
        buttonText.setOrigin(0.5);
        
        // Add button and text to popup
        this.popup.add(actionButton);
        this.popup.add(buttonText);
        
        // Button hover effects
        actionButton.on('pointerover', () => {
            actionButton.fillColor = 0x6666ff;
        });
        actionButton.on('pointerout', () => {
            actionButton.fillColor = 0x4444ff;
        });
        
        // Button click - fly the sprite to collections button
        actionButton.on('pointerdown', () => {
            this.collectItemAnimation(sprite, square);
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
    
    collectItemAnimation(sprite: Phaser.GameObjects.Rectangle, originalSquare: Phaser.GameObjects.Rectangle) {
        // Find the collections button (bottom-left button)
        const collectionsButton = this.hubButtons.find(button => 
            button.getData('buttonType') === 'collections'
        );
        
        if (!collectionsButton) return;
        
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
        
        // Hide the popup
        this.hidePopup();
        
        // Set the current square to UNLOCK state
        originalSquare.setData('state', 'UNLOCK');
        originalSquare.setVisible(true); // Show it again
        originalSquare.setAlpha(0.7); // Slightly dimmed to indicate completed
        
        // Get the index of the current square
        const currentIndex = originalSquare.getData('index');
        
        // Add to collected items
        this.collectedItems.push({
            color: originalSquare.fillColor,
            index: currentIndex
        });
        
        // If there's a next square, set it to AVAILABLE
        if (currentIndex < this.pathSquares.length - 1) {
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
                        
                        // After collection is complete, move the player circle to the next square
                        this.movePlayerToNextSquare(currentIndex);
                    }
                });
            }
        });
    }
    
    movePlayerToNextSquare(currentIndex: number) {
        // If there's a next square, move the player circle to it
        if (currentIndex < this.pathSquares.length - 1) {
            const nextSquare = this.pathSquares[currentIndex + 1];
            
            // Calculate points along the path for smooth movement
            const startPoint = this.pathSquares[currentIndex].getCenter();
            const endPoint = nextSquare.getCenter();
            
            // Get the normalized path position of the next square
            const nextT = (currentIndex + 1) / 6;
            
            // Create a small path segment for this movement
            const points = [];
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
        background.on('pointerdown', () => this.hidePopup());
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
            pointer.event.stopPropagation();
        });
        this.popup.add(popupBg);
        
        // Add title text
        const titleText = this.add.text(
            0, -popupHeight * 0.4,
            'Collections',
            { fontSize: '32px', color: '#000000', fontStyle: 'bold' }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add message if no items collected
        if (this.collectedItems.length === 0) {
            const noItemsText = this.add.text(
                0, 0,
                'No items collected yet.\nExplore the path to collect items!',
                { fontSize: '20px', color: '#000000', align: 'center' }
            );
            noItemsText.setOrigin(0.5);
            this.popup.add(noItemsText);
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
                this.popup.add(itemBg);
                
                // Add the item sprite (using rectangle for now)
                const itemSprite = this.add.rectangle(x, y, itemSize * 0.7, itemSize * 0.7, item.color);
                this.popup.add(itemSprite);
                
                // Add item name/number
                const itemText = this.add.text(
                    x, y + itemSize * 0.5,
                    `Item ${item.index + 1}`,
                    { fontSize: '16px', color: '#000000' }
                );
                itemText.setOrigin(0.5, 0);
                this.popup.add(itemText);
            });
        }
        
        // Add close button
        const closeButton = this.add.rectangle(
            popupWidth * 0.4, -popupHeight * 0.4,
            40, 40,
            0xff4444
        );
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.hidePopup());
        
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
}
