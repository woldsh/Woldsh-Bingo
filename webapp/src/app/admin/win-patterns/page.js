'use client';

import { useState, useEffect } from 'react';

export default function AdminWinPatternsPage() {
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPattern, setEditingPattern] = useState(null);
    const [formData, setFormData] = useState({
        name: '', code: '', cells: [], isActive: true, priority: 0
    });
    const [saving, setSaving] = useState(false);

    // 5x5 grid helper for pattern builder
    const GRID_SIZE = 5;

    useEffect(() => {
        loadPatterns();
    }, []);

    async function loadPatterns() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getWinPatterns();
            setPatterns(data);
        } catch (error) {
            console.error('Failed to load win patterns:', error);
        } finally {
            setLoading(false);
        }
    }

    const openCreateModal = () => {
        setEditingPattern(null);
        setFormData({ name: '', code: '', cells: [], isActive: true, priority: 0 });
        setShowModal(true);
    };

    const openEditModal = (pattern) => {
        setEditingPattern(pattern);
        setFormData({
            name: pattern.name,
            code: pattern.code,
            cells: pattern.cells || [],
            isActive: pattern.isActive,
            priority: pattern.priority
        });
        setShowModal(true);
    };

    const toggleCell = (r, c) => {
        const cellString = `${r},${c}`;
        setFormData(prev => {
            const existing = [...prev.cells];
            // Look for existing array match [r,c]
            const index = existing.findIndex(cell => cell[0] === r && cell[1] === c);

            if (index >= 0) {
                // Remove
                existing.splice(index, 1);
            } else {
                // Add
                existing.push([r, c]);
            }
            return { ...prev, cells: existing };
        });
    };

    const isCellSelected = (r, c) => {
        return formData.cells.some(cell => cell[0] === r && cell[1] === c);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.cells.length === 0) {
            alert('Please select at least one cell for the pattern.');
            return;
        }

        setSaving(true);
        try {
            const { adminApi } = await import('@/lib/api');
            if (editingPattern) {
                await adminApi.updateWinPattern(editingPattern.id, formData);
            } else {
                await adminApi.createWinPattern(formData);
            }
            setShowModal(false);
            loadPatterns();
        } catch (error) {
            console.error('Failed to save pattern:', error);
            alert(error.message || 'Failed to save pattern');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this win pattern? This may break games that depend on it.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.deleteWinPattern(id);
            loadPatterns();
        } catch (error) {
            console.error('Failed to delete pattern:', error);
            alert('Failed to delete pattern.');
        }
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Win Patterns</h1>
                <button className="admin-btn-primary" onClick={openCreateModal}>
                    + Create Pattern
                </button>
            </header>

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>CODE</th>
                                    <th>CELLS REQ.</th>
                                    <th>PRIORITY</th>
                                    <th>STATUS</th>
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
                                ) : patterns.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No win patterns defined yet.
                                        </td>
                                    </tr>
                                ) : patterns.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.code}</td>
                                        <td>{p.cells.length} cells</td>
                                        <td>{p.priority}</td>
                                        <td>
                                            <span className={`status-pill ${p.isActive ? 'active' : 'inactive'}`}>
                                                {p.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="admin-btn-outline"
                                                    onClick={() => openEditModal(p)}
                                                    style={{ padding: '4px 12px', fontSize: '12px' }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="admin-btn-outline"
                                                    onClick={() => handleDelete(p.id)}
                                                    style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '4px 12px', fontSize: '12px' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>{editingPattern ? 'Edit Win Pattern' : 'Create Win Pattern'}</h2>
                            <button className="modal-close" onClick={() => !saving && setShowModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Pattern Name</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        required
                                        placeholder="e.g. Any Line"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Pattern Code (Unique identifier)</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        required
                                        placeholder="e.g. any_line"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Priority (Higher = check first)</label>
                                    <input
                                        type="number"
                                        className="admin-input"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <label htmlFor="isActive" style={{ margin: 0 }}>Active</label>
                                </div>
                            </div>

                            <div className="form-group builder-group">
                                <label>Pattern Builder (Click cells to toggle)</label>
                                <div className="pattern-grid">
                                    {Array.from({ length: GRID_SIZE }).map((_, r) => (
                                        <div key={r} className="pattern-row">
                                            {Array.from({ length: GRID_SIZE }).map((_, c) => {
                                                const selected = isCellSelected(r, c);
                                                // Center is typically free space
                                                const isFreeSpace = r === 2 && c === 2;
                                                return (
                                                    <div
                                                        key={`${r}-${c}`}
                                                        className={`pattern-cell ${selected ? 'selected' : ''} ${isFreeSpace ? 'free' : ''}`}
                                                        onClick={() => toggleCell(r, c)}
                                                    >
                                                        {isFreeSpace && !selected && <span style={{ fontSize: 10, opacity: 0.5 }}>FREE</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                    {formData.cells.length} cells selected
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (editingPattern ? 'Save Changes' : 'Create Pattern')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .status-pill {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .status-pill.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .status-pill.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                
                .builder-group {
                    margin-top: 24px;
                    background: var(--bg-card-hover);
                    padding: 20px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .pattern-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    margin-top: 12px;
                    padding: 8px;
                    background: var(--bg-card);
                    border: 1px solid var(--admin-border);
                    border-radius: 8px;
                }
                
                .pattern-row {
                    display: flex;
                    gap: 4px;
                }
                
                .pattern-cell {
                    width: 40px;
                    height: 40px;
                    border-radius: 6px;
                    background: var(--bg-card-hover);
                    border: 1px solid var(--admin-border);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .pattern-cell:hover {
                    background: rgba(14, 165, 233, 0.2);
                    border-color: #0ea5e9;
                }
                
                .pattern-cell.selected {
                    background: linear-gradient(135deg, #2563eb, #8b5cf6);
                    border-color: transparent;
                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
                }
            `}</style>
        </div>
    );
}
