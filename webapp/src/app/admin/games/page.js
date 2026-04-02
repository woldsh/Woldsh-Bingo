'use client';

import { useState, useEffect } from 'react';

export default function AdminGamesPage() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => { loadGames(); }, []);

    async function loadGames() {
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.games();
            setGames(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    const filtered = filter === 'all' ? games : games.filter(g => g.status === filter);

    const statusColor = {
        waiting: 'var(--accent-orange)',
        playing: 'var(--accent-primary)',
        finished: 'var(--accent-blue)',
        cancelled: 'var(--accent-pink)'
    };

    return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Games</h1></header>
            <div className="admin-content">
                <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['all', 'waiting', 'playing', 'finished', 'cancelled'].map(f => (
                        <button key={f} className={`admin-btn-outline ${filter === f ? 'active' : ''}`} style={filter === f ? { background: 'rgba(255,255,255,0.1)', borderColor: 'var(--accent-primary)' } : {}} onClick={() => setFilter(f)}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                    <button className="admin-btn-outline" onClick={loadGames} style={{ marginLeft: 'auto' }}>↻ Refresh</button>
                </div>
                {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner"></div></div> : (
                    <div className="admin-card">
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead><tr><th>ID</th><th>ROOM</th><th>STAKE</th><th>STATUS</th><th>PLAYERS</th><th>PRIZE</th><th>WINNER</th><th>CREATED</th></tr></thead>
                                <tbody>
                                    {filtered.map(g => (
                                        <tr key={g.id}>
                                            <td>#{g.id}</td>
                                            <td className="tx-player">{g.roomName}</td>
                                            <td style={{ fontWeight: 700 }}>{g.stake} ETB</td>
                                            <td>
                                                <span className="tx-type-badge" style={{ color: statusColor[g.status], borderColor: statusColor[g.status], backgroundColor: `color-mix(in srgb, ${statusColor[g.status]} 10%, transparent)` }}>
                                                    <span style={{ fontSize: 10, marginRight: 4 }}>●</span> {g.status}
                                                </span>
                                            </td>
                                            <td>{g._count?.players || 0}/{g.maxPlayers}</td>
                                            <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{Number(g.prize).toFixed(2)} ETB</td>
                                            <td>{g.winnerId || '-'}</td>
                                            <td className="tx-time">{new Date(g.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No games found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
