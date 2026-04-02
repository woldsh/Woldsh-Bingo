/**
 * Game Engine - Server-Authoritative Bingo Game Loop
 * 
 * Handles:
 * - Automatic number calling every 3 seconds
 * - Server-side auto-marking of all player cards
 * - Automatic win detection across all cards after each call
 * - Atomic winner selection with race condition protection
 * - Real-time WebSocket broadcasting to all connected players
 * - Dynamic Derash (prize pool) calculation
 */

const prisma = require('../lib/prisma');
const { callNumber, getLetterForNumber, checkAllPatterns, getMatchingNumbers } = require('./bingo');

// Track active game loops to prevent duplicates
const activeGames = new Map(); // gameId -> intervalId

// Reference to Socket.IO instance (set from server.js)
let ioInstance = null;

/**
 * Set the Socket.IO instance for broadcasting
 */
function setIO(io) {
    ioInstance = io;
}

/**
 * Calculate live Derash (prize pool) for a game
 * Derash = totalCards × stake × 0.8 (20% house fee)
 */
function calculateDerash(playerCount, stake, totalCards = null) {
    const cards = totalCards || playerCount;
    return Math.floor(cards * stake * 0.8);
}

/**
 * Start the server-side game loop for a game
 * This is called when a game transitions from 'waiting' to 'playing'
 */
async function startGameLoop(gameId) {
    // Prevent double-starting
    if (activeGames.has(gameId)) {
        console.log(`[GameEngine] Game #${gameId} loop already running, skipping`);
        return;
    }

    console.log(`[GameEngine] 🎮 Starting game loop for game #${gameId}`);

    // Call the first number immediately
    await callAndProcess(gameId);

    // Then call numbers every 3 seconds
    const intervalId = setInterval(async () => {
        const shouldContinue = await callAndProcess(gameId);
        if (!shouldContinue) {
            stopGameLoop(gameId);
        }
    }, 3000);

    activeGames.set(gameId, intervalId);
}

/**
 * Stop a game loop
 */
function stopGameLoop(gameId) {
    const intervalId = activeGames.get(gameId);
    if (intervalId) {
        clearInterval(intervalId);
        activeGames.delete(gameId);
        console.log(`[GameEngine] 🛑 Stopped game loop for game #${gameId}`);
    }
}

/**
 * Core game tick: call a number, auto-mark, check for winners
 * Returns false if the game should stop (winner found or all numbers called)
 */
async function callAndProcess(gameId) {
    try {
        // Fetch fresh game state
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                players: {
                    include: {
                        user: { select: { firstName: true, username: true } }
                    }
                }
            }
        });

        if (!game) {
            console.log(`[GameEngine] Game #${gameId} not found, stopping`);
            return false;
        }

        // Only process active games
        if (game.status !== 'playing') {
            console.log(`[GameEngine] Game #${gameId} status is ${game.status}, stopping`);
            return false;
        }

        // Call next number
        const nextNum = callNumber(game.calledNums);
        if (nextNum === null) {
            console.log(`[GameEngine] All 75 numbers called in game #${gameId}, ending with no winner`);
            await prisma.game.update({
                where: { id: gameId },
                data: { status: 'finished' }
            });
            broadcast(gameId, 'game_finished', {
                gameId,
                reason: 'all_numbers_called',
                winnerId: null,
            });
            return false;
        }

        const newCalledNums = [...game.calledNums, nextNum];
        const letter = getLetterForNumber(nextNum);

        // Update game with new called number
        await prisma.game.update({
            where: { id: gameId },
            data: { calledNums: newCalledNums }
        });

        // Broadcast the called number
        broadcast(gameId, 'number_called', {
            number: nextNum,
            letter,
            allCalledNums: newCalledNums,
            calledCount: newCalledNums.length,
        });

        // Auto-mark all player cards and check for winners
        let winnerFound = null;

        for (const player of game.players) {
            // === Card 1 ===
            const card1Matches = getMatchingNumbers(player.card, newCalledNums);
            if (card1Matches.length !== player.markedNums.length) {
                await prisma.gamePlayer.update({
                    where: { id: player.id },
                    data: { markedNums: card1Matches }
                });
            }

            // Check card 1 for win
            const result1 = checkAllPatterns(player.card, card1Matches);
            if (result1.won && !winnerFound) {
                winnerFound = {
                    player,
                    cardIndex: 0,
                    pattern: result1.pattern,
                    detail: result1.detail,
                    markedNums: card1Matches,
                };
            }

            // === Card 2 (if exists) ===
            if (player.card2) {
                const card2Matches = getMatchingNumbers(player.card2, newCalledNums);
                if (card2Matches.length !== player.markedNums2.length) {
                    await prisma.gamePlayer.update({
                        where: { id: player.id },
                        data: { markedNums2: card2Matches }
                    });
                }

                const result2 = checkAllPatterns(player.card2, card2Matches);
                if (result2.won && !winnerFound) {
                    winnerFound = {
                        player,
                        cardIndex: 1,
                        pattern: result2.pattern,
                        detail: result2.detail,
                        markedNums: card2Matches,
                    };
                }
            }
        }

        // Broadcast auto-mark updates
        broadcast(gameId, 'cards_updated', {
            calledNums: newCalledNums,
            calledCount: newCalledNums.length,
        });

        // If a winner was found, process the win
        if (winnerFound) {
            return await processWinner(game, winnerFound, newCalledNums);
        }

        return true; // Continue the loop

    } catch (error) {
        console.error(`[GameEngine] Error in game #${gameId} tick:`, error);
        return true; // Continue despite error (don't crash the loop)
    }
}

/**
 * Process a winner - atomic transaction to prevent race conditions
 * Returns false to stop the game loop
 */
async function processWinner(game, winnerData, calledNums) {
    const { player, cardIndex, pattern, detail } = winnerData;
    const gameId = game.id;
    const userId = player.userId;

    try {
        // Calculate live Derash
        let totalCards = 0;
        for (const p of game.players) {
            totalCards += (p.cardCount || 1);
        }
        const derash = calculateDerash(game.players.length, Number(game.stake), totalCards);

        const winnerName = player.user?.firstName || player.user?.username || 'Player';

        console.log(`[GameEngine] 🏆 Winner found in game #${gameId}!`);
        console.log(`[GameEngine]    Player: ${winnerName} (ID: ${userId})`);
        console.log(`[GameEngine]    Pattern: ${detail}`);
        console.log(`[GameEngine]    Derash: ${derash} ETB`);

        // Atomic transaction: verify game is still playing, then lock it
        await prisma.$transaction(async (tx) => {
            // Re-check game status inside transaction to prevent race conditions
            const freshGame = await tx.game.findUnique({
                where: { id: gameId },
                select: { status: true }
            });

            if (freshGame.status !== 'playing') {
                throw new Error('Game already finished (race condition prevented)');
            }

            // 1. Mark game as finished
            await tx.game.update({
                where: { id: gameId },
                data: {
                    status: 'finished',
                    winnerId: userId,
                    prize: derash,
                    winPattern: pattern,
                }
            });

            // 2. Mark player as winner
            await tx.gamePlayer.update({
                where: { id: player.id },
                data: { isWinner: true }
            });

            // 3. Credit winner's wallet
            await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: derash } }
            });

            // 4. Create win transaction record
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'win',
                    amount: derash,
                    status: 'completed',
                    note: `Won game #${gameId} (${game.roomName}) - ${detail} - ${derash} ETB`,
                }
            });

            // 5. Create claim record for audit
            await tx.claim.create({
                data: {
                    gameId,
                    userId,
                    playerId: player.id,
                    cardIndex,
                    status: 'approved',
                    calledNums,
                    matchData: {
                        pattern,
                        detail,
                        derash,
                        calledCount: calledNums.length,
                        autoDetected: true,
                        timestamp: new Date().toISOString(),
                    }
                }
            });
        });

        // Broadcast winner to all players
        broadcast(gameId, 'game_won', {
            gameId,
            winnerId: userId,
            winnerPlayerId: player.id,
            winnerName,
            pattern,
            patternDetail: detail,
            prize: derash,
            cardIndex,
            calledCount: calledNums.length,
        });

        broadcast(gameId, 'game_finished', {
            gameId,
            winnerId: userId,
            winnerName,
            prize: derash,
            pattern,
        });

        return false; // Stop the loop

    } catch (error) {
        if (error.message.includes('race condition')) {
            console.log(`[GameEngine] Race condition prevented in game #${gameId}`);
        } else {
            console.error(`[GameEngine] Error processing winner in game #${gameId}:`, error);
        }
        return false; // Stop the loop either way
    }
}

/**
 * Broadcast an event to all players in a game room
 */
function broadcast(gameId, event, data) {
    if (ioInstance) {
        ioInstance.to(`game_${gameId}`).emit(event, data);
    }
}

/**
 * Get the count of active game loops
 */
function getActiveGameCount() {
    return activeGames.size;
}

/**
 * Stop all active game loops (for cleanup)
 */
function stopAllGames() {
    for (const [gameId, intervalId] of activeGames) {
        clearInterval(intervalId);
        console.log(`[GameEngine] Stopped game #${gameId}`);
    }
    activeGames.clear();
}

module.exports = {
    setIO,
    startGameLoop,
    stopGameLoop,
    callAndProcess,
    calculateDerash,
    getActiveGameCount,
    stopAllGames,
    broadcast,
};
