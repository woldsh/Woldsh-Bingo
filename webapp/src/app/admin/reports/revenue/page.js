'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function AdminRevenueReportPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getReports(30); // Last 30 days
            setStats(data);
        } catch (error) {
            console.error('Failed to load revenue reports:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner"></div></div>;

    if (!stats) return <div className="admin-page"><div className="admin-content">Failed to load statistics.</div></div>;

    const netProfit = (stats.revenue.find(r => r.type === 'bet')?._sum.amount || 0)
        - (stats.revenue.find(r => r.type === 'win')?._sum.amount || 0);

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Financial Revenue Report</h1>
            </header>

            <div className="admin-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div className="admin-card" style={{ padding: '24px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Gross Gaming Volume (Bets)</div>
                        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{Number(stats.totalVolume).toLocaleString()} ETB</div>
                    </div>

                    <div className="admin-card" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Player Payouts (Wins)</div>
                        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: '#ef4444' }}>
                            {Number(stats.revenue.find(r => r.type === 'win')?._sum.amount || 0).toLocaleString()} ETB
                        </div>
                    </div>

                    <div className="admin-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Net GGR (Profit)</div>
                        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: '#10b981' }}>
                            {netProfit.toLocaleString()} ETB
                        </div>
                    </div>
                </div>

                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">Detailed Ledger Breakdown (Last 30 Days)</h2>
                    </div>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>TRANSACTION TYPE</th>
                                    <th>TOTAL FLOW</th>
                                    <th>IMPACT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.revenue.map(r => (
                                    <tr key={r.type}>
                                        <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.type.replace('_', ' ')}</td>
                                        <td style={{ fontWeight: 700 }}>{Number(r._sum.amount).toFixed(2)} ETB</td>
                                        <td>
                                            {['bet', 'deposit'].includes(r.type) ? (
                                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <ArrowUpRight size={14} /> Inflow
                                                </span>
                                            ) : (
                                                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <ArrowDownRight size={14} /> Outflow
                                                </span>
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
