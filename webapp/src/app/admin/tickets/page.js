'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, Search, Send } from 'lucide-react';

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('open'); // open, answered, closed
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    // Mock initial ticket for display purposes if file is empty
    const mockTickets = [
        {
            id: 't_1001',
            userId: '10293',
            username: 'JohnDoe',
            subject: 'Withdrawal not received',
            message: 'I requested a withdrawal 3 hours ago but it is still pending. Please check.',
            status: 'open',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            replies: []
        },
        {
            id: 't_1002',
            userId: '9281',
            username: 'AbebaG',
            subject: 'How to use referral bonus?',
            message: 'I have 50 ETB in my gift balance. How can I use it?',
            status: 'answered',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            replies: [
                { from: 'admin', message: 'Hello Abeba, gift balances are automatically used when you stake into a room if your main balance is insufficient. You cannot withdraw gift balances directly.', timestamp: new Date(Date.now() - 3600000 * 20).toISOString() }
            ]
        }
    ];

    useEffect(() => {
        loadTickets();
    }, []);

    async function loadTickets() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            let data = await adminApi.getTickets();
            if (!data || data.length === 0) {
                // Seed mock data for MVP demo if actual file is empty
                data = mockTickets;
            }
            setTickets(data);
        } catch (error) {
            console.error('Failed to load tickets:', error);
            setTickets(mockTickets); // Fallback
        } finally {
            setLoading(false);
        }
    }

    async function handleReply(e) {
        e.preventDefault();
        if (!replyText.trim()) return;
        setReplying(true);
        try {
            const { adminApi } = await import('@/lib/api');
            const res = await adminApi.replyToTicket(selectedTicket.id, replyText);

            // Update local state
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? res.ticket : t));
            setSelectedTicket(res.ticket);
            setReplyText('');
        } catch (error) {
            // Because we fallback to mock data if the JSON file isn't populated, the API call will fail for mock IDs.
            // In that case, we simulate the reply locally for the MVP UI.
            if (selectedTicket.id.startsWith('t_')) {
                const updatedTicket = {
                    ...selectedTicket,
                    status: 'answered',
                    replies: [
                        ...(selectedTicket.replies || []),
                        { from: 'admin', message: replyText, timestamp: new Date().toISOString() }
                    ]
                };
                setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
                setSelectedTicket(updatedTicket);
                setReplyText('');
            } else {
                alert('Failed to send reply: ' + error.message);
            }
        } finally {
            setReplying(false);
        }
    }

    async function handleCloseTicket() {
        if (!confirm('Are you sure you want to close this ticket?')) return;
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.closeTicket(selectedTicket.id);
            loadTickets();
            setSelectedTicket(null);
        } catch (error) {
            if (selectedTicket.id.startsWith('t_')) {
                const updatedTicket = { ...selectedTicket, status: 'closed' };
                setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
                setSelectedTicket(null);
            } else {
                alert('Failed to close ticket: ' + error.message);
            }
        }
    }

    const filteredTickets = tickets.filter(t => t.status === filter || filter === 'all');

    return (
        <div className="admin-page" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <header className="admin-header" style={{ marginBottom: 16 }}>
                <div>
                    <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={24} color="var(--accent-primary)" />
                        Support Desk
                    </h1>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                {/* Tickets List View */}
                <div className="admin-card" style={{ width: '350px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '16px 16px 0' }}>
                        {['open', 'answered', 'closed', 'all'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                style={{
                                    flex: 1, padding: '8px 0', background: 'none', border: 'none',
                                    borderBottom: filter === status ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                    color: filter === status ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontWeight: filter === status ? 600 : 500, cursor: 'pointer',
                                    textTransform: 'capitalize', fontSize: 13
                                }}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No {filter} tickets found.
                            </div>
                        ) : filteredTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                style={{
                                    padding: '16px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px',
                                    background: selectedTicket?.id === ticket.id ? 'var(--bg-card-hover)' : 'transparent',
                                    border: `1px solid ${selectedTicket?.id === ticket.id ? 'var(--border-color)' : 'transparent'}`,
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.username}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    {ticket.subject}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: 11, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 700,
                                        background: ticket.status === 'open' ? 'rgba(239, 68, 68, 0.1)' : ticket.status === 'answered' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: ticket.status === 'open' ? '#ef4444' : ticket.status === 'answered' ? '#3b82f6' : '#10b981'
                                    }}>
                                        {ticket.status}
                                    </span>
                                    {ticket.status === 'open' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 11, fontWeight: 600 }}>
                                            <Clock size={12} /> Needs Reply
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ticket Conversation View */}
                <div className="admin-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: 18 }}>{selectedTicket.subject}</h2>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: 13, color: 'var(--text-muted)' }}>
                                        <span>User: <b>{selectedTicket.username}</b> (ID: {selectedTicket.userId})</span>
                                        <span>Opened: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                {selectedTicket.status !== 'closed' && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleCloseTicket}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                                    >
                                        <CheckCircle size={16} /> Mark Resolved
                                    </button>
                                )}
                            </div>

                            {/* Chat History */}
                            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
                                {/* Initial User Message */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        {selectedTicket.username[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600 }}>{selectedTicket.username}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '0 12px 12px 12px', color: 'var(--text-secondary)', lineHeight: 1.5, border: '1px solid var(--border-color)' }}>
                                            {selectedTicket.message}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {selectedTicket.replies?.map((reply, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 24, flexDirection: reply.from === 'admin' ? 'row-reverse' : 'row' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 18, background: reply.from === 'admin' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.1)', color: reply.from === 'admin' ? '#3b82f6' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            {reply.from === 'admin' ? 'W' : selectedTicket.username[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: reply.from === 'admin' ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexDirection: reply.from === 'admin' ? 'row-reverse' : 'row' }}>
                                                <span style={{ fontWeight: 600 }}>{reply.from === 'admin' ? 'Support Agent' : selectedTicket.username}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(reply.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div style={{
                                                background: reply.from === 'admin' ? '#2563eb' : 'var(--bg-card)',
                                                color: reply.from === 'admin' ? '#fff' : 'var(--text-secondary)',
                                                padding: '16px',
                                                borderRadius: reply.from === 'admin' ? '12px 0 12px 12px' : '0 12px 12px 12px',
                                                lineHeight: 1.5,
                                                border: reply.from === 'admin' ? 'none' : '1px solid var(--border-color)',
                                                maxWidth: '85%'
                                            }}>
                                                {reply.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {selectedTicket.status === 'closed' && (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border-color)', marginTop: 20 }}>
                                        This ticket was closed on {new Date(selectedTicket.closedAt || Date.now()).toLocaleString()}. You cannot reply to resolved tickets.
                                    </div>
                                )}
                            </div>

                            {/* Reply Box */}
                            {selectedTicket.status !== 'closed' && (
                                <form onSubmit={handleReply} style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                                    <textarea
                                        className="admin-input"
                                        placeholder="Type your reply to the user..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        rows={2}
                                        style={{ flex: 1, resize: 'none', marginBottom: 0 }}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={replying || !replyText.trim()}
                                        style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-end', height: 46 }}
                                    >
                                        <Send size={18} />
                                        Send Reply
                                    </button>
                                </form>
                            )}
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <p>Select a ticket from the left to view the conversation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
