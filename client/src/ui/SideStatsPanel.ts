import Phaser from 'phaser';
import { BasePanel } from './BasePanel';

export class SideStatsPanel extends BasePanel {
    private isOpen = false;
    private toggleBtn: Phaser.GameObjects.Container;
    
    // Текстовые поля статистики
    private repText: Phaser.GameObjects.Text;
    private dayText: Phaser.GameObjects.Text;
    private totalTradesText: Phaser.GameObjects.Text;
    private winRateText: Phaser.GameObjects.Text;

    // Статистика (храним локально для отображения)
    private tradesCount = 0;
    private profitableTrades = 0;

    constructor(scene: Phaser.Scene, height: number) {
        const width = 300; // Ширина панели
        // Создаем панель ЗА пределами экрана (x = -300)
        super(scene, -width, 20, width, height - 40, 0x0a0a0a); 
        this.setDepth(200); // Поверх новостей

        // --- КОНТЕНТ ПАНЕЛИ ---
        this.add(scene.add.text(20, 20, 'PLAYER DOSSIER', { 
            fontSize: '24px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace' 
        }));
        this.add(scene.add.rectangle(20, 55, width - 40, 2, 0x444444).setOrigin(0));

        // 1. День
        this.dayText = this.addStat(20, 80, 'DAY:', '1');
        
        // 2. Репутация
        this.repText = this.addStat(20, 140, 'REPUTATION:', 'UNKNOWN');

        // 3. Статистика трейдинга
        this.totalTradesText = this.addStat(20, 220, 'TOTAL TRADES:', '0');
        this.winRateText = this.addStat(20, 280, 'WIN RATE:', '0%');

        // --- КНОПКА-ЯЗЫЧОК (TOGGLE) ---
        // Она должна быть приклеена к правому краю панели
        this.toggleBtn = scene.add.container(width, 0); // x=width (справа от панели)
        
        // Фон кнопки (вертикальный прямоугольник)
        const btnBg = scene.add.rectangle(0, 50, 40, 100, 0x00aa00)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });
        
        // Иконка (текст)
        const btnIcon = scene.add.text(8, 80, 'STATS', { 
            fontSize: '16px', color: '#000', fontStyle: 'bold' 
        }).setAngle(90); // Поворачиваем текст вертикально

        this.toggleBtn.add([btnBg, btnIcon]);
        this.add(this.toggleBtn);

        // Логика клика
        btnBg.on('pointerdown', () => {
            this.toggle();
        });
    }

    public updateData(day: number, reputation: number, trades: number, wins: number) {
        this.dayText.setText(day.toString());
        this.repText.setText(`${reputation}/100`);
        
        this.tradesCount = trades;
        this.profitableTrades = wins;
        
        this.totalTradesText.setText(trades.toString());
        
        const rate = trades > 0 ? ((wins / trades) * 100).toFixed(1) : '0';
        this.winRateText.setText(`${rate}%`);
    }

    private toggle() {
        this.isOpen = !this.isOpen;
        
        // Анимация выезда
        this.scene.tweens.add({
            targets: this,
            x: this.isOpen ? 0 : -this.width, // Выезжаем в 0 или прячемся обратно в -width
            duration: 300,
            ease: 'Power2'
        });
    }

    private addStat(x: number, y: number, label: string, value: string) {
        this.add(this.scene.add.text(x, y, label, { 
            fontSize: '14px', color: '#888', fontFamily: 'monospace' 
        }));
        const valText = this.scene.add.text(x, y + 20, value, { 
            fontSize: '24px', color: '#0f0', fontFamily: 'monospace', fontStyle: 'bold' 
        });
        this.add(valText);
        return valText;
    }
}