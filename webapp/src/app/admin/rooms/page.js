'use client';

import { useState, useEffect } from 'react';

export default function AdminRoomsPage() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadGames();
    }, [statusFilter]);

    async function loadGames() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getGames(statusFilter);
            setGames(data);
        } catch (error) {
            console.error('Failed to load games:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCancelGame(gameId) {
        if (!confirm('Are you sure you want to cancel this room? Players will be refunded (if MVP refund logic is implemented).')) return;

        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.cancelGame(gameId);
            loadGames();
        } catch (error) {
            console.error('Failed to cancel game:', error);
            alert('Failed to cancel game.');
        }
    }

    const timeAgo = (dateStr) => {
        const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'waiting': return <span className="status-pill warning">Waiting</span>;
            case 'playing': return <span className="status-pill active">Playing</span>;
            case 'finished': return <span className="status-pill info">Finished</span>;
            case 'cancelled': return <span className="status-pill inactive">Cancelled</span>;
            default: return <span className="status-pill inactive">{status}</span>;
        }
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Rooms / Rounds</h1>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="admin-filters" style={{ display: 'flex', gap: '8px' }}>
                            {['all', 'waiting', 'playing', 'finished', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button className="admin-btn-outline" onClick={loadGames} disabled={loading}>
                            ↻ Refresh
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>ROOM / STAKE</th>
                                    <th>PLAYERS</th>
                                    <th>CARDS SOLD</th>
                                    <th>PRIZE POOL</th>
                                    <th>CREATED</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && games.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : games.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No games found for this status.
                                        </td>
                                    </tr>
                                ) : games.map(game => (
                                    <tr key={game.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>#{game.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{game.roomName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{game.stake} ETB</div>
                                        </td>
                                        <td>{game.playerCount} / {game.maxPlayers}</td>
                                        <td>{game.cardsSold}</td>
                                        <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{Number(game.prize).toFixed(2)} ETB</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{timeAgo(game.createdAt)}</td>
                                        <td>
                                            {getStatusBadge(game.status)}
                                            {templates.find(t => t.stake === game.stake)?.isMaintenance && (
                                                <div style={{ fontSize: '9px', fontWeight: 900, color: '#ef4444', marginTop: '2px' }}>🛠️ MAINTENANCE</div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleMaintenance(game.stake)}
                                                    className="admin-btn-outline"
                                                    style={{ 
                                                        borderColor: templates.find(t => t.stake === game.stake)?.isMaintenance ? '#ef4444' : '#64748b',
                                                        color: templates.find(t => t.stake === game.stake)?.isMaintenance ? '#ef4444' : '#64748b',
                                                        padding: '4px 8px', fontSize: '11px' 
                                                    }}
                                                >
                                                    {templates.find(t => t.stake === game.stake)?.isMaintenance ? 'Open Room' : 'Set Maintenance'}
                                                </button>
                                                
                                                {game.status === 'waiting' && (
                                                    <button
                                                        onClick={() => handleCancelGame(game.id)}
                                                        className="admin-btn-outline"
                                                        style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '4px 8px', fontSize: '11px' }}
                                                    >
                                                        Cancel Room
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .filter-btn {
                    padding: 6px 16px;
                    border-radius: 20px;
                    border: 1px solid var(--admin-border);
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: capitalize;
                }
                .filter-btn:hover {
                    background: var(--bg-card-hover);
                }
                .filter-btn.active {
                    background: var(--admin-accent-primary, #2563eb);
                    color: white;
                    border-color: var(--admin-accent-primary, #2563eb);
                }
                .status-pill {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .status-pill.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .status-pill.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .status-pill.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .status-pill.info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
            `}</style>
        </div>
    );
}
