'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Server, Wrench, Shield, MessageSquare } from 'lucide-react';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({
        maintenanceMode: 'false',
        minWithdrawal: '100',
        referralBonus: '50',
        botAnnouncements: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const data = await adminApi.getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.updateSettings(settings);
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert(error.message || 'Failed to save settings');
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
                        Configure application-wide parameters for the Bingo bot.
                    </p>
                </div>
            </header>

            <div className="admin-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSave}>

                    {/* System Settings */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <Server size={18} color="var(--text-secondary)" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>System Config</h2>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="maintenanceMode"
                                        checked={settings.maintenanceMode === 'true'}
                                        onChange={handleChange}
                                        style={{ width: 18, height: 18, accentColor: '#ef4444' }}
                                    />
                                    <span style={{ fontWeight: 600, color: settings.maintenanceMode === 'true' ? '#ef4444' : 'inherit' }}>
                                        Enable Maintenance Mode
                                    </span>
                                </label>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 26 }}>
                                    When enabled, the mini app will show a maintenance screen and bot commands will be paused.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Settings */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <Wrench size={18} color="var(--text-secondary)" />
                            <h2 className="admin-card-title" style={{ margin: 0, fontSize: 16 }}>Financial & Game Rules</h2>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                    Minimum Withdrawal Amount (ETB)
                                </label>
                                <input
                                    type="number"
                                    name="minWithdrawal"
                                    className="admin-input"
                                    value={settings.minWithdrawal || ''}
                                    onChange={handleChange}
                                    style={{ maxWidth: 200 }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                                    Default Referral Bonus (ETB)
                                </label>
                                <input
                                    type="number"
                                    name="referralBonus"
                                    className="admin-input"
                                    value={settings.referralBonus || ''}
                                    onChange={handleChange}
                                    style={{ maxWidth: 200 }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Amount automatically credited to referrers when an invitee makes their first deposit.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Telegram Bot Announcements */}
                    <div className="admin-card" style={{ marginBottom: 24 }}>
                        <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                            <MessageSquare size={18} color="var(--text-secondary)" />
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
                                    This text is shown prominently on the Mini App home screen or sent as a bot message.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                        <button type="button" className="admin-btn-outline" onClick={loadSettings} disabled={saving}>
                            Discard Changes
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px' }}>
                            {saving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save All Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
