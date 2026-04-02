'use client';

import { useState, useEffect } from 'react';

export default function AdminFinancePage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadFinance(); }, []);

    async function loadFinance() {
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.dashboard();
            setStats(data.stats);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    if (loading) return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Finance Summary</h1></header>
            <div className="admin-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner"></div></div>
        </div>
    );

    const cards = stats ? [
        { label: 'Total Deposited', value: `${Number(stats.totalDeposited).toFixed(2)} ETB`, sub: `${stats.approvedDepositsCount} deposits`, icon: '📥', color: 'var(--accent-primary)' },
        { label: 'Total Withdrawn', value: `${Number(stats.totalWithdrawn).toFixed(2)} ETB`, sub: `${stats.approvedWithdrawalsCount} withdrawals`, icon: '📤', color: 'var(--accent-pink)' },
        { label: 'Net Revenue', value: `${(Number(stats.totalDeposited) - Number(stats.totalWithdrawn)).toFixed(2)} ETB`, sub: 'Deposits - Withdrawals', icon: '📊', color: 'var(--accent-gold)' },
        { label: 'Pending Deposits', value: stats.pendingDeposits, sub: 'Awaiting review', icon: '⏳', color: 'var(--accent-orange)' },
        { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, sub: 'Awaiting approval', icon: '⏳', color: 'var(--accent-orange)' },
        { label: 'Total Players', value: stats.totalPlayers, sub: `${stats.playersToday} new today`, icon: '👥', color: 'var(--accent-purple)' },
    ] : [];

    return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Finance Summary</h1></header>
            <div className="admin-content">
                <div style={{ marginBottom: 24 }}><button className="admin-btn-outline" onClick={loadFinance}>↻ Refresh</button></div>
                <div className="admin-stats-grid">
                    {cards.map((c, i) => (
                        <div key={i} className="admin-stat-card">
                            <div>
                                <div className="admin-stat-label">{c.label}</div>
                                <div className="admin-stat-value">{c.value}</div>
                                <div className="stat-sub">{c.sub}</div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ '--icon-color': c.color }}>{c.icon}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
