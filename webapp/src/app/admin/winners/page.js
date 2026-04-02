'use client';

import { useState, useEffect } from 'react';

export default function AdminWinnersPage() {
    const [winners, setWinners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWinners();
    }, []);

    async function loadWinners() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getWinnersHistory();
            setWinners(data);
        } catch (error) {
            console.error('Failed to load winners:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Winners History</h1>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="admin-card-title">Completed Games</h2>
                        <button className="admin-btn-outline" onClick={loadWinners} disabled={loading}>
                            ↻ Refresh
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>GAME ID</th>
                                    <th>WINNER</th>
                                    <th>ROOM</th>
                                    <th>STAKE / PRIZE</th>
                                    <th>CALLS</th>
                                    <th>ENDED AT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : winners.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No winners history found yet.
                                        </td>
                                    </tr>
                                ) : winners.map(w => (
                                    <tr key={w.gameId}>
                                        <td style={{ color: 'var(--text-muted)' }}>#{w.gameId}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--admin-accent-primary, #2563eb)' }}>
                                                🏆 {w.winnerName}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {w.winnerId}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{w.roomName}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stake: {w.stake} ETB</div>
                                            <div style={{ fontWeight: 600, color: '#10b981' }}>Won: {Number(w.prize).toFixed(2)} ETB</div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{w.calledNumsCount}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> draws</span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(w.endedAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
