import { type Room, type Player } from './types.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  // Генерация кода (4 буквы)
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Рекурсивно проверяем, не занят ли код
    return this.rooms.has(result) ? this.generateCode() : result;
  }

  createRoom(hostId: string): Room {
    const code = this.generateCode();
    const newRoom: Room = {
      code,
      hostId,
      players: [],
      gameState: 'LOBBY'
    };
    this.rooms.set(code, newRoom);
    return newRoom;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  addPlayer(roomCode: string, player: Player): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    
    room.players.push(player);
    return true;
  }

  removePlayer(socketId: string): { roomCode: string, player: Player } | null {
    // Это неэффективный поиск, но для прототипа пойдет.
    // todo: хранить мапу socketId -> roomCode
    for (const [code, room] of this.rooms) {
      const index = room.players.findIndex(p => p.id === socketId);
      if (index !== -1) {
        const removedPlayer = room.players[index];
        room.players.splice(index, 1);
        
        // Если комната пуста и хост отключился — удаляем комнату (логику можно усложнить)
        if (room.players.length === 0 && room.hostId === socketId) {
            this.rooms.delete(code);
        }
        
        return { roomCode: code, player: removedPlayer };
      }
    }
    return null;
  }
  
  removeRoom(code: string) {
      this.rooms.delete(code);
  }
}