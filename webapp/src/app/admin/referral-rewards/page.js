'use client';

import { useState, useEffect } from 'react';
import { Gift, Award, TrendingUp } from 'lucide-react';

export default function AdminReferralRewardsPage() {
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rewardModal, setRewardModal] = useState({ show: false, user: null, amount: '', note: 'Top Referrer Bonus' });

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

    async function handleRewardSubmit(e) {
        e.preventDefault();
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.rewardReferrer(rewardModal.user.id, rewardModal.amount, rewardModal.note);
            alert(`Successfully rewarded ${rewardModal.amount} ETB to ${rewardModal.user.username || 'User'}`);
            setRewardModal({ show: false, user: null, amount: '', note: '' });
            loadReferrals(); // Refresh balances
        } catch (error) {
            console.error('Failed to reward user:', error);
            alert(error.message || 'Failed to reward user');
        }
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title">Referral Rewards Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Manually grant bonus funds (gift balance) to your top performing affiliates.
                    </p>
                </div>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="admin-card-title">Top Affiliates Eligible for Bonus</h2>
                        <button className="admin-btn-outline" onClick={loadReferrals} disabled={loading}>
                            ↻ Refresh Leaderboard
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>RANK</th>
                                    <th>USER</th>
                                    <th>INVITES (ACTIVE)</th>
                                    <th>CURRENT GIFT BAL</th>
                                    <th style={{ textAlign: 'right' }}>GRANT REWARD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && referrers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : referrers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No referrers found.
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <TrendingUp size={14} color="#10b981" />
                                                <span style={{ fontWeight: 700 }}>{r.totalReferred}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({r.activeReferred} deposited)</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600 }}>
                                                <Gift size={14} />
                                                {Number(r.user.giftBalance).toFixed(0)} <span style={{ fontSize: 10 }}>ETB</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => setRewardModal({ show: true, user: r.user, amount: '', note: `Top Referrer Bonus (Rank #${idx + 1})` })}
                                                className="btn btn-primary"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', fontSize: 12 }}
                                            >
                                                <Award size={14} /> Grant Bonus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Reward Modal */}
                {rewardModal.show && (
                    <div className="modal-overlay" onClick={() => setRewardModal({ show: false, user: null, amount: '', note: '' })}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h2>Grant Bonus to {rewardModal.user?.username || rewardModal.user?.firstName}</h2>
                                <button className="modal-close" onClick={() => setRewardModal({ show: false, user: null, amount: '', note: '' })}>×</button>
                            </div>
                            <form onSubmit={handleRewardSubmit} className="modal-body">
                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label>Bonus Amount (ETB)</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        step="1"
                                        min="1"
                                        required
                                        placeholder="e.g. 100"
                                        value={rewardModal.amount}
                                        onChange={e => setRewardModal(m => ({ ...m, amount: e.target.value }))}
                                        style={{ fontSize: 18, fontWeight: 'bold' }}
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        This will be added to their <b>Gift Balance</b>.
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 24 }}>
                                    <label>Note / Reason (For Audit Log)</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        required
                                        value={rewardModal.note}
                                        onChange={e => setRewardModal(m => ({ ...m, note: e.target.value }))}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setRewardModal({ show: false, user: null, amount: '', note: '' })}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ background: '#10b981' }}>
                                        Grant {rewardModal.amount ? `${rewardModal.amount} ETB` : 'Bonus'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
