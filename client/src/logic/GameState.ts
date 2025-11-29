export class GameState {
    // === ЭКОНОМИКА ===
    public cash: number = 10000;
    public heat: number = 0; // 0-100
    
    // === ПРОГРЕСС ===
    public day: number = 1;
    public inventory: string[] = []; // ID купленных предметов
    
    // === РЫНОК (Для переноса между днями) ===
    public lastClosePrice: number = 100;
    public priceHistory: number[] = []; // История для красивого старта графика

    // === СТАТИСТИКА (Глобальная) ===
    public totalTrades: number = 0;
    public totalWins: number = 0;

    // Сброс игры (для Game Over)
    public reset() {
        this.cash = 10000;
        this.heat = 0;
        this.day = 1;
        this.inventory = [];
        this.lastClosePrice = 100;
        this.priceHistory = [];
        this.totalTrades = 0;
        this.totalWins = 0;
    }

    // Хелпер для списания денег
    public spendMoney(amount: number): boolean {
        if (this.cash >= amount) {
            this.cash -= amount;
            return true;
        }
        return false;
    }

    // Хелпер для изменения Heat
    public changeHeat(amount: number, multiplier: number = 1.0) {
        // Если нагреваемся (amount > 0), применяем множитель (например от VPN)
        const finalAmount = amount > 0 ? amount * multiplier : amount;
        this.cash = Math.max(0, this.cash); // Защита от NaN (на всякий)
        this.heat = Math.min(100, Math.max(0, this.heat + finalAmount));
    }
}

// Экспортируем ЕДИНСТВЕННЫЙ экземпляр, который будет доступен везде
export const gameState = new GameState();