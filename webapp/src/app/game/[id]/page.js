'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { hapticFeedback } from '@/lib/telegram';

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

function getLetterForNumber(num) {
    if (num >= 1 && num <= 15) return 'B';
    if (num >= 16 && num <= 30) return 'I';
    if (num >= 31 && num <= 45) return 'N';
    if (num >= 46 && num <= 60) return 'G';
    if (num >= 61 && num <= 75) return 'O';
    return '';
}

const PATTERN_LABELS = {
    four_corners: '🔲 Four Corners',
    horizontal_line: '➡️ Horizontal Line',
    vertical_line: '⬇️ Vertical Line',
    diagonal: '↗️ Diagonal',
};

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id;
    const socketRef = useRef(null);
    const hasJoinedRoom = useRef(false);

    // Pre-game state
    const [phase, setPhase] = useState('selecting'); // 'selecting' | 'playing'
    const [pickedNumbers, setPickedNumbers] = useState([]);
    const [cardCount, setCardCount] = useState(1);
    const [takenNumbers, setTakenNumbers] = useState([]);
    const [joining, setJoining] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Game state
    const [card, setCard] = useState(null);
    const [card2, setCard2] = useState(null);
    const [markedNums, setMarkedNums] = useState([]);
    const [markedNums2, setMarkedNums2] = useState([]);
    const [calledNums, setCalledNums] = useState([]);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [roomName, setRoomName] = useState('');
    const [stake, setStake] = useState(0);
    const [prize, setPrize] = useState(0);
    const [derash, setDerash] = useState(0);
    const [won, setWon] = useState(false);
    const [winPrize, setWinPrize] = useState(0);
    const [winPattern, setWinPattern] = useState('');
    const [winnerName, setWinnerName] = useState('');
    const [isMyWin, setIsMyWin] = useState(false);
    const [playerCount, setPlayerCount] = useState(0);
    const [maxPlayers, setMaxPlayers] = useState(1000);
    const [walletBalance, setWalletBalance] = useState(0);
    const [startAt, setStartAt] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [latestNumber, setLatestNumber] = useState(null);
    const [showBallAnimation, setShowBallAnimation] = useState(false);
    const [myPlayerId, setMyPlayerId] = useState(null);
    const myPlayerIdRef = useRef(null);

    useEffect(() => {
        myPlayerIdRef.current = myPlayerId;
    }, [myPlayerId]);

    // =================== SOCKET.IO SETUP ===================
    useEffect(() => {
        let socketModule;

        async function setupSocket() {
            socketModule = await import('@/lib/socket');
            const { socket, joinGameRoom } = socketModule;
            socketRef.current = socket;

            // Join the game room
            joinGameRoom(gameId);
            hasJoinedRoom.current = true;

            // === REAL-TIME EVENT LISTENERS ===

            // New player joined
            socket.on('player_joined', (data) => {
                console.log('[WS] player_joined:', data);
                setPlayerCount(data.playerCount);
                setDerash(data.derash);
                setPrize(data.derash);
            });

            // Timer reset (not enough players)
            socket.on('timer_reset', (data) => {
                console.log('[WS] timer_reset:', data);
                setStartAt(data.startAt);
            });

            // Game started!
            socket.on('game_started', (data) => {
                console.log('[WS] game_started:', data);
                setGameStatus('playing');
                if (data.firstNumber) {
                    setCalledNums(prev => {
                        if (prev.includes(data.firstNumber)) return prev;
                        return [...prev, data.firstNumber];
                    });
                    triggerBallAnimation(data.firstNumber);
                }
                hapticFeedback('heavy');
            });

            // Number called by server
            socket.on('number_called', (data) => {
                console.log('[WS] number_called:', data.number);
                setCalledNums(data.allCalledNums);
                triggerBallAnimation(data.number);
                hapticFeedback('light');
            });

            // Cards auto-updated by server
            socket.on('cards_updated', (data) => {
                // Server has marked all cards automatically
                // We need to refresh our marks from the state
            });

            // Winner found! Only process the FIRST game_won event
            let gameWonHandled = false;
            socket.on('game_won', (data) => {
                console.log('[WS] game_won:', data);
                // Guard: ignore duplicate game_won events (should only happen once)
                if (gameWonHandled) {
                    console.log('[WS] Ignoring duplicate game_won event');
                    return;
                }
                gameWonHandled = true;
                setWon(true);
                setWinPrize(data.prize || 0);
                setWinPattern(data.pattern);
                setWinnerName(data.winnerName);
                // Only set isMyWin if this player's ID matches the winner
                if (data.winnerPlayerId === myPlayerIdRef.current) {
                    setIsMyWin(true);
                } else {
                    setIsMyWin(false);
                }
                setGameStatus('finished');
                hapticFeedback('heavy');
            });

            // Game finished
            socket.on('game_finished', (data) => {
                console.log('[WS] game_finished:', data);
                setGameStatus('finished');
            });

            // Game cancelled
            socket.on('game_cancelled', (data) => {
                console.log('[WS] game_cancelled:', data);
                setGameStatus('cancelled');
            });

            // Reconnection
            socket.on('connect', () => {
                console.log('[WS] Reconnected, rejoining game room');
                joinGameRoom(gameId);
                // Refresh game state from API
                loadGame();
            });
        }

        setupSocket();

        return () => {
            // Cleanup
            if (socketRef.current) {
                socketRef.current.off('player_joined');
                socketRef.current.off('timer_reset');
                socketRef.current.off('game_started');
                socketRef.current.off('number_called');
                socketRef.current.off('cards_updated');
                socketRef.current.off('game_won');
                socketRef.current.off('game_finished');
                socketRef.current.off('game_cancelled');
            }
            if (socketModule && hasJoinedRoom.current) {
                socketModule.leaveGameRoom(gameId);
            }
        };
    }, [gameId]);

    // =================== AUTO-MARK FROM SERVER ===================
    // When calledNums updates, auto-mark matching numbers on cards
    useEffect(() => {
        if (!card || calledNums.length === 0) return;

        // Card 1
        const newMarked1 = [];
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 5; row++) {
                const num = card[col][row];
                if (num !== 0 && calledNums.includes(num)) {
                    newMarked1.push(num);
                }
            }
        }
        setMarkedNums(newMarked1);

        // Card 2
        if (card2) {
            const newMarked2 = [];
            for (let col = 0; col < 5; col++) {
                for (let row = 0; row < 5; row++) {
                    const num = card2[col][row];
                    if (num !== 0 && calledNums.includes(num)) {
                        newMarked2.push(num);
                    }
                }
            }
            setMarkedNums2(newMarked2);
        }
    }, [calledNums, card, card2]);

    // =================== BALL ANIMATION ===================
    function triggerBallAnimation(num) {
        setLatestNumber(num);
        setShowBallAnimation(true);
        setTimeout(() => setShowBallAnimation(false), 2000);
    }

    // =================== INITIAL LOAD ===================
    useEffect(() => {
        loadGame();
    }, [gameId]);

    // Countdown timer
    useEffect(() => {
        if (!startAt) return;
        const interval = setInterval(() => {
            const now = new Date();
            const start = new Date(startAt);
            const diff = Math.max(0, Math.floor((start - now) / 1000));
            setTimeLeft(diff);
            if (diff <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [startAt]);

    // Poll game status while waiting (fallback for WebSocket)
    useEffect(() => {
        if (gameStatus !== 'waiting') return;

        const pollInterval = setInterval(async () => {
            try {
                const { gamesApi } = await import('@/lib/api');
                const data = await gamesApi.get(gameId);
                if (data.game) {
                    setGameStatus(data.game.status);
                    setCalledNums(data.game.calledNums || []);
                    setPlayerCount(data.game.playerCount);
                    setStartAt(data.game.startAt);
                    setDerash(data.game.derash || data.game.prize || 0);
                    setPrize(data.game.derash || data.game.prize || 0);
                }
            } catch {
                // Ignore
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [gameStatus, gameId]);

    // Poll for live marks while playing (fallback)
    useEffect(() => {
        if (gameStatus !== 'playing' || !card) return;

        const pollInterval = setInterval(async () => {
            try {
                const { gamesApi } = await import('@/lib/api');
                const data = await gamesApi.get(gameId);
                if (data.game) {
                    setCalledNums(data.game.calledNums || []);
                    setGameStatus(data.game.status);
                    setDerash(data.game.derash || data.game.prize || 0);
                    setPrize(data.game.derash || data.game.prize || 0);

                    // Check if game ended with winner
                    if (data.game.status === 'finished' && data.game.winnerId) {
                        setWon(true);
                        setWinPrize(data.game.prize || data.game.derash || 0);
                        setWinPattern(data.game.winPattern || '');
                        setGameStatus('finished');
                        // Correctly set isMyWin based on server response
                        if (data.isWinner) {
                            setIsMyWin(true);
                        } else {
                            setIsMyWin(false);
                        }
                    }
                }
            } catch {
                // Ignore
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [gameStatus, card, gameId]);

    async function loadGame() {
        // Fetch wallet balance
        try {
            const { walletApi } = await import('@/lib/api');
            const walletData = await walletApi.balance();
            if (walletData.balance !== undefined) {
                setWalletBalance(Number(walletData.balance));
            }
        } catch {
            // Demo mode
        }

        try {
            const { gamesApi } = await import('@/lib/api');
            const data = await gamesApi.get(gameId);
            if (data.game) {
                setGameStatus(data.game.status);
                setRoomName(data.game.roomName);
                setStake(data.game.stake);
                setPrize(data.game.derash || data.game.prize);
                setDerash(data.game.derash || data.game.prize);
                setCalledNums(data.game.calledNums || []);
                setPlayerCount(data.game.playerCount);
                setMaxPlayers(data.game.maxPlayers);
                setTakenNumbers(data.game.takenNumbers || []);
                setStartAt(data.game.startAt);
            }
            if (data.myCard) {
                setCard(data.myCard);
                setCard2(data.myCard2 || null);
                setMarkedNums(data.myMarkedNums || []);
                setMarkedNums2(data.myMarkedNums2 || []);
                setPickedNumbers(data.myPickedNumbers || []);
                setCardCount(data.myCardCount || 1);
                setMyPlayerId(data.myPlayerId);
            }
            if (data.isWinner) {
                setIsMyWin(true);
            }
        } catch {
            // Demo mode fallback
            const stakeMap = { '1': 10, '2': 20, '3': 50 };
            const nameMap = { '1': 'Weyra', '2': 'Fortune', '3': 'Buna' };
            setStake(stakeMap[gameId] || 10);
            setRoomName(nameMap[gameId] || 'Weyra');
            setPrize(0);
            setDerash(0);
            setPlayerCount(0);
            setMaxPlayers(1000);
            setTakenNumbers([]);
        }
    }

    function handlePickNumber(num) {
        if (card) return;
        if (takenNumbers.includes(num)) return;

        hapticFeedback('light');

        if (pickedNumbers.includes(num)) {
            setPickedNumbers(pickedNumbers.filter(n => n !== num));
        } else {
            if (pickedNumbers.length >= cardCount) {
                setErrorMsg(`You can only pick up to ${cardCount} number(s)`);
                setTimeout(() => setErrorMsg(''), 2000);
                return;
            }

            const newPicked = [...pickedNumbers, num];
            setPickedNumbers(newPicked);

            if (newPicked.length === cardCount) {
                handleJoinGame(newPicked);
            }
        }
    }

    async function handleJoinGame(numsToJoin = pickedNumbers) {
        if (numsToJoin.length < 1) {
            setErrorMsg('Please pick at least 1 number');
            setTimeout(() => setErrorMsg(''), 2000);
            return;
        }

        setJoining(true);
        setErrorMsg('');
        hapticFeedback('medium');

        try {
            const { gamesApi } = await import('@/lib/api');
            const data = await gamesApi.join(gameId, numsToJoin, cardCount);
            if (data.gamePlayer) {
                setCard(data.gamePlayer.card);
                setCard2(data.gamePlayer.card2 || null);
                setMyPlayerId(data.gamePlayer.id);

                if (data.derash) {
                    setDerash(data.derash);
                    setPrize(data.derash);
                }

                // Reload game state
                const gameData = await gamesApi.get(gameId);
                if (gameData.game) {
                    setGameStatus(gameData.game.status);
                    setCalledNums(gameData.game.calledNums || []);
                    setPlayerCount(gameData.game.playerCount);
                    setDerash(gameData.game.derash || gameData.game.prize);
                    setPrize(gameData.game.derash || gameData.game.prize);
                }

                // Update wallet balance
                try {
                    const { walletApi } = await import('@/lib/api');
                    const walletData = await walletApi.balance();
                    if (walletData.balance !== undefined) {
                        setWalletBalance(Number(walletData.balance));
                    }
                } catch { }
            }
            if (data.error) {
                setErrorMsg(data.error);
                setTimeout(() => setErrorMsg(''), 3000);
            }
        } catch (err) {
            // If game already started, redirect to new game
            if (err.data && err.data.redirectGameId) {
                setErrorMsg('Game already started. Redirecting to new game...');
                setTimeout(() => {
                    router.push(`/game/${err.data.redirectGameId}`);
                }, 1000);
                setJoining(false);
                return;
            }
            setErrorMsg(err.message || 'Failed to join game');
            setTimeout(() => setErrorMsg(''), 3000);
        }
        setJoining(false);
    }

    // ============ RENDER: MAIN ============
    const isStarted = gameStatus === 'playing' || gameStatus === 'finished';
    const showPlayingLayout = isStarted;

    // PRE-GAME: Number selection + waiting room
    if (!showPlayingLayout) {
        return (
            <div className="page-container obsidian-theme" style={{ paddingBottom: '20px', backgroundColor: '#0b111a', minHeight: '100vh' }}>

                {/* TOP HEADER ROW: Timer & Derash */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 16px 8px', gap: '12px', backgroundColor: '#0f172a' }}>
                    {startAt && !isStarted && timeLeft > 0 ? (
                        <div style={{
                            width: 60, height: 60, borderRadius: '50%',
                            background: timeLeft <= 10 ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #1e293b, #0f172a)',
                            border: timeLeft <= 10 ? '3px solid #ef4444' : '3px solid #334155',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: timeLeft <= 10 ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 10px rgba(0,0,0,0.5)',
                            animation: timeLeft <= 5 ? 'pulse 1s infinite' : 'none',
                        }}>
                            <span style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{timeLeft}s</span>
                        </div>
                    ) : (
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '3px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>WAIT</span>
                        </div>
                    )}

                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a, #1a1a2e)',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '10px 24px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        minWidth: '140px'
                    }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>Derash</span>
                        <span style={{
                            color: '#10b981', fontSize: '28px', fontWeight: '900', letterSpacing: '0.5px',
                            textShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                        }}>{derash} <span style={{ fontSize: '14px', color: '#6ee7b7' }}>ETB</span></span>
                        <span style={{ color: '#475569', fontSize: '10px' }}>{playerCount} joined</span>
                    </div>
                </div>

                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    padding: '8px 10px', 
                    backgroundColor: '#0f172a', 
                    borderBottom: '1px solid #1e293b',
                    overflow: 'hidden'
                }}>
                    <button
                        onClick={() => router.push('/')}
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            color: '#94a3b8', 
                            fontSize: '20px', 
                            borderRadius: '10px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        ←
                    </button>

                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', backgroundColor: '#334155', borderRadius: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '8px', color: '#e2e8f0', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Game ID</span>
                        <span style={{ fontSize: '12px', color: '#fff', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden' }}>#{gameId}</span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', backgroundColor: '#422e11', border: '1px solid #713f12', borderRadius: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '8px', color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Bet</span>
                        <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden' }}>{stake}<span style={{fontSize: '8px'}}> ETB</span></span>
                    </div>

                    <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', backgroundColor: '#064e3b', border: '1px solid #065f46', borderRadius: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '8px', color: '#34d399', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Wallet</span>
                        <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden' }}>{walletBalance.toFixed(0)}</span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 2px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '8px', color: '#cbd5e1', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Players</span>
                        <span style={{ fontSize: '12px', color: '#fff', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden' }}>{playerCount}</span>
                    </div>
                </div>

                {/* Card already joined indicator */}
                {card && (
                    <div style={{
                        margin: '12px 16px',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #064e3b, #065f46)',
                        borderRadius: '12px',
                        border: '1px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#6ee7b7',
                        fontWeight: '700',
                    }}>
                        <span style={{ fontSize: '20px' }}>✅</span>
                        <span>You have joined with {cardCount} card{cardCount > 1 ? 's' : ''}! Waiting for game to start...</span>
                    </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                    <div className="error-banner" style={{
                        margin: '12px 16px', padding: '12px 16px', background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#fca5a5',
                        fontSize: '13px', fontWeight: '600',
                    }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Number Grid 1-200 */}
                {!card && (
                    <>
                        <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>Pick {cardCount} number{cardCount > 1 ? 's' : ''}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => { setCardCount(1); setPickedNumbers([]); }}
                                    style={{
                                        padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                        fontWeight: '700', fontSize: '13px',
                                        background: cardCount === 1 ? '#10b981' : '#1e293b',
                                        color: cardCount === 1 ? '#fff' : '#94a3b8',
                                    }}
                                >1 Card</button>
                                <button
                                    onClick={() => { setCardCount(2); setPickedNumbers([]); }}
                                    style={{
                                        padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                        fontWeight: '700', fontSize: '13px',
                                        background: cardCount === 2 ? '#10b981' : '#1e293b',
                                        color: cardCount === 2 ? '#fff' : '#94a3b8',
                                    }}
                                >2 Cards</button>
                            </div>
                        </div>
                        <div className="number-grid-container">
                            <div className="number-grid">
                                {Array.from({ length: 400 }, (_, i) => i + 1).map(num => {
                                    const isSelected = pickedNumbers.includes(num);
                                    const isTaken = takenNumbers.includes(num);
                                    return (
                                        <div
                                            key={num}
                                            className={`number-cell ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`}
                                            onClick={() => handlePickNumber(num)}
                                        >
                                            {num}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}


            </div>
        );
    }

    // ============ RENDER: PLAYING/WATCHING ============
    function renderBingoCard(cardData, markedData, cardIdx, label) {
        return (
            <div className="bingo-card-wrapper">
                {label && <div className="bingo-card-label">{label}</div>}
                <div className="bingo-grid">
                    {/* Header */}
                    {BINGO_LETTERS.map(letter => (
                        <div key={letter} className={`bingo-header-cell bg-${letter.toLowerCase()}`}>{letter}</div>
                    ))}
                    {/* Cells */}
                    {[0, 1, 2, 3, 4].map(row => (
                        BINGO_LETTERS.map((_, col) => {
                            const num = cardData[col][row];
                            const isMarked = markedData.includes(num);
                            const isFree = num === 0;
                            const isCalled = calledNums.includes(num);
                            const isLatestCalled = latestNumber === num;

                            return (
                                <div
                                    key={`${cardIdx}-${col}-${row}`}
                                    className={`bingo-cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''} ${isCalled && !isMarked ? 'called' : ''} ${isLatestCalled && isMarked ? 'just-marked' : ''}`}
                                >
                                    {isFree ? '★' : num}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container obsidian-theme playing-layout">
            <header className="header playing-header">
                <button
                    className="header-btn"
                    onClick={() => router.push('/')}
                    style={{ border: 'none', fontSize: '18px', padding: '8px', position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}
                >
                    ←
                </button>
                <div className="header-stats">
                    <div className="stat-box">
                        <span className="label">Game</span>
                        <span className="value">{gameId}</span>
                    </div>
                    <div className="stat-box">
                        <span className="label">Bet</span>
                        <span className="value">{stake} Birr</span>
                    </div>
                    <div className="stat-box active-green">
                        <span className="label">Derash</span>
                        <span className="value">{derash} ETB</span>
                    </div>
                    <div className="stat-box">
                        <span className="label">Players</span>
                        <span className="value">{playerCount}</span>
                    </div>
                </div>
            </header>

            <div className="latest-numbers-row">
                <div className="called-count">
                    <span className="label">Called</span>
                    <span className="value"><strong>{calledNums.length}</strong>/75</span>
                </div>

                {calledNums.length > 0 && (
                    <div className="called-history-row">
                        {/* Latest Big 3D Ball */}
                        <div className={`ball-3d ball-3d-${getLetterForNumber(calledNums[calledNums.length - 1]).toLowerCase()} ${showBallAnimation ? 'ball-bounce' : ''}`}>
                            <div className="ball-3d-inner">
                                <div className="ball-3d-text">
                                    <span className="ball-letter">{getLetterForNumber(calledNums[calledNums.length - 1])}</span>
                                    <span className="ball-number">{calledNums[calledNums.length - 1]}</span>
                                </div>
                            </div>
                        </div>

                        {/* Previous Small 3D Balls */}
                        <div className="previous-small-circles">
                            {calledNums.slice(-4, -1).reverse().map(num => {
                                const letter = getLetterForNumber(num);
                                return (
                                    <div key={num} className={`ball-3d small ball-3d-${letter.toLowerCase()}`}>
                                        <div className="ball-3d-inner">
                                            <div className="ball-3d-text">
                                                <span className="ball-letter">{letter}</span>
                                                <span className="ball-number">{num}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="game-main-content">
                <div className="calling-board-75">
                    <div className="board-headers">
                        {BINGO_LETTERS.map(letter => (
                            <div key={letter} className={`board-header bg-${letter.toLowerCase()}`}>{letter}</div>
                        ))}
                    </div>
                    <div className="board-grid-75">
                        {[...Array(15)].map((_, row) => (
                            <div key={`row-${row}`} className="board-row-75">
                                {BINGO_LETTERS.map((_, col) => {
                                    const num = col * 15 + row + 1;
                                    const isCalled = calledNums.includes(num);
                                    const isLatest = calledNums.length > 0 && calledNums[calledNums.length - 1] === num;
                                    return (
                                        <div key={num} className={`board-cell-75 ${isCalled ? `called bg-${BINGO_LETTERS[col].toLowerCase()}` : ''} ${isLatest ? 'latest' : ''}`}>
                                            {num}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="play-area-right">
                    {!card ? (
                        <div className="watching-only-overlay">
                            <div className="watching-icon">ℹ️</div>
                            <h2 className="watching-title">Watching Only,<br />The game already started.</h2>
                            <p className="watching-desc">Wait for the next round to join.</p>
                            <p className="watching-amharic">ይህ ዙር ተጀምሯል፡ ጨዋታው እስኪያልቅ ይጠብቁ</p>
                        </div>
                    ) : (
                        <div className="player-cards-section">
                            <div className="auto-mark-header">
                                <span className="card-label">Card{cardCount === 2 ? 's' : ''}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', padding: '3px 10px', background: 'rgba(16,185,129,0.15)', borderRadius: '12px' }}>
                                        🤖 AUTO-PLAY
                                    </span>
                                </div>
                            </div>
                            <div className="cards-wrapper">
                                {renderBingoCard(card, markedNums, 0, cardCount === 2 ? 'Card 1' : null)}
                                {card2 && renderBingoCard(card2, markedNums2, 1, 'Card 2')}
                            </div>
                            <div style={{
                                textAlign: 'center', padding: '8px', fontSize: '12px',
                                color: '#10b981', fontWeight: '600',
                                background: 'rgba(16,185,129,0.08)',
                                borderRadius: '8px', margin: '8px 0',
                            }}>
                                ✨ Cards are automatically marked by the server
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Game Status - Finished without winning */}
            {gameStatus === 'finished' && !won && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, #0f172a, transparent)',
                    padding: '20px', textAlign: 'center', zIndex: 100,
                }}>
                    <button
                        className="btn btn-primary"
                        style={{ width: '80%', maxWidth: '300px', padding: '14px 24px', fontSize: '16px', fontWeight: '800' }}
                        onClick={() => router.push('/')}
                    >
                        Back to Lobby
                    </button>
                </div>
            )}

            {/* Win Overlay */}
            {won && (
                <div className="win-overlay" onClick={() => {
                    setWon(false);
                    router.push('/');
                }}>
                    <div className="win-card" onClick={(e) => e.stopPropagation()}>
                        {isMyWin ? (
                            <>
                                <div className="win-emoji">🎉🏆🎉</div>
                                <div className="win-title">BINGO!</div>
                                <div style={{ color: '#10b981', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                                    {PATTERN_LABELS[winPattern] || winPattern}
                                </div>
                                <div className="win-amount">You won {winPrize} ETB!</div>
                                <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                                    Derash has been credited to your wallet 💰
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="win-emoji">🎯</div>
                                <div className="win-title" style={{ fontSize: '24px' }}>Game Over!</div>
                                <div style={{ color: '#f59e0b', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                                    {winnerName || 'A player'} won the game!
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
                                    Pattern: {PATTERN_LABELS[winPattern] || winPattern}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                                    Prize: {winPrize} ETB
                                </div>
                            </>
                        )}
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 20, width: '100%' }}
                            onClick={() => router.push('/')}
                        >
                            Back to Lobby
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
