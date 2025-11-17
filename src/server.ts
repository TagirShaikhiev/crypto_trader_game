// src/server.ts
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { RoomManager } from './RoomManager.js';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from './types.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Настройка CORS важна, если фронт будет на другом порту (например, React/Vite)
const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
  cors: {
    origin: "*", // Для разработки разрешаем всё
    methods: ["GET", "POST"]
  }
});

// Раздача статики (если билд фронта лежит тут же)
app.use(express.static(path.join(__dirname, '../public')));

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- ХОСТ ---
  socket.on('createRoom', () => {
    const room = roomManager.createRoom(socket.id);
    socket.join(room.code);
    socket.emit('roomCreated', room.code);
    console.log(`Room created: ${room.code} by ${socket.id}`);
  });

  // --- ИГРОК ---
  socket.on('joinRoom', (roomCode: string, playerName: string) => {
    const room = roomManager.getRoom(roomCode);

    if (!room) {
      socket.emit('error', 'Комната не найдена');
      return;
    }

    const newPlayer = { id: socket.id, name: playerName, score: 0 };
    roomManager.addPlayer(roomCode, newPlayer);

    // Сохраняем данные в объект сокета для удобства при дисконнекте
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;

    socket.join(roomCode); // Socket.io комната

    socket.emit('joinedSuccess', roomCode);
    
    // Уведомляем ХОСТА (и всех в комнате, если нужно отображать список на телефонах)
    io.to(room.hostId).emit('playerJoined', newPlayer);
    io.to(room.hostId).emit('updatePlayerList', room.players);
    
    console.log(`Player ${playerName} joined room ${roomCode}`);
  });

  // --- ИГРОВАЯ ЛОГИКА ---
  socket.on('jump', () => {
    // Берем код комнаты из данных сокета (мы сохранили его при входе)
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (room) {
      // Пересылаем сигнал ТОЛЬКО Хосту этой комнаты
      io.to(room.hostId).emit('playerJumped', socket.id);
    }
  });
  

  // --- ОТКЛЮЧЕНИЕ ---
  socket.on('disconnect', () => {
    // Если у нас есть данные в socket.data, мы знаем, откуда вышел игрок
    if (socket.data.roomCode) {
        const result = roomManager.removePlayer(socket.id);
        if (result) {
            const room = roomManager.getRoom(result.roomCode);
            if (room) {
                 // Сообщаем хосту, что игрок вышел, отправив обновленный список
                 io.to(room.hostId).emit('updatePlayerList', room.players);
            }
        }
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});