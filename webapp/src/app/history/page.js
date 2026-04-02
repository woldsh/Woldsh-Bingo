'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

export default function HistoryPage() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        try {
            const { userApi } = await import('@/lib/api');
            const data = await userApi.history();
            setHistory(data.history || []);
        } catch {
            // Demo data
            setHistory([
                { gameId: 5, roomName: 'Fortune', stake: 20, status: 'finished', isWinner: true, prize: 72, playedAt: new Date(Date.now() - 3600000).toISOString() },
                { gameId: 8, roomName: 'Weyra', stake: 10, status: 'finished', isWinner: false, prize: 0, playedAt: new Date(Date.now() - 7200000).toISOString() },
                { gameId: 3, roomName: 'Buna', stake: 50, status: 'finished', isWinner: false, prize: 0, playedAt: new Date(Date.now() - 86400000).toISOString() },
                { gameId: 1, roomName: 'Weyra', stake: 10, status: 'finished', isWinner: true, prize: 36, playedAt: new Date(Date.now() - 172800000).toISOString() },
            ]);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

    return (
        <div className="page-container obsidian-theme">
            <header className="header">
                <span style={{ fontWeight: 700, fontSize: 18 }}>🕐 Game History</span>
            </header>

            {history.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎮</div>
                    <div className="empty-text">No games played yet</div>
                </div>
            ) : (
                <div className="history-list">
                    {history.map((game, i) => (
                        <div key={i} className="history-item">
                            <div className="history-info">
                                <div className="history-room">
                                    {game.isWinner ? '🏆' : '🎮'} {game.roomName}
                                </div>
                                <div className="history-date">{formatDate(game.playedAt)}</div>
                            </div>
                            <div className="history-result">
                                <div className="history-stake">{game.stake} ETB</div>
                                <span className={`history-badge ${game.isWinner ? 'badge-won' : 'badge-lost'}`}>
                                    {game.isWinner ? `Won ${game.prize} ETB` : 'Lost'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <BottomNav />
        </div>
    );
}
