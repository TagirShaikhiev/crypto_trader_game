"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const phaser_1 = __importDefault(require("phaser"));
const socket_io_client_1 = require("socket.io-client");
const SERVER_URL = 'http://localhost:3000';
class GameScene extends phaser_1.default.Scene {
    constructor() {
        super('GameScene');
        this.players = new Map(); // Храним игроков по ID
        this.playersNames = new Map();
    }
    preload() {
        // Загрузим простой квадратик вместо спрайта, если нет картинки
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
    }
    create() {
        this.add.text(10, 10, 'HOST SCREEN', { fontSize: '20px', color: '#666' });
        this.socket = (0, socket_io_client_1.io)(SERVER_URL);
        this.socket.on('connect', () => {
            this.socket.emit('createRoom');
        });
        this.socket.on('roomCreated', (roomCode) => {
            this.add.text(400, 50, roomCode, { fontSize: '64px', color: '#ffff00' }).setOrigin(0.5);
        });
        // ИГРОК ЗАШЕЛ -> Создаем спрайт
        this.socket.on('playerJoined', (player) => {
            const x = phaser_1.default.Math.Between(100, 700);
            const y = 400;
            // Спрайт
            const sprite = this.physics.add.sprite(x, y, 'player');
            sprite.setBounce(0.2);
            sprite.setCollideWorldBounds(true);
            // Имя над головой
            const nameText = this.add.text(x, y - 50, player.name, { fontSize: '16px' }).setOrigin(0.5);
            // Сохраняем в Map, чтобы потом найти по ID
            this.players.set(player.id, sprite);
            this.playersNames.set(player.id, nameText);
        });
        // ИГРОК ПРЫГНУЛ -> Применяем силу
        this.socket.on('playerJumped', (playerId) => {
            const sprite = this.players.get(playerId);
            if (sprite) {
                sprite.setVelocityY(-100);
            }
        });
    }
    update() {
        // Обновляем позицию имени, чтобы оно летело за игроком
        this.players.forEach((sprite, id) => {
            const nameText = this.playersNames.get(id);
            if (nameText) {
                nameText.x = sprite.x;
                nameText.y = sprite.y - 40;
            }
        });
    }
}
const config = {
    type: phaser_1.default.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade', // Включаем физику для прыжков
        arcade: { gravity: { y: 600, x: 100 }, debug: false }
    },
    scene: GameScene,
    backgroundColor: '#1a1a1a'
};
new phaser_1.default.Game(config);
//# sourceMappingURL=game.js.map