'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { adminApi } from '@/lib/api';

export default function AdminAnnouncementsPage() {
    const [payload, setPayload] = useState({
        message: '',
        photoUrl: '',
        caption: '',
        delayMs: '500' // Assuming the 500 field is for batch delay
    });
    const [base64Image, setBase64Image] = useState(null);
    const [sending, setSending] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setBase64Image(reader.result);
            reader.readAsDataURL(file);
        } else {
            setBase64Image(null);
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!payload.message && !payload.photoUrl && !base64Image && !payload.caption) return;
        if (!confirm('This will broadcast this message to all bot users. Proceed?')) return;

        setSending(true);
        try {
            await adminApi.sendBroadcast({
                message: payload.message,
                photoUrl: payload.photoUrl,
                caption: payload.caption,
                delayMs: parseInt(payload.delayMs) || 500,
                base64Image: base64Image
            });
            alert('Broadcast initiated successfully!');
            // Reset form
            setPayload({ message: '', photoUrl: '', caption: '', delayMs: '500' });
            setBase64Image(null);
            document.getElementById('file-upload').value = '';
        } catch (error) {
            console.error('Broadcast failed:', error);
            alert('Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">Announcements</h1>
                <Bell size={20} color="var(--admin-text-muted, #64748b)" />
            </header>

            <div className="admin-content">
                <div className="admin-card" style={{ padding: '24px', maxWidth: '800px' }}>
                    <form onSubmit={handleBroadcast}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                Message (Markdown supported)
                            </label>
                            <textarea
                                className="admin-input"
                                style={{
                                    height: '140px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                                placeholder="Write message to send..."
                                value={payload.message}
                                onChange={(e) => setPayload({ ...payload, message: e.target.value })}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                Photo URL or Telegram file_id (optional)
                            </label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="https://example.com/image.jpg"
                                value={payload.photoUrl}
                                onChange={(e) => setPayload({ ...payload, photoUrl: e.target.value })}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                OR Upload Image (optional)
                            </label>
                            <input
                                type="file"
                                id="file-upload"
                                accept="image/png, image/jpeg, image/webp"
                                className="admin-input"
                                style={{ padding: '8px' }}
                                onChange={handleFileChange}
                            />
                            {base64Image && (
                                <div style={{ marginTop: '10px' }}>
                                    <img src={base64Image} alt="Preview" style={{ maxWidth: '200px', borderRadius: '4px', border: '1px solid var(--admin-border)' }} />
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                                Caption (only if photo is provided)
                            </label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Optional caption for the photo..."
                                value={payload.caption}
                                onChange={(e) => setPayload({ ...payload, caption: e.target.value })}
                            />
                        </div>

                        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--admin-bg-hover, rgba(255,255,255,0.02))', borderRadius: '8px', border: '1px dashed var(--admin-border)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--admin-text)' }}>Advanced Settings</h3>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: 'var(--admin-text)' }}>Batch Delay (ms)</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Delay between messages to avoid Telegram rate limits (default: 500)</span>
                                </div>
                                <input
                                    type="number"
                                    className="admin-input"
                                    style={{ width: '100px', marginBottom: 0 }}
                                    value={payload.delayMs}
                                    onChange={(e) => setPayload({ ...payload, delayMs: e.target.value })}
                                />
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ 
                                width: '100%', 
                                padding: '14px', 
                                fontSize: '16px', 
                                fontWeight: 'bold',
                                opacity: sending ? 0.7 : 1,
                                cursor: sending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                justifyContent: 'center'
                            }}
                            disabled={sending}
                        >
                            {sending ? 'Broadcasting...' : 'Broadcast to All Users'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
