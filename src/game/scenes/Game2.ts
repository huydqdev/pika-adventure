import Phaser from 'phaser';

export class Game2 extends Phaser.Scene {
    private grid: Phaser.GameObjects.Container;
    private gridItems: Phaser.GameObjects.Rectangle[] = [];
    private popup: Phaser.GameObjects.Container;
    private square: Phaser.GameObjects.Rectangle;
    private lastClickedItemIndex: number = -1;

    constructor() {
        super('Game2');
    }

    create() {
        // Calculate the center of the screen
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Create a background
        this.add.rectangle(
            centerX, 
            centerY, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x222222
        ).setDepth(-1);

        // Create a 3x3 grid container
        this.grid = this.add.container(centerX, centerY);
        
        // Grid properties
        const gridSize = 3;
        const itemSize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.2; // 20% of the smaller dimension
        const spacing = itemSize * 0.2; // 20% of item size as spacing
        const totalGridWidth = (itemSize * gridSize) + (spacing * (gridSize - 1));
        const startX = -(totalGridWidth / 2) + (itemSize / 2);
        const startY = startX;

        // Create the grid items
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const x = startX + (col * (itemSize + spacing));
                const y = startY + (row * (itemSize + spacing));
                
                // Create a rectangle for each grid item
                const item = this.add.rectangle(x, y, itemSize, itemSize, 0x3498db)
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this.showPopup(row * gridSize + col));
                
                // Add a text label to identify the item (optional)
                this.add.text(x, y, `${row * gridSize + col + 1}`, { 
                    fontSize: '32px',
                    color: '#ffffff'
                }).setOrigin(0.5).setDepth(1);
                
                this.grid.add(item);
                this.gridItems.push(item);
            }
        }
        
        // Create the popup (initially not visible)
        this.createPopup();
    }
    
    private createPopup() {
        // Create popup container (initially hidden)
        this.popup = this.add.container(0, 0).setVisible(false);
        
        // Add semi-transparent background to intercept clicks outside the popup
        const modalBg = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setInteractive();
        
        // Add popup panel
        const popupWidth = this.cameras.main.width * 0.6;
        const popupHeight = this.cameras.main.height * 0.6;
        const panel = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            popupWidth,
            popupHeight,
            0xffffff
        );
        
        // Add the square sprite (which will be animated)
        const squareSize = Math.min(popupWidth, popupHeight) * 0.3;
        this.square = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - popupHeight * 0.15,
            squareSize,
            squareSize,
            0xff0000
        );
        
        // Create "correct" button
        const correctButton = this.createButton(
            this.cameras.main.width / 2 - popupWidth * 0.2,
            this.cameras.main.height / 2 + popupHeight * 0.25,
            'Correct',
            0x2ecc71,
            () => this.handleCorrectButton()
        );
        
        // Create "wrong" button
        const wrongButton = this.createButton(
            this.cameras.main.width / 2 + popupWidth * 0.2,
            this.cameras.main.height / 2 + popupHeight * 0.25,
            'Wrong',
            0xe74c3c,
            () => this.handleWrongButton()
        );
        
        // Add everything to the popup container
        this.popup.add([modalBg, panel, this.square, correctButton, wrongButton]);
    }
    
    private createButton(x: number, y: number, label: string, color: number, callback: () => void) {
        const buttonWidth = 150;
        const buttonHeight = 50;
        const buttonContainer = this.add.container(x, y);
        
        // Button background
        const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, color)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);
        
        // Button text
        const text = this.add.text(0, 0, label, { 
            fontSize: '24px', 
            color: '#ffffff' 
        }).setOrigin(0.5);
        
        buttonContainer.add([bg, text]);
        return buttonContainer;
    }
    
    private showPopup(itemIndex: number) {
        // Store the index of the clicked item for later reference
        this.lastClickedItemIndex = itemIndex;
        
        // Show the popup
        this.popup.setVisible(true);
    }
    
    private handleCorrectButton() {
        if (this.lastClickedItemIndex === -1) return;
        
        // Hide the popup
        this.popup.setVisible(false);
        
        // Get the target grid item
        const targetItem = this.gridItems[this.lastClickedItemIndex];
        
        // Get world position of the target grid item
        const targetWorldPos = this.grid.getWorldTransformMatrix()
            .transformPoint(targetItem.x, targetItem.y);
        
        // Create a temporary square for the animation
        const tempSquare = this.add.rectangle(
            this.square.x,
            this.square.y,
            this.square.width,
            this.square.height,
            0xff0000
        );
        
        // Animate the square to the target position
        this.tweens.add({
            targets: tempSquare,
            x: targetWorldPos.x,
            y: targetWorldPos.y,
            scaleX: 0.6,
            scaleY: 0.6,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Change the color of the grid item to indicate completion
                targetItem.setFillStyle(0xff0000);
                // Remove the temporary square
                tempSquare.destroy();
            }
        });
    }
    
    private handleWrongButton() {
        // Shake animation
        this.tweens.add({
            targets: this.square,
            x: this.square.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 5
        });
        
        // Scale animation
        this.tweens.add({
            targets: this.square,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            yoyo: true
        });
    }
}
