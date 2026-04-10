'use client';

import { useState, useEffect } from 'react';
import {
    X, Search, RefreshCw, Wallet, Gift as GiftIcon
} from 'lucide-react';

export default function AdminWalletsPage() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Super admin state
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    // Wallet adjustment state
    const [adjustModal, setAdjustModal] = useState({ show: false, player: null, amount: '', note: '', walletType: 'main', actionType: 'add' });

    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        try {
            const stored = localStorage.getItem('admin_auth');
            if (stored) {
                const auth = JSON.parse(stored);
                setIsSuperAdmin(auth.role === 'super_admin');
            }
        } catch { }
        loadPlayers();
    }, []);

    async function loadPlayers() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.players();
            setPlayers(data);
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Failed to load user wallets', type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    async function handleAdjustWallet(e) {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        
        let amountToSubmit = parseFloat(adjustModal.amount);
        if (isNaN(amountToSubmit) || amountToSubmit === 0) {
            alert('Please enter a non-zero amount');
            return;
        }
        
        // If action is remove, make it negative. Assumes input is positive absolute value.
        if (adjustModal.actionType === 'remove') {
            amountToSubmit = -Math.abs(amountToSubmit);
        } else {
            amountToSubmit = Math.abs(amountToSubmit);
        }

        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.adjustWallet(adjustModal.player.id, amountToSubmit, adjustModal.note, adjustModal.walletType);
            setMessage({ text: `${adjustModal.walletType === 'play' ? 'Play' : 'Main'} Wallet successfully ${adjustModal.actionType === 'remove' ? 'reduced' : 'credited'} for ${adjustModal.player.username || adjustModal.player.firstName}`, type: 'success' });
            setAdjustModal({ show: false, player: null, amount: '', note: '', walletType: 'main', actionType: 'add' });
            loadPlayers();
        } catch (err) {
            setMessage({ text: err.message || 'Failed to adjust wallet', type: 'error' });
        }
    }

    const filtered = players.filter(p => {
        const matchesSearch = (p.username || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
            String(p.telegramId).includes(search) ||
            (p.phone || '').includes(search);

        return matchesSearch;
    });

    return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Manage User Wallets</h1></header>
            <div className="admin-content">

                {message.text && (
                    <div style={{
                        padding: '12px 20px', borderRadius: 10, marginBottom: 24,
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        color: message.type === 'success' ? '#10b981' : '#ef4444',
                        fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        {message.text}
                        <button onClick={() => setMessage({ text: '', type: '' })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
                    </div>
                )}

                <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 300 }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted, #64748b)' }} />
                            <input
                                className="modal-input"
                                style={{ marginBottom: 0, paddingLeft: 40, width: '100%' }}
                                placeholder="Search by username, name, ID, or phone..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button className="admin-btn-outline" onClick={loadPlayers} style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {loading ? <div style={{ textAlign: 'center', padding: 100 }}><div className="spinner"></div></div> : (
                    <div className="admin-card" style={{ border: '1px solid var(--admin-border)', width: '100%', overflow: 'hidden' }}>
                        <div className="admin-table-wrapper custom-scrollbar" style={{
                            overflowX: 'auto',
                            width: '100%',
                            display: 'block',
                            WebkitOverflowScrolling: 'touch',
                            paddingBottom: '8px'
                        }}>
                            <table className="admin-table" style={{ minWidth: 900, tableLayout: 'auto', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ whiteSpace: 'nowrap', width: '70px', paddingLeft: '24px' }}>ID</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>User</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Main Wallet</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Play Wallet</th>
                                        {isSuperAdmin && <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '220px', paddingRight: '24px' }}>Adjustments</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontSize: 12, opacity: 0.7, paddingLeft: '24px' }}>#{p.id}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600 }}>{p.username || 'unknown'}</span>
                                                    <span style={{ fontSize: 11, opacity: 0.6 }}>{p.firstName || ''} {p.lastName || ''}</span>
                                                    {p.phone && <span style={{ fontSize: 11, opacity: 0.6 }}>Phone: {p.phone}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-gold)', fontWeight: 700, fontSize: 16 }}>
                                                    <Wallet size={16} />
                                                    {Number(p.balance).toFixed(2)} <span style={{ fontSize: 11, fontWeight: 500 }}>ETB</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: 16 }}>
                                                    <GiftIcon size={16} />
                                                    {Number(p.giftBalance || 0).toFixed(2)} <span style={{ fontSize: 11, fontWeight: 500 }}>ETB</span>
                                                </div>
                                            </td>
                                            {isSuperAdmin && (
                                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                    <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        
                                                        {/* MAIN WALLET COLUMN */}
                                                        <div style={{ display: 'flex', gap: 6, background: 'var(--admin-bg-secondary)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--admin-border)', alignItems: 'center' }}>
                                                            <div style={{ fontSize: 10, paddingRight: 6, color:'var(--accent-gold)', fontWeight: 800, borderRight: '1px solid var(--admin-border)' }}>MAIN</div>
                                                            <button
                                                                title="Add to Main Wallet"
                                                                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#f59e0b', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                                onClick={() => setAdjustModal({ show: true, player: p, amount: '', note: '', walletType: 'main', actionType: 'add' })}
                                                            >
                                                                + ADD
                                                            </button>
                                                            <button
                                                                title="Reduce Main Wallet"
                                                                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                                onClick={() => setAdjustModal({ show: true, player: p, amount: '', note: '', walletType: 'main', actionType: 'remove' })}
                                                            >
                                                                - REDUCE
                                                            </button>
                                                        </div>

                                                        {/* PLAY WALLET COLUMN */}
                                                        <div style={{ display: 'flex', gap: 6, background: 'var(--admin-bg-secondary)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--admin-border)', alignItems: 'center' }}>
                                                            <div style={{ fontSize: 10, paddingRight: 6, color:'#10b981', fontWeight: 800, borderRight: '1px solid var(--admin-border)' }}>PLAY</div>
                                                            <button
                                                                title="Add to Play Wallet"
                                                                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#10b981', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                                onClick={() => setAdjustModal({ show: true, player: p, amount: '', note: '', walletType: 'play', actionType: 'add' })}
                                                            >
                                                                + ADD
                                                            </button>
                                                            <button
                                                                title="Reduce Play Wallet"
                                                                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                                onClick={() => setAdjustModal({ show: true, player: p, amount: '', note: '', walletType: 'play', actionType: 'remove' })}
                                                            >
                                                                - REDUCE
                                                            </button>
                                                        </div>

                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 5 : 4} style={{ textAlign: 'center', padding: 60, color: 'var(--admin-text-muted, #64748b)' }}>
                                                No users found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Adjust Wallet Modal */}
            {adjustModal.show && (
                <div className="modal-overlay" onClick={() => setAdjustModal({ show: false, player: null, amount: '', note: '', walletType: 'main', actionType: 'add' })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: adjustModal.actionType === 'remove' ? '#ef4444' : 'inherit' }}>
                                {adjustModal.walletType === 'play' ? <GiftIcon size={20} color={adjustModal.actionType === 'remove' ? '#ef4444' : '#10b981'} /> : <Wallet size={20} color={adjustModal.actionType === 'remove' ? '#ef4444' : "var(--accent-gold)"} />}
                                {adjustModal.actionType === 'remove' ? 'Reduce' : 'Add to'} {adjustModal.walletType === 'play' ? 'Play' : 'Main'} Wallet
                            </h2>
                            <button className="modal-close" onClick={() => setAdjustModal({ show: false, player: null, amount: '', note: '', walletType: 'main', actionType: 'add' })}>×</button>
                        </div>
                        <form onSubmit={handleAdjustWallet} className="modal-body">
                            <div style={{ marginBottom: 16, padding: '12px', background: 'var(--admin-bg-secondary)', borderRadius: 8 }}>
                                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Target User</div>
                                <div style={{ fontWeight: 600 }}>{adjustModal.player?.username || adjustModal.player?.firstName}</div>
                            </div>
                            
                            <div className="form-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Amount to {adjustModal.actionType === 'remove' ? 'Reduce' : 'Add'}</span>
                                    <span style={{ color: 'var(--admin-text-muted)' }}>
                                        Current: <b style={{ color: adjustModal.walletType === 'play' ? '#10b981' : 'var(--accent-gold)' }}>
                                            {Number(adjustModal.walletType === 'play' ? (adjustModal.player?.giftBalance || 0) : (adjustModal.player?.balance || 0)).toFixed(2)} ETB
                                        </b>
                                    </span>
                                </label>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        placeholder="e.g. 50"
                                        value={adjustModal.amount}
                                        onChange={e => setAdjustModal(m => ({ ...m, amount: e.target.value }))}
                                        style={{ marginBottom: 0, textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label>Reason / Note for Audit Log</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    required
                                    placeholder={adjustModal.actionType === 'remove' ? "e.g. Deducting accidental deposit" : "e.g. Refund, Manual Deposit"}
                                    value={adjustModal.note}
                                    onChange={e => setAdjustModal(m => ({ ...m, note: e.target.value }))}
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: 24 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setAdjustModal({ show: false, player: null, amount: '', note: '', walletType: 'main', actionType: 'add' })}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ background: adjustModal.actionType === 'remove' ? '#ef4444' : (adjustModal.walletType === 'play' ? '#10b981' : 'var(--accent-gold)') }}>
                                    {adjustModal.actionType === 'remove' ? 'Remove Funds' : 'Add Funds'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
