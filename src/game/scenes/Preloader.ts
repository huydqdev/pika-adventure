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

        // Load image assets
        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');

        // game 1 assets
        this.load.image('amp-item', 'game1/amp_item.png');
        this.load.image('nut-item', 'game1/nut_item.png');
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

        // Tải các file video
        this.load.video('stage1-video', 'videos/stage1.mp4');
        this.load.video('stage2-video', 'videos/stage2.mp4');
        this.load.video('stage3-video', 'videos/stage3.mp4');
        this.load.video('stage4-video', 'videos/stage4.mp4');
        this.load.video('stage5-video', 'videos/stage5.mp4');

        this.load.image('cap-item', 'game1/cap_item.png');
        this.load.image('switch-item', 'game1/switch_item.png');
        this.load.image('tool-item', 'game1/tool_item.png');
        this.load.image('background_1', 'game1/background_1.png');

        // game 1 icons
        this.load.image('balo-ic', 'game1/balo_ic.png');
        this.load.image('guide-ic', 'game1/guide_ic.png');
        this.load.image('volume-ic', 'game1/volume_ic.png');
        this.load.image('back-ic', 'game1/back_ic.png');

        this.load.image('idle-player', 'game1/player/idle.png');
        this.load.image('walk-player', 'game1/player/walk.png');
        // Load audio assets from audio directory
        this.load.setPath('audio');

        // Load utility sounds
        this.load.audio('click', 'utils/click.mp3');

        // Load vocabulary word sounds
        this.load.setPath('audio');

        // Tải các file âm thanh
        this.load.audio('music', 'music.mp3');
        this.load.audio('swipe', 'swipe.mp3');
        this.load.audio('select', 'select.mp3');
        
        // game 1
        this.load.audio('amp-word-audio', 'game1/words/amp.mp3');
        this.load.audio('nut-word-audio', 'game1/words/nut.mp3');
        this.load.audio('spark-word-audio', 'game1/words/spark.mp3');
        this.load.audio('plug-word-audio', 'game1/words/plug.mp3');
        this.load.audio('cap-word-audio', 'game1/words/cap.mp3');
        this.load.audio('switch-word-audio', 'game1/words/switch.mp3');
        this.load.audio('tool-word-audio', 'game1/words/tool.mp3');

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

            // Kiểm tra các video đã được tải chưa
            console.log('stage1-video texture exists:', this.textures.exists('stage1-video'));
            console.log('stage2-video texture exists:', this.textures.exists('stage2-video'));
            console.log('stage3-video texture exists:', this.textures.exists('stage3-video'));
            console.log('stage4-video texture exists:', this.textures.exists('stage4-video'));
            console.log('stage5-video texture exists:', this.textures.exists('stage5-video'));
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
