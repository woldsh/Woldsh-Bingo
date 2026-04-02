'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, BarChart3, UserX } from 'lucide-react';

export default function AdminSuspiciousPage() {
    const [suspiciousUsers, setSuspiciousUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSuspicious();
    }, []);

    async function loadSuspicious() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getSuspiciousActivity();
            setSuspiciousUsers(data);
        } catch (error) {
            console.error('Failed to load suspicious activity:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleBan(userId, currentStatus, username) {
        if (!confirm(`Are you sure you want to ban ${username}?`)) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.updatePlayer(userId, { status: 'banned' });
            alert('User banned successfully');
            loadSuspicious(); // Reload to reflect changes
        } catch (error) {
            console.error('Failed to ban user:', error);
            alert(error.message || 'Failed to ban user');
        }
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={24} color="#ef4444" />
                        Suspicious Activity Monitor
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Automatically flags accounts with unusual gameplay patterns, such as statistically improbable win rates.
                    </p>
                </div>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="admin-card-title">Flagged Accounts</h2>
                        <button className="admin-btn-outline" onClick={loadSuspicious} disabled={loading}>
                            ↻ Run Analysis
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>USER</th>
                                    <th>RISK SCORE</th>
                                    <th>GAME STATS</th>
                                    <th>WALLET</th>
                                    <th>FLAGS</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : suspiciousUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                                <ShieldAlert size={40} color="#10b981" style={{ opacity: 0.5 }} />
                                                No suspicious activity detected. The system looks healthy.
                                            </div>
                                        </td>
                                    </tr>
                                ) : suspiciousUsers.map(u => (
                                    <tr key={u.userId} style={{ background: u.status === 'banned' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{u.username}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {u.userId}</div>
                                            {u.status === 'banned' && (
                                                <span style={{ fontSize: 10, background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>BANNED</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                background: u.riskScore >= 100 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: u.riskScore >= 100 ? '#ef4444' : '#f59e0b',
                                                padding: '4px 10px', borderRadius: 20, fontWeight: 700, fontSize: 13
                                            }}>
                                                <AlertTriangle size={14} />
                                                {u.riskScore}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <BarChart3 size={14} color="var(--text-muted)" />
                                                <span style={{ fontWeight: 600 }}>{u.wins} wins</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {u.totalGames} played</span>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginTop: 4 }}>
                                                {u.winRate}% Win Rate
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                                                {Number(u.balance).toFixed(2)} ETB
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {u.flags.map((flag, idx) => (
                                                    <div key={idx} style={{
                                                        fontSize: 11, background: 'var(--bg-card-hover)',
                                                        padding: '4px 8px', borderRadius: 4, color: 'var(--text-secondary)'
                                                    }}>
                                                        • {flag}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {u.status !== 'banned' && (
                                                <button
                                                    onClick={() => handleBan(u.userId, u.status, u.username)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                                >
                                                    <UserX size={14} style={{ marginRight: 6 }} /> Ban User
                                                </button>
                                            )}
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
