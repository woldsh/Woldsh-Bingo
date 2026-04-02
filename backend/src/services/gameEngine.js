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
 * 
 * IMPORTANT: Uses chained setTimeout (not setInterval) to prevent
 * overlapping ticks that could cause multiple winners.
 */

const prisma = require('../lib/prisma');
const { callNumber, getLetterForNumber, checkAllPatterns, getMatchingNumbers, PATTERN_PRIORITY } = require('./bingo');

// Track active game loops to prevent duplicates
// gameId -> timeoutId (using setTimeout, NOT setInterval)
const activeGames = new Map();

// In-memory lock: prevents concurrent processing of the same game
// This is the PRIMARY guard against two winners
const processingGames = new Set();

// Games that have been won (in-memory flag, checked BEFORE any DB read)
// This is set synchronously the instant a winner is detected
const finishedGames = new Set();

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
 * Uses chained setTimeout to guarantee sequential tick execution.
 * Each tick FULLY completes before the next one is scheduled.
 */
async function startGameLoop(gameId) {
    // Prevent double-starting
    if (activeGames.has(gameId)) {
        console.log(`[GameEngine] Game #${gameId} loop already running, skipping`);
        return;
    }

    // Clear any stale finished flag (new game with same ID)
    finishedGames.delete(gameId);

    console.log(`[GameEngine] 🎮 Starting game loop for game #${gameId}`);

    // Mark as active immediately with a placeholder
    activeGames.set(gameId, 'starting');

    // Process first tick immediately (awaited - blocks until complete)
    const shouldContinue = await callAndProcess(gameId);

    if (shouldContinue) {
        // Schedule next tick only after the first one fully completed
        scheduleNextTick(gameId);
    } else {
        // Game ended on first tick (very unlikely but possible)
        activeGames.delete(gameId);
        processingGames.delete(gameId);
        console.log(`[GameEngine] 🛑 Game #${gameId} ended on first tick`);
    }
}

/**
 * Schedule the next game tick using setTimeout.
 * The callback awaits callAndProcess, ensuring no overlap.
 */
function scheduleNextTick(gameId) {
    const timeoutId = setTimeout(async () => {
        const shouldContinue = await callAndProcess(gameId);
        if (shouldContinue) {
            // Chain the next tick — only runs AFTER this one fully completes
            scheduleNextTick(gameId);
        } else {
            // Game ended — clean up
            activeGames.delete(gameId);
            processingGames.delete(gameId);
            console.log(`[GameEngine] 🛑 Game loop ended for game #${gameId}`);
        }
    }, 3000);

    activeGames.set(gameId, timeoutId);
}

/**
 * Stop a game loop
 */
function stopGameLoop(gameId) {
    const timeoutId = activeGames.get(gameId);
    if (timeoutId && timeoutId !== 'starting') {
        clearTimeout(timeoutId);
    }
    activeGames.delete(gameId);
    processingGames.delete(gameId);
    finishedGames.add(gameId); // Mark as finished to block any in-flight ticks
    console.log(`[GameEngine] 🛑 Stopped game loop for game #${gameId}`);
}

/**
 * Core game tick: call a number, auto-mark, check for winners
 * Returns false if the game should stop (winner found or all numbers called)
 * 
 * CRITICAL: This function is protected by an in-memory lock.
 * Only ONE tick can run at a time per game.
 */
async function callAndProcess(gameId) {
    // ===== GUARD 1: In-memory finished flag (instant, no DB read) =====
    if (finishedGames.has(gameId)) {
        console.log(`[GameEngine] Game #${gameId} already finished (in-memory flag), skipping tick`);
        return false;
    }

    // ===== GUARD 2: In-memory lock (prevents concurrent ticks) =====
    if (processingGames.has(gameId)) {
        console.log(`[GameEngine] Game #${gameId} is being processed by another tick, skipping`);
        return false;
    }

    // Acquire lock
    processingGames.add(gameId);

    try {
        // ===== GUARD 3: Re-check finished flag after acquiring lock =====
        if (finishedGames.has(gameId)) {
            return false;
        }

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
            finishedGames.add(gameId);
            return false;
        }

        // ===== GUARD 4: DB status check =====
        if (game.status !== 'playing') {
            console.log(`[GameEngine] Game #${gameId} status is ${game.status}, stopping`);
            finishedGames.add(gameId);
            return false;
        }

        // Call next number
        const nextNum = callNumber(game.calledNums);
        if (nextNum === null) {
            console.log(`[GameEngine] All 75 numbers called in game #${gameId}, ending with no winner`);
            finishedGames.add(gameId); // Mark finished IMMEDIATELY
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

        // Auto-mark all player cards and collect ALL potential winners
        const potentialWinners = [];

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
            if (result1.won) {
                potentialWinners.push({
                    player,
                    cardIndex: 0,
                    pattern: result1.pattern,
                    detail: result1.detail,
                    markedNums: card1Matches,
                    priority: PATTERN_PRIORITY[result1.pattern] || 999,
                });
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
                if (result2.won) {
                    potentialWinners.push({
                        player,
                        cardIndex: 1,
                        pattern: result2.pattern,
                        detail: result2.detail,
                        markedNums: card2Matches,
                        priority: PATTERN_PRIORITY[result2.pattern] || 999,
                    });
                }
            }
        }

        // Broadcast auto-mark updates
        broadcast(gameId, 'cards_updated', {
            calledNums: newCalledNums,
            calledCount: newCalledNums.length,
        });

        // If potential winners were found, select THE ONE winner
        if (potentialWinners.length > 0) {
            // ===== IMMEDIATELY mark game as finished in-memory =====
            // This blocks any future ticks BEFORE we even hit the database
            finishedGames.add(gameId);

            // Select winner by highest pattern priority (lowest number = highest priority)
            // If tied on pattern priority, first player in the array wins (server order)
            potentialWinners.sort((a, b) => a.priority - b.priority);
            const winner = potentialWinners[0];

            if (potentialWinners.length > 1) {
                console.log(`[GameEngine] ⚠️ Multiple potential winners in game #${gameId} on same tick!`);
                console.log(`[GameEngine]    Candidates: ${potentialWinners.map(w => `${w.player.user?.firstName || 'Player'}(${w.pattern}:P${w.priority})`).join(', ')}`);
                console.log(`[GameEngine]    Selected winner: ${winner.player.user?.firstName || 'Player'} with ${winner.pattern} (priority ${winner.priority})`);
            }

            return await processWinner(game, winner, newCalledNums);
        }

        return true; // Continue the loop

    } catch (error) {
        console.error(`[GameEngine] Error in game #${gameId} tick:`, error);
        return true; // Continue despite error (don't crash the loop)
    } finally {
        // Release the lock (unless game is finished)
        if (!finishedGames.has(gameId)) {
            processingGames.delete(gameId);
        }
    }
}

/**
 * Process a winner - atomic transaction to prevent race conditions
 * Returns false to stop the game loop
 * 
 * IMPORTANT: finishedGames.add(gameId) is called BEFORE this function
 * so no new ticks can start even if this transaction takes time.
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
        console.log(`[GameEngine]    Server time: ${new Date().toISOString()}`);

        // Atomic transaction: verify game is still playing, then lock it
        await prisma.$transaction(async (tx) => {
            // Re-check game status inside transaction to prevent race conditions
            // This is a SECONDARY guard — the primary guard is the in-memory finishedGames Set
            const freshGame = await tx.game.findUnique({
                where: { id: gameId },
                select: { status: true, winnerId: true }
            });

            if (freshGame.status !== 'playing') {
                throw new Error('RACE_CONDITION: Game already finished');
            }

            if (freshGame.winnerId) {
                throw new Error('RACE_CONDITION: Game already has a winner');
            }

            // 1. Mark game as finished with winner
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
                        serverTickLock: true, // Indicates single-winner enforcement was active
                    }
                }
            });
        });

        console.log(`[GameEngine] ✅ Winner processed successfully for game #${gameId}`);

        // Broadcast winner to all players (ONLY after successful transaction)
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
        if (error.message.includes('RACE_CONDITION')) {
            console.log(`[GameEngine] 🛡️ Race condition prevented in game #${gameId}: ${error.message}`);
        } else {
            console.error(`[GameEngine] ❌ Error processing winner in game #${gameId}:`, error);
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
    for (const [gameId, timeoutId] of activeGames) {
        if (timeoutId && timeoutId !== 'starting') {
            clearTimeout(timeoutId);
        }
        finishedGames.add(gameId);
        console.log(`[GameEngine] Stopped game #${gameId}`);
    }
    activeGames.clear();
    processingGames.clear();
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
