'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Save, Plus, Trash2, GripVertical, Info } from 'lucide-react';

export default function AdminFAQPage() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Initial mock data if empty
    const defaultFaqs = [
        { id: '1', question: 'How do I deposit money?', answer: 'Click on Wallet and choose your preferred deposit method.' },
        { id: '2', question: 'When can I refer friends?', answer: 'You get your referral link immediately upon registration.' }
    ];

    useEffect(() => {
        loadFAQ();
    }, []);

    async function loadFAQ() {
        setLoading(true);
        try {
            const { adminApi } = await import('@/lib/api');
            let data = await adminApi.getFAQ();
            if (!data || data.length === 0) data = defaultFaqs;
            setFaqs(data);
        } catch (error) {
            console.error('Failed to load FAQ:', error);
            setFaqs(defaultFaqs);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const { adminApi } = await import('@/lib/api');
            await adminApi.updateFAQ(faqs);
            alert('FAQ saved successfully!');
        } catch (error) {
            console.error('Failed to save FAQ:', error);
            alert(error.message || 'Failed to save FAQ');
        } finally {
            setSaving(false);
        }
    }

    function addFaq() {
        const newId = Date.now().toString();
        setFaqs([...faqs, { id: newId, question: '', answer: '' }]);
    }

    function removeFaq(id) {
        if (!confirm('Are you sure you want to remove this FAQ?')) return;
        setFaqs(faqs.filter(f => f.id !== id));
    }

    function updateFaqItem(id, field, value) {
        setFaqs(faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
    }

    function moveUp(index) {
        if (index === 0) return;
        const newFaqs = [...faqs];
        const temp = newFaqs[index];
        newFaqs[index] = newFaqs[index - 1];
        newFaqs[index - 1] = temp;
        setFaqs(newFaqs);
    }

    function moveDown(index) {
        if (index === faqs.length - 1) return;
        const newFaqs = [...faqs];
        const temp = newFaqs[index];
        newFaqs[index] = newFaqs[index + 1];
        newFaqs[index + 1] = temp;
        setFaqs(newFaqs);
    }

    if (loading) {
        return <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner"></div></div>;
    }

    return (
        <div className="admin-page">
            <header className="admin-header" style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HelpCircle size={28} color="var(--accent-primary)" />
                            Knowledge Base (FAQ)
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                            Manage the Frequently Asked Questions shown to users in the Support menu.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="admin-btn-outline" onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={16} /> Add Question
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, justifyContent: 'center' }}>
                            {saving ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="admin-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: 8, marginBottom: 24, fontSize: 13, fontWeight: 500 }}>
                    <Info size={16} /> Users can view these questions through the Telegram Bot /help menu.
                </div>

                {faqs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                        <HelpCircle size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No FAQs Defined</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Add your first question to start building the knowledge base.</p>
                        <button className="btn btn-primary" onClick={addFaq} style={{ marginTop: 24 }}>Add Question</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {faqs.map((faq, index) => (
                            <div key={faq.id} className="admin-card" style={{ display: 'flex', gap: 16, padding: 20 }}>

                                {/* Drag Handles / Ordering */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 4, width: 24 }}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => moveUp(index)}
                                        disabled={index === 0}
                                        style={{ padding: 4, cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 0.7 }}
                                    >
                                        &#9650;
                                    </button>
                                    <GripVertical size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                                    <button
                                        className="btn-icon"
                                        onClick={() => moveDown(index)}
                                        disabled={index === faqs.length - 1}
                                        style={{ padding: 4, cursor: index === faqs.length - 1 ? 'not-allowed' : 'pointer', opacity: index === faqs.length - 1 ? 0.3 : 0.7 }}
                                    >
                                        &#9660;
                                    </button>
                                </div>

                                {/* Form Fields */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            placeholder="Question (e.g., How do I withdraw funds?)"
                                            value={faq.question}
                                            onChange={(e) => updateFaqItem(faq.id, 'question', e.target.value)}
                                            style={{ fontWeight: 600, fontSize: 15 }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <textarea
                                            className="admin-input"
                                            placeholder="Answer..."
                                            value={faq.answer}
                                            onChange={(e) => updateFaqItem(faq.id, 'answer', e.target.value)}
                                            rows={3}
                                            style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.5 }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                                    <button
                                        className="admin-btn-outline"
                                        onClick={() => removeFaq(faq.id)}
                                        title="Delete FAQ"
                                        style={{ padding: 8, height: 'auto', borderColor: 'transparent', color: '#ef4444' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
