require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const gamesRouter = require('./routes/games');
const walletRouter = require('./routes/wallet');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const { setIO } = require('./services/gameEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3002'],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Admin-Role', 'X-Admin-Id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'bingo-son-api' });
});

// Make io accessible via req inside routes if needed
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/games', gamesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);

// --- Set IO instance for game engine ---
setIO(io);

// --- Socket.IO Game Namespace (Default) ---
io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    // Player joins a game room
    socket.on('join_game', (gameId) => {
        const room = `game_${gameId}`;
        socket.join(room);
        console.log(`🎮 ${socket.id} joined room ${room}`);
    });

    // Player leaves a game room
    socket.on('leave_game', (gameId) => {
        const room = `game_${gameId}`;
        socket.leave(room);
        console.log(`👋 ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Player disconnected: ${socket.id}`);
    });
});

// --- Socket.IO Admin Namespace ---
const adminIo = io.of('/admin');

adminIo.on('connection', (socket) => {
    console.log('Admin connected to socket namespace:', socket.id);
    socket.on('disconnect', () => {
        console.log('Admin disconnected:', socket.id);
    });
});

// Broadcast real-time stats every 5 seconds
setInterval(async () => {
    try {
        if (adminIo.sockets.size === 0) return; // don't query DB if no admins are listening

        const [activeGames, pendingDeposits] = await Promise.all([
            prisma.game.count({ where: { status: { in: ['waiting', 'playing'] } } }),
            prisma.transaction.count({ where: { type: 'deposit', status: 'pending' } })
        ]);

        // Example stats payload
        adminIo.emit('stats_update', {
            activeGames,
            pendingDeposits,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error broadcasting admin stats:', err);
    }
}, 5000);

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
    console.log(`🎮 Bingo Son API running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket.io enabled for games + /admin`);
});

module.exports = { app, server, io };
