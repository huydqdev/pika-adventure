import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        console.log('Preloader: Loading assets...');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        this.load.image('stage1', 'stage 1.png');
        this.load.image('stage2', 'stage 2.png');
        this.load.image('stage3', 'stage 3.png');
        this.load.image('stage4', 'stage 4.png');
        this.load.image('stage5', 'stage 5.png');

        // game 1 assets
        this.load.image('amp-item', 'game1/amp_item.png');
        this.load.image('nut-item', 'game1/plug_item.png');
        this.load.image('spark-item', 'game1/spark_item.png');
        this.load.image('plug-item', 'game1/plug_item.png');
        
        // Tải các background cho từng chặng
        this.load.image('bg1', 'bg1.jpg');
        this.load.image('bg2', 'bg2.jpg');
        this.load.image('bg3', 'bg3.jpg');
        this.load.image('bg4', 'bg4.jpg');
        this.load.image('bg5', 'bg5.jpg');

        // Tải các file âm thanh
        this.load.audio('music', 'music.mp3');
        this.load.audio('swipe', 'swipe.mp3');
        this.load.audio('select', 'select.mp3');

        // Load audio assets from audio directory
        this.load.setPath('audio');

        // Load utility sounds
        this.load.audio('click', 'utils/click.mp3');

        // Load vocabulary word sounds
        this.load.setPath('audio');
        // game 1
        this.load.audio('amp-word-audio', 'game1/words/amp.mp3');
        this.load.audio('nut-word-audio', 'game1/words/nut.mp3');
        this.load.audio('spark-word-audio', 'game1/words/spark.mp3');
        this.load.audio('plug-word-audio', 'game1/words/plug.mp3');



        // load utils sound
        this.load.audio('click', 'utils/click.mp3');
        this.load.audio('correct', 'utils/correct.mp3');
        this.load.audio('wrong', 'utils/wrong.mp3');
        this.load.audio('adventure-bg', 'utils/adventure_bg.mp3');
        
        // Thêm sự kiện để kiểm tra khi tải xong
        this.load.on('complete', () => {
            console.log('Preloader: All assets loaded successfully');
            console.log('stage1 texture exists:', this.textures.exists('stage1'));
            console.log('stage2 texture exists:', this.textures.exists('stage2'));
            console.log('stage3 texture exists:', this.textures.exists('stage3'));
            console.log('stage4 texture exists:', this.textures.exists('stage4'));
            console.log('stage5 texture exists:', this.textures.exists('stage5'));
        });
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
