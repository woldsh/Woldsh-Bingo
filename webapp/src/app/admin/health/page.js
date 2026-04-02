'use client';

import { useState, useEffect } from 'react';

export default function AdminHealthPage() {
    const [health, setHealth] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadHealth(); }, []);

    async function loadHealth() {
        setLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const healthRes = await fetch(`${API_URL}/api/health`);
            const healthData = await healthRes.json();
            setHealth(healthData);

            const { adminApi } = await import('@/lib/api');
            const dashData = await adminApi.dashboard();
            setStats(dashData.stats);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Health</h1></header>
            <div className="admin-content">
                <div style={{ marginBottom: 24 }}><button className="admin-btn-outline" onClick={loadHealth}>↻ Refresh</button></div>
                {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner"></div></div> : (
                    <div className="admin-stats-grid">
                        <div className="admin-stat-card">
                            <div>
                                <div className="admin-stat-label">API STATUS</div>
                                <div className="admin-stat-value" style={{ color: health?.status === 'ok' ? 'var(--accent-primary)' : 'var(--accent-pink)' }}>
                                    {health?.status === 'ok' ? '● Online' : '● Offline'}
                                </div>
                                <div className="stat-sub">{health?.service || 'unknown'}</div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ '--icon-color': 'var(--accent-primary)' }}>⚡</div>
                        </div>
                        <div className="admin-stat-card">
                            <div>
                                <div className="admin-stat-label">DATABASE</div>
                                <div className="admin-stat-value" style={{ color: stats ? 'var(--accent-primary)' : 'var(--accent-pink)' }}>
                                    {stats ? '● Connected' : '● Error'}
                                </div>
                                <div className="stat-sub">Supabase PostgreSQL</div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ '--icon-color': 'var(--accent-blue)' }}>🗄️</div>
                        </div>
                        <div className="admin-stat-card">
                            <div>
                                <div className="admin-stat-label">TOTAL RECORDS</div>
                                <div className="admin-stat-value">{stats ? stats.totalPlayers + stats.totalGames : 0}</div>
                                <div className="stat-sub">{stats?.totalPlayers || 0} users · {stats?.totalGames || 0} games</div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ '--icon-color': 'var(--accent-purple)' }}>📊</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
