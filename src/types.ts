// src/types.ts

// Данные игрока
export interface Player {
  id: string;
  name: string;
  score: number;
}

// Данные комнаты
export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  gameState: 'LOBBY' | 'GAME' | 'RESULTS';
}

// События, которые отправляет КЛИЕНТ (нам)
export interface ClientToServerEvents {
  createRoom: () => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  jump: () => void;
}

// События, которые отправляет СЕРВЕР (клиентам)
export interface ServerToClientEvents {
  roomCreated: (code: string) => void;
  playerJoined: (player: Player) => void;
  joinedSuccess: (roomCode: string) => void;
  error: (message: string) => void;
  updatePlayerList: (players: Player[]) => void;
  playerJumped: (playerId: string) => void;
}

// Данные внутри сокета (для хранения ID комнаты прямо в сокете)
export interface SocketData {
  roomCode: string;
  playerName: string;
}