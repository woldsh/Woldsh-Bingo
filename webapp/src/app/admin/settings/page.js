'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Server, Wrench, Shield, MessageSquare, DollarSign, Gamepad2, Users, Bell, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
    const [originalSettings, setOriginalSettings] = useState({});

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getSettings();
            setSettings(data);
            setOriginalSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setSaveStatus(null);
        try {
            const { adminApi } = await import('@/lib/api');
            const result = await adminApi.updateSettings(settings);
            if (result.settings) {
                setSettings(result.settings);
                setOriginalSettings(result.settings);
            }
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 4000);
        } finally {
            setSaving(false);
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
        }));
    };

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    if (loading) {
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
                        <Settings size={28} color="var(--accent-primary)" />
                        Global Settings
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        Configure application-wide parameters for the Bingo platform.
                    </p>
                </div>
                {hasChanges && (
                    <span style={{
                        padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                        background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                        Unsaved Changes
                    </span>
                )}
            </header>

            {/* Save Status Banner */}
            {saveStatus === 'success' && (
                <div style={{
                    maxWidth: 800, margin: '0 auto 16px', padding: '12px 16px', borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: 14
                }}>
                    <CheckCircle size={18} /> Settings saved successfully!
                </div>
            )}
            {saveStatus === 'error' && (
                <div style={{
                    maxWidth: 800, margin: '0 auto 16px', padding: '12px 16px', borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: 14
                }}>
                    <AlertTriangle size={18} /> Failed to save settings. Please try again.
                </div>
            )}

            <div className="admin-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSave}>

                    {/* System Settings */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <Server size={18} color="#3b82f6" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>System Config</h2>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="maintenanceMode"
                                        checked={settings.maintenanceMode === 'true'}
                                        onChange={handleChange}
                                        style={{ width: 18, height: 18, accentColor: '#ef4444' }}
                                    />
                                    <span style={{ fontWeight: 600, color: settings.maintenanceMode === 'true' ? '#ef4444' : 'inherit' }}>
                                        🔧 Enable Maintenance Mode
                                    </span>
                                </label>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 26 }}>
                                    When enabled, the mini app will show a maintenance screen and games will be paused.
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Platform Name
                                    </label>
                                    <input
                                        type="text"
                                        name="platformName"
                                        className="admin-input"
                                        value={settings.platformName || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Currency
                                    </label>
                                    <input
                                        type="text"
                                        name="currency"
                                        className="admin-input"
                                        value={settings.currency || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                    Support Contact
                                </label>
                                <input
                                    type="text"
                                    name="supportContact"
                                    className="admin-input"
                                    value={settings.supportContact || ''}
                                    onChange={handleChange}
                                    placeholder="@username or URL"
                                    style={{ maxWidth: 300 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Settings */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <DollarSign size={18} color="#10b981" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>Financial Settings</h2>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Minimum Deposit (ETB)
                                    </label>
                                    <input
                                        type="number"
                                        name="minDeposit"
                                        className="admin-input"
                                        value={settings.minDeposit || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Minimum Withdrawal (ETB)
                                    </label>
                                    <input
                                        type="number"
                                        name="minWithdrawal"
                                        className="admin-input"
                                        value={settings.minWithdrawal || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Maximum Withdrawal (ETB)
                                    </label>
                                    <input
                                        type="number"
                                        name="maxWithdrawal"
                                        className="admin-input"
                                        value={settings.maxWithdrawal || ''}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        House Fee (%)
                                    </label>
                                    <input
                                        type="number"
                                        name="houseFeePercent"
                                        className="admin-input"
                                        value={settings.houseFeePercent || ''}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Percentage deducted from prize pool (Derash = stake × players × (100 - fee)%)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bonus & Referral Settings */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <Users size={18} color="#f59e0b" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>Bonuses & Referrals</h2>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        🎁 Welcome Bonus (ETB)
                                    </label>
                                    <input
                                        type="number"
                                        name="welcomeBonus"
                                        className="admin-input"
                                        value={settings.welcomeBonus || ''}
                                        onChange={handleChange}
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Credited to new players on registration.
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        🤝 Referral Bonus (ETB)
                                    </label>
                                    <input
                                        type="number"
                                        name="referralBonus"
                                        className="admin-input"
                                        value={settings.referralBonus || ''}
                                        onChange={handleChange}
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Credited to referrer when invitee makes their first deposit.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Game Rules */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <Gamepad2 size={18} color="#8b5cf6" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>Game Rules</h2>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Number Call Interval (sec)
                                    </label>
                                    <input
                                        type="number"
                                        name="numberCallInterval"
                                        className="admin-input"
                                        value={settings.numberCallInterval || ''}
                                        onChange={handleChange}
                                        min="1"
                                        max="30"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Min Players to Start
                                    </label>
                                    <input
                                        type="number"
                                        name="minPlayersToStart"
                                        className="admin-input"
                                        value={settings.minPlayersToStart || ''}
                                        onChange={handleChange}
                                        min="1"
                                        max="100"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                        Waiting Time (sec)
                                    </label>
                                    <input
                                        type="number"
                                        name="waitingTimeSeconds"
                                        className="admin-input"
                                        value={settings.waitingTimeSeconds || ''}
                                        onChange={handleChange}
                                        min="5"
                                        max="300"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                    Max Cards Per Player
                                </label>
                                <select
                                    name="maxCardsPerPlayer"
                                    className="admin-input"
                                    value={settings.maxCardsPerPlayer || '2'}
                                    onChange={handleChange}
                                    style={{ maxWidth: 200 }}
                                >
                                    <option value="1">1 Card</option>
                                    <option value="2">2 Cards</option>
                                    <option value="3">3 Cards</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Telegram Bot Announcements */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <Bell size={18} color="#06b6d4" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>Bot Announcements</h2>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                    Global Notice Message
                                </label>
                                <textarea
                                    name="botAnnouncements"
                                    className="admin-input"
                                    rows={4}
                                    value={settings.botAnnouncements || ''}
                                    onChange={handleChange}
                                    placeholder="Enter a message to broadcast to all players (e.g., 'New Bingo Room Open!')"
                                    style={{ resize: 'vertical' }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    This text is shown on the Mini App home screen or sent as a bot message.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px', paddingBottom: '40px' }}>
                        <button
                            type="button"
                            className="admin-btn-outline"
                            onClick={loadSettings}
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}
                        >
                            <RefreshCw size={14} />
                            Discard Changes
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !hasChanges}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
                                opacity: (!hasChanges && !saving) ? 0.5 : 1
                            }}
                        >
                            {saving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save All Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
