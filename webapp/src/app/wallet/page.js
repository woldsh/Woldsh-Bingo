'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [playBalance, setPlayBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');

    // New Withdrawal Requirement States
    const [stats, setStats] = useState({ gamesWon: 0 });
    const [hasDeposit, setHasDeposit] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState(''); // 'cbe' | 'telebirr'

    useEffect(() => {
        loadWallet();
    }, []);

    async function loadWallet() {
        try {
            const { walletApi, userApi } = await import('@/lib/api');
            const [balData, txData, userRes] = await Promise.all([
                walletApi.balance(),
                walletApi.transactions(),
                userApi.me()
            ]);
            setBalance(balData.balance);
            setPlayBalance(userRes.user?.playBalance || 0);
            setTransactions(txData.transactions || []);

            // Extract requirements info
            setPhone(userRes.user?.phone || '');
            setStats(userRes.stats || { gamesWon: 0 });
            setHasDeposit(txData.transactions?.some(tx => tx.type === 'deposit' && tx.status === 'completed') || false);
        } catch {
            // Demo data
            setBalance(33);
            setPlayBalance(0);
            setTransactions([
                { id: 1, type: 'deposit', amount: 100, status: 'completed', note: 'Deposit via Telebirr', createdAt: new Date().toISOString() },
                { id: 2, type: 'bet', amount: 20, status: 'completed', note: 'Game #5 (Fortune)', createdAt: new Date().toISOString() },
                { id: 3, type: 'win', amount: 72, status: 'completed', note: 'Won game #5!', createdAt: new Date().toISOString() },
                { id: 4, type: 'bet', amount: 10, status: 'completed', note: 'Game #8 (Weyra)', createdAt: new Date().toISOString() },
            ]);
        }
    }

    async function handleDeposit() {
        if (!amount || parseFloat(amount) < 10) {
            setMessage('Minimum deposit is 10 ETB');
            return;
        }
        try {
            const { walletApi } = await import('@/lib/api');
            const data = await walletApi.deposit(parseFloat(amount), reference);
            setMessage(data.message);
            setShowDeposit(false);
            setAmount('');
            setReference('');
            loadWallet();
        } catch (err) {
            setMessage(err.message || 'Deposit failed');
        }
    }

    async function handleWithdraw() {
        const reqAmount = parseFloat(amount || 0);

        // Manual validation before calling API
        if (!reqAmount || reqAmount < 100) {
            setMessage('Minimum manual withdrawal is 100 Birr.');
            return;
        }
        if (playBalance < reqAmount) {
            setMessage(`Insufficient Play Wallet balance. You have ${playBalance.toFixed(0)} Birr available for withdrawal.`);
            return;
        }
        if (playBalance - reqAmount < 10) {
            setMessage('You must leave a minimum remaining Play Wallet balance of 10 Birr.');
            return;
        }
        if (!hasDeposit) {
            setMessage('You must make at least 1 deposit before withdrawing.');
            return;
        }
        if (stats.gamesWon < 2) {
            setMessage('You must win at least 2 games before withdrawing.');
            return;
        }
        if (!withdrawMethod) {
            setMessage('Please select a withdrawal method (CBE Birr or Telebirr).');
            return;
        }
        if (!phone) {
            setMessage('Please provide a valid phone number.');
            return;
        }

        try {
            const { walletApi } = await import('@/lib/api');
            // Format phone to include the bank name so the admin knows where to send it
            const formattedPhone = `${withdrawMethod.toUpperCase()}: ${phone}`;
            const data = await walletApi.withdraw(reqAmount, formattedPhone);
            setMessage(data.message || 'Withdrawal requested successfully');
            setShowWithdraw(false);
            setAmount('');
            setPhone('');
            loadWallet();
        } catch (err) {
            setMessage(err.message || 'Withdrawal failed');
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    }

    return (
        <div className="page-container obsidian-theme" style={{ paddingBottom: '100px' }}>
            <header className="header">
                <span style={{ fontWeight: 700, fontSize: 18 }}>💰 Wallet</span>
            </header>

            {/* Balances */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px' }}>
                <div className="profile-stat-box" style={{ background: 'var(--gradient-card-1)' }}>
                    <div className="stat-box-title" style={{ color: 'var(--text-primary)' }}>
                        <span style={{ marginRight: 8, fontSize: 16 }}>💼</span> Main Wallet
                    </div>
                    <div className="stat-box-value" style={{ color: 'var(--accent-gold)' }}>
                        {balance.toFixed(2)} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>ETB</span>
                    </div>
                </div>
                <div className="profile-stat-box" style={{ background: 'var(--gradient-card-2)' }}>
                    <div className="stat-box-title" style={{ color: 'var(--text-primary)' }}>
                        <span style={{ marginRight: 8, fontSize: 16 }}>💳</span> Play Wallet
                    </div>
                    <div className="stat-box-value" style={{ color: 'var(--accent-primary)' }}>
                        {playBalance.toFixed(2)} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>ETB</span>
                    </div>
                </div>
            </div>

            <div className="wallet-balance" style={{ margin: '0 20px' }}>
                <div className="balance-label">Total Balance</div>
                <div className="balance-amount">{(balance + playBalance).toFixed(2)}</div>
                <div className="balance-currency">ETB</div>
            </div>

            {/* Actions */}
            <div className="wallet-actions">
                <button className="wallet-btn wallet-btn-deposit" onClick={() => { setShowDeposit(true); setMessage(''); }}>
                    💳 Deposit
                </button>
                <button className="wallet-btn wallet-btn-withdraw" onClick={() => { setShowWithdraw(true); setMessage(''); }}>
                    💸 Withdraw
                </button>
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    padding: '10px 20px',
                    margin: '12px 20px',
                    borderRadius: 10,
                    background: 'rgba(0, 212, 170, 0.1)',
                    border: '1px solid rgba(0, 212, 170, 0.2)',
                    color: 'var(--accent-primary)',
                    fontSize: 13,
                    textAlign: 'center',
                }}>
                    {message}
                </div>
            )}

            {/* Transactions History */}
            <div style={{ padding: '20px 20px 0' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    History (Deposit/Withdraw)
                </h3>
            </div>

            {transactions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-text">No transactions yet</div>
                </div>
            ) : (
                <div className="transaction-list">
                    {transactions.map(tx => (
                        <div key={tx.id} className="transaction-item">
                            <div className="transaction-info">
                                <div className="transaction-type">
                                    {tx.type === 'deposit' && '💳 '}
                                    {tx.type === 'withdraw' && '💸 '}
                                    {tx.type === 'bet' && '🎮 '}
                                    {tx.type === 'win' && '🏆 '}
                                    {tx.type}
                                </div>
                                <div className="transaction-date">{formatDate(tx.createdAt)}</div>
                                {tx.note && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.note}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className={`transaction-amount ${['deposit', 'win', 'bonus'].includes(tx.type) ? 'positive' : 'negative'}`}>
                                    {['deposit', 'win', 'bonus'].includes(tx.type) ? '+' : '-'}{tx.amount} ETB
                                </div>
                                <span className={`transaction-status ${tx.status === 'completed' ? 'status-completed' : 'status-pending'}`}>
                                    {tx.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Deposit Modal */}
            {showDeposit && (
                <div className="modal-overlay" onClick={() => setShowDeposit(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">💳 Deposit</div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' }}>
                            Send money to Telebirr: 09XXXXXXXX<br />
                            Then enter the amount and reference below.
                        </p>
                        <input
                            className="modal-input"
                            type="number"
                            placeholder="Amount (min 10 ETB)"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                        <input
                            className="modal-input"
                            type="text"
                            placeholder="Transaction reference (optional)"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowDeposit(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleDeposit}>Deposit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw App UI Overlay (Clean Light Theme) */}
            {showWithdraw && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                    {/* Top Section: Requirements */}
                    <div style={{ padding: '24px 20px', background: '#ffffff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 16px 0' }}>
                            <h2 style={{ margin: 0, fontSize: 22, color: '#0f172a', fontWeight: 700 }}>Withdrawal Requirements</h2>
                            <button onClick={() => setShowWithdraw(false)} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: 18, fontSize: 20, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        <p style={{ color: '#475569', fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>
                            To withdraw money, you need to fulfill the following requirements:
                        </p>
                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', gap: 12, color: '#334155', fontSize: 14, alignItems: 'center' }}>
                                <div style={{ minWidth: 24, height: 24, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>🎯</div>
                                <span>Minimum withdrawal: <strong style={{ color: '#0f172a' }}>100 Birr</strong></span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, color: '#334155', fontSize: 14, alignItems: 'center' }}>
                                <div style={{ minWidth: 24, height: 24, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>💸</div>
                                <span>Minimum remaining balance: <strong style={{ color: '#dc2626' }}>10 Birr</strong></span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, color: '#334155', fontSize: 14, alignItems: 'center' }}>
                                <div style={{ minWidth: 24, height: 24, borderRadius: 12, background: hasDeposit ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasDeposit ? '#16a34a' : '#dc2626' }}>{hasDeposit ? '✓' : '!'}</div>
                                <span style={{ color: hasDeposit ? '#334155' : '#ef4444', fontWeight: hasDeposit ? 400 : 500 }}>
                                    At least 1 previous deposit
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, color: '#334155', fontSize: 14, alignItems: 'center' }}>
                                <div style={{ minWidth: 24, height: 24, borderRadius: 12, background: stats.gamesWon >= 2 ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stats.gamesWon >= 2 ? '#16a34a' : '#dc2626' }}>{stats.gamesWon >= 2 ? '✓' : '!'}</div>
                                <span style={{ color: stats.gamesWon >= 2 ? '#334155' : '#ef4444', fontWeight: stats.gamesWon >= 2 ? 400 : 500 }}>
                                    At least 2 game wins {stats.gamesWon < 2 && `(${stats.gamesWon}/2)`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Inputs */}
                    <div style={{ flex: 1, padding: '32px 20px 100px', color: '#0f172a' }}>
                        <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', fontWeight: 700, fontSize: 24, color: '#0f172a' }}>Withdraw Funds</h2>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#eff6ff', borderRadius: 12, marginBottom: 28, border: '1px solid #bfdbfe' }}>
                            <p style={{ margin: 0, fontSize: 14, color: '#1e3a8a' }}>Play Wallet Balance</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 24, fontWeight: 800, color: '#1d4ed8' }}>{playBalance.toFixed(0)} ETB</p>
                        </div>

                        {/* Amount Input */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600 }}>ETB</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    style={{ width: '100%', padding: '16px 16px 16px 52px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 18, fontWeight: 600, outline: 'none', transition: 'border-color 0.2s' }}
                                    className="styled-light-input"
                                />
                            </div>
                        </div>

                        {/* Phone Input */}
                        <div style={{ marginBottom: 28 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="+251 7..."
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 16, outline: 'none', transition: 'border-color 0.2s' }}
                                className="styled-light-input"
                            />
                        </div>

                        {/* Bank Selectors */}
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Bank</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                            {/* CBE */}
                            <div
                                onClick={() => setWithdrawMethod('cbe')}
                                style={{ background: withdrawMethod === 'cbe' ? '#eff6ff' : '#ffffff', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', cursor: 'pointer', border: withdrawMethod === 'cbe' ? '2px solid #2563eb' : '2px solid #e2e8f0', transition: 'all 0.2s' }}
                            >
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12, marginRight: 16 }}>CBE</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>CBE Birr</div>
                                    <div style={{ color: '#64748b', fontSize: 13 }}>Commercial Bank of Ethiopia</div>
                                </div>
                                <div style={{ width: 24, height: 24, borderRadius: 12, border: withdrawMethod === 'cbe' ? '7px solid #2563eb' : '2px solid #cbd5e1', background: '#fff' }}></div>
                            </div>

                            {/* Telebirr */}
                            <div
                                onClick={() => setWithdrawMethod('telebirr')}
                                style={{ background: withdrawMethod === 'telebirr' ? '#eff6ff' : '#ffffff', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', cursor: 'pointer', border: withdrawMethod === 'telebirr' ? '2px solid #2563eb' : '2px solid #e2e8f0', transition: 'all 0.2s' }}
                            >
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20, marginRight: 16 }}>+</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Telebirr</div>
                                    <div style={{ color: '#64748b', fontSize: 13 }}>Ethio Telecom</div>
                                </div>
                                <div style={{ width: 24, height: 24, borderRadius: 12, border: withdrawMethod === 'telebirr' ? '7px solid #2563eb' : '2px solid #cbd5e1', background: '#fff' }}></div>
                            </div>
                        </div>

                        {/* Dynamic Message inside Modal */}
                        {message && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px', color: '#dc2626', textAlign: 'center', marginBottom: 24, fontSize: 14, fontWeight: 500 }}>
                                🚨 {message}
                            </div>
                        )}

                        <button
                            onClick={handleWithdraw}
                            style={{ width: '100%', padding: '18px', background: '#2563eb', border: 'none', borderRadius: 12, color: '#ffffff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)', transition: 'background 0.2s' }}
                        >
                            Request Withdrawal
                        </button>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .styled-light-input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
                        .styled-light-input::placeholder { color: #94a3b8; }
                    `}} />
                </div>
            )}

            <BottomNav />
        </div>
    );
}
