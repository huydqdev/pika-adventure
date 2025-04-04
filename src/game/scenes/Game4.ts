import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

// Add type definitions for SpeechRecognition API
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

// SpeechRecognition type definitions
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

export class Game4 extends Scene
{
    // Camera and environment
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    
    // Player character and spaceship
    pika: Phaser.GameObjects.Sprite;
    spaceship: Phaser.GameObjects.Image;
    
    // Game elements
    energyBar: Phaser.GameObjects.Graphics;
    currentEnergy: number = 0;
    maxEnergy: number = 100;
    energyText: Phaser.GameObjects.Text;
    
    // Voice command elements
    voiceCommandText: Phaser.GameObjects.Text;
    feedbackText: Phaser.GameObjects.Text;
    
    // Monsters and combat
    monsters: Phaser.GameObjects.Sprite[] = [];
    currentMonster: Phaser.GameObjects.Sprite;
    monsterHealth: number = 100;
    monsterHealthBar: Phaser.GameObjects.Graphics;
    
    // Player health
    playerHealth: number = 100;
    playerHealthBar: Phaser.GameObjects.Graphics;
    
    // UI elements
    attackButton: Phaser.GameObjects.Rectangle;
    defenseButton: Phaser.GameObjects.Rectangle;
    popup: Phaser.GameObjects.Container | undefined;
    
    // Game state
    score: number = 0;
    scoreText: Phaser.GameObjects.Text;
    gameState: 'intro' | 'playing' | 'voice_command' | 'result' = 'intro';
    
    // Voice command state
    currentCommand: 'sword' | 'shield' = 'sword';
    commandAccuracy: number = 0;
    failedAttempts: number = 0;
    speechRecognition: SpeechRecognition | null = null;
    
    // Word arrays for commands - will cycle through these with each successful command
    attackWords: string[] = ['Sword', 'Strike', 'Slash', 'Attack', 'Stab'];
    defenseWords: string[] = ['Shield', 'Block', 'Defend', 'Guard', 'Parry'];
    currentAttackWordIndex: number = 0;
    currentDefenseWordIndex: number = 0;
    
    // Add shield duration property
    shieldDuration: number = 0;
    
    constructor()
    {
        super('Game4');
    }
    
    create()
    {
        // Set up camera and background
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#8B0000'); // Dark red for the planet
        
        // Get the actual game width and height
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create red planet environment (simple gradient background)
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0xAA0000, 0xAA0000, 0x660000, 0x660000, 1);
        graphics.fillRect(0, 0, gameWidth, gameHeight);
        
        // Add some random "energy surge" particles
        this.createEnergySurges();
        
        // Add spaceship (disabled/crashed state)
        this.spaceship = this.add.image(gameWidth * 0.85, gameHeight * 0.2, 'spaceship');
        // Note: 'spaceship' is a placeholder, you'll need to add the actual asset
        // For now, we'll create a placeholder shape
        const spaceshipGraphics = this.add.graphics();
        spaceshipGraphics.fillStyle(0x888888);
        spaceshipGraphics.fillRoundedRect(gameWidth * 0.8, gameHeight * 0.15, gameWidth * 0.1, gameHeight * 0.1, 10);
        spaceshipGraphics.lineStyle(2, 0x444444);
        spaceshipGraphics.strokeRoundedRect(gameWidth * 0.8, gameHeight * 0.15, gameWidth * 0.1, gameHeight * 0.1, 10);
        
        // Add Pika character
        this.pika = this.add.sprite(gameWidth * 0.2, gameHeight * 0.7, 'pika');
        // Note: 'pika' is a placeholder, you'll need to add the actual asset
        // For now, we'll create a placeholder shape
        const pikaGraphics = this.add.graphics();
        pikaGraphics.fillStyle(0xFFFF00);
        pikaGraphics.fillCircle(gameWidth * 0.2, gameHeight * 0.7, 30);
        
        // Create energy bar
        this.createEnergyBar();
        
        // Create player health bar
        this.createPlayerHealthBar();
        
        // Create score display
        this.scoreText = this.add.text(20, 20, 'Score: 0', { 
            fontSize: '24px', 
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
            fontStyle: 'bold'
        });
        
        // Create voice command area
        this.createVoiceCommandArea();
        
        // Create monster area
        this.createMonsterArea();
        
        // Create UI buttons for testing (these would be replaced by actual voice commands)
        this.createUIButtons();
        
        // Show intro popup
        this.showIntroPopup();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Notify that the scene is ready
        EventBus.emit('current-scene-ready', this);
    }
    
    createEnergySurges() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create energy surge particles using circles instead of particle system
        // For now, we'll create some animated dots as placeholders
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(0, gameWidth);
            const y = Phaser.Math.Between(0, gameHeight);
            const size = Phaser.Math.Between(3, 8);
            const particle = this.add.circle(x, y, size, 0xFFAA00);
            
            // Animate the particle
            this.tweens.add({
                targets: particle,
                alpha: { from: 0.7, to: 0.2 },
                scale: { from: 1, to: 0.5 },
                duration: Phaser.Math.Between(1000, 3000),
                repeat: -1,
                yoyo: true
            });
        }
    }
    
    createEnergyBar() {
        const gameWidth = this.cameras.main.width;
        
        // Create energy bar container
        const barWidth = gameWidth * 0.2;
        const barHeight = 30;
        const barX = gameWidth - barWidth - 20;
        const barY = 20;
        
        // Create background for energy bar with rounded corners
        // Using graphics for rounded rectangles instead of Rectangle object
        const energyBarBg = this.add.graphics();
        energyBarBg.fillStyle(0x000000);
        energyBarBg.lineStyle(2, 0xFFFFFF);
        energyBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 8);
        energyBarBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 8);
        
        // Create the actual energy bar
        this.energyBar = this.add.graphics();
        
        // Add energy text
        this.energyText = this.add.text(barX + barWidth/2, barY + barHeight/2, 'Energy: 0%', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
            fontStyle: 'bold'
        });
        this.energyText.setOrigin(0.5);
        
        // Now update the energy bar after energyText is created
        this.updateEnergyBar();
    }
    
    updateEnergyBar() {
        const gameWidth = this.cameras.main.width;
        const barWidth = gameWidth * 0.2;
        const barHeight = 30;
        const barX = gameWidth - barWidth - 20;
        const barY = 20;
        
        this.energyBar.clear();
        this.energyBar.fillStyle(0x00FF00);
        
        // Calculate width based on current energy
        const energyWidth = (this.currentEnergy / this.maxEnergy) * barWidth;
        this.energyBar.fillRect(barX, barY, energyWidth, barHeight);
        
        // Update text
        this.energyText.setText(`Energy: ${Math.floor(this.currentEnergy)}%`);
    }
    
    createVoiceCommandArea() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create voice command display area with rounded corners
        // Using graphics for rounded rectangles
        const commandArea = this.add.graphics();
        commandArea.fillStyle(0x000000, 0.5);
        commandArea.fillRoundedRect(
            gameWidth / 2 - (gameWidth * 0.6) / 2,
            gameHeight * 0.85 - (gameHeight * 0.15) / 2,
            gameWidth * 0.6,
            gameHeight * 0.15,
            16
        );
        
        // Add text for current command
        this.voiceCommandText = this.add.text(
            gameWidth / 2,
            gameHeight * 0.82,
            'Say: ...',
            {
                fontSize: '32px',
                color: '#FFFFFF',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        this.voiceCommandText.setOrigin(0.5);
        
        // Add text for feedback
        this.feedbackText = this.add.text(
            gameWidth / 2,
            gameHeight * 0.88,
            '',
            {
                fontSize: '24px',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        this.feedbackText.setOrigin(0.5);
    }
    
    createMonsterArea() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create monster placeholder
        this.currentMonster = this.add.sprite(
            gameWidth * 0.7,
            gameHeight * 0.5,
            'monster'
        );
        // Note: 'monster' is a placeholder, you'll need to add the actual asset
        
        // For now, we'll create a placeholder shape with random color
        const monsterColor = Phaser.Display.Color.RandomRGB().color;
        const monsterGraphics = this.add.graphics();
        monsterGraphics.fillStyle(monsterColor);
        monsterGraphics.fillRoundedRect(gameWidth * 0.65, gameHeight * 0.4, 80, 100, 10);
        monsterGraphics.lineStyle(2, 0x880000);
        monsterGraphics.strokeRoundedRect(gameWidth * 0.65, gameHeight * 0.4, 80, 100, 10);
        
        // Add eyes to the monster
        monsterGraphics.fillStyle(0xFFFFFF);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 20, gameHeight * 0.4 + 30, 10);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 60, gameHeight * 0.4 + 30, 10);
        
        monsterGraphics.fillStyle(0x000000);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 20, gameHeight * 0.4 + 30, 5);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 60, gameHeight * 0.4 + 30, 5);
        
        // Create monster health bar
        this.monsterHealthBar = this.add.graphics();
        this.updateMonsterHealthBar();
    }
    
    updateMonsterHealthBar() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        const barWidth = 80;
        const barHeight = 10;
        const barX = gameWidth * 0.65;
        const barY = gameHeight * 0.4 - 20;
        
        this.monsterHealthBar.clear();
        
        // Background with rounded corners - changed from black to gray
        this.monsterHealthBar.fillStyle(0x888888); // Gray background
        this.monsterHealthBar.lineStyle(1, 0xFFFFFF);
        this.monsterHealthBar.fillRoundedRect(barX, barY, barWidth, barHeight, 4);
        
        // Health with rounded corners
        const healthWidth = (this.monsterHealth / 100) * barWidth;
        if (healthWidth > 0) {
            this.monsterHealthBar.fillStyle(0xFF0000);
            // Make sure the health bar doesn't exceed the container bounds
            const cornerRadius = healthWidth < 8 ? healthWidth/2 : 4;
            this.monsterHealthBar.fillRoundedRect(barX, barY, healthWidth, barHeight, cornerRadius);
        }
        
        // Add a border
        this.monsterHealthBar.lineStyle(1, 0xFFFFFF);
        this.monsterHealthBar.strokeRoundedRect(barX, barY, barWidth, barHeight, 4);
    }
    
    createUIButtons() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create attack button (for testing without voice) with rounded corners
        // Using graphics for rounded rectangles
        const attackButtonGraphics = this.add.graphics();
        attackButtonGraphics.fillStyle(0xFF0000);
        attackButtonGraphics.fillRoundedRect(
            gameWidth * 0.3 - 75,
            gameHeight * 0.9 - 25,
            150,
            50,
            12
        );
        
        // Create an invisible rectangle for hit detection
        this.attackButton = this.add.rectangle(
            gameWidth * 0.3,
            gameHeight * 0.9,
            150,
            50,
            0xFF0000,
            0 // Transparent
        );
        this.attackButton.setInteractive({ useHandCursor: true });
        
        const attackText = this.add.text(
            gameWidth * 0.3,
            gameHeight * 0.9,
            `Attack (${this.attackWords[this.currentAttackWordIndex]})`,
            { 
                fontSize: '18px', 
                color: '#FFFFFF',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        attackText.setOrigin(0.5);
        
        // Create defense button (for testing without voice) with rounded corners
        const defenseButtonGraphics = this.add.graphics();
        defenseButtonGraphics.fillStyle(0x0000FF);
        defenseButtonGraphics.fillRoundedRect(
            gameWidth * 0.7 - 75,
            gameHeight * 0.9 - 25,
            150,
            50,
            12
        );
        
        // Create an invisible rectangle for hit detection
        this.defenseButton = this.add.rectangle(
            gameWidth * 0.7,
            gameHeight * 0.9,
            150,
            50,
            0x0000FF,
            0 // Transparent
        );
        this.defenseButton.setInteractive({ useHandCursor: true });
        
        const defenseText = this.add.text(
            gameWidth * 0.7,
            gameHeight * 0.9,
            `Defense (${this.defenseWords[this.currentDefenseWordIndex]})`,
            { 
                fontSize: '18px', 
                color: '#FFFFFF',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        defenseText.setOrigin(0.5);
        
        // Add event listeners
        this.attackButton.on('pointerdown', () => {
            this.startVoiceCommand('sword');
        });
        
        this.defenseButton.on('pointerdown', () => {
            this.startVoiceCommand('shield');
        });
    }
    
    setupEventListeners() {
        // Initialize speech recognition if available
        this.initSpeechRecognition();
        
        // Listen for window resize
        this.scale.on('resize', this.handleResize, this);
    }
    
    handleResize() {
        // Restart the scene to adjust all elements
        this.scene.restart();
    }
    
    initSpeechRecognition() {
        // Check if browser supports SpeechRecognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            // Create a speech recognition instance
            const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.speechRecognition = new SpeechRecognitionApi();
            
            if (this.speechRecognition) {
                // Configure speech recognition
                this.speechRecognition.continuous = false;
                this.speechRecognition.interimResults = false;
                this.speechRecognition.lang = 'en-US';
                
                // Add event listeners
                this.speechRecognition.onresult = this.handleSpeechResult.bind(this);
                this.speechRecognition.onerror = this.handleSpeechError.bind(this);
                this.speechRecognition.onend = this.handleSpeechEnd.bind(this);
            }
        } else {
            console.log('Speech recognition not supported in this browser');
            this.feedbackText.setText('Speech recognition not supported in your browser.');
            this.feedbackText.setColor('#FF0000');
        }
    }
    
    handleSpeechResult(event: SpeechRecognitionEvent) {
        const result = event.results[0][0].transcript.trim().toLowerCase();
        const confidence = event.results[0][0].confidence;
        
        console.log(`Speech recognized: "${result}" (confidence: ${confidence})`);
        
        // Get the expected word based on the current command and word index
        let expectedWord = '';
        
        if (this.currentCommand === 'sword') {
            expectedWord = this.attackWords[this.currentAttackWordIndex].toLowerCase();
        } else if (this.currentCommand === 'shield') {
            expectedWord = this.defenseWords[this.currentDefenseWordIndex].toLowerCase();
        }
        
        // Calculate accuracy based on string similarity and confidence
        // This combines both how close the word was to the expected word
        // and how confident the speech recognition was in the result
        const similarity = this.calculateStringSimilarity(result, expectedWord);
        this.commandAccuracy = similarity * confidence;
        
        console.log(`Expected: "${expectedWord}", Similarity: ${similarity}, Final accuracy: ${this.commandAccuracy}`);
        
        // Display feedback based on accuracy
        this.displayFeedback();
        
        // Execute the command or count as failed attempt
        if (this.commandAccuracy > 0.6) {
            // Reset failed attempts counter on success
            this.failedAttempts = 0;
            
            // Execute the command
            if (this.currentCommand === 'sword') {
                this.executeAttack(this.commandAccuracy);
                // Move to next attack word in the array
                this.currentAttackWordIndex = (this.currentAttackWordIndex + 1) % this.attackWords.length;
            } else if (this.currentCommand === 'shield') {
                this.executeDefense(this.commandAccuracy);
                // Move to next defense word in the array
                this.currentDefenseWordIndex = (this.currentDefenseWordIndex + 1) % this.defenseWords.length;
            }
        } else {
            // Count as failed attempt - but keep the same word
            this.failedAttempts++;
            console.log(`Failed attempt ${this.failedAttempts}/3`);
            
            // If failed 3 times, monster attacks the player
            if (this.failedAttempts >= 3) {
                this.monsterAttack();
                this.failedAttempts = 0; // Reset counter after monster attack
            }
        }
        
        // Reset game state after a delay
        this.time.delayedCall(2000, () => {
            this.gameState = 'playing';
            this.voiceCommandText.setText('Say: ...');
            this.feedbackText.setText('');
            
            // Check if monster is defeated
            if (this.monsterHealth <= 0) {
                this.defeatMonster();
            }
            
            // Check if player is defeated
            if (this.playerHealth <= 0) {
                this.gameOver();
            }
            
            // Update UI buttons with new words
            this.updateUIButtons();
            
            // Decrease shield duration if active
            if (this.shieldDuration > 0) {
                this.shieldDuration--;
                
                // Show shield countdown if still active
                if (this.shieldDuration > 0) {
                    this.showShieldStatus();
                }
            }
        });
    }
    
    handleSpeechError(event: SpeechRecognitionErrorEvent) {
        console.error('Speech recognition error:', event.error);
        this.feedbackText.setText(`Error: ${event.error}`);
        this.feedbackText.setColor('#FF0000');
        
        // Special handling for network errors - retry automatically
        if (event.error === 'network') {
            this.feedbackText.setText('Network error. Retrying...');
            
            // Wait a moment and try again
            this.time.delayedCall(1000, () => {
                if (this.speechRecognition) {
                    try {
                        this.speechRecognition.start();
                    } catch (e) {
                        console.error('Retry failed:', e);
                        // If still fails, count as a failed attempt
                        this.failedAttempts++;
                        this.feedbackText.setText('Connection failed. Try again later.');
                    }
                }
            });
            
            return; // Don't continue with normal error handling
        }
        
        // For other errors, count as failed attempt
        this.failedAttempts++;
        
        // If failed 3 times, monster attacks
        if (this.failedAttempts >= 3) {
            this.monsterAttack();
            this.failedAttempts = 0;
        }
        
        // Reset after delay
        this.time.delayedCall(2000, () => {
            this.gameState = 'playing';
            this.voiceCommandText.setText('Say: ...');
            this.feedbackText.setText('');
        });
    }
    
    handleSpeechEnd() {
        // Recognition service has disconnected
        console.log('Speech recognition ended');
    }
    
    calculateStringSimilarity(str1: string, str2: string): number {
        // Simple Levenshtein distance implementation
        const track = Array(str2.length + 1).fill(null).map(() => 
            Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) {
            track[0][i] = i;
        }
        
        for (let j = 0; j <= str2.length; j++) {
            track[j][0] = j;
        }
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        // Convert distance to similarity score between 0 and 1
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1.0; // Both strings are empty
        
        const distance = track[str2.length][str1.length];
        return 1 - (distance / maxLength);
    }
    
    updateUIButtons() {
        // Find and update attack button text
        const attackText = this.children.list.find(child => 
            child instanceof Phaser.GameObjects.Text && 
            child.text.includes('Attack')) as Phaser.GameObjects.Text;
            
        if (attackText) {
            attackText.setText(`Attack (${this.attackWords[this.currentAttackWordIndex]})`);
        }
        
        // Find and update defense button text
        const defenseText = this.children.list.find(child => 
            child instanceof Phaser.GameObjects.Text && 
            child.text.includes('Defense')) as Phaser.GameObjects.Text;
            
        if (defenseText) {
            defenseText.setText(`Defense (${this.defenseWords[this.currentDefenseWordIndex]})`);
        }
    }
    
    displayFeedback() {
        // Display feedback based on accuracy
        if (this.commandAccuracy > 0.8) {
            this.feedbackText.setText('Excellent pronunciation!');
            this.feedbackText.setColor('#00FF00');
        } else if (this.commandAccuracy > 0.6) {
            this.feedbackText.setText('Good pronunciation');
            this.feedbackText.setColor('#FFFF00');
        } else {
            this.feedbackText.setText('Try again');
            this.feedbackText.setColor('#FF0000');
        }
    }
    
    monsterAttack() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Calculate damage - fixed value instead of level-based
        const damage = 15; // Fixed damage value instead of using level
        
        // Create attack animation from monster to player
        const attackEffect = this.add.graphics();
        attackEffect.fillStyle(0xFF6600, 0.7);
        
        // Draw attack shape - a triangle from monster to player
        attackEffect.fillTriangle(
            gameWidth * 0.65 + 40, gameHeight * 0.4 + 50,
            gameWidth * 0.4, gameHeight * 0.6,
            gameWidth * 0.4, gameHeight * 0.8
        );
        
        // Animate the attack effect (fade out)
        this.tweens.add({
            targets: attackEffect,
            alpha: { from: 0.7, to: 0 },
            duration: 500,
            onComplete: () => {
                attackEffect.destroy();
            }
        });
        
        // Player reaction animation (shake)
        this.tweens.add({
            targets: this.pika,
            x: this.pika.x - 20,
            yoyo: true,
            duration: 100,
            repeat: 2
        });
        
        // Check if shield is active
        if (this.shieldDuration > 0) {
            // Show shield block effect
            this.showShieldBlock();
            
            // Show blocked text instead of damage
            const blockedText = this.add.text(
                this.pika.x,
                this.pika.y - 40,
                `BLOCKED!`,
                { 
                    fontSize: '24px', 
                    color: '#00FFFF', 
                    fontStyle: 'bold',
                    fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
                }
            );
            
            this.tweens.add({
                targets: blockedText,
                y: blockedText.y - 50,
                alpha: { from: 1, to: 0 },
                duration: 1000,
                onComplete: () => {
                    blockedText.destroy();
                }
            });
        } else {
            // Apply damage to player (only if no shield)
            this.playerHealth -= damage;
            if (this.playerHealth < 0) this.playerHealth = 0;
            this.updatePlayerHealthBar();
            
            // Show damage text
            const damageText = this.add.text(
                this.pika.x,
                this.pika.y - 40,
                `-${damage}`,
                { 
                    fontSize: '24px', 
                    color: '#FF0000', 
                    fontStyle: 'bold',
                    fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
                }
            );
            
            this.tweens.add({
                targets: damageText,
                y: damageText.y - 50,
                alpha: { from: 1, to: 0 },
                duration: 1000,
                onComplete: () => {
                    damageText.destroy();
                }
            });
            
            // Flash the screen red for damage effect
            const flashEffect = this.add.rectangle(
                gameWidth/2, gameHeight/2, 
                gameWidth, gameHeight, 
                0xFF0000, 0.3
            );
            
            this.tweens.add({
                targets: flashEffect,
                alpha: { from: 0.3, to: 0 },
                duration: 300,
                onComplete: () => {
                    flashEffect.destroy();
                }
            });
        }
    }
    
    gameOver() {
        // Display game over and offer restart
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create popup for game over
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.7
        );
        background.setInteractive();
        this.popup.add(background);
        
        // Add popup content with rounded corners using graphics
        const popupBgGraphics = this.add.graphics();
        popupBgGraphics.fillStyle(0xFF0000);
        popupBgGraphics.lineStyle(4, 0x000000);
        popupBgGraphics.fillRoundedRect(
            -gameWidth * 0.3,
            -gameHeight * 0.2,
            gameWidth * 0.6,
            gameHeight * 0.4,
            20
        );
        popupBgGraphics.strokeRoundedRect(
            -gameWidth * 0.3,
            -gameHeight * 0.2,
            gameWidth * 0.6,
            gameHeight * 0.4,
            20
        );
        this.popup.add(popupBgGraphics);
        
        // Add title
        const titleText = this.add.text(
            0, -gameHeight * 0.12,
            'GAME OVER',
            { 
                fontSize: '42px', 
                color: '#FFFFFF', 
                fontStyle: 'bold',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add message
        const messageText = this.add.text(
            0, -gameHeight * 0.02,
            `You were defeated by the monsters!\n\nFinal Score: ${this.score}`,
            { 
                fontSize: '24px', 
                color: '#FFFFFF', 
                align: 'center',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        messageText.setOrigin(0.5);
        this.popup.add(messageText);
        
        // Add restart button with rounded corners
        const restartButtonGraphics = this.add.graphics();
        restartButtonGraphics.fillStyle(0x00AA00);
        restartButtonGraphics.fillRoundedRect(
            -gameWidth * 0.1,
            gameHeight * 0.1 - 30,
            gameWidth * 0.2,
            60,
            15
        );
        this.popup.add(restartButtonGraphics);
        
        // Create invisible hit area for the button
        const restartButton = this.add.rectangle(
            0, gameHeight * 0.1,
            gameWidth * 0.2, 60,
            0x00AA00,
            0 // Transparent
        );
        restartButton.setInteractive({ useHandCursor: true });
        this.popup.add(restartButton);
        
        const restartText = this.add.text(
            0, gameHeight * 0.1,
            'Try Again',
            { 
                fontSize: '24px', 
                color: '#FFFFFF',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        restartText.setOrigin(0.5);
        
        this.popup.add(restartButton);
        this.popup.add(restartText);
        
        // Add button functionality
        restartButton.on('pointerdown', () => {
            this.scene.restart();
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
    
    startVoiceCommand(command: 'sword' | 'shield') {
        // Set the current command
        this.currentCommand = command;
        this.gameState = 'voice_command';
        
        // Get the current word to say based on command type
        let wordToSay = '';
        if (command === 'sword') {
            wordToSay = this.attackWords[this.currentAttackWordIndex];
        } else if (command === 'shield') {
            wordToSay = this.defenseWords[this.currentDefenseWordIndex];
        }
        
        // Update the voice command text
        this.voiceCommandText.setText(`Say: "${wordToSay}"`);
        this.feedbackText.setText('Listening...');
        
        // Start the speech recognition
        if (this.speechRecognition) {
            try {
                // Reset any previous speech recognition session
                this.speechRecognition.stop();
                
                // Small delay to ensure stop completes before starting again
                this.time.delayedCall(200, () => {
                    try {
                        if (this.speechRecognition) {
                            this.speechRecognition.start();
                        }
                    } catch (e) {
                        console.error('Speech recognition start error:', e);
                        this.feedbackText.setText('Speech recognition error. Try again.');
                        this.time.delayedCall(1500, () => {
                            this.gameState = 'playing';
                            this.voiceCommandText.setText('Say: ...');
                            this.feedbackText.setText('');
                        });
                    }
                });
            } catch (e) {
                console.error('Speech recognition stop error:', e);
                // Fall back to simulation if speech recognition fails
                this.time.delayedCall(2000, () => {
                    this.processVoiceResult();
                });
            }
        } else {
            // Fallback for browsers without speech recognition
            this.time.delayedCall(2000, () => {
                // Simulate voice recognition result
                this.processVoiceResult();
            });
        }
        
        // Visual feedback that we're listening
        this.tweens.add({
            targets: this.voiceCommandText,
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: 3
        });
    }
    
    processVoiceResult() {
        // This is a fallback for browsers without speech recognition
        // Simulate voice recognition accuracy (random for demo)
        this.commandAccuracy = Phaser.Math.FloatBetween(0.5, 1);
        
        // Display feedback
        this.displayFeedback();
        
        // Execute the command with the given accuracy
        if (this.commandAccuracy > 0.6) {
            // Success - execute command
            if (this.currentCommand === 'sword') {
                this.executeAttack(this.commandAccuracy);
                // Move to next attack word
                this.currentAttackWordIndex = (this.currentAttackWordIndex + 1) % this.attackWords.length;
            } else if (this.currentCommand === 'shield') {
                this.executeDefense(this.commandAccuracy);
                // Move to next defense word
                this.currentDefenseWordIndex = (this.currentDefenseWordIndex + 1) % this.defenseWords.length;
            }
            
            // Reset failed attempts counter on success
            this.failedAttempts = 0;
        } else {
            // Count as failed attempt - keep the same word
            this.failedAttempts++;
            
            // If failed 3 times, monster attacks
            if (this.failedAttempts >= 3) {
                this.monsterAttack();
                this.failedAttempts = 0;
            }
        }
        
        // Reset game state after a delay
        this.time.delayedCall(2000, () => {
            this.gameState = 'playing';
            this.voiceCommandText.setText('Say: ...');
            this.feedbackText.setText('');
            
            // Check if monster is defeated
            if (this.monsterHealth <= 0) {
                this.defeatMonster();
            }
            
            // Check if player is defeated
            if (this.playerHealth <= 0) {
                this.gameOver();
            }
            
            // Update UI buttons with new words
            this.updateUIButtons();
            
            // Decrease shield duration if active
            if (this.shieldDuration > 0) {
                this.shieldDuration--;
                
                // Show shield countdown if still active
                if (this.shieldDuration > 0) {
                    this.showShieldStatus();
                }
            }
        });
    }
    
    executeAttack(accuracy: number) {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Calculate damage based on accuracy
        const damage = Math.floor(30 * accuracy);
        
        // Create attack animation
        const attackEffect = this.add.graphics();
        attackEffect.fillStyle(0xFF0000, 0.7);
        
        // Draw attack shape based on accuracy
        if (accuracy > 0.8) {
            // Strong attack - large sword slash
            attackEffect.fillTriangle(
                this.pika.x, this.pika.y,
                this.pika.x + gameWidth * 0.3, this.pika.y - gameHeight * 0.1,
                this.pika.x + gameWidth * 0.3, this.pika.y + gameHeight * 0.1
            );
        } else if (accuracy > 0.6) {
            // Medium attack - medium sword slash
            attackEffect.fillTriangle(
                this.pika.x, this.pika.y,
                this.pika.x + gameWidth * 0.2, this.pika.y - gameHeight * 0.07,
                this.pika.x + gameWidth * 0.2, this.pika.y + gameHeight * 0.07
            );
        } else {
            // Weak attack - small sword slash
            attackEffect.fillTriangle(
                this.pika.x, this.pika.y,
                this.pika.x + gameWidth * 0.1, this.pika.y - gameHeight * 0.05,
                this.pika.x + gameWidth * 0.1, this.pika.y + gameHeight * 0.05
            );
        }
        
        // Animate the attack effect
        this.tweens.add({
            targets: attackEffect,
            alpha: { from: 0.7, to: 0 },
            duration: 500,
            onComplete: () => {
                attackEffect.destroy();
            }
        });
        
        // Apply damage to monster
        this.monsterHealth -= damage;
        if (this.monsterHealth < 0) this.monsterHealth = 0;
        this.updateMonsterHealthBar();
        
        // Monster reaction animation
        this.tweens.add({
            targets: this.currentMonster,
            x: gameWidth * 0.7 + 20,
            yoyo: true,
            duration: 100,
            repeat: 2
        });
        
        // Add energy based on accuracy
        const energyGain = Math.floor(10 * accuracy);
        this.addEnergy(energyGain);
        
        // Update score
        this.score += damage;
        this.scoreText.setText(`Score: ${this.score}`);
        
        // Show damage text
        const damageText = this.add.text(
            gameWidth * 0.65 + 40,
            gameHeight * 0.4 - 40,
            `-${damage}`,
            { 
                fontSize: '24px', 
                color: '#FF0000', 
                fontStyle: 'bold',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        
        this.tweens.add({
            targets: damageText,
            y: damageText.y - 50,
            alpha: { from: 1, to: 0 },
            duration: 1000,
            onComplete: () => {
                damageText.destroy();
            }
        });
    }
    
    executeDefense(accuracy: number) {
        // Activate shield for 2 turns
        this.shieldDuration = 2;
        
        // Calculate shield strength based on accuracy
        const shieldStrength = Math.floor(100 * accuracy);
        
        // Create shield animation
        const shield = this.add.circle(this.pika.x, this.pika.y, 50, 0x0088FF, accuracy * 0.7);
        shield.setStrokeStyle(3, 0x00FFFF);
        
        // Scale shield based on accuracy
        shield.setScale(accuracy);
        
        // Animate the shield
        this.tweens.add({
            targets: shield,
            scale: { from: accuracy, to: accuracy * 1.2 },
            alpha: { from: accuracy * 0.7, to: 0 },
            duration: 1000,
            onComplete: () => {
                shield.destroy();
            }
        });
        
        // Add energy based on accuracy
        const energyGain = Math.floor(5 * accuracy);
        this.addEnergy(energyGain);
        
        // Update score
        this.score += Math.floor(shieldStrength / 2);
        this.scoreText.setText(`Score: ${this.score}`);
        
        // Show shield activation text
        const shieldText = this.add.text(
            this.pika.x,
            this.pika.y - 70,
            `Shield Active (${this.shieldDuration} turns)`,
            { 
                fontSize: '20px', 
                color: '#00FFFF', 
                fontStyle: 'bold',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        shieldText.setOrigin(0.5);
        
        this.tweens.add({
            targets: shieldText,
            y: shieldText.y - 30,
            alpha: { from: 1, to: 0 },
            duration: 1000,
            onComplete: () => {
                shieldText.destroy();
            }
        });
    }
    
    addEnergy(amount: number) {
        this.currentEnergy += amount;
        if (this.currentEnergy > this.maxEnergy) {
            this.currentEnergy = this.maxEnergy;
            
            // If energy is full, show notification
            if (amount > 0) {
                this.showEnergyFullNotification();
            }
        }
        
        this.updateEnergyBar();
    }
    
    showEnergyFullNotification() {
        const gameWidth = this.cameras.main.width;
        
        const notification = this.add.text(
            gameWidth - 150,
            60,
            'Energy Full!',
            { fontSize: '20px', color: '#FFFF00', fontStyle: 'bold' }
        );
        notification.setOrigin(0.5);
        
        this.tweens.add({
            targets: notification,
            y: notification.y - 30,
            alpha: { from: 1, to: 0 },
            duration: 2000,
            onComplete: () => {
                notification.destroy();
            }
        });
    }
    
    defeatMonster() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Show defeat message
        const defeatText = this.add.text(
            gameWidth * 0.65 + 40,
            gameHeight * 0.4,
            'DEFEATED!',
            { fontSize: '28px', color: '#FFFF00', fontStyle: 'bold' }
        );
        defeatText.setOrigin(0.5);
        
        // Animate monster defeat
        this.tweens.add({
            targets: this.currentMonster,
            alpha: 0,
            y: gameHeight * 0.5 + 50,
            duration: 1000,
            onComplete: () => {
                // Remove the monster and text
                this.currentMonster.destroy();
                defeatText.destroy();
                
                // Spawn a new monster after delay
                this.time.delayedCall(1000, () => {
                    this.spawnNewMonster();
                });
            }
        });
        
        // Add bonus energy
        this.addEnergy(20);
        
        // Update score with bonus
        this.score += 100;
        this.scoreText.setText(`Score: ${this.score}`);
        
        // Check if we have enough energy to repair the spaceship
        if (this.currentEnergy >= this.maxEnergy) {
            this.showSpaceshipRepairOption();
        }
    }
    
    spawnNewMonster() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Set fixed monster health instead of level-based
        this.monsterHealth = 100;
        
        // Create monster placeholder
        this.currentMonster = this.add.sprite(
            gameWidth * 0.7,
            gameHeight * 0.5,
            'monster'
        );
        
        // For now, we'll create a placeholder shape with random color
        const monsterColor = Phaser.Display.Color.RandomRGB().color;
        const monsterGraphics = this.add.graphics();
        monsterGraphics.fillStyle(monsterColor);
        monsterGraphics.fillRoundedRect(gameWidth * 0.65, gameHeight * 0.4, 80, 100, 10);
        monsterGraphics.lineStyle(2, 0x880000);
        monsterGraphics.strokeRoundedRect(gameWidth * 0.65, gameHeight * 0.4, 80, 100, 10);
        
        // Add eyes to the monster
        monsterGraphics.fillStyle(0xFFFFFF);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 20, gameHeight * 0.4 + 30, 10);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 60, gameHeight * 0.4 + 30, 10);
        
        monsterGraphics.fillStyle(0x000000);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 20, gameHeight * 0.4 + 30, 5);
        monsterGraphics.fillCircle(gameWidth * 0.65 + 60, gameHeight * 0.4 + 30, 5);
        
        // Update monster health bar
        this.updateMonsterHealthBar();
    }
    
    showSpaceshipRepairOption() {
        // Only show if we haven't already repaired the spaceship
        if (this.currentEnergy < this.maxEnergy) return;
        
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create popup for spaceship repair
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.7
        );
        background.setInteractive();
        this.popup.add(background);
        
        // Add popup content with rounded corners using graphics
        const popupBgGraphics = this.add.graphics();
        popupBgGraphics.fillStyle(0xFFFFFF);
        popupBgGraphics.lineStyle(4, 0x000000);
        popupBgGraphics.fillRoundedRect(
            -gameWidth * 0.3,
            -gameHeight * 0.2,
            gameWidth * 0.6,
            gameHeight * 0.4,
            20
        );
        popupBgGraphics.strokeRoundedRect(
            -gameWidth * 0.3,
            -gameHeight * 0.2,
            gameWidth * 0.6,
            gameHeight * 0.4,
            20
        );
        this.popup.add(popupBgGraphics);
        
        // Add title
        const titleText = this.add.text(
            0, -gameHeight * 0.15,
            'Spaceship Repair',
            { 
                fontSize: '32px', 
                color: '#000000', 
                fontStyle: 'bold',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add message
        const messageText = this.add.text(
            0, -gameHeight * 0.05,
            'You have collected enough energy to repair your spaceship!\nWould you like to use the energy now?',
            { 
                fontSize: '20px', 
                color: '#000000', 
                align: 'center',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold' 
            }
        );
        messageText.setOrigin(0.5);
        this.popup.add(messageText);
        
        // Add repair button with rounded corners using graphics
        const repairButtonGraphics = this.add.graphics();
        repairButtonGraphics.fillStyle(0x00AA00);
        repairButtonGraphics.fillRoundedRect(
            -gameWidth * 0.1 - gameWidth * 0.075,
            gameHeight * 0.1 - 25,
            gameWidth * 0.15,
            50,
            15
        );
        this.popup.add(repairButtonGraphics);
        
        // Create invisible hit area for the button
        const repairButton = this.add.rectangle(
            -gameWidth * 0.1, gameHeight * 0.1,
            gameWidth * 0.15, 50,
            0x00AA00,
            0 // Transparent
        );
        repairButton.setInteractive({ useHandCursor: true });
        this.popup.add(repairButton);

        // Add continue button with rounded corners using graphics
        const continueButtonGraphics = this.add.graphics();
        continueButtonGraphics.fillStyle(0x0000AA);
        continueButtonGraphics.fillRoundedRect(
            gameWidth * 0.1 - gameWidth * 0.075,
            gameHeight * 0.1 - 25,
            gameWidth * 0.15,
            50,
            15
        );
        this.popup.add(continueButtonGraphics);
        
        // Create invisible hit area for the button
        const continueButton = this.add.rectangle(
            gameWidth * 0.1, gameHeight * 0.1,
            gameWidth * 0.15, 50,
            0x0000AA,
            0 // Transparent
        );
        continueButton.setInteractive({ useHandCursor: true });
        this.popup.add(continueButton);
        
        const repairText = this.add.text(
            -gameWidth * 0.1, gameHeight * 0.1,
            'Repair Now',
            { 
                fontSize: '24px', 
                color: '#FFFFFF',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        repairText.setOrigin(0.5);
        
        const continueText = this.add.text(
            gameWidth * 0.1, gameHeight * 0.1,
            'Continue Playing',
            { fontSize: '20px', color: '#FFFFFF' }
        );
        continueText.setOrigin(0.5);
        
        this.popup.add(repairButton);
        this.popup.add(repairText);
        this.popup.add(continueButton);
        this.popup.add(continueText);
        
        // Add button functionality
        repairButton.on('pointerdown', () => {
            this.repairSpaceship();
        });
        
        continueButton.on('pointerdown', () => {
            this.hidePopup();
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
    
    repairSpaceship() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Hide popup
        this.hidePopup();
        
        // Use all energy
        this.currentEnergy = 0;
        this.updateEnergyBar();
        
        // Create energy transfer effect
        const energyBeam = this.add.graphics();
        energyBeam.lineStyle(10, 0x00FFFF, 0.7);
        energyBeam.lineBetween(
            this.pika.x, this.pika.y,
            gameWidth * 0.85, gameHeight * 0.2
        );
        
        // Animate energy beam
        this.tweens.add({
            targets: energyBeam,
            alpha: { from: 0.7, to: 0 },
            duration: 2000,
            onComplete: () => {
                energyBeam.destroy();
                
                // Show completion message
                this.showGameCompletionMessage();
            }
        });
        
        // Animate spaceship repair
        this.tweens.add({
            targets: this.spaceship,
            y: gameHeight * 0.2 - 20,
            duration: 500,
            yoyo: true,
            repeat: 3
        });
    }
    
    showGameCompletionMessage() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create popup for game completion
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.7
        );
        background.setInteractive();
        this.popup.add(background);
        
        // Add popup content with rounded corners using graphics
        const popupBgGraphics = this.add.graphics();
        popupBgGraphics.fillStyle(0xFFFFFF);
        popupBgGraphics.lineStyle(4, 0x000000);
        popupBgGraphics.fillRoundedRect(
            -gameWidth * 0.35,
            -gameHeight * 0.25,
            gameWidth * 0.7,
            gameHeight * 0.5,
            20
        );
        popupBgGraphics.strokeRoundedRect(
            -gameWidth * 0.35,
            -gameHeight * 0.25,
            gameWidth * 0.7,
            gameHeight * 0.5,
            20
        );
        this.popup.add(popupBgGraphics);
        
        // Add title
        const titleText = this.add.text(
            0, -gameHeight * 0.18,
            'Congratulations!',
            { 
                fontSize: '36px', 
                color: '#000000', 
                fontStyle: 'bold',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add message
        const messageText = this.add.text(
            0, -gameHeight * 0.05,
            `You've successfully repaired your spaceship and can now leave the red planet!\n\nFinal Score: ${this.score}\n\nYour pronunciation skills have saved the day!`,
            { 
                fontSize: '22px', 
                color: '#000000', 
                align: 'center',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        messageText.setOrigin(0.5);
        this.popup.add(messageText);
        
        // Add restart button with rounded corners
        const restartButtonGraphics = this.add.graphics();
        restartButtonGraphics.fillStyle(0x00AA00);
        restartButtonGraphics.fillRoundedRect(
            -gameWidth * 0.1,
            gameHeight * 0.15 - 30,
            gameWidth * 0.2,
            60,
            15
        );
        this.popup.add(restartButtonGraphics);
        
        // Create invisible hit area for the button
        const restartButton = this.add.rectangle(
            0, gameHeight * 0.15,
            gameWidth * 0.2, 60,
            0x00AA00,
            0 // Transparent
        );
        restartButton.setInteractive({ useHandCursor: true });
        this.popup.add(restartButton);
        
        const restartText = this.add.text(
            0, gameHeight * 0.15,
            'Play Again',
            { fontSize: '24px', color: '#FFFFFF' }
        );
        restartText.setOrigin(0.5);
        
        this.popup.add(restartButton);
        this.popup.add(restartText);
        
        // Add button functionality
        restartButton.on('pointerdown', () => {
            this.scene.restart();
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
    
    showIntroPopup() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create popup for intro
        this.popup = this.add.container(gameWidth / 2, gameHeight / 2);
        
        // Add semi-transparent background
        const background = this.add.rectangle(
            0, 0,
            gameWidth * 2, gameHeight * 2,
            0x000000, 0.7
        );
        background.setInteractive();
        background.on('pointerdown', () => this.hidePopup());
        this.popup.add(background);
        
        // Add popup content with rounded corners using graphics
        const popupBgGraphics = this.add.graphics();
        popupBgGraphics.fillStyle(0xFFFFFF);
        popupBgGraphics.lineStyle(4, 0x000000);
        popupBgGraphics.fillRoundedRect(
            -gameWidth * 0.35,
            -gameHeight * 0.3,
            gameWidth * 0.7,
            gameHeight * 0.6,
            20
        );
        popupBgGraphics.strokeRoundedRect(
            -gameWidth * 0.35,
            -gameHeight * 0.3,
            gameWidth * 0.7,
            gameHeight * 0.6,
            20
        );
        
        // Create an invisible rectangle for hit detection
        const popupBg = this.add.rectangle(
            0, 0,
            gameWidth * 0.7, gameHeight * 0.6,
            0xFFFFFF, 
            0 // Transparent
        );
        popupBg.setInteractive();
        popupBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            pointer.event.stopPropagation();
        });
        
        this.popup.add(popupBgGraphics);
        this.popup.add(popupBg);
        
        // Add title
        const titleText = this.add.text(
            0, -gameHeight * 0.25,
            'Pika\'s Voice Adventure',
            { 
                fontSize: '36px', 
                color: '#000000', 
                fontStyle: 'bold',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif'
            }
        );
        titleText.setOrigin(0.5);
        this.popup.add(titleText);
        
        // Add story text
        const storyText = this.add.text(
            0, -gameHeight * 0.1,
            'Pika\'s spaceship has run out of energy and crashed on a mysterious red planet.\nThis hostile environment is filled with natural energy surges, dangerous terrains,\nand bizarre creatures that Pika must face to survive.',
            { 
                fontSize: '18px', 
                color: '#000000', 
                align: 'center',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        storyText.setOrigin(0.5);
        this.popup.add(storyText);
        
        // Add gameplay instructions
        const instructionsText = this.add.text(
            0, gameHeight * 0.05,
            'Use your voice as a weapon!\n\n• Learn different attack words (starting with "' + this.attackWords[0] + '")\n• Learn different defense words (starting with "' + this.defenseWords[0] + '")\n\nThe effectiveness depends on your pronunciation accuracy.\nCollect energy to repair your spaceship and escape the planet!\n\nBe careful! If you fail 3 times, monsters will attack you!',
            { 
                fontSize: '20px', 
                color: '#000000', 
                align: 'center',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        instructionsText.setOrigin(0.5);
        this.popup.add(instructionsText);
        
        // Add start button with rounded corners using graphics
        const startButtonGraphics = this.add.graphics();
        startButtonGraphics.fillStyle(0x00AA00);
        startButtonGraphics.fillRoundedRect(
            -gameWidth * 0.1,
            gameHeight * 0.22 - 30,
            gameWidth * 0.2,
            60,
            15
        );
        this.popup.add(startButtonGraphics);
        
        // Create invisible hit area for the button
        const startButton = this.add.rectangle(
            0, gameHeight * 0.22,
            gameWidth * 0.2, 60,
            0x00AA00,
            0 // Transparent
        );
        startButton.setInteractive({ useHandCursor: true });
        this.popup.add(startButton);
        
        const startText = this.add.text(
            0, gameHeight * 0.22,
            'Start Adventure',
            { 
                fontSize: '24px', 
                color: '#FFFFFF',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold'
            }
        );
        startText.setOrigin(0.5);
        
        this.popup.add(startButton);
        this.popup.add(startText);
        
        // Add button functionality
        startButton.on('pointerdown', () => {
            this.hidePopup();
            this.gameState = 'playing';
            
            // Spawn first monster
            this.spawnNewMonster();
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
    
    hidePopup() {
        if (this.popup) {
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
    
    update() {
        // This method is called every frame
        // Add any continuous updates here
    }

    createPlayerHealthBar() {
        // Create the actual health bar graphics
        this.playerHealthBar = this.add.graphics();
        
        // Update the health bar (initial creation)
        this.updatePlayerHealthBar();
    }
    
    updatePlayerHealthBar() {
        // Player health bar should follow Pika's position
        const barWidth = 80; // Same width as monster health bar
        const barHeight = 10; // Same height as monster health bar
        const barX = this.pika.x - barWidth / 2; // Center above Pika
        const barY = this.pika.y - 60; // Position above Pika's head
        
        this.playerHealthBar.clear();
        
        // Background with rounded corners
        this.playerHealthBar.fillStyle(0x000000);
        this.playerHealthBar.lineStyle(1, 0xFFFFFF);
        // Draw rounded rectangle for background
        this.playerHealthBar.fillRoundedRect(barX, barY, barWidth, barHeight, 4);
        
        // Health bar (green color) with rounded corners
        const healthWidth = (this.playerHealth / 100) * barWidth;
        if (healthWidth > 0) {
            this.playerHealthBar.fillStyle(0x00FF00);
            // Make sure the health bar doesn't exceed the container bounds
            const cornerRadius = healthWidth < 8 ? healthWidth/2 : 4;
            this.playerHealthBar.fillRoundedRect(barX, barY, healthWidth, barHeight, cornerRadius);
        }
        
        // Add a border to make it stand out better
        this.playerHealthBar.lineStyle(1, 0xFFFFFF);
        this.playerHealthBar.strokeRoundedRect(barX, barY, barWidth, barHeight, 4);
    }
    
    // Add new method to show shield block effect
    showShieldBlock() {
        // Create shield block animation
        const shieldBlock = this.add.circle(this.pika.x, this.pika.y, 60, 0x00FFFF, 0.7);
        shieldBlock.setStrokeStyle(4, 0x0088FF);
        
        // Animate the shield block effect
        this.tweens.add({
            targets: shieldBlock,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 0.7, to: 0 },
            duration: 500,
            onComplete: () => {
                shieldBlock.destroy();
            }
        });
    }
    
    // Add new method to show shield status
    showShieldStatus() {
        const statusText = this.add.text(
            this.pika.x,
            this.pika.y - 80,
            `Shield: ${this.shieldDuration} turns`,
            { 
                fontSize: '16px', 
                color: '#00FFFF',
                fontFamily: 'Fuzzy Bubbles, Arial, sans-serif',
                fontStyle: 'bold' 
            }
        );
        statusText.setOrigin(0.5);
        
        this.tweens.add({
            targets: statusText,
            alpha: { from: 1, to: 0 },
            duration: 1500,
            onComplete: () => {
                statusText.destroy();
            }
        });
    }
}
