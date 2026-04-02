'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import { getTelegramUser } from '@/lib/telegram';

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ gamesPlayed: 0, gamesWon: 0, totalWinnings: 0, winRate: '0.0' });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const { userApi } = await import('@/lib/api');
            const data = await userApi.me();
            // Try getting extra TG data if not in backend yet
            const tgUser = getTelegramUser();
            setProfile({
                ...data.user,
                photoUrl: tgUser?.photo_url || data.user.photoUrl,
                telegramId: tgUser?.id || data.user.telegramId,
                phone: data.user.phone, // Remove mock fallback
                status: data.user.status || 'VERIFIED',
                playBalance: data.user.playBalance || 0,
                totalInvites: data.user.totalInvites || 0,
                referralEarnings: data.user.referralEarnings || 0,
            });
            if (data.stats) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // ONLY fallback to dummy data if we absolutely have to, 
            // but try to keep what we might have loaded if partial data exists
            if (!profile) {
                const tgUser = getTelegramUser();
                setProfile({
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name,
                    username: tgUser.username,
                    telegramId: tgUser.id,
                    photoUrl: tgUser.photo_url,
                    balance: 0,
                    playBalance: 0,
                    phone: null, // Still fallback if error, but now API should work
                    status: 'UNVERIFIED',
                    totalInvites: 0,
                    referralEarnings: 0,
                    createdAt: new Date().toISOString(),
                });
            }
        }
    }

    function getInviteLink() {
        if (!profile) return '';
        return `https://t.me/woldshbingo_bot?start=ref_${profile.telegramId}`;
    }

    function copyInviteLink() {
        navigator.clipboard.writeText(getInviteLink()).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    if (!profile) {
        return (
            <div className="page-container obsidian-theme">
                <div className="loading"><div className="spinner"></div></div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="page-container obsidian-theme" style={{ paddingBottom: '100px' }}>
            {/* Top Profile */}
            <div style={{ textAlign: 'center', margin: '30px 0 20px' }}>
                {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--border-color)', objectFit: 'cover', margin: '0 auto' }} />
                ) : (
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                        fontWeight: 800, margin: '0 auto', border: '1px solid var(--border-color)', color: 'var(--text-primary)'
                    }}>
                        {(profile.username || profile.firstName || 'U')[0].toUpperCase()}
                    </div>
                )}
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 16 }}>
                    {profile.username || profile.firstName}
                </div>
            </div>

            {/* Grid Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '0 20px' }}>
                <div className="profile-stat-box">
                    <div className="stat-box-title">
                        <span style={{ marginRight: 8, fontSize: 16 }}>💼</span> Main Wallet
                    </div>
                    <div className="stat-box-value">{profile.balance || 0}</div>
                </div>
                <div className="profile-stat-box">
                    <div className="stat-box-title">
                        <span style={{ marginRight: 8, fontSize: 16 }}>💳</span> Play Wallet
                    </div>
                    <div className="stat-box-value">{profile.playBalance || 0}</div>
                </div>
                <div className="profile-stat-box">
                    <div className="stat-box-title">
                        <span style={{ marginRight: 8, fontSize: 16 }}>🏆</span> Games Won
                    </div>
                    <div className="stat-box-value">{stats.gamesWon}</div>
                </div>
                <div className="profile-stat-box">
                    <div className="stat-box-title">
                        <span style={{ marginRight: 8, fontSize: 16 }}>👥</span> Total Invite
                    </div>
                    <div className="stat-box-value">{profile.totalInvites || 0}</div>
                </div>
            </div>

            <div style={{ margin: '12px 20px' }}>
                <div className="profile-stat-box" style={{ width: '100%' }}>
                    <div className="stat-box-title">
                        <span style={{ marginRight: 8, fontSize: 16 }}>📈</span> Total Earning
                    </div>
                    <div className="stat-box-value">{stats.totalWinnings || 0}</div>
                </div>
            </div>

            {/* Settings Section */}
            <div style={{ margin: '30px 20px 10px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Settings
            </div>

            <div className="settings-section">
                <div className="settings-header">Referral Center</div>
                <div className="settings-row">
                    <span className="settings-label">Total Invites</span>
                    <span className="settings-value">{profile.totalInvites || 0}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Referral Earnings</span>
                    <span className="settings-value">{profile.referralEarnings || 0}</span>
                </div>
                <div className="settings-copy-row">
                    <div className="settings-label" style={{ marginBottom: 12 }}>Your referral link</div>
                    <div className="settings-link-container">
                        <div className="settings-link">{getInviteLink()}</div>
                        <button className="settings-btn-copy" onClick={copyInviteLink}>
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section" style={{ marginTop: 20 }}>
                <div className="settings-header">Account & Security</div>
                <div className="settings-row">
                    <span className="settings-label">Telegram ID</span>
                    <span className="settings-value">{profile.telegramId}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Phone</span>
                    <span className="settings-value">{profile.phone || <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontStyle: 'italic' }}>Not Registered</span>}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Status</span>
                    <span className="settings-value" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                        {profile.status || 'UNVERIFIED'}
                    </span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Sound</span>
                    <div className="toggle-switch">
                        <input type="checkbox" id="sound-toggle" defaultChecked />
                        <label htmlFor="sound-toggle"></label>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
