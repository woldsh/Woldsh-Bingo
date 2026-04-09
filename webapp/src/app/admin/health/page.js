'use client';

import { useState, useEffect } from 'react';
import { Activity, Database, Cpu, RefreshCw, Wifi, WifiOff, Clock, Server, Zap } from 'lucide-react';

export default function AdminHealthPage() {
    const [health, setHealth] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);

    useEffect(() => { loadHealth(); }, []);

    async function loadHealth() {
        setLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const healthRes = await fetch(`${API_URL}/api/health`);
            const healthData = await healthRes.json();
            setHealth(healthData);

            const { adminApi } = await import('@/lib/api');
            const dashData = await adminApi.dashboard();
            setStats(dashData.stats);
            setLastRefresh(new Date());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    function formatUptime(seconds) {
        if (!seconds) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    function StatusDot({ status }) {
        const colors = {
            connected: '#10b981',
            ok: '#10b981',
            disconnected: '#f59e0b',
            error: '#ef4444',
        };
        const color = colors[status] || '#6b7280';
        return (
            <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 8px ${color}60`,
                marginRight: 8,
            }} />
        );
    }

    function StatusBadge({ status, label }) {
        const styles = {
            connected: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
            ok: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
            disconnected: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
            error: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
        };
        const s = styles[status] || styles.disconnected;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                background: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}>
                {label || status}
            </span>
        );
    }

    const redisStatus = health?.redis?.status || 'disconnected';
    const dbStatus = health?.database?.status || 'disconnected';

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={28} color="var(--accent-primary)" />
                        System Health
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Monitor backend services, database, and cache connectivity.
                    </p>
                </div>
                <button
                    className="admin-btn-outline"
                    onClick={loadHealth}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    Refresh
                </button>
            </header>

            <div className="admin-content">

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 80 }}>
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <>
                        {/* Service Status Cards */}
                        <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
                            {/* API Status */}
                            <div className="admin-stat-card">
                                <div>
                                    <div className="admin-stat-label">API SERVER</div>
                                    <div className="admin-stat-value" style={{
                                        color: health?.status === 'ok' ? '#10b981' : '#ef4444',
                                        display: 'flex', alignItems: 'center', fontSize: 20
                                    }}>
                                        <StatusDot status={health?.status || 'error'} />
                                        {health?.status === 'ok' ? 'Online' : 'Offline'}
                                    </div>
                                    <div className="stat-sub">{health?.service || 'unknown'}</div>
                                </div>
                                <div className="stat-icon-wrapper" style={{ '--icon-color': '#10b981' }}>
                                    <Server size={22} />
                                </div>
                            </div>

                            {/* Database Status */}
                            <div className="admin-stat-card">
                                <div>
                                    <div className="admin-stat-label">DATABASE</div>
                                    <div className="admin-stat-value" style={{
                                        color: dbStatus === 'connected' ? '#10b981' : '#ef4444',
                                        display: 'flex', alignItems: 'center', fontSize: 20
                                    }}>
                                        <StatusDot status={dbStatus} />
                                        {dbStatus === 'connected' ? 'Connected' : dbStatus === 'error' ? 'Error' : 'Disconnected'}
                                    </div>
                                    <div className="stat-sub">
                                        Supabase PostgreSQL
                                        {health?.database?.latency != null && (
                                            <span style={{ marginLeft: 6, color: '#3b82f6', fontWeight: 600 }}>
                                                {health.database.latency}ms
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="stat-icon-wrapper" style={{ '--icon-color': '#3b82f6' }}>
                                    <Database size={22} />
                                </div>
                            </div>

                            {/* Redis Status */}
                            <div className="admin-stat-card" style={{
                                borderLeft: `3px solid ${redisStatus === 'connected' ? '#10b981' : redisStatus === 'error' ? '#ef4444' : '#f59e0b'}`
                            }}>
                                <div>
                                    <div className="admin-stat-label">REDIS CACHE</div>
                                    <div className="admin-stat-value" style={{
                                        color: redisStatus === 'connected' ? '#10b981' : redisStatus === 'error' ? '#ef4444' : '#f59e0b',
                                        display: 'flex', alignItems: 'center', fontSize: 20
                                    }}>
                                        <StatusDot status={redisStatus} />
                                        {redisStatus === 'connected' ? 'Connected' : redisStatus === 'error' ? 'Error' : 'Disconnected'}
                                    </div>
                                    <div className="stat-sub">
                                        {redisStatus === 'connected' ? (
                                            <>
                                                Settings cache active
                                                {health?.redis?.latency != null && (
                                                    <span style={{ marginLeft: 6, color: '#10b981', fontWeight: 600 }}>
                                                        {health.redis.latency}ms
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span style={{ color: '#f59e0b' }}>Fallback: in-memory cache</span>
                                        )}
                                    </div>
                                </div>
                                <div className="stat-icon-wrapper" style={{
                                    '--icon-color': redisStatus === 'connected' ? '#ef4444' : '#f59e0b'
                                }}>
                                    <Zap size={22} />
                                </div>
                            </div>

                            {/* Uptime */}
                            <div className="admin-stat-card">
                                <div>
                                    <div className="admin-stat-label">UPTIME</div>
                                    <div className="admin-stat-value" style={{ fontSize: 20 }}>
                                        {formatUptime(health?.uptime)}
                                    </div>
                                    <div className="stat-sub">Server process</div>
                                </div>
                                <div className="stat-icon-wrapper" style={{ '--icon-color': '#8b5cf6' }}>
                                    <Clock size={22} />
                                </div>
                            </div>
                        </div>

                        {/* Detailed Status Panel */}
                        <div className="admin-card" style={{ marginBottom: 24 }}>
                            <div className="admin-card-header" style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                borderBottom: '1px solid var(--border-color)', paddingBottom: 16
                            }}>
                                <Cpu size={18} color="#8b5cf6" />
                                <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>Service Details</h2>
                            </div>

                            <div style={{ padding: 0 }}>
                                {/* Row: API */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Server size={18} color="#6b7280" />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>API Server</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Express.js + Socket.IO</div>
                                        </div>
                                    </div>
                                    <StatusBadge status={health?.status === 'ok' ? 'connected' : 'error'} label={health?.status === 'ok' ? 'Healthy' : 'Down'} />
                                </div>

                                {/* Row: Database */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Database size={18} color="#6b7280" />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>PostgreSQL Database</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                Supabase · Latency: {health?.database?.latency != null ? `${health.database.latency}ms` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <StatusBadge status={dbStatus} label={dbStatus === 'connected' ? 'Connected' : 'Error'} />
                                </div>

                                {/* Row: Redis */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Zap size={18} color={redisStatus === 'connected' ? '#ef4444' : '#6b7280'} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>Redis Cache</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {redisStatus === 'connected'
                                                    ? `Settings cache · Latency: ${health?.redis?.latency != null ? `${health.redis.latency}ms` : '—'}`
                                                    : 'Not running · Using in-memory fallback'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <StatusBadge
                                        status={redisStatus}
                                        label={redisStatus === 'connected' ? 'Connected' : redisStatus === 'error' ? 'Error' : 'Offline'}
                                    />
                                </div>

                                {/* Row: Records Summary */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Activity size={18} color="#6b7280" />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>Platform Records</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {stats?.totalPlayers || 0} users · {stats?.totalGames || 0} games · {stats?.activeGames || 0} active
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                    }}>
                                        {stats ? (stats.totalPlayers + stats.totalGames) : 0} total
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Last refresh */}
                        {lastRefresh && (
                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 20 }}>
                                Last checked: {lastRefresh.toLocaleTimeString()}
                            </div>
                        )}
                    </>
                )}
            </div>

            <style jsx>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
