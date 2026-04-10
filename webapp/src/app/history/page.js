'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

export default function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        try {
            const { userApi } = await import('@/lib/api');
            const data = await userApi.history();
            // Max 5
            setHistory((data.history || []).slice(0, 5));
        } catch {
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

    return (
        <div className="page-container obsidian-theme">
            <header className="header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontWeight: 700, fontSize: 18 }}>🕐 Game History</span>
                <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    letterSpacing: '0.5px',
                }}>
                    Win / Loss
                </span>
            </header>

            {loading ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 20px',
                    gap: '16px',
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        border: '3px solid rgba(20, 184, 166, 0.15)',
                        borderTopColor: '#14b8a6',
                        borderRadius: '50%',
                        animation: 'histSpin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes histSpin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : history.length === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 20px',
                    gap: '12px',
                }}>
                    <div style={{ fontSize: '48px' }}>🎮</div>
                    <div style={{ color: '#94a3b8', fontSize: '15px', fontWeight: 600 }}>No games played yet</div>
                </div>
            ) : (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {history.map((game, i) => (
                        <div key={game.gameId || i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 16px',
                            background: 'var(--bg-card)',
                            borderRadius: '14px',
                            border: game.isWinner
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid var(--border-color)',
                        }}>
                            {/* Left: icon + info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: game.isWinner
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : 'rgba(239, 68, 68, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}>
                                    {game.isWinner ? '🏆' : '😔'}
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                    }}>
                                        {game.roomName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        {formatDate(game.playedAt)}
                                    </div>
                                </div>
                            </div>

                            {/* Right: stake + result */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#94a3b8',
                                    marginBottom: '4px',
                                }}>
                                    Bet: {game.stake} ETB
                                </div>
                                <span style={{
                                    display: 'inline-block',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    background: game.isWinner
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : 'rgba(239, 68, 68, 0.12)',
                                    color: game.isWinner ? '#10b981' : '#ef4444',
                                    letterSpacing: '0.3px',
                                }}>
                                    {game.isWinner ? `Won ${game.prize} ETB` : 'Lost'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Footer note */}
                    <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 500,
                    }}>
                        Showing last {history.length} game{history.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
