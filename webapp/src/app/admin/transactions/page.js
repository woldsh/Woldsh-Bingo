'use client';

import { useState, useEffect } from 'react';

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const transactionTypes = ['all', 'deposit', 'withdraw', 'bet', 'win', 'refund', 'bonus', 'adjust_wallet'];
    const transactionStatuses = ['all', 'pending', 'approved', 'completed', 'failed'];

    useEffect(() => {
        loadTransactions();
    }, [typeFilter, statusFilter]);

    async function loadTransactions() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getTransactions(typeFilter, statusFilter);
            setTransactions(data);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
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

    const getTypeColor = (type) => {
        switch (type) {
            case 'deposit': return '#10b981';
            case 'withdraw': return '#ef4444';
            case 'win': return '#3b82f6';
            case 'bet': case 'stake': return '#f59e0b';
            case 'refund': return '#8b5cf6';
            case 'bonus': return '#eab308';
            case 'adjust_wallet': return '#64748b';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <span className="status-pill warning">Pending</span>;
            case 'approved': return <span className="status-pill info">Processing</span>;
            case 'completed': return <span className="status-pill active">Success</span>;
            case 'failed': case 'rejected': return <span className="status-pill inactive">Failed</span>;
            default: return <span className="status-pill">{status}</span>;
        }
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Transactions Ledger</h1>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="admin-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: 8 }}>TYPE:</span>
                                {transactionTypes.map(type => (
                                    <button
                                        key={type}
                                        className={`filter-btn ${typeFilter === type ? 'active' : ''}`}
                                        onClick={() => setTypeFilter(type)}
                                    >
                                        {type.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                            <button className="admin-btn-outline" onClick={loadTransactions} disabled={loading}>
                                ↻ Refresh
                            </button>
                        </div>

                        <div className="admin-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: 8 }}>STATUS:</span>
                            {transactionStatuses.map(status => (
                                <button
                                    key={status}
                                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>USER</th>
                                    <th>TYPE</th>
                                    <th>AMOUNT</th>
                                    <th>STATUS</th>
                                    <th>REFERENCE / NOTE</th>
                                    <th style={{ textAlign: 'right' }}>TIME</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No transactions found matching criteria.
                                        </td>
                                    </tr>
                                ) : transactions.map(tx => {
                                    const color = getTypeColor(tx.type);
                                    const amt = Number(tx.amount);
                                    const isPositive = ['deposit', 'win', 'bonus', 'refund', 'adjust_wallet'].includes(tx.type) && amt > 0;

                                    return (
                                        <tr key={tx.id}>
                                            <td style={{ color: 'var(--text-muted)' }}>#{tx.id}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{tx.user?.username || tx.user?.firstName || `User_${tx.userId}`}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.user?.telegramId}</div>
                                            </td>
                                            <td>
                                                <span className="tx-type-badge" style={{ color: color, borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td style={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                {isPositive ? '+' : (tx.type === 'withdraw' ? '-' : '')}{Math.abs(amt).toFixed(2)} ETB
                                            </td>
                                            <td>{getStatusBadge(tx.status)}</td>
                                            <td>
                                                <div style={{ fontSize: 12 }}>{tx.method || '-'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.note || '-'}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                                <div title={new Date(tx.createdAt).toLocaleString()}>
                                                    {timeAgo(tx.createdAt)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .filter-btn {
                    padding: 4px 12px;
                    border-radius: 20px;
                    border: 1px solid var(--admin-border);
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 12px;
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
