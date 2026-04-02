'use client';

import { useState, useEffect } from 'react';
import {
    Users, Gamepad2, ArrowDownToLine, ArrowUpFromLine,
    CreditCard, TrendingDown, Ban, Bell, Clock
} from 'lucide-react';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminName, setAdminName] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('admin_auth');
        if (stored) {
            try { setAdminName(JSON.parse(stored).username || ''); } catch { }
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.dashboard();
            setStats(data.stats);
            setTransactions(data.recentTransactions || []);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    if (loading) {
        return (
            <div className="admin-page">
                <header className="admin-header">
                    <h1 className="admin-title">Dashboard</h1>
                </header>
                <div className="admin-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    const statCards = stats ? [
        { label: 'TOTAL PLAYERS', value: stats.totalPlayers, sub: `${stats.playersToday} joined today`, icon: <Users size={24} />, color: '#8b5cf6' },
        { label: 'ACTIVE GAMES', value: stats.activeGames, sub: `${stats.totalGames} total games`, icon: <Gamepad2 size={24} />, color: '#f59e0b' },
        { label: 'PENDING DEPOSITS', value: stats.pendingDeposits, sub: 'Awaiting review', icon: <ArrowDownToLine size={24} />, color: '#3b82f6' },
        { label: 'PENDING WITHDRAWALS', value: stats.pendingWithdrawals, sub: 'Awaiting approval', icon: <ArrowUpFromLine size={24} />, color: '#ec4899' },
        { label: 'TOTAL DEPOSITED', value: `${Number(stats.totalDeposited).toFixed(2)} ETB`, sub: `${stats.approvedDepositsCount} approved deposits`, icon: <CreditCard size={24} />, color: '#10b981' },
        { label: 'TOTAL WITHDRAWN', value: `${Number(stats.totalWithdrawn).toFixed(2)} ETB`, sub: `${stats.approvedWithdrawalsCount} approved withdrawals`, icon: <TrendingDown size={24} />, color: '#ef4444' },
        { label: 'BANNED PLAYERS', value: stats.bannedPlayers, sub: `Out of ${stats.totalPlayers} total`, icon: <Ban size={24} />, color: '#ef4444' },
    ] : [];

    const typeColors = {
        'win': '#3b82f6',
        'stake': '#f59e0b',
        'bet': '#f59e0b',
        'deposit': '#10b981',
        'withdraw': '#ef4444',
        'bonus': '#eab308',
        'refund': '#8b5cf6',
        'adjust_wallet': '#64748b',
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Dashboard</h1>
                <div className="admin-header-actions">
                    <button className="admin-icon-btn">
                        <Bell size={20} />
                    </button>
                </div>
            </header>

            <div className="admin-content">
                <div className="admin-welcome-section">
                    <div className="welcome-text">
                        Welcome back, <span className="welcome-name">{adminName}</span>
                        <div className="welcome-sub">Here&apos;s what&apos;s happening with your platform today.</div>
                    </div>
                    <button className="admin-btn-outline" onClick={loadDashboard}>
                        <Clock size={16} /> Refresh
                    </button>
                </div>

                <div className="admin-stats-grid">
                    {statCards.map((stat, i) => (
                        <div key={i} className="admin-stat-card">
                            <div className="stat-info">
                                <div className="admin-stat-label">{stat.label}</div>
                                <div className="admin-stat-value">{stat.value}</div>
                                <div className="stat-sub">{stat.sub}</div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ '--icon-color': stat.color }}>
                                {stat.icon}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="admin-card">
                    <div className="admin-card-header">
                        <div className="card-title">
                            <Clock size={20} /> Recent Transactions
                        </div>
                    </div>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>TYPE</th>
                                    <th>PLAYER</th>
                                    <th>AMOUNT</th>
                                    <th>NOTE</th>
                                    <th style={{ textAlign: 'right' }}>TIME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx, i) => {
                                    const color = typeColors[tx.type] || 'var(--text-secondary)';
                                    const amt = Number(tx.amount);
                                    const isPositive = ['deposit', 'win', 'bonus', 'refund', 'adjust_wallet'].includes(tx.type) && amt > 0;
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <span className="tx-type-badge" style={{ color, borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                                                    <span style={{ fontSize: 10, marginRight: 4 }}>●</span> {tx.type}
                                                </span>
                                            </td>
                                            <td className="tx-player">{tx.player}</td>
                                            <td className={`tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                                                {isPositive ? '+' : '-'}{Math.abs(amt).toFixed(2)} ETB
                                            </td>
                                            <td className="tx-note">{tx.note || '-'}</td>
                                            <td className="tx-time" style={{ textAlign: 'right' }}>{timeAgo(tx.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                                {transactions.length === 0 && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No transactions yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="admin-bottom-cards">
                    <div className="admin-quick-card">
                        <h3 className="quick-title">Players</h3>
                        <p className="quick-desc">Search, view details, and manage player accounts.</p>
                        <a href="/admin/players" className="quick-link">Manage Players →</a>
                    </div>
                    <div className="admin-quick-card">
                        <h3 className="quick-title">Admin Users</h3>
                        <p className="quick-desc">Create admin accounts and manage permissions.</p>
                        <a href="/admin/admin-users" className="quick-link">Manage Admins →</a>
                    </div>
                    <div className="admin-quick-card">
                        <h3 className="quick-title">App Settings</h3>
                        <p className="quick-desc">Configure application parameters and values.</p>
                        <a href="/admin/settings" className="quick-link">View Settings →</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
