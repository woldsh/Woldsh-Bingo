'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, UserCheck, Activity } from 'lucide-react';

export default function AdminPlayersReportPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getReports(30);
            setStats(data);
        } catch (error) {
            console.error('Failed to load player reports:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner"></div></div>;

    if (!stats) return <div className="admin-page"><div className="admin-content">Failed to load statistics.</div></div>;

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Player Growth Analytics</h1>
            </header>

            <div className="admin-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    <div className="admin-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Total Registered Users</div>
                                <div style={{ fontSize: 36, fontWeight: 800, margin: '8px 0' }}>{stats.totalUsers}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                                    <UserPlus size={14} /> Cumulative
                                </div>
                            </div>
                            <div style={{ padding: 12, background: 'rgba(37, 99, 235, 0.1)', borderRadius: 16, height: 'fit-content' }}>
                                <Users color="#2563eb" size={28} />
                            </div>
                        </div>
                    </div>

                    <div className="admin-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>New Signups (Last 30 Days)</div>
                                <div style={{ fontSize: 36, fontWeight: 800, margin: '8px 0' }}>{stats.newUsers}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: 12, fontWeight: 600 }}>
                                    <Activity size={14} /> +{((stats.newUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}% Growth
                                </div>
                            </div>
                            <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 16, height: 'fit-content' }}>
                                <UserCheck color="#3b82f6" size={28} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">Retention & Acquisition</h2>
                    </div>
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Detailed player cohorts and retention heatmaps would appear here.</p>
                        <p style={{ fontSize: 12, marginTop: 8 }}>Unique active players: <b>{stats.totalUsers}</b></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
