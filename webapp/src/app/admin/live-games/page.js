'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function AdminLiveGamesPage() {
    const [liveGames, setLiveGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        loadLiveGames();

        // Connect to WebSocket using the same token
        let token = '';
        try {
            const authStr = localStorage.getItem('admin_auth');
            if (authStr) {
                token = JSON.parse(authStr).token;
            }
        } catch (err) { }

        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Admin connected to socket');
        });

        newSocket.on('number_called', (data) => {
            setLiveGames(prev => prev.map(g => {
                if (g.id === data.gameId) {
                    return { ...g, calledNums: data.calledNums };
                }
                return g;
            }));
        });

        newSocket.on('game_ended', () => {
            // Refresh full list if a game ends
            loadLiveGames();
        });

        newSocket.on('rooms_updated', () => {
            loadLiveGames();
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, []);

    async function loadLiveGames() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getGames('playing');
            setLiveGames(data);
        } catch (error) {
            console.error('Failed to load live games:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleForceEnd(id) {
        if (!confirm('EMERGENCY: Are you sure you want to force-end this live room? This will stop the game abruptly.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.cancelGame(id); // MVP: Cancelling works identical to forcing an end for now
            loadLiveGames();
        } catch (error) {
            console.error('Failed to force end game:', error);
            alert('Failed to force end game.');
        }
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Live Games Monitoring</h1>
            </header>

            <div className="admin-content">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <button className="admin-btn-outline" onClick={loadLiveGames} disabled={loading}>
                        ↻ Refresh
                    </button>
                </div>

                {loading && liveGames.length === 0 ? (
                    <div className="admin-card" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                        <div className="spinner"></div>
                    </div>
                ) : liveGames.length === 0 ? (
                    <div className="admin-card" style={{ display: 'flex', justifyContent: 'center', padding: 80, color: 'var(--text-muted)' }}>
                        No live games currently active. Waiting for players...
                    </div>
                ) : (
                    <div className="live-games-grid">
                        {liveGames.map(game => (
                            <div key={game.id} className="admin-card live-game-card">
                                <div className="card-header">
                                    <div className="room-info">
                                        <div className="room-name">{game.roomName}</div>
                                        <div className="room-meta">ID: #{game.id} | Stake: {game.stake} ETB</div>
                                    </div>
                                    <div className="pulsing-badge">LIVE</div>
                                </div>

                                <div className="stats-row">
                                    <div className="stat-box">
                                        <span className="label">PLAYERS</span>
                                        <span className="val">{game.playerCount}/{game.maxPlayers}</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="label">CARDS</span>
                                        <span className="val">{game.cardsSold}</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="label">PRIZE</span>
                                        <span className="val" style={{ color: 'var(--accent-gold)' }}>{Number(game.prize).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="calls-section">
                                    <div className="calls-val">
                                        {game.calledNums?.length || 0} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ 75 calls</span>
                                    </div>
                                    <div className="latest-call">
                                        Last: {game.calledNums?.length > 0 ? game.calledNums[game.calledNums.length - 1] : '-'}
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${((game.calledNums?.length || 0) / 75) * 100}%` }}></div>
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button
                                        className="admin-btn-outline danger-btn"
                                        onClick={() => handleForceEnd(game.id)}
                                    >
                                        Force End Room
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .live-games-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                .live-game-card {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    border: 1px solid var(--admin-border);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1px solid var(--admin-border);
                    padding-bottom: 12px;
                }
                .room-name {
                    font-size: 18px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .room-meta {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .pulsing-badge {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 800;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                .stats-row {
                    display: flex;
                    gap: 12px;
                }
                .stat-box {
                    flex: 1;
                    background: var(--bg-card);
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    border: 1px solid var(--admin-border);
                }
                .label {
                    font-size: 10px;
                    color: var(--text-muted);
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .val {
                    font-size: 16px;
                    font-weight: 700;
                }
                .calls-section {
                    background: var(--bg-card);
                    border: 1px solid var(--admin-border);
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .calls-val {
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--accent-primary);
                }
                .latest-call {
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .progress-bar {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                    margin-top: 4px;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                    transition: width 0.3s ease;
                }
                .card-actions {
                    padding-top: 8px;
                }
                .danger-btn {
                    width: 100%;
                    color: #ef4444;
                    border-color: #ef4444;
                }
                .danger-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }
            `}</style>
        </div>
    );
}
