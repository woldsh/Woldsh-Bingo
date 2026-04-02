'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Gift, TrendingUp } from 'lucide-react';

export default function AdminReferralsPage() {
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReferrals();
    }, []);

    async function loadReferrals() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getReferrals();
            setReferrers(data);
        } catch (error) {
            console.error('Failed to load referrals:', error);
        } finally {
            setLoading(false);
        }
    }

    const totalInvites = referrers.reduce((sum, r) => sum + r.totalReferred, 0);
    const totalActive = referrers.reduce((sum, r) => sum + r.activeReferred, 0);
    const avgConversion = totalInvites > 0 ? ((totalActive / totalInvites) * 100).toFixed(1) : 0;

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Referral Program</h1>
            </header>

            <div className="admin-content">

                {/* Top Level Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div className="admin-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ height: 40, width: 40, borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} color="#2563eb" />
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Total Invites Sent</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{totalInvites}</div>
                    </div>

                    <div className="admin-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ height: 40, width: 40, borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UserPlus size={20} color="#10b981" />
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Active Conversions (Deposited)</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{totalActive}</div>
                    </div>

                    <div className="admin-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ height: 40, width: 40, borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrendingUp size={20} color="#f59e0b" />
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Avg. Conversion Rate</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{avgConversion}%</div>
                    </div>
                </div>

                {/* Top Referrers Table */}
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="admin-card-title">Top Referrers Leaderboard</h2>
                        <button className="admin-btn-outline" onClick={loadReferrals} disabled={loading}>
                            ↻ Refresh
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>RANK</th>
                                    <th>USER</th>
                                    <th>TOTAL INVITES</th>
                                    <th>ACTIVE (CONVERTED)</th>
                                    <th>CONVERSION RATE</th>
                                    <th>BONUS WALLET</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && referrers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : referrers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No referral data available yet.
                                        </td>
                                    </tr>
                                ) : referrers.map((r, idx) => (
                                    <tr key={r.user.id}>
                                        <td style={{ fontWeight: 800, color: idx < 3 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                            #{idx + 1}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{r.user.username || r.user.firstName || 'Unknown'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {r.user.id}</div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 700, fontSize: 16 }}>{r.totalReferred}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>{r.activeReferred}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ flex: 1, height: 6, background: 'var(--bg-card-hover)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ width: `${r.conversionRate}%`, height: '100%', background: '#3b82f6' }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>{r.conversionRate}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600 }}>
                                                <Gift size={14} />
                                                {Number(r.user.giftBalance).toFixed(0)} <span style={{ fontSize: 10 }}>ETB</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <a
                                                href="/admin/players"
                                                className="admin-btn-outline"
                                                style={{ display: 'inline-block', padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}
                                            >
                                                View Player
                                            </a>
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
