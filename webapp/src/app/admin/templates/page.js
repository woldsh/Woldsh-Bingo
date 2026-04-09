'use client';

import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, Check, X, Info, Clock, Wrench } from 'lucide-react';
import { adminApi } from '@/lib/api';

export default function RoomTemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        stake: '',
        prize: '',
        maxPlayers: 1000,
        theme: 'blue',
        sortOrder: 0,
        isActive: true
    });
    const [saving, setSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    // Auto-reset delete confirmation after 3 seconds
    useEffect(() => {
        if (deleteConfirmId) {
            const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteConfirmId]);

    async function loadTemplates() {
        try {
            setLoading(true);
            const data = await adminApi.roomTemplates.list();
            setTemplates(data || []);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    }

    function openAddModal() {
        setEditingTemplate(null);
        setFormData({
            name: '',
            stake: '',
            prize: '',
            maxPlayers: 1000,
            theme: 'blue',
            sortOrder: 0,
            isActive: true
        });
        setIsModalOpen(true);
    }

    function openEditModal(template) {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            stake: template.stake,
            prize: template.prize,
            maxPlayers: template.maxPlayers,
            theme: template.theme || 'blue',
            sortOrder: template.sortOrder || 0,
            isActive: template.isActive
        });
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingTemplate) {
                await adminApi.roomTemplates.update(editingTemplate.id, formData);
            } else {
                await adminApi.roomTemplates.create(formData);
            }
            setIsModalOpen(false);
            loadTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save room template');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (deleteConfirmId !== id) {
            setDeleteConfirmId(id);
            return;
        }
        setDeleteConfirmId(null);
        try {
            await adminApi.roomTemplates.delete(id);
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete room template');
        }
    }

    async function handleToggleMaintenance(id) {
        try {
            await adminApi.roomTemplates.toggleMaintenance(id);
            loadTemplates();
        } catch (error) {
            console.error('Error toggling maintenance:', error);
            alert('Failed to toggle maintenance');
        }
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title">Room Templates</h1>
                    <p className="admin-subtitle">Manage game stakes and room configurations</p>
                </div>
                <button className="admin-btn-primary" onClick={openAddModal}>
                    <Plus size={18} /> Add New Stake
                </button>
            </header>

            <div className="admin-content">
                <div className="admin-info-card">
                    <Info size={18} className="info-icon" />
                    <span>Active templates are displayed as available "Stakes" in the mini app. Fallback defaults are used if no active templates exist.</span>
                </div>

                {loading ? (
                    <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '16px' }}>
                        <div className="spinner"></div>
                        <p>Loading templates...</p>
                    </div>
                ) : (
                    <div className="admin-card">
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ROOM NAME</th>
                                        <th>STAKE (ETB)</th>
                                        <th>LIVE PRIZE (ETB)</th>
                                        <th>LIVE PLAYERS</th>
                                        <th>THEME</th>
                                        <th>STATUS</th>
                                        <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                                No custom room templates found. Create one to get started!
                                            </td>
                                        </tr>
                                    ) : (
                                        templates.map((template) => (
                                            <tr key={template.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="room-icon-circle" style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Layers size={14} />
                                                        </div>
                                                        <span style={{ fontWeight: 600 }}>{template.name}</span>
                                                    </div>
                                                </td>
                                                <td>{template.stake}</td>
                                                <td style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                                                    {template.livePrize !== undefined ? Number(template.livePrize).toFixed(2) : Number(template.prize).toFixed(2)}
                                                </td>
                                                <td>
                                                    {template.livePlayers !== undefined ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ color: template.livePlayers > 0 ? 'var(--accent-primary)' : 'inherit', fontWeight: template.livePlayers > 0 ? 'bold' : 'normal' }}>
                                                                {template.livePlayers}
                                                            </span>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/ {template.maxPlayers}</span>
                                                        </span>
                                                    ) : (
                                                        template.maxPlayers
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`theme-badge theme-${template.theme || 'blue'}`}>
                                                        {(template.theme || 'blue').charAt(0).toUpperCase() + (template.theme || 'blue').slice(1)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${template.isMaintenance ? 'maintenance' : template.isActive ? 'active' : 'inactive'}`}>
                                                        {template.isMaintenance ? 'Maintenance' : template.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className="action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            className={`action-btn ${template.isMaintenance ? 'maintenance-active' : ''}`}
                                                            onClick={() => handleToggleMaintenance(template.id)}
                                                            title={template.isMaintenance ? 'End Maintenance' : 'Start Maintenance'}
                                                        >
                                                            <Wrench size={16} />
                                                        </button>
                                                        <button className="action-btn edit" onClick={() => openEditModal(template)}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className={`action-btn btn-delete ${deleteConfirmId === template.id ? 'confirming' : ''}`}
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                                                            title={deleteConfirmId === template.id ? 'Click again to confirm delete' : 'Delete template'}
                                                        >
                                                            {deleteConfirmId === template.id ? <Check size={16} /> : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingTemplate ? 'Edit Stake' : 'Create New Stake'}</h2>
                            <button className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Room Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Weyra, Gold Room, Mega Bingo"
                                    className="modal-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Stake Amount (ETB)</label>
                                    <input
                                        type="number"
                                        placeholder="10"
                                        className="modal-input"
                                        value={formData.stake}
                                        onChange={(e) => setFormData({ ...formData, stake: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Target Prize (ETB)</label>
                                    <input
                                        type="number"
                                        placeholder="36"
                                        className="modal-input"
                                        value={formData.prize}
                                        onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                                    />
                                    <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>If empty, auto-calc (Stake * Players * 0.9)</small>
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Card Theme</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        {[
                                            { id: 'blue', name: 'Indigo 💎', gradient: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', glow: 'rgba(59, 130, 246, 0.5)' },
                                            { id: 'green', name: 'Emerald 🌿', gradient: 'linear-gradient(135deg, #064e3b, #10b981)', glow: 'rgba(16, 185, 129, 0.5)' },
                                            { id: 'red', name: 'Ruby 🔥', gradient: 'linear-gradient(135deg, #7f1d1d, #ef4444)', glow: 'rgba(239, 68, 68, 0.5)' },
                                            { id: 'gold', name: 'Amber 🌟', gradient: 'linear-gradient(135deg, #b45309, #f59e0b)', glow: 'rgba(245, 158, 11, 0.5)' },
                                            { id: 'purple', name: 'Amethyst 🔮', gradient: 'linear-gradient(135deg, #581c87, #8b5cf6)', glow: 'rgba(139, 92, 246, 0.5)' },
                                            { id: 'slate', name: 'Onyx 🌑', gradient: 'linear-gradient(135deg, #0f172a, #475569)', glow: 'rgba(71, 85, 105, 0.5)' },
                                        ].map(t => {
                                            const isSelected = formData.theme === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, theme: t.id })}
                                                    style={{
                                                        position: 'relative',
                                                        height: '85px',
                                                        borderRadius: '16px',
                                                        border: 'none',
                                                        background: t.gradient,
                                                        color: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        boxShadow: isSelected 
                                                            ? `0 0 0 3px #fff, 0 0 0 6px ${t.glow}, 0 10px 20px ${t.glow}` 
                                                            : '0 4px 10px rgba(0,0,0,0.1)',
                                                        transform: isSelected ? 'translateY(-3px)' : 'translateY(0)',
                                                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if(!isSelected) e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                                        e.currentTarget.style.boxShadow = isSelected 
                                                            ? `0 0 0 3px #fff, 0 0 0 6px ${t.glow}, 0 15px 25px ${t.glow}` 
                                                            : '0 8px 15px rgba(0,0,0,0.15)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if(!isSelected) e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                        e.currentTarget.style.boxShadow = isSelected 
                                                            ? `0 0 0 3px #fff, 0 0 0 6px ${t.glow}, 0 10px 20px ${t.glow}` 
                                                            : '0 4px 10px rgba(0,0,0,0.1)';
                                                    }}
                                                >
                                                    {/* Card Pattern Overlay */}
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                        background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.06\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
                                                        zIndex: 1
                                                    }} />
                                                    
                                                    {/* Blur light blob */}
                                                    <div style={{
                                                        position: 'absolute', bottom: '-20px', right: '-20px',
                                                        width: '70px', height: '70px', background: 'rgba(255,255,255,0.15)',
                                                        borderRadius: '50%', filter: 'blur(15px)', zIndex: 1
                                                    }} />
                                                    <div style={{
                                                        position: 'absolute', top: '-10px', left: '-10px',
                                                        width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)',
                                                        borderRadius: '50%', filter: 'blur(10px)', zIndex: 1
                                                    }} />

                                                    {/* Selection Indicator */}
                                                    {isSelected && (
                                                        <div style={{
                                                            position: 'absolute', top: '10px', right: '10px',
                                                            background: '#fff', color: t.glow.replace(/, 0.5\)/, ', 1)').replace('rgba', 'rgb'),
                                                            borderRadius: '50%', width: '22px', height: '22px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                                            zIndex: 3,
                                                            animation: 'scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                                                        }}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Text Label */}
                                                    <span style={{ 
                                                        position: 'relative', zIndex: 2, 
                                                        fontWeight: 800, fontSize: '15px',
                                                        letterSpacing: '0.5px', textShadow: '0 2px 5px rgba(0,0,0,0.5)',
                                                        display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center'
                                                    }}>
                                                        <span>{t.name.split(' ')[1]}</span>
                                                        <span style={{ fontSize: '13px', opacity: 0.9 }}>{t.name.split(' ')[0]}</span>
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="modal-input"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                                    />
                                    <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lower numbers appear first</small>
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 25 }}>
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="isActive" style={{ margin: 0 }}>Active</label>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '20px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (editingTemplate ? 'Save Changes' : 'Create Template')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .admin-subtitle {
                    color: var(--text-secondary);
                    font-size: 14px;
                    margin-top: 4px;
                }
                .admin-btn-primary {
                    background: var(--gradient-primary);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .admin-info-card {
                    background: rgba(14, 165, 233, 0.1);
                    border: 1px solid rgba(14, 165, 233, 0.2);
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: var(--accent-primary);
                    font-size: 14px;
                }
                .status-pill.active {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                .status-pill.inactive {
                    background: rgba(239, 44, 44, 0.1);
                    color: #ef4444;
                }
                .status-pill.maintenance {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }
                .action-btn.maintenance-active {
                    background: rgba(245, 158, 11, 0.15);
                    border-color: #f59e0b;
                    color: #f59e0b;
                }
                .action-btn {
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: inherit;
                }
                .action-btn:hover {
                    opacity: 0.8;
                }
                .action-btn.btn-delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: #ef4444;
                    color: #ef4444;
                }
                .action-btn.btn-delete.confirming {
                    background: #ef4444;
                    border-color: #ef4444;
                    color: #fff;
                    animation: pulse-delete 0.6s ease infinite;
                }
                @keyframes pulse-delete {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                .form-group {
                    margin-bottom: 16px;
                }
                .theme-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: capitalize;
                }
                .theme-blue {
                    background: linear-gradient(135deg, #1e1b4b, #2e2a7a);
                    color: #c7d2fe;
                }
                .theme-green {
                    background: linear-gradient(135deg, #134e4a, #115e59);
                    color: #99f6e4;
                }
                .theme-red {
                    background: linear-gradient(135deg, #4c0519, #701a75);
                    color: #fda4af;
                }
                .theme-gold {
                    background: linear-gradient(135deg, #78350f, #92400e);
                    color: #fde68a;
                }
                .theme-purple {
                    background: linear-gradient(135deg, #4c1d95, #6d28d9);
                    color: #ddd6fe;
                }
                .theme-slate {
                    background: linear-gradient(135deg, #0f172a, #1e293b);
                    color: #e2e8f0;
                }
            `}</style>
        </div>
    );
}
