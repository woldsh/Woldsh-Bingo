'use client';

import { useState, useEffect } from 'react';

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');

    useEffect(() => {
        loadWithdrawals();
    }, [statusFilter]);

    async function loadWithdrawals() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getWithdrawals(statusFilter);
            setWithdrawals(data);
        } catch (error) {
            console.error('Failed to load withdrawals:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id) {
        if (!confirm('Approve this withdrawal? This marks it as processing but does NOT send money yet.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.approveWithdrawal(id);
            loadWithdrawals();
        } catch (error) {
            console.error('Failed to approve withdrawal:', error);
            alert('Failed to approve withdrawal.');
        }
    }

    async function handleReject(id) {
        if (!confirm('Reject this withdrawal? The funds will be returned to the user\'s balance.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.rejectWithdrawal(id);
            loadWithdrawals();
        } catch (error) {
            console.error('Failed to reject withdrawal:', error);
            alert('Failed to reject withdrawal.');
        }
    }

    async function handleMarkPaid(id) {
        if (!confirm('Mark as Paid? Only do this AFTER you have successfully sent the money to the user.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.markWithdrawalPaid(id);
            loadWithdrawals();
        } catch (error) {
            console.error('Failed to mark paid:', error);
            alert('Failed to mark paid.');
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
            case 'pending': return <span className="status-pill warning">Pending</span>;
            case 'approved': return <span className="status-pill info">Processing</span>;
            case 'completed': return <span className="status-pill active">Paid</span>;
            case 'failed': case 'rejected': return <span className="status-pill inactive">Rejected</span>;
            default: return <span className="status-pill">{status}</span>;
        }
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Withdrawals</h1>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="admin-filters" style={{ display: 'flex', gap: '8px' }}>
                            {['all', 'pending', 'approved', 'completed', 'rejected'].map(status => (
                                <button
                                    key={status}
                                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button className="admin-btn-outline" onClick={loadWithdrawals} disabled={loading}>
                            ↻ Refresh
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>USER</th>
                                    <th>AMOUNT</th>
                                    <th>METHOD/DESTINATION</th>
                                    <th>TIME</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && withdrawals.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : withdrawals.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No withdrawals found.
                                        </td>
                                    </tr>
                                ) : withdrawals.map(w => (
                                    <tr key={w.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>#{w.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{w.user?.username || w.user?.firstName || `User_${w.userId}`}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.user?.telegramId}</div>
                                        </td>
                                        <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                            -{Number(w.amount).toFixed(2)} ETB
                                        </td>
                                        <td>
                                            <div>{w.method || 'CBE / Telebirr'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.note || '-'}</div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>{timeAgo(w.createdAt)}</td>
                                        <td>{getStatusBadge(w.status)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {w.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleApprove(w.id)}
                                                        className="admin-btn-outline"
                                                        style={{ color: '#3b82f6', borderColor: '#bfdbfe', padding: '4px 8px', fontSize: '11px' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(w.id)}
                                                        className="admin-btn-outline"
                                                        style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '4px 8px', fontSize: '11px' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {w.status === 'approved' && (
                                                <button
                                                    onClick={() => handleMarkPaid(w.id)}
                                                    className="admin-btn-outline"
                                                    style={{ color: '#10b981', borderColor: '#a7f3d0', padding: '4px 8px', fontSize: '11px' }}
                                                >
                                                    ✓ Mark Paid
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
                .filter-btn:hover { background: var(--bg-card-hover); }
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
                .status-pill.info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .status-pill.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .status-pill.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
            `}</style>
        </div>
    );
}
