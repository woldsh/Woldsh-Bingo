'use client';

import { useState, useEffect } from 'react';
import { Gamepad2, Trophy, Clock, Users } from 'lucide-react';

export default function AdminGamesReportPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/api');
            const data = await adminApi.getReports(30);
            setStats(data);
        } catch (error) {
            console.error('Failed to load games report:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner"></div></div>;

    if (!stats) return <div className="admin-page"><div className="admin-content">Failed to load statistics.</div></div>;

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Game Activity Report</h1>
            </header>

            <div className="admin-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div className="admin-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ padding: 10, background: 'rgba(52, 211, 153, 0.1)', borderRadius: 12 }}>
                                <Gamepad2 color="#34d399" size={24} />
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Games Completed</div>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.finishedGames}</div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ padding: 10, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 12 }}>
                                <Trophy color="#3b82f6" size={24} />
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total Winners History</div>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.finishedGames}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">Historical Trends (Last 30 Days)</h2>
                    </div>
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Activity size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                        <p>Chart visualization of daily games played would appear here.</p>
                        <p style={{ fontSize: 12, marginTop: 8 }}>Total period finished games: <b>{stats.finishedGames}</b></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
