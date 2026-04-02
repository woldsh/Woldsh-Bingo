'use client';

import { useState, useEffect } from 'react';
import {
    Pencil, Trash2, Check, X, Search, RefreshCw, Filter,
    Wallet, Gift as GiftIcon, Trophy, Clock, Target, Shield, User, Ban
} from 'lucide-react';

export default function AdminPlayersPage() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, banned, registered

    // Super admin state
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        status: 'active',
        phone: ''
    });

    // Wallet adjustment state
    const [adjustModal, setAdjustModal] = useState({ show: false, player: null, amount: '', note: '' });

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
            setMessage({ text: 'Failed to load players', type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(id) {
        setMessage({ text: '', type: '' });
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.updatePlayer(id, {
                status: editForm.status,
                phone: editForm.phone
            });
            setMessage({ text: 'Player updated successfully', type: 'success' });
            setEditingId(null);
            loadPlayers();
        } catch (err) {
            setMessage({ text: err.message || 'Failed to update player', type: 'error' });
        }
    }

    async function handleDelete(id, name) {
        if (!confirm(`Are you sure you want to completely delete player "${name}"? This action cannot be undone.`)) return;
        setMessage({ text: '', type: '' });
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.deletePlayer(id);
            setMessage({ text: `Player deleted`, type: 'success' });
            loadPlayers();
        } catch (err) {
            setMessage({ text: err.message || 'Failed to delete player (they may have existing transactions)', type: 'error' });
        }
    }

    async function handleBan(id, currentStatus, name) {
        const action = currentStatus === 'banned' ? 'unban' : 'ban';
        if (!confirm(`Are you sure you want to ${action} player "${name}"?`)) return;
        setMessage({ text: '', type: '' });
        try {
            const { adminApi } = await import('@/lib/api');
            const result = await adminApi.banPlayer(id);
            setMessage({ text: result.message, type: 'success' });
            loadPlayers();
        } catch (err) {
            setMessage({ text: err.message || `Failed to ${action} player`, type: 'error' });
        }
    }

    function startEdit(p) {
        setEditingId(p.id);
        setEditForm({
            status: p.status || 'active',
            phone: p.phone || ''
        });
    }

    async function handleAdjustWallet(e) {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        if (!adjustModal.amount || parseFloat(adjustModal.amount) === 0) {
            alert('Please enter a non-zero amount');
            return;
        }

        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.adjustWallet(adjustModal.player.id, adjustModal.amount, adjustModal.note);
            setMessage({ text: `Wallet adjusted successfully for ${adjustModal.player.username || adjustModal.player.firstName}`, type: 'success' });
            setAdjustModal({ show: false, player: null, amount: '', note: '' });
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

        let matchesFilter = true;
        if (filterStatus === 'active') matchesFilter = p.status === 'active';
        if (filterStatus === 'banned') matchesFilter = p.status === 'banned';
        if (filterStatus === 'registered') matchesFilter = !!p.phone;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Manage Registered Players</h1></header>
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
                        <select
                            className="modal-input"
                            style={{ marginBottom: 0, width: 140, padding: '8px 12px' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="banned">Banned Only</option>
                            <option value="registered">Registered</option>
                        </select>
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
                            paddingBottom: '8px' // Space for the scrollbar
                        }}>
                            <table className="admin-table" style={{ minWidth: 1400, tableLayout: 'auto', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ whiteSpace: 'nowrap', width: '70px', paddingLeft: '24px' }}>ID</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Username</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>Phone</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>Wallet</th>
                                        <th style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>Gift</th>
                                        <th style={{ whiteSpace: 'nowrap', width: '80px' }}>Wins</th>
                                        <th style={{ whiteSpace: 'nowrap', width: '120px' }}>Last Seen</th>
                                        <th style={{ whiteSpace: 'nowrap', width: '120px' }}>Last Stake</th>
                                        <th style={{ whiteSpace: 'nowrap', width: '100px' }}>Status</th>
                                        <th style={{ whiteSpace: 'nowrap', width: '120px' }}>Joined</th>
                                        {isSuperAdmin && <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '120px', paddingRight: '24px' }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontSize: 12, opacity: 0.7 }}>#{p.id}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600 }}>{p.username || 'unknown'}</span>
                                                    <span style={{ fontSize: 11, opacity: 0.6 }}>{p.firstName || ''} {p.lastName || ''}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {editingId === p.id ? (
                                                    <input
                                                        className="modal-input"
                                                        style={{ marginBottom: 0, padding: '4px 8px', fontSize: 13, width: 110 }}
                                                        value={editForm.phone}
                                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: 13 }}>{p.phone || '-'}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-gold)', fontWeight: 700 }}>
                                                    {Number(p.balance).toFixed(0)} <span style={{ fontSize: 10 }}>ETB</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600 }}>
                                                    {Number(p.giftBalance || 0).toFixed(0)} <span style={{ fontSize: 10 }}>ETB</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', padding: '2px 8px', borderRadius: 10,
                                                    background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontSize: 12, fontWeight: 700
                                                }}>
                                                    {p.winCount || 0}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                {p.lastActive ? new Date(p.lastActive).toLocaleDateString() : '-'}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>
                                                    {Number(p.lastStakeAmount || 0) > 0 ? `${Number(p.lastStakeAmount).toFixed(0)} ETB` : '-'}
                                                </div>
                                            </td>
                                            <td>
                                                {editingId === p.id ? (
                                                    <select
                                                        className="modal-input"
                                                        style={{ marginBottom: 0, padding: '4px 8px', fontSize: 12, width: 90 }}
                                                        value={editForm.status}
                                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="banned">Banned</option>
                                                    </select>
                                                ) : (
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                                        background: p.status === 'banned' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: p.status === 'banned' ? '#ef4444' : '#10b981'
                                                    }}>
                                                        {p.status || 'active'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12, opacity: 0.6, whiteSpace: 'nowrap' }}>
                                                {new Date(p.createdAt).toLocaleDateString()}
                                            </td>

                                            {isSuperAdmin && (
                                                <td style={{ textAlign: 'right' }}>
                                                    {editingId === p.id ? (
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-primary" style={{ padding: '4px 8px', height: 'auto', minHeight: 28 }} onClick={() => handleUpdate(p.id)}>
                                                                <Check size={14} />
                                                            </button>
                                                            <button className="admin-btn-outline" style={{ padding: '4px 8px', height: 'auto', minHeight: 28 }} onClick={() => setEditingId(null)}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                            <button
                                                                className="admin-btn-outline"
                                                                title="Adjust Wallet Balance"
                                                                style={{ padding: '6px 10px', height: 'auto', minHeight: 32, cursor: 'pointer', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
                                                                onClick={() => setAdjustModal({ show: true, player: p, amount: '', note: '' })}
                                                            >
                                                                <Wallet size={14} />
                                                            </button>
                                                            <button
                                                                className="admin-btn-outline"
                                                                title="Edit Player"
                                                                style={{ padding: '6px 10px', height: 'auto', minHeight: 32, cursor: 'pointer', color: 'var(--text-secondary)' }}
                                                                onClick={() => startEdit(p)}
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                className="admin-btn-outline"
                                                                title={p.status === 'banned' ? 'Unban Player' : 'Ban Player'}
                                                                style={{
                                                                    padding: '6px 10px', height: 'auto', minHeight: 32, cursor: 'pointer',
                                                                    color: p.status === 'banned' ? '#10b981' : '#f59e0b',
                                                                    borderColor: p.status === 'banned' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'
                                                                }}
                                                                onClick={() => handleBan(p.id, p.status, p.username || p.firstName)}
                                                            >
                                                                <Ban size={14} />
                                                            </button>
                                                            <button
                                                                className="admin-btn-outline"
                                                                title="Delete Player"
                                                                style={{ padding: '6px 10px', height: 'auto', minHeight: 32, cursor: 'pointer', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                                                                onClick={() => handleDelete(p.id, p.username || p.firstName)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 11 : 10} style={{ textAlign: 'center', padding: 60, color: 'var(--admin-text-muted, #64748b)' }}>
                                                No players found matching your filters.
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
                <div className="modal-overlay" onClick={() => setAdjustModal({ show: false, player: null, amount: '', note: '' })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2>Adjust Wallet: {adjustModal.player?.username || adjustModal.player?.firstName}</h2>
                            <button className="modal-close" onClick={() => setAdjustModal({ show: false, player: null, amount: '', note: '' })}>×</button>
                        </div>
                        <form onSubmit={handleAdjustWallet} className="modal-body">
                            <div className="form-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Amount to Add (or Subtract)</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        Current: <b style={{ color: 'var(--accent-gold)' }}>{Number(adjustModal.player?.balance || 0).toFixed(2)} ETB</b>
                                    </span>
                                </label>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button type="button" className="admin-btn-outline" style={{ padding: '8px 12px' }} onClick={() => setAdjustModal(m => ({ ...m, amount: (parseFloat(m.amount || 0) - 10).toString() }))}>-10</button>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        step="0.01"
                                        required
                                        placeholder="e.g. 50 or -50"
                                        value={adjustModal.amount}
                                        onChange={e => setAdjustModal(m => ({ ...m, amount: e.target.value }))}
                                        style={{ marginBottom: 0, textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}
                                    />
                                    <button type="button" className="admin-btn-outline" style={{ padding: '8px 12px' }} onClick={() => setAdjustModal(m => ({ ...m, amount: (parseFloat(m.amount || 0) + 10).toString() }))}>+10</button>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                    Use negative numbers to debit (remove) money from their account.
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label>Reason / Note for Audit Log</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    required
                                    placeholder="e.g. Refund for game crash, bonus credit"
                                    value={adjustModal.note}
                                    onChange={e => setAdjustModal(m => ({ ...m, note: e.target.value }))}
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: 24 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setAdjustModal({ show: false, player: null, amount: '', note: '' })}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ background: parseFloat(adjustModal.amount || 0) < 0 ? '#ef4444' : '#10b981' }}>
                                    {parseFloat(adjustModal.amount || 0) < 0 ? 'Debit Funds' : 'Credit Funds'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
