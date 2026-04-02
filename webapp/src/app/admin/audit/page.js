'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock, User, Fingerprint, FileText, Search } from 'lucide-react';

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getAuditLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.adminUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.targetId && log.targetId.includes(searchTerm))
    );

    function getActionColor(action) {
        if (action.includes('DELETE')) return '#ef4444';
        if (action.includes('APPROVE') || action.includes('CREDIT')) return '#10b981';
        if (action.includes('UPDATE') || action.includes('EDIT')) return '#3b82f6';
        if (action.includes('CREATE')) return '#8b5cf6';
        return 'var(--text-secondary)';
    }

    if (loading) return <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner"></div></div>;

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={28} color="var(--accent-primary)" />
                        Security Audit Logs
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Track every administrative action for accountability and troubleshooting.
                    </p>
                </div>
            </header>

            <div className="admin-content">
                <div className="admin-card" style={{ marginBottom: '24px' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Search logs by action, admin, or target ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '40px', marginBottom: 0 }}
                            />
                        </div>
                        <button className="admin-btn-outline" onClick={loadLogs}>Refresh</button>
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>TIMESTAMP</th>
                                    <th>ADMIN</th>
                                    <th>ACTION</th>
                                    <th>TARGET</th>
                                    <th>DETAILS / REASON</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No audit logs found.
                                        </td>
                                    </tr>
                                ) : filteredLogs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Clock size={12} />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                                                <User size={14} color="var(--accent-primary)" />
                                                {log.adminUsername}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.05)', color: getActionColor(log.action),
                                                border: `1px solid ${getActionColor(log.action)}33`
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12 }}>
                                                <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{log.targetType}:</span>
                                                <code style={{ marginLeft: 4, background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: 4 }}>
                                                    {log.targetId || 'N/A'}
                                                </code>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: '300px' }}>
                                            {log.reason && <div style={{ marginBottom: 4 }}><b>R:</b> {log.reason}</div>}
                                            {log.afterData && (
                                                <div style={{ fontSize: 11, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <b>Data:</b> {log.afterData}
                                                </div>
                                            )}
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
