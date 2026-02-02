const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

const rooms = {}; // roomCode -> { host, joiner, hostName, joinerName, started }

function generateRoomCode() {
    let code;
    do {
        code = String(Math.floor(1000 + Math.random() * 9000));
    } while (rooms[code]);
    return code;
}

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('createRoom', (playerName) => {
        const code = generateRoomCode();
        rooms[code] = {
            host: socket.id,
            joiner: null,
            hostName: playerName,
            joinerName: null,
            started: false
        };
        socket.join(code);
        socket.roomCode = code;
        socket.isHost = true;
        socket.emit('roomCreated', code);
        console.log(`Room ${code} created by ${playerName}`);
    });

    socket.on('joinRoom', ({ code, playerName }) => {
        const room = rooms[code];
        if (!room) {
            socket.emit('joinError', 'Room not found');
            return;
        }
        if (room.joiner) {
            socket.emit('joinError', 'Room is full');
            return;
        }
        if (room.started) {
            socket.emit('joinError', 'Game already started');
            return;
        }
        room.joiner = socket.id;
        room.joinerName = playerName;
        socket.join(code);
        socket.roomCode = code;
        socket.isHost = false;
        socket.emit('joinedRoom', { code, hostName: room.hostName });
        // Tell host that someone joined
        io.to(room.host).emit('partnerJoined', playerName);
        console.log(`${playerName} joined room ${code}`);
    });

    socket.on('startGame', () => {
        const code = socket.roomCode;
        const room = rooms[code];
        if (!room || !socket.isHost || !room.joiner) return;
        room.started = true;
        io.to(code).emit('gameStarted', {
            hostName: room.hostName,
            joinerName: room.joinerName
        });
        console.log(`Game started in room ${code}`);
    });

    // Relay player position/state to the other player
    socket.on('playerUpdate', (data) => {
        const code = socket.roomCode;
        if (!code) return;
        socket.to(code).emit('playerUpdate', data);
    });

    // Relay shot events
    socket.on('playerShoot', (data) => {
        const code = socket.roomCode;
        if (!code) return;
        socket.to(code).emit('playerShoot', data);
    });

    // Host sends enemy state, server relays to joiner
    socket.on('enemiesSync', (data) => {
        const code = socket.roomCode;
        if (!code || !socket.isHost) return;
        socket.to(code).emit('enemiesSync', data);
    });

    // Host triggers wave start
    socket.on('waveStart', (data) => {
        const code = socket.roomCode;
        if (!code || !socket.isHost) return;
        socket.to(code).emit('waveStart', data);
    });

    // Enemy killed - broadcast to other player
    socket.on('enemyKilled', (data) => {
        const code = socket.roomCode;
        if (!code) return;
        socket.to(code).emit('enemyKilled', data);
    });

    // Player died
    socket.on('playerDied', () => {
        const code = socket.roomCode;
        if (!code) return;
        socket.to(code).emit('partnerDied');
    });

    // Game over (both dead)
    socket.on('gameOverMulti', () => {
        const code = socket.roomCode;
        if (!code) return;
        io.to(code).emit('gameOverMulti');
    });

    socket.on('disconnect', () => {
        const code = socket.roomCode;
        if (!code || !rooms[code]) return;
        const room = rooms[code];
        console.log(`Player disconnected from room ${code}: ${socket.id}`);
        // Notify the other player
        socket.to(code).emit('partnerDisconnected');
        // Clean up room
        delete rooms[code];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Old Wars server running on http://localhost:${PORT}`);
});
