'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                setLoading(false);
                return;
            }

            localStorage.setItem('admin_auth', JSON.stringify({
                id: data.admin.id,
                username: data.admin.username,
                role: data.admin.role,
                token: data.token,
                loggedInAt: new Date().toISOString()
            }));
            router.push('/admin');
        } catch (err) {
            setError('Could not connect to server');
        }
        setLoading(false);
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: 20
        }}>
            <div style={{
                width: '100%',
                maxWidth: 420,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 20,
                padding: 40,
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src="/banner.png" alt="Woldsh Bingo" style={{ height: 60, objectFit: 'contain', marginBottom: 12 }} />
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Woldsh Bingo</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: 2, fontWeight: 700 }}>ADMIN SECURE LOGIN</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Username</label>
                        <input
                            className="modal-input"
                            type="text"
                            placeholder="Enter admin username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={{ marginBottom: 0 }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Password</label>
                        <input
                            className="modal-input"
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ marginBottom: 0 }}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 16px', borderRadius: 10, marginBottom: 16,
                            background: 'rgba(255, 107, 157, 0.1)',
                            border: '1px solid rgba(255, 107, 157, 0.2)',
                            color: 'var(--accent-pink)', fontSize: 13, textAlign: 'center'
                        }}>{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px',
                            borderRadius: 12, border: 'none',
                            background: 'var(--gradient-primary)',
                            color: 'var(--bg-primary)',
                            fontSize: 15, fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            transition: 'all 0.2s',
                            fontFamily: 'inherit'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
