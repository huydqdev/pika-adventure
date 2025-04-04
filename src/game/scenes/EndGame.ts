import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class EndGame extends Scene
{
    // Background
    background: Phaser.GameObjects.Image;
    
    // UI elements
    congratsText: Phaser.GameObjects.Text;
    homeButton: Phaser.GameObjects.Container;
    
    // Sound
    clickSound: Phaser.Sound.BaseSound;
    congratsSound: Phaser.Sound.BaseSound;

    constructor ()
    {
        super('EndGame');
    }

    create ()
    {
        // Get screen dimensions
        const width = this.scale.width;
        const height = this.scale.height;
        
        // Add background image
        this.background = this.add.image(width / 2, height / 2, 'end-game')
            .setOrigin(0.5)
            .setDisplaySize(width, height);
            
        // Add congratulatory text
        this.congratsText = this.add.text(width / 2, height * 0.3, 'Chúc mừng bạn đã vượt qua chặng 1!', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        
        // Add home button
        this.createHomeButton(width / 2, height * 0.8);
        
        // Initialize sounds
        this.clickSound = this.sound.add('click', { volume: 0.7 });
        
        // Try to add congrats sound if it exists
        if (this.cache.audio.exists('congrats')) {
            this.congratsSound = this.sound.add('congrats', { volume: 0.7 });
            this.congratsSound.play();
        }
        
        // Add animation to the text
        this.tweens.add({
            targets: this.congratsText,
            scale: { from: 0.8, to: 1.1 },
            duration: 1000,
            ease: 'Bounce.easeOut'
        });
        
        // Add a pulsing effect to the text
        this.tweens.add({
            targets: this.congratsText,
            scale: 1,
            duration: 800,
            delay: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Notify that the scene is ready
        EventBus.emit('current-scene-ready', this);
    }
    
    createHomeButton(x: number, y: number) {
        // Create a container for the button
        this.homeButton = this.add.container(x, y);
        
        // Create button background
        const buttonBg = this.add.rectangle(0, 0, 200, 60, 0x4488ff)
            .setStrokeStyle(4, 0xffffff);
        
        // Create button text
        const buttonText = this.add.text(0, 0, 'Tiếp tục', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Add elements to container
        this.homeButton.add([buttonBg, buttonText]);
        
        // Make button interactive
        buttonBg.setInteractive({ useHandCursor: true });
        
        // Add hover effects
        buttonBg.on('pointerover', () => {
            buttonBg.fillColor = 0x66aaff;
            this.tweens.add({
                targets: this.homeButton,
                scale: 1.05,
                duration: 100
            });
        });
        
        buttonBg.on('pointerout', () => {
            buttonBg.fillColor = 0x4488ff;
            this.tweens.add({
                targets: this.homeButton,
                scale: 1,
                duration: 100
            });
        });
        
        // Add click handler
        buttonBg.on('pointerdown', () => {
            // Play click sound
            this.clickSound.play();
            
            // Add click animation
            this.tweens.add({
                targets: this.homeButton,
                scale: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    // Navigate to main menu
                    this.goToMainMenu();
                }
            });
        });
    }
    
    goToMainMenu() {
        // Fade out
        this.cameras.main.fadeOut(500);
        
        this.time.delayedCall(500, () => {
            // Stop any sounds
            if (this.congratsSound && this.congratsSound.isPlaying) {
                this.congratsSound.stop();
            }
            
            // Navigate to MainMenu scene
            this.scene.start('MainMenu');
        });
    }
}
