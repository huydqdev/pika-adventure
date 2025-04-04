import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    // Logo and title
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    // Background
    background: GameObjects.Image;
    backgroundNext: GameObjects.Image; // Background tiếp theo cho hiệu ứng crossfade

    // Âm thanh
    backgroundMusic: Phaser.Sound.BaseSound;
    swipeSound: Phaser.Sound.BaseSound;
    selectSound: Phaser.Sound.BaseSound;

    // Stage images
    stage1: GameObjects.Image;
    stage2: GameObjects.Image;
    stage3: GameObjects.Image;
    stage4: GameObjects.Image;
    stage5: GameObjects.Image;

    // Stage names
    stageNames: string[] = [
        'Earth Awakening',
        'Asteroid Labyrinth',
        'Crimson Exoplanet',
        'Void Rift Station',
        'Eclipse Nexus'
    ];

    // Stage name text
    stageNameText: GameObjects.Text;

    // Carousel navigation
    prevButton: GameObjects.Text;
    nextButton: GameObjects.Text;
    currentIndex: number = 0;
    lastIndex: number | undefined = undefined; // Lưu index trước đó để xác định hướng chuyển động
    carouselTween: Phaser.Tweens.Tween | null = null;
    startX: number | null = null; // Biến để theo dõi swipe

    // Container cho các stage
    stageContainer: GameObjects.Container;

    // Mảng chứa tất cả các stage
    stages: GameObjects.Image[] = [];

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Tính toán tâm màn hình
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        console.log('MainMenu create() - centerX:', centerX, 'centerY:', centerY);
        console.log('Checking if stage images are loaded:');
        console.log('stage1 texture exists:', this.textures.exists('stage1'));
        console.log('stage2 texture exists:', this.textures.exists('stage2'));
        console.log('stage3 texture exists:', this.textures.exists('stage3'));
        console.log('stage4 texture exists:', this.textures.exists('stage4'));
        console.log('stage5 texture exists:', this.textures.exists('stage5'));

        // Thiết lập màu nền đen để tránh nhìn thấy màu nền mặc định
        this.cameras.main.setBackgroundColor('#000000');

        // Lấy kích thước màn hình
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        // Thêm background cho chặng đầu tiên
        this.background = this.add.image(centerX, centerY, 'bg1')
            .setOrigin(0.5)
            .setDepth(0)
            .setDisplaySize(screenWidth, screenHeight) // Điều chỉnh kích thước để phủ toàn màn hình
            .setAlpha(0.5); // Giảm độ đậm xuống 0.5 (từ 0.7) để tăng độ mờ

        // Tạo background thứ hai cho hiệu ứng crossfade (ban đầu ẩn)
        this.backgroundNext = this.add.image(centerX, centerY, 'bg1')
            .setOrigin(0.5)
            .setDepth(0)
            .setDisplaySize(screenWidth, screenHeight) // Đảm bảo cùng kích thước với background chính
            .setAlpha(0) // Ẩn hoàn toàn
            .setVisible(false); // Ẩn đi ban đầu

        // Thêm lớp overlay màu đen để tạo hiệu ứng mờ cho background
        const overlay = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x000000)
            .setOrigin(0.5)
            .setDepth(1)
            .setAlpha(0.5); // Tăng độ đậm lên 0.5 (từ 0.3) để tăng độ mờ

        // Tạo container cho các stage với depth cao hơn background và overlay
        this.stageContainer = this.add.container(centerX, centerY).setDepth(10);

        // Khoảng cách giữa các stage
        const spacing = 600; // Tăng khoảng cách từ 450 lên 600 để tránh bị đè lên nhau

        // Tạo các stage images và thêm vào container
        this.stage1 = this.add.image(0, 0, 'stage1').setScale(0.25); // Giảm scale ban đầu
        this.stage2 = this.add.image(spacing, 0, 'stage2').setScale(0.25);
        this.stage3 = this.add.image(spacing * 2, 0, 'stage3').setScale(0.25);
        this.stage4 = this.add.image(spacing * 3, 0, 'stage4').setScale(0.25);
        this.stage5 = this.add.image(spacing * 4, 0, 'stage5').setScale(0.25);

        // Thêm các stage vào container và mảng
        this.stageContainer.add([this.stage1, this.stage2, this.stage3, this.stage4, this.stage5]);
        this.stages = [this.stage1, this.stage2, this.stage3, this.stage4, this.stage5];

        // Thêm logo và tiêu đề
        this.logo = this.add.image(centerX, 150, 'logo')
            .setDepth(5)
            .setScale(0.5); // Giảm kích thước logo xuống một nửa

        // Tạo text hiển thị tên stage (ban đầu ẩn)
        this.stageNameText = this.add.text(centerX, centerY + 400, '', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100).setVisible(false);

        // Thiết lập các nút điều hướng carousel (không còn nút mũi tên)
        this.setupCarouselNavigation();

        // Thiết lập input cho carousel
        this.setupCarouselInput();

        // Cập nhật carousel để hiển thị đúng các stage
        this.updateCarousel();

        // Thêm hiệu ứng hover cho các stage
        this.stages.forEach(stage => this.addStageInteractivity(stage));

        // Thêm hướng dẫn cho người dùng
        const instructionText = this.add.text(centerX, centerY + 450, 'Swipe hoặc click vào stage để di chuyển', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setDepth(100).setAlpha(0.8);

        // Thiết lập âm thanh cho game
        this.setupAudio();

        EventBus.emit('current-scene-ready', this);
    }

    // Cập nhật carousel để hiển thị đúng các stage
    updateCarousel()
    {
        // Tính toán tâm màn hình
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Hiển thị tên stage hiện tại
        this.stageNameText.setText(this.stageNames[this.currentIndex]);
        this.stageNameText.setVisible(true);

        // Thay đổi background theo chặng hiện tại
        this.changeBackground(this.currentIndex + 1);

        // Tính toán vị trí mới cho container
        const newX = -this.currentIndex * 600; // 600 là khoảng cách giữa các stage

        // Dừng tất cả các tween hiện tại trên các stage
        this.stages.forEach(stage => {
            this.tweens.killTweensOf(stage);
            // Đặt lại alpha và vị trí y
            stage.setAlpha(1);
            stage.y = 0;
        });

        // Nếu đang có tween, dừng lại
        if (this.carouselTween) {
            this.carouselTween.stop();
        }

        // Tạo tween mới để di chuyển container với hiệu ứng mượt hơn
        this.carouselTween = this.tweens.add({
            targets: this.stageContainer,
            x: this.scale.width / 2 + newX,
            duration: 800, // Tăng thời gian để chuyển động mượt hơn
            ease: 'Cubic.easeInOut', // Sử dụng ease function mượt hơn
            onComplete: () => {
                this.carouselTween = null;
                this.lastIndex = this.currentIndex;
            }
        });

        // Thêm hiệu ứng nhẹ nhàng cho container khi chuyển chặng
        this.tweens.add({
            targets: this.stageContainer,
            y: centerY - 10, // Di chuyển lên trên một chút
            duration: 400,
            yoyo: true, // Quay lại vị trí ban đầu
            ease: 'Sine.easeInOut'
        });

        // Cập nhật scale cho các stage
        this.stages.forEach((stage, index) => {
            if (index === this.currentIndex) {
                // Stage hiện tại lớn hơn và có hiệu ứng chuyển động
                this.tweens.add({
                    targets: stage,
                    scale: 0.8, // Tăng scale lớn hơn nữa (từ 0.7 lên 0.8)
                    duration: 600,
                    ease: 'Back.easeOut' // Hiệu ứng bật lên một chút khi đạt kích thước tối đa
                });

                // Thêm hiệu ứng chuyển động nổi (floating) cho stage được focus
                this.tweens.add({
                    targets: stage,
                    y: -20, // Di chuyển lên trên nhiều hơn
                    duration: 1800,
                    yoyo: true, // Quay lại vị trí ban đầu
                    repeat: -1, // Lặp lại vô hạn
                    ease: 'Sine.easeInOut' // Hiệu ứng mượt mà
                });

                // Thêm hiệu ứng ánh sáng nhấp nháy
                this.tweens.add({
                    targets: stage,
                    alpha: 0.85,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Thêm hiệu ứng xoay nhẹ nhàng
                this.tweens.add({
                    targets: stage,
                    angle: 2, // Xoay nhẹ 2 độ
                    duration: 2500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                // Các stage khác nhỏ hơn
                this.tweens.add({
                    targets: stage,
                    scale: 0.25, // Giảm scale từ 0.3 xuống 0.25 để tạo sự tương phản
                    duration: 500,
                    ease: 'Power2'
                });
            }
        });
    }

    // Chuyển đến stage trước
    prevStage()
    {
        if (this.currentIndex > 0) {
            // Phát âm thanh khi chuyển stage
            this.swipeSound.play();

            this.currentIndex--;
            this.updateCarousel();
        }
    }

    // Chuyển đến stage tiếp theo
    nextStage()
    {
        if (this.currentIndex < this.stages.length - 1) {
            // Phát âm thanh khi chuyển stage
            this.swipeSound.play();

            this.currentIndex++;
            this.updateCarousel();
        }
    }

    // Thiết lập các nút điều hướng carousel - đã bỏ nút mũi tên
    setupCarouselNavigation()
    {
        // Đã bỏ các nút điều hướng, chỉ sử dụng swipe và click vào stage
    }

    // Thiết lập âm thanh cho game
    setupAudio()
    {
        // Tạo nhạc nền
        this.backgroundMusic = this.sound.add('music', {
            volume: 0.5,
            loop: true
        });

        // Tạo âm thanh khi chuyển stage
        this.swipeSound = this.sound.add('swipe', {
            volume: 0.7
        });

        // Tạo âm thanh khi chọn
        this.selectSound = this.sound.add('select', {
            volume: 0.7
        });

        // Phát nhạc nền
        if (!this.sound.get('music')?.isPlaying) {
            this.backgroundMusic.play();
        }
    }

    // Thiết lập input cho carousel
    setupCarouselInput()
    {
        // Cho phép scroll ngang để chuyển stage
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Tránh xử lý nếu đang có tween đang chạy
            if (this.carouselTween && this.carouselTween.isPlaying()) return;

            if (deltaY > 0) {
                this.nextStage();
            } else if (deltaY < 0) {
                this.prevStage();
            }
        });

        // Cho phép swipe ngang trên mobile
        this.input.on('pointerdown', (pointer) => {
            // Lưu vị trí bắt đầu của swipe
            this.startX = pointer.x;
        });

        this.input.on('pointerup', (pointer) => {
            if (this.startX) {
                // Tính khoảng cách swipe
                const diffX = pointer.x - this.startX;

                // Tránh xử lý nếu đang có tween đang chạy
                if (this.carouselTween && this.carouselTween.isPlaying()) {
                    this.startX = null;
                    return;
                }

                // Chỉ xử lý swipe khi khoảng cách đủ lớn
                if (Math.abs(diffX) > 50) { // Ngưỡng swipe
                    if (diffX > 0) {
                        // Swipe từ trái sang phải -> prev stage
                        this.prevStage();
                    } else {
                        // Swipe từ phải sang trái -> next stage
                        this.nextStage();
                    }
                }

                // Reset vị trí bắt đầu
                this.startX = null;
            }
        });

        // Thêm xử lý cho phím mũi tên trái/phải
        this.input.keyboard.on('keydown-LEFT', () => {
            if (!this.carouselTween || !this.carouselTween.isPlaying()) {
                this.prevStage();
            }
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            if (!this.carouselTween || !this.carouselTween.isPlaying()) {
                this.nextStage();
            }
        });
    }

    // Thêm hiệu ứng hover và click cho stage
    addStageInteractivity(stageImage: GameObjects.Image)
    {
        stageImage.setInteractive({ useHandCursor: true });

        stageImage.on('pointerover', () => {
            if (this.stages.indexOf(stageImage) !== this.currentIndex) {
                this.tweens.add({
                    targets: stageImage,
                    scale: 0.3, // Tăng scale khi hover lên stage không phải focus
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });

        stageImage.on('pointerout', () => {
            if (this.stages.indexOf(stageImage) !== this.currentIndex) {
                this.tweens.add({
                    targets: stageImage,
                    scale: 0.25, // Khôi phục scale ban đầu khi không hover
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });

        stageImage.on('pointerdown', () => {
            console.log('Click on stage:', this.stages.indexOf(stageImage));

            // Nếu click vào stage ở giữa, chuyển cảnh
            const index = this.stages.indexOf(stageImage);

            if (index === this.currentIndex) {
                // Phát âm thanh khi chọn
                this.selectSound.play();

                // Chỉ chuyển cảnh khi click vào stage ở giữa
                console.log('Clicked on center stage, changing scene...');
                this.changeScene();
            } else {
                // Phát âm thanh khi chuyển stage
                this.swipeSound.play();

                // Nếu click vào stage khác, chuyển stage đó vào giữa
                console.log('Clicked on side stage, moving it to center...');
                this.currentIndex = index;
                this.updateCarousel();
            }
        });
    }

    changeScene()
    {
        // Dừng tất cả các tween
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        if (this.carouselTween) {
            this.carouselTween.stop();
            this.carouselTween = null;
        }

        // Dừng tất cả các tween trên các stage
        this.stages.forEach(stage => {
            this.tweens.killTweensOf(stage);
        });

        // Dừng nhạc nền (hoặc có thể để tiếp tục phát trong cảnh tiếp theo)
        // this.backgroundMusic.stop();

        // Phát âm thanh khi chọn
        this.selectSound.play();

        this.scene.start('Game');
    }

    update()
    {
        // Có thể thêm logic cập nhật nếu cần
    }

    // Phương thức thay đổi background theo chặng sử dụng kỹ thuật crossfade
    changeBackground(stageNumber: number)
    {
        // Đảm bảo stageNumber nằm trong khoảng hợp lệ (1-5)
        stageNumber = Phaser.Math.Clamp(stageNumber, 1, 5);

        // Kiểm tra nếu background hiện tại đã có cùng texture
        if (this.background.texture.key === `bg${stageNumber}`) {
            return; // Không cần thay đổi nếu đã là background của chặng hiện tại
        }

        // Dừng tất cả các tween hiện tại
        this.tweens.killAll();

        // Lấy kích thước màn hình hiện tại
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        // Thiết lập lại backgroundNext
        if (this.backgroundNext) {
            this.backgroundNext.destroy(); // Hủy backgroundNext cũ nếu có
        }

        // Tạo backgroundNext mới
        this.backgroundNext = this.add.image(centerX, centerY, `bg${stageNumber}`)
            .setOrigin(0.5)
            .setDepth(0)
            .setDisplaySize(screenWidth, screenHeight)
            .setAlpha(0);

        // Đảm bảo background hiện tại đúng vị trí và kích thước
        this.background
            .setPosition(centerX, centerY)
            .setDisplaySize(screenWidth, screenHeight);

        // Hiệu ứng fade out background hiện tại
        this.tweens.add({
            targets: this.background,
            alpha: 0,
            duration: 1000,
            ease: 'Linear'
        });

        // Hiệu ứng fade in background mới
        this.tweens.add({
            targets: this.backgroundNext,
            alpha: 0.5, // Giảm alpha xuống 0.5 để tăng độ mờ
            duration: 1000,
            ease: 'Linear',
            onComplete: () => {
                // Sau khi fade in hoàn tất, ẩn background cũ và gán backgroundNext cho background
                this.background.setVisible(false);

                const temp = this.background;
                this.background = this.backgroundNext;
                this.backgroundNext = temp;

                // Ẩn backgroundNext đi
                this.backgroundNext.setVisible(false);
            }
        });
    }
}