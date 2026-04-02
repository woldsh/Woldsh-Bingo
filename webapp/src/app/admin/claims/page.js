'use client';

import { useState, useEffect } from 'react';

export default function AdminClaimsPage() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');

    // Modal state for viewing card snapshot
    const [viewClaim, setViewClaim] = useState(null);

    useEffect(() => {
        loadClaims();
    }, [statusFilter]);

    async function loadClaims() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getClaims(statusFilter);
            setClaims(data);
        } catch (error) {
            console.error('Failed to load claims:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id) {
        if (!confirm('Approve this claim? This will end the game and credit the user\'s wallet instantly.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.approveClaim(id);
            setViewClaim(null);
            loadClaims();
        } catch (error) {
            console.error('Failed to approve claim:', error);
            alert(error.message || 'Failed to approve claim.');
        }
    }

    async function handleReject(id) {
        if (!confirm('Reject this claim? The game will continue its current state.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.rejectClaim(id);
            setViewClaim(null);
            loadClaims();
        } catch (error) {
            console.error('Failed to reject claim:', error);
            alert(error.message || 'Failed to reject claim.');
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
            case 'pending': return <span className="status-pill warning">Pending Verify</span>;
            case 'approved': return <span className="status-pill active">Winner</span>;
            case 'failed': case 'rejected': return <span className="status-pill inactive">False Claim</span>;
            default: return <span className="status-pill">{status}</span>;
        }
    };

    // Helper to render the bingo card grid
    const renderCardSnapshot = (claim) => {
        if (!claim) return null;

        // Grab the right card based on cardIndex
        const rawCard = claim.cardIndex === 1 ? claim.player?.card2 : claim.player?.card;
        if (!rawCard) return <div style={{ padding: 20, textAlign: 'center' }}>No card data found.</div>;

        // Ensure format is 2D array
        let cardGrid = rawCard;
        if (typeof rawCard === 'string') {
            try { cardGrid = JSON.parse(rawCard); } catch (e) { }
        }

        if (!Array.isArray(cardGrid) || !Array.isArray(cardGrid[0])) {
            return <div style={{ padding: 20, textAlign: 'center' }}>Invalid card format.</div>;
        }

        const calledNumsSet = new Set(claim.calledNums || []);

        return (
            <div className="card-snapshot">
                <div className="bingo-header">
                    <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
                </div>
                <div className="bingo-grid">
                    {cardGrid.map((row, r) => (
                        <div key={r} className="bingo-row">
                            {row.map((num, c) => {
                                const isFree = (r === 2 && c === 2);
                                const isCalled = isFree || calledNumsSet.has(num);
                                return (
                                    <div key={`${r}-${c}`} className={`bingo-cell ${isCalled ? 'called' : ''}`}>
                                        {isFree ? '★' : num}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Claims Queue</h1>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="admin-filters" style={{ display: 'flex', gap: '8px' }}>
                            {['all', 'pending', 'approved', 'rejected'].map(status => (
                                <button
                                    key={status}
                                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button className="admin-btn-outline" onClick={loadClaims} disabled={loading}>
                            ↻ Refresh
                        </button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>CLAIM ID</th>
                                    <th>USER</th>
                                    <th>ROOM</th>
                                    <th>PRIZE</th>
                                    <th>CALLS</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && claims.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ) : claims.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No claims found.
                                        </td>
                                    </tr>
                                ) : claims.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>#{c.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{c.user?.username || c.user?.firstName || `User_${c.userId}`}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{c.game?.roomName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Game #{c.gameId}</div>
                                        </td>
                                        <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                                            {Number(c.game?.prize).toFixed(2)} ETB
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{c.calledNums?.length || 0}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> drawn</span>
                                        </td>
                                        <td>{getStatusBadge(c.status)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => setViewClaim(c)}
                                                className="admin-btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                            >
                                                Inspect Card
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Inspect Modal */}
            {viewClaim && (
                <div className="modal-overlay" onClick={() => setViewClaim(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>Review Claim #{viewClaim.id}</h2>
                            <button className="modal-close" onClick={() => setViewClaim(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, background: 'var(--bg-card-hover)', padding: '12px', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Player</div>
                                    <div style={{ fontWeight: 600 }}>{viewClaim.user?.username || viewClaim.user?.firstName}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Calls at time of BINGO</div>
                                    <div style={{ fontWeight: 600 }}>{viewClaim.calledNums?.length || 0} numbers</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                {renderCardSnapshot(viewClaim)}
                            </div>

                            {viewClaim.status === 'pending' ? (
                                <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleReject(viewClaim.id)}
                                        className="btn btn-secondary"
                                        style={{ color: '#ef4444', borderColor: '#ef4444', flex: 1 }}
                                    >
                                        Reject (False Claim)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApprove(viewClaim.id)}
                                        className="btn btn-primary"
                                        style={{ background: '#10b981', flex: 1 }}
                                    >
                                        Approve (Winner!)
                                    </button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-card-hover)', borderRadius: '8px', fontWeight: 'bold' }}>
                                    This claim is {viewClaim.status.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

                /* Bingo Card Snapshot Styles */
                .card-snapshot {
                    background: white;
                    padding: 10px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    display: inline-block;
                }
                .bingo-header {
                    display: flex;
                    justify-content: space-between;
                    background: #2563eb;
                    color: white;
                    border-radius: 8px 8px 0 0;
                    padding: 8px 0;
                    font-weight: 900;
                    font-size: 20px;
                    margin-bottom: 4px;
                }
                .bingo-header span {
                    width: 48px;
                    text-align: center;
                }
                .bingo-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .bingo-row {
                    display: flex;
                    gap: 4px;
                }
                .bingo-cell {
                    width: 48px;
                    height: 48px;
                    background: #f1f5f9;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 18px;
                    border-radius: 6px;
                }
                .bingo-cell.called {
                    background: #10b981;
                    color: white;
                }
            `}</style>
        </div>
    );
}
