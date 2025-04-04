import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { Game2 } from './scenes/Game2';
// import { Game3 } from './scenes/Game3';
import { Game4 } from './scenes/Game4';
import { EndGame } from './scenes/EndGame';


//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        Game2,
        // Game3,
        Game4,
        GameOver,
        EndGame,
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
