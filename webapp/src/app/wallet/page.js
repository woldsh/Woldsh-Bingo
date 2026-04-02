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
        if (balance - reqAmount < 10) {
            setMessage('You must leave a minimum remaining balance of 10 Birr.');
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

            {/* Withdraw App UI Overlay */}
            {showWithdraw && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#fdfdfd', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                    {/* Top Section: Requirements */}
                    <div style={{ padding: '24px 20px', background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 22, color: '#111827', fontWeight: 600 }}>Withdrawal Requirements</h2>
                            <button onClick={() => setShowWithdraw(false)} style={{ background: 'none', border: 'none', fontSize: 28, color: '#9ca3af', lineHeight: 1, cursor: 'pointer' }}>×</button>
                        </div>
                        <p style={{ color: '#4b5563', fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>
                            To withdraw money, you need to fulfill the following requirements:
                        </p>
                        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', gap: 10, color: '#334155', fontSize: 14 }}>
                                <span>🎯</span>
                                <span>Minimum withdrawal: 100 Birr (Manual) or 10 Birr (Automatic)</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, color: '#334155', fontSize: 14 }}>
                                <span>💸</span>
                                <span>Minimum remaining balance: 10 Birr</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, color: '#334155', fontSize: 14 }}>
                                <span>💰</span>
                                <span style={{ color: hasDeposit ? 'inherit' : '#ef4444' }}>
                                    At least 1 previous deposit required {hasDeposit && '✅'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, color: '#334155', fontSize: 14 }}>
                                <span>🏆</span>
                                <span style={{ color: stats.gamesWon >= 2 ? 'inherit' : '#ef4444' }}>
                                    At least 2 game wins required {stats.gamesWon >= 2 ? '✅' : `(${stats.gamesWon}/2)`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Inputs */}
                    <div style={{ flex: 1, background: 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)', padding: '32px 20px 40px', color: '#fff' }}>
                        <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', fontWeight: 500, fontSize: 24 }}>Withdraw Funds</h2>
                        <p style={{ textAlign: 'center', fontSize: 15, opacity: 0.9, marginBottom: 28 }}>
                            Available Balance: {balance.toFixed(0)} Birr
                        </p>

                        {/* Toggle */}
                        <div style={{ display: 'flex', marginBottom: 20 }}>
                            <div style={{ background: 'linear-gradient(90deg, #c084fc, #38bdf8)', padding: '10px 24px', borderRadius: '4px 4px 0 0', fontWeight: 600, fontSize: 14, boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}>
                                MANUAL
                            </div>
                            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', flex: 1 }}></div>
                        </div>

                        {/* Amount Input */}
                        <div style={{ marginBottom: 16 }}>
                            <input
                                type="number"
                                placeholder="Amount (Birr)"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                style={{ width: '100%', padding: '16px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 16, outline: 'none' }}
                                className="styled-placeholder"
                            />
                        </div>

                        {/* Phone Input */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', top: -10, left: 16, background: '#7175f3', padding: '0 4px', fontSize: 12, opacity: 0.9 }}>
                                    Phone Number (Optional)
                                </div>
                                <input
                                    type="tel"
                                    placeholder="+251709344446"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    style={{ width: '100%', padding: '18px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 16, outline: 'none' }}
                                    className="styled-placeholder"
                                />
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Use 09..., 07..., or +251... format</div>
                        </div>

                        {/* Bank Selectors */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                            {/* CBE */}
                            <div
                                onClick={() => setWithdrawMethod('cbe')}
                                style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', border: withdrawMethod === 'cbe' ? '2px solid #38bdf8' : '2px solid transparent', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                            >
                                <span style={{ fontSize: 24, marginRight: 16, color: '#f59e0b' }}>⭐</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#111827', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>CBE Birr</div>
                                    <div style={{ color: '#10b981', fontSize: 13 }}>Better Transaction Fee</div>
                                </div>
                                <div style={{ color: '#64748b', fontSize: 13 }}>select to transfer</div>
                            </div>

                            {/* Telebirr */}
                            <div
                                onClick={() => setWithdrawMethod('telebirr')}
                                style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', border: withdrawMethod === 'telebirr' ? '2px solid #38bdf8' : '2px solid transparent', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                            >
                                <span style={{ fontSize: 24, marginRight: 16, color: '#f59e0b' }}>⭐</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#111827', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Telebirr</div>
                                    <div style={{ color: '#10b981', fontSize: 13 }}>Better Transaction Fee</div>
                                </div>
                                <div style={{ color: '#64748b', fontSize: 13 }}>select to transfer</div>
                            </div>
                        </div>

                        {/* Dynamic Message inside Modal */}
                        {message && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, padding: '12px', color: '#fecaca', textAlign: 'center', marginBottom: 20, fontSize: 14 }}>
                                {message}
                            </div>
                        )}

                        <button
                            onClick={handleWithdraw}
                            style={{ width: '100%', padding: '18px', background: 'linear-gradient(90deg, #c084fc, #06b6d4)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                        >
                            PROCEED TO WITHDRAW
                        </button>
                    </div>

                    {/* Add a style definition for placeholder text colors inside the modal */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .styled-placeholder::placeholder {
                            color: rgba(255, 255, 255, 0.5);
                        }
                    `}} />
                </div>
            )}

            <BottomNav />
        </div>
    );
}
