'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Shield, User, Trash2, Edit2, AlertCircle, Key, Check } from 'lucide-react';

export default function AdminUsersPage() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'admin'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadAdmins();
    }, []);

    async function loadAdmins() {
        setLoading(true);
        setError(null);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getAdmins();
            setAdmins(data);
        } catch (err) {
            console.error('Failed to load admins:', err);
            setError(err.message || 'Failed to load administrators. You may not have permission.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { adminApi } = await import('@/lib/api');
            if (editingAdmin) {
                // Update
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;

                await adminApi.updateAdmin(editingAdmin.id, updateData);
            } else {
                // Create
                await adminApi.createAdmin(formData);
            }
            setIsModalOpen(false);
            loadAdmins();
            resetForm();
        } catch (err) {
            alert(err.message || 'Failed to save admin user');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this administrator? This action cannot be undone.')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.deleteAdmin(id);
            loadAdmins();
        } catch (err) {
            alert(err.message || 'Failed to delete administrator');
        }
    }

    function resetForm() {
        setFormData({ username: '', password: '', role: 'admin' });
        setEditingAdmin(null);
    }

    function openEditModal(admin) {
        setEditingAdmin(admin);
        setFormData({
            username: admin.username,
            password: '', // Don't show existing password
            role: admin.role
        });
        setIsModalOpen(true);
    }

    if (loading && admins.length === 0) {
        return (
            <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={28} color="var(--accent-primary)" />
                        Administrator Accounts
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Create and manage staff accounts and system permissions.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserPlus size={18} /> Add New Admin
                </button>
            </header>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>USERNAME</th>
                                    <th>ROLE</th>
                                    <th>CREATED AT</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                    <User size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{admin.username}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase',
                                                background: admin.role === 'super_admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: admin.role === 'super_admin' ? '#8b5cf6' : '#3b82f6',
                                                border: `1px solid ${admin.role === 'super_admin' ? '#8b5cf633' : '#3b82f633'}`
                                            }}>
                                                {admin.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn-icon" title="Edit Admin" onClick={() => openEditModal(admin)}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn-icon" title="Delete Admin" onClick={() => handleDelete(admin.id)} style={{ color: '#ef4444' }}>
                                                    <Trash2 size={16} />
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

            {/* Admin Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingAdmin ? 'Edit Administrator' : 'Create New Administrator'}</h2>
                            <button className="btn-icon" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        required
                                        placeholder="e.g. john_doe"
                                        disabled={editingAdmin}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password {editingAdmin && '(Leave blank to keep current)'}</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                        <input
                                            type="password"
                                            className="admin-input"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            required={!editingAdmin}
                                            placeholder="••••••••"
                                            style={{ paddingLeft: 40 }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">System Role</label>
                                    <select
                                        className="admin-input"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="admin">Standard Admin</option>
                                        <option value="super_admin">Super Administrator</option>
                                    </select>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Super Admins can manage other admin accounts and system-wide settings.
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" className="admin-btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : editingAdmin ? 'Update Account' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
