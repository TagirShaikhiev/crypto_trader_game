import Phaser from 'phaser';
import { NEWS_POOL, NewsType } from '../data/NewsData';

export interface PublishResult {
    success: boolean;       // Попал в тайминг или нет
    impact: number;         // Итоговая сила удара по рынку
    message: string;        // Текст для всплывашки (например "PERFECT TIMING!")
    reputationChange: number; // На сколько изменилась репутация
}

export class ReputationManager {
    public reputation: number = 10; // От 1 до 100
    
    // Новость, которую игрок держит "в руке" и готов опубликовать
    public currentDraft = { text: "", type: "NEUTRAL" as NewsType };

    constructor() {
        this.rerollDraft();
    }

    // 1. Выдать игроку новую случайную новость
    public rerollDraft() {
        const rand = Math.random();
        // 50/50 шанс хорошей или плохой (нейтральные для этой механики скучны)
        const type: NewsType = rand > 0.5 ? 'GOOD' : 'BAD'; 
        
        const pool = NEWS_POOL[type];
        const item = pool[Phaser.Math.Between(0, pool.length - 1)];
        
        this.currentDraft = { text: item.text, type: type };
    }

    // 2. Главная механика: Публикация
    // trend - текущее направление рынка из симуляции (-1..+1)
    public attemptPublish(marketTrend: number): PublishResult {
        const newsType = this.currentDraft.type;
        
        // Определяем, куда дует ветер
        const isMarketBull = marketTrend > 0.2; // Растет
        const isMarketBear = marketTrend < -0.2; // Падает
        
        let isMatch = false;

        // Логика совпадения (Тайминг)
        // Игрок должен кидать GOOD на росте и BAD на падении (усиление тренда)
        if (isMarketBull && newsType === 'GOOD') isMatch = true;
        if (isMarketBear && newsType === 'BAD') isMatch = true;
        
        // Если рынок во флэте (ни туда ни сюда), считаем это "Мимо" или слабым попаданием
        
        // Расчет силы
        // Базовая сила (10) * Множитель репутации (0.1 .. 10.0)
        let basePower = 10 * (this.reputation / 20); 
        
        let resultImpact = 0;
        let message = "";
        let repChange = 0;

        if (isMatch) {
            // УСПЕХ: Усиливаем тренд
            resultImpact = (newsType === 'GOOD' ? 1 : -1) * basePower * 2; // x2 бонус
            repChange = 5;
            message = "PERFECT TIMING!";
        } else {
            // ПРОВАЛ: Идем против рынка (рынок "съедает" новость)
            resultImpact = (newsType === 'GOOD' ? 1 : -1) * basePower * 0.5; // Штраф 50%
            repChange = -2;
            message = "AGAINST MARKET...";
        }

        // Применяем изменения к статам
        this.updateReputation(repChange);
        
        // Сохраняем текущую новость во временную переменную и рероллим руку
        const result = {
            success: isMatch,
            impact: resultImpact,
            message: message,
            reputationChange: repChange
        };

        this.rerollDraft(); // Сразу даем новую карту в руку
        
        return result;
    }

    private updateReputation(val: number) {
        this.reputation = Phaser.Math.Clamp(this.reputation + val, 1, 100);
    }
}