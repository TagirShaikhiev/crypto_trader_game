import Phaser from 'phaser';

export class AudioManager {
    private static currentTrack: Phaser.Sound.BaseSound | null = null;

    static preload(scene: Phaser.Scene) {
        scene.load.audio('menu_theme', '/assets/music/main.mp3');
        for (let i = 1; i <= 16; i++) {
            const strIndex = i.toString().padStart(2, '0');
            scene.load.audio(`track_${strIndex}`, `/assets/music/${strIndex}.mp3`);
        }
    }

    static init(scene: Phaser.Scene) {
        scene.sound.pauseOnBlur = false;
    }

    // --- ОБНОВЛЕННЫЙ МЕТОД ---
    static playMenu(scene: Phaser.Scene) {
        // 1. Если этот трек уже играет, не перезапускаем
        if (this.currentTrack && this.currentTrack.key === 'menu_theme' && this.currentTrack.isPlaying) {
            
            return;
        }

        // Функция запуска звука
        const startMusic = () => {
            this.stop(); // Останавливаем старое
            this.currentTrack = scene.sound.add('menu_theme', {
                loop: true,
                volume: 0.5
            });
            this.currentTrack.play();
        };

        // 2. ПРОВЕРКА БЛОКИРОВКИ БРАУЗЕРА
        if (scene.sound.locked) {
            
            // Если заблокировано — ждем первого клика ("разблокировки")
            scene.sound.once('unlocked', () => {
                startMusic();
            });
        } else {
            // Если разблокировано — играем сразу
            startMusic();
        }
    }

    static playGame(scene: Phaser.Scene) {
        this.stop();
        this.playRandomTrack(scene);
    }

    private static playRandomTrack(scene: Phaser.Scene) {
        const randomIndex = Phaser.Math.Between(1, 16);
        const key = `track_${randomIndex.toString().padStart(2, '0')}`;

        // Тоже добавим проверку блокировки на всякий случай
        if (scene.sound.locked) {
             scene.sound.once('unlocked', () => this.playRandomTrack(scene));
             return;
        }

        this.currentTrack = scene.sound.add(key, { volume: 0.4 });
        this.currentTrack.play();

        console.log(`Radio playing: ${key}`);

        this.currentTrack.once('complete', () => {
            if (scene.scene.isActive('MainGame')) {
                this.playRandomTrack(scene);
            }
        });
    }

    static stop() {
        if (this.currentTrack) {
            this.currentTrack.stop();
            this.currentTrack.removeAllListeners();
            this.currentTrack = null;
        }
    }
}