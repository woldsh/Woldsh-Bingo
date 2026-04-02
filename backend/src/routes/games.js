const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { adminAuthMiddleware } = require('../middleware/adminAuth');
const { generateCard, callNumber } = require('../services/bingo');
const { startGameLoop, calculateDerash, broadcast } = require('../services/gameEngine');

const router = express.Router();

const activeTimers = new Map(); // gameId -> timeoutId

/**
 * Schedule a game to auto-start after the 30-second window
 * Minimum 2 players required to start
 */
const scheduleGameStart = (id, targetTime) => {
    if (activeTimers.has(id)) return;

    const now = Date.now();
    let delay = targetTime ? new Date(targetTime).getTime() - now : 30000;
    if (delay < 0) delay = 0;

    const timeoutId = setTimeout(async () => {
        activeTimers.delete(id);
        try {
            const checkGame = await prisma.game.findUnique({
                where: { id },
                include: { players: true }
            });

            if (!checkGame || checkGame.status !== 'waiting') return;

            if (checkGame.players.length >= 2) {
                // Minimum 2 players reached — start the game!
                const firstNum = callNumber([]);
                await prisma.game.update({
                    where: { id },
                    data: {
                        status: 'playing',
                        calledNums: [firstNum],
                    }
                });

                console.log(`[GameStart] 🎮 Game #${id} started with ${checkGame.players.length} players`);

                // Broadcast game start to all players in the room
                broadcast(id, 'game_started', {
                    gameId: id,
                    firstNumber: firstNum,
                    playerCount: checkGame.players.length,
                });

                // Start the server-side game engine loop
                startGameLoop(id);

            } else {
                // Not enough players, reset timer for another 30 seconds
                console.log(`[GameStart] Game #${id} has ${checkGame.players.length} player(s), need 2. Resetting timer.`);
                const newStartAt = new Date(Date.now() + 30000);
                await prisma.game.update({
                    where: { id },
                    data: { startAt: newStartAt }
                });

                // Broadcast updated timer
                broadcast(id, 'timer_reset', {
                    startAt: newStartAt.toISOString(),
                    reason: 'Need minimum 2 players',
                });

                scheduleGameStart(id, newStartAt);
            }
        } catch (e) {
            console.error('Auto-start timeout failed:', e);
        }
    }, delay);

    activeTimers.set(id, timeoutId);
};

// GET /api/games - List active game rooms
router.get('/', async (req, res) => {
    try {
        const rooms = [];

        // Fetch active templates from DB, ordered by stake
        let templates = await prisma.roomTemplate.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { stake: 'asc' }]
        });

        // If no templates defined in admin, return empty rooms
        if (templates.length === 0) {
            return res.json({ rooms: [] });
        }

        for (const template of templates) {
            // If room is in maintenance, show it but don't create/lookup games
            if (template.isMaintenance) {
                rooms.push({
                    id: null,
                    stake: template.stake,
                    roomName: template.name,
                    status: 'maintenance',
                    playerCount: 0,
                    maxPlayers: template.maxPlayers,
                    prize: 0,
                    derash: 0,
                    theme: template.theme || 'blue',
                    takenNumbers: [],
                    startAt: null,
                    isMaintenance: true,
                });
                continue;
            }

            let game = await prisma.game.findFirst({
                where: {
                    stake: template.stake,
                    status: 'waiting',
                },
                include: {
                    players: {
                        select: { id: true, userId: true, pickedNumbers: true, cardCount: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!game) {
                const newStartAt = new Date(Date.now() + 30000);

                game = await prisma.game.create({
                    data: {
                        stake: template.stake,
                        roomName: template.name,
                        maxPlayers: template.maxPlayers || 1000,
                        prize: 0,
                        startAt: newStartAt,
                    },
                    include: {
                        players: {
                            select: { id: true, userId: true, pickedNumbers: true, cardCount: true }
                        }
                    }
                });
                scheduleGameStart(game.id, newStartAt);
            } else {
                scheduleGameStart(game.id, game.startAt);
            }

            // Calculate live Derash
            const takenNumbers = [];
            let totalCards = 0;
            for (const p of game.players) {
                takenNumbers.push(...(p.pickedNumbers || []));
                totalCards += (p.cardCount || 1);
            }
            const liveDerash = calculateDerash(game.players.length, game.stake, totalCards);

            rooms.push({
                id: game.id,
                stake: game.stake,
                roomName: template.name,
                status: game.status,
                playerCount: game.players.length,
                maxPlayers: game.maxPlayers,
                prize: liveDerash,
                derash: liveDerash,
                theme: template.theme || 'blue',
                takenNumbers,
                startAt: game.startAt,
                isMaintenance: false,
            });
        }

        res.json({ rooms });
    } catch (error) {
        console.error('Error listing games:', error);
        res.status(500).json({ error: 'Failed to list games' });
    }
});

/**
 * POST /api/games/:id/join - Join a game room
 */
router.post('/:id/join', authMiddleware, async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);
        const userId = req.user.id;
        const { pickedNumbers = [], cardCount = 1 } = req.body;

        // Check if room is in maintenance
        const game_ = await prisma.game.findUnique({ where: { id: gameId } });
        if (game_) {
            const roomTemplate = await prisma.roomTemplate.findFirst({
                where: { stake: game_.stake, isActive: true }
            });
            if (roomTemplate && roomTemplate.isMaintenance) {
                return res.status(403).json({ error: 'This room is currently under maintenance. Please try again later.' });
            }
        }

        // Check if player is banned
        if (req.user.status === 'banned') {
            return res.status(403).json({ error: 'Your account has been banned. You cannot join games.' });
        }

        // Validate cardCount
        if (![1, 2].includes(cardCount)) {
            return res.status(400).json({ error: 'Card count must be 1 or 2' });
        }

        // Validate pickedNumbers
        if (!Array.isArray(pickedNumbers) || pickedNumbers.length < 1 || pickedNumbers.length > 2) {
            return res.status(400).json({ error: 'You must pick 1 or 2 numbers' });
        }

        for (const num of pickedNumbers) {
            if (!Number.isInteger(num) || num < 1 || num > 200) {
                return res.status(400).json({ error: 'Each picked number must be between 1 and 200' });
            }
        }

        // Check for duplicates in picks
        if (new Set(pickedNumbers).size !== pickedNumbers.length) {
            return res.status(400).json({ error: 'Duplicate picked numbers are not allowed' });
        }

        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: { players: true }
        });

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.status !== 'waiting') {
            return res.status(400).json({ error: 'The game has already started. Wait for the next round to join.' });
        }

        if (game.players.length >= game.maxPlayers) {
            return res.status(400).json({ error: 'Game is full' });
        }

        // Check if already joined
        const existing = game.players.find(p => p.userId === userId);
        if (existing) {
            return res.json({
                message: 'Already joined',
                gamePlayer: {
                    ...existing,
                    card: existing.card,
                    card2: existing.card2,
                    pickedNumbers: existing.pickedNumbers,
                    cardCount: existing.cardCount,
                }
            });
        }

        // Check if picked numbers are already taken
        for (const p of game.players) {
            for (const num of pickedNumbers) {
                if (p.pickedNumbers.includes(num)) {
                    return res.status(400).json({ error: `Number ${num} is already taken by another player` });
                }
            }
        }

        // Check balance (charge per card)
        const totalCost = game.stake * cardCount;
        if (req.user.balance < totalCost) {
            return res.status(400).json({ error: `Insufficient balance. You need ${totalCost} ETB to play with ${cardCount} card(s).` });
        }

        // Generate bingo card(s)
        const card = generateCard();
        const card2 = cardCount === 2 ? generateCard() : null;

        // Create game player and deduct balance in a transaction
        const [gamePlayer] = await prisma.$transaction([
            prisma.gamePlayer.create({
                data: {
                    gameId,
                    userId,
                    card,
                    card2,
                    pickedNumbers,
                    cardCount,
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    balance: { decrement: totalCost }
                }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    type: 'bet',
                    amount: totalCost,
                    status: 'completed',
                    note: `Bet on game #${gameId} (${game.roomName}) - ${cardCount} card(s), picks: [${pickedNumbers.join(', ')}]`,
                }
            })
        ]);

        // Calculate updated Derash after this player joins
        const allPlayers = await prisma.gamePlayer.findMany({ where: { gameId } });
        let totalCards = 0;
        for (const p of allPlayers) {
            totalCards += (p.cardCount || 1);
        }
        const liveDerash = calculateDerash(allPlayers.length, game.stake, totalCards);

        // Update game prize to live value
        await prisma.game.update({
            where: { id: gameId },
            data: { prize: liveDerash }
        });

        // Broadcast player joined + updated Derash to ALL players in the room
        broadcast(gameId, 'player_joined', {
            playerCount: allPlayers.length,
            derash: liveDerash,
            prize: liveDerash,
            newPlayerName: req.user.firstName || req.user.username || 'Player',
        });

        res.json({
            message: 'Joined game successfully',
            gamePlayer: {
                id: gamePlayer.id,
                card: gamePlayer.card,
                card2: gamePlayer.card2,
                pickedNumbers: gamePlayer.pickedNumbers,
                cardCount: gamePlayer.cardCount,
                gameId,
            },
            derash: liveDerash,
        });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ error: 'Failed to join game' });
    }
});

/**
 * GET /api/games/:id - Get game state
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);
        const userId = req.user.id;

        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                players: {
                    select: {
                        id: true,
                        userId: true,
                        card: true,
                        card2: true,
                        markedNums: true,
                        markedNums2: true,
                        pickedNumbers: true,
                        cardCount: true,
                        isWinner: true,
                        user: {
                            select: { firstName: true, username: true }
                        }
                    }
                }
            }
        });

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.status === 'waiting' && game.startAt) {
            scheduleGameStart(game.id, game.startAt);
        }

        const myPlayer = game.players.find(p => p.userId === userId);
        const takenNumbers = game.players.flatMap(p => p.pickedNumbers);

        // Calculate live Derash
        let totalCards = 0;
        for (const p of game.players) {
            totalCards += (p.cardCount || 1);
        }
        const liveDerash = calculateDerash(game.players.length, game.stake, totalCards);

        res.json({
            game: {
                id: game.id,
                status: game.status,
                roomName: game.roomName,
                stake: game.stake,
                prize: liveDerash,
                derash: liveDerash,
                calledNums: game.calledNums,
                playerCount: game.players.length,
                maxPlayers: game.maxPlayers,
                startAt: game.startAt,
                takenNumbers,
                winPattern: game.winPattern,
                winnerId: game.winnerId,
            },
            myCard: myPlayer ? myPlayer.card : null,
            myCard2: myPlayer ? myPlayer.card2 : null,
            myMarkedNums: myPlayer ? myPlayer.markedNums : [],
            myMarkedNums2: myPlayer ? myPlayer.markedNums2 : [],
            myPickedNumbers: myPlayer ? myPlayer.pickedNumbers : [],
            myCardCount: myPlayer ? myPlayer.cardCount : 1,
            myPlayerId: myPlayer ? myPlayer.id : null,
            isWinner: myPlayer ? myPlayer.isWinner : false,
            players: game.players.map(p => ({
                id: p.id,
                name: p.user.firstName || p.user.username || 'Player',
                isWinner: p.isWinner,
            })),
        });
    } catch (error) {
        console.error('Error getting game:', error);
        res.status(500).json({ error: 'Failed to get game' });
    }
});

/**
 * POST /api/games/:id/call - Call next number (kept for admin/manual use)
 */
router.post('/:id/call', authMiddleware, async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);

        const game = await prisma.game.findUnique({
            where: { id: gameId },
        });

        if (!game || game.status !== 'playing') {
            return res.status(400).json({ error: 'Game is not active' });
        }

        const nextNum = callNumber(game.calledNums);
        if (nextNum === null) {
            return res.status(400).json({ error: 'All numbers have been called' });
        }

        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: {
                calledNums: [...game.calledNums, nextNum],
            },
        });

        res.json({
            calledNumber: nextNum,
            allCalledNums: updatedGame.calledNums,
        });
    } catch (error) {
        console.error('Error calling number:', error);
        res.status(500).json({ error: 'Failed to call number' });
    }
});

/**
 * POST /api/games/:id/mark - Mark a number on card (kept for manual marking)
 */
router.post('/:id/mark', authMiddleware, async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);
        const userId = req.user.id;
        const { number, cardIndex = 0 } = req.body;

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game || game.status !== 'playing') {
            return res.status(400).json({ error: 'Game is not active' });
        }

        if (!game.calledNums.includes(number)) {
            return res.status(400).json({ error: 'Number has not been called yet' });
        }

        const player = await prisma.gamePlayer.findFirst({
            where: { gameId, userId }
        });

        if (!player) {
            return res.status(404).json({ error: 'You are not in this game' });
        }

        // Determine which card and marked array to use
        const card = cardIndex === 1 ? player.card2 : player.card;
        const currentMarked = cardIndex === 1 ? player.markedNums2 : player.markedNums;
        const markedField = cardIndex === 1 ? 'markedNums2' : 'markedNums';

        if (!card) {
            return res.status(400).json({ error: 'Invalid card index' });
        }

        // Check the number is on the card
        let onCard = false;
        for (const col of card) {
            if (col.includes(number)) {
                onCard = true;
                break;
            }
        }

        if (!onCard) {
            return res.status(400).json({ error: 'Number is not on your card' });
        }

        if (currentMarked.includes(number)) {
            return res.json({ marked: currentMarked, won: false });
        }

        // Mark the number
        const newMarked = [...currentMarked, number];
        await prisma.gamePlayer.update({
            where: { id: player.id },
            data: { [markedField]: newMarked }
        });

        res.json({
            marked: newMarked,
            won: false,
            message: 'Number marked. Winner detection is handled automatically by the server.',
        });
    } catch (error) {
        console.error('Error marking number:', error);
        res.status(500).json({ error: 'Failed to mark number' });
    }
});

// =============================================
// Admin Game Controls
// =============================================

/**
 * POST /api/games/:id/force-start - Admin force start a game
 */
router.post('/:id/force-start', adminAuthMiddleware, async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);

        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: { players: true }
        });

        if (!game) return res.status(404).json({ error: 'Game not found' });
        if (game.status !== 'waiting') return res.status(400).json({ error: 'Game is not in waiting state' });

        if (game.players.length === 0) {
            return res.status(400).json({ error: 'Cannot start game with 0 players' });
        }

        const firstNum = callNumber([]);
        await prisma.game.update({
            where: { id: gameId },
            data: {
                status: 'playing',
                calledNums: [firstNum],
            }
        });

        // Broadcast game start
        if (req.io) {
            req.io.to(`game_${gameId}`).emit('game_started', {
                gameId,
                firstNumber: firstNum,
                playerCount: game.players.length,
            });
        }

        // Start server-side game loop
        startGameLoop(gameId);

        res.json({ success: true, message: 'Game forced started', gameId });
    } catch (error) {
        console.error('Error force starting game:', error);
        res.status(500).json({ error: 'Failed to force start' });
    }
});

/**
 * POST /api/games/:id/force-end - Admin force end a game (no payout)
 */
router.post('/:id/force-end', adminAuthMiddleware, async (req, res) => {
    try {
        const gameId = parseInt(req.params.id);

        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) return res.status(404).json({ error: 'Game not found' });

        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: { status: 'cancelled' }
        });

        // Stop the game engine loop if running
        const { stopGameLoop } = require('../services/gameEngine');
        stopGameLoop(gameId);

        // Broadcast cancellation
        if (req.io) {
            req.io.to(`game_${gameId}`).emit('game_cancelled', { message: 'Game was cancelled by Admin' });
        }

        res.json({ success: true, message: 'Game cancelled successfully', game: updatedGame });
    } catch (error) {
        console.error('Error force ending game:', error);
        res.status(500).json({ error: 'Failed to force end' });
    }
});

module.exports = router;
