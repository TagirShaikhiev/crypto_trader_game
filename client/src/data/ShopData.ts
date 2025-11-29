export interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    icon: string; // Эмодзи или символ
    oneTime: boolean; // true = Расходник (на 1 раз), false = Навсегда
}

export const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'coffee',
        name: 'PREMIUM COFFEE',
        description: 'Restores focus. Just tasty.',
        price: 150,
        icon: '☕',
        oneTime: true
    },
    {
        id: 'bribe_small',
        name: 'LOCAL BRIBE',
        description: 'Reduces HEAT by 20%.',
        price: 2000,
        icon: '🤝',
        oneTime: true
    },
    {
        id: 'bribe_big',
        name: 'SEC INSIDER',
        description: 'Reduces HEAT by 50%. Expensive.',
        price: 5000,
        icon: '🕴️',
        oneTime: true
    },
    {
        id: 'bot_net',
        name: 'BOT FARM LITE',
        description: '+25% News Impact Power (1 Day).',
        price: 3500,
        icon: '🤖',
        oneTime: true
    },
    {
        id: 'vpn',
        name: 'OFFSHORE VPN',
        description: 'Passive: HEAT grows 20% slower.',
        price: 8000,
        icon: '🛡️',
        oneTime: false // Permanent upgrade
    }
];

// Helper to find an item by its ID
export const getItemById = (id: string): ShopItem | undefined => {
    return SHOP_ITEMS.find(item => item.id === id);
};