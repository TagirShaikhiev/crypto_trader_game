import { io, Socket } from 'socket.io-client';

// const SERVER_URL = 'http://localhost:3000';
// локальный сервер
const socket: Socket = io();

// Элементы DOM
const loginScreen = document.getElementById('login-screen')!;
const gameScreen = document.getElementById('game-screen')!;
const joinBtn = document.getElementById('join-btn')!;
const jumpBtn = document.getElementById('jump-btn')!;
const roomInput = document.getElementById('room-code') as HTMLInputElement;
const nameInput = document.getElementById('player-name') as HTMLInputElement;
const errorMsg = document.getElementById('error-msg')!;

// Логика входа
joinBtn.addEventListener('click', () => {
  const code = roomInput.value.toUpperCase();
  const name = nameInput.value;
  if (code.length === 4 && name.length > 0) {
    socket.emit('joinRoom', code, name);
  } else {
    errorMsg.innerText = "Enter code and name!";
  }
});

// Логика кнопки (Прыжок)
jumpBtn.addEventListener('click', () => {
    socket.emit('jump');
});

// Ответы сервера
socket.on('joinedSuccess', (roomCode) => {
    console.log(roomCode);
    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');
    document.getElementById('player-display')!.innerText = nameInput.value;
});

socket.on('error', (msg) => {
    errorMsg.innerText = msg;
});