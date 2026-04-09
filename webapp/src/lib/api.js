import { getInitData } from './telegram';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function apiCall(endpoint, options = {}) {
    const initData = getInitData();
    let adminAuth = null;
    try {
        if (typeof window !== 'undefined') {
            adminAuth = JSON.parse(localStorage.getItem('admin_auth') || 'null');
        }
    } catch (e) { }

    const headers = {
        'Content-Type': 'application/json',
        ...(initData && { 'X-Telegram-Init-Data': initData }),
        ...(adminAuth?.token && { 'Authorization': `Bearer ${adminAuth.token}` }),
        ...(adminAuth?.role && { 'X-Admin-Role': adminAuth.role }), // Can eventually be deprecated since JWT has role
        ...(adminAuth?.id && { 'X-Admin-Id': adminAuth.id.toString() }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        const err = new Error(data.error || 'API request failed');
        err.data = data;
        throw err;
    }

    return data;
}

// Game API
export const gamesApi = {
    list: (params = '') => apiCall(`/api/games${params}`),
    get: (id) => apiCall(`/api/games/${id}`),
    join: (id, pickedNumbers, cardCount) =>
        apiCall(`/api/games/${id}/join`, {
            method: 'POST',
            body: JSON.stringify({ pickedNumbers, cardCount }),
        }),
    callNumber: (id) => apiCall(`/api/games/${id}/call`, { method: 'POST' }),
    markNumber: (id, number, cardIndex = 0) =>
        apiCall(`/api/games/${id}/mark`, {
            method: 'POST',
            body: JSON.stringify({ number, cardIndex }),
        }),
};

// Wallet API
export const walletApi = {
    balance: () => apiCall('/api/wallet/balance'),
    deposit: (amount, reference) =>
        apiCall('/api/wallet/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, reference }),
        }),
    withdraw: (amount, phone) =>
        apiCall('/api/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, phone }),
        }),
    transactions: () => apiCall('/api/wallet/transactions'),
};

// User API
export const userApi = {
    me: () => apiCall('/api/users/me'),
    history: () => apiCall('/api/users/history'),
};

// Admin API
export const adminApi = {
    dashboard: () => apiCall('/api/admin/dashboard'),
    players: () => apiCall('/api/admin/players'),
    updatePlayer: (id, data) =>
        apiCall(`/api/admin/players/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    adjustWallet: (id, amount, note) =>
        apiCall(`/api/admin/players/${id}/adjust-wallet`, {
            method: 'POST',
            body: JSON.stringify({ amount, note }),
        }),
    deletePlayer: (id) =>
        apiCall(`/api/admin/players/${id}`, { method: 'DELETE' }),
    games: () => apiCall('/api/admin/games'),
    transactions: () => apiCall('/api/admin/transactions'),
    // Admin user management
    getAdmins: () => apiCall('/api/admin/admins'),
    createAdmin: (data) =>
        apiCall('/api/admin/admins', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updateAdmin: (id, data) =>
        apiCall(`/api/admin/admins/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    deleteAdmin: (id) =>
        apiCall(`/api/admin/admins/${id}`, { method: 'DELETE' }),
    banPlayer: (id) =>
        apiCall(`/api/admin/players/${id}/ban`, { method: 'POST' }),

    // Room Templates
    roomTemplates: {
        list: () => apiCall('/api/admin/room-templates'),
        create: (data) => apiCall('/api/admin/room-templates', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => apiCall(`/api/admin/room-templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => apiCall(`/api/admin/room-templates/${id}`, {
            method: 'DELETE'
        }),
        toggleMaintenance: (id) => apiCall(`/api/admin/room-templates/${id}/maintenance`, {
            method: 'PUT'
        }),
    },

    // Phase 1 API Endpoints
    getGames: (status = 'all') => apiCall(`/api/admin/games?status=${status}`),
    cancelGame: (id) => apiCall(`/api/admin/games/${id}/cancel`, { method: 'POST' }),

    getDeposits: (status = 'all') => apiCall(`/api/admin/deposits?status=${status}`),
    approveDeposit: (id) => apiCall(`/api/admin/deposits/${id}/approve`, { method: 'POST' }),
    rejectDeposit: (id) => apiCall(`/api/admin/deposits/${id}/reject`, { method: 'POST' }),

    getWithdrawals: (status = 'all') => apiCall(`/api/admin/withdrawals?status=${status}`),
    approveWithdrawal: (id) => apiCall(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' }),
    rejectWithdrawal: (id) => apiCall(`/api/admin/withdrawals/${id}/reject`, { method: 'POST' }),
    markWithdrawalPaid: (id) => apiCall(`/api/admin/withdrawals/${id}/mark-paid`, { method: 'POST' }),

    // Phase 1: Win Patterns
    getWinPatterns: () => apiCall('/api/admin/win-patterns'),
    createWinPattern: (data) => apiCall('/api/admin/win-patterns', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateWinPattern: (id, data) => apiCall(`/api/admin/win-patterns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteWinPattern: (id) => apiCall(`/api/admin/win-patterns/${id}`, { method: 'DELETE' }),

    // Phase 2: Financial & User Control
    getTransactions: (type = 'all', status = 'all') => apiCall(`/api/admin/transactions?type=${type}&status=${status}`),

    getClaims: (status = 'all') => apiCall(`/api/admin/claims?status=${status}`),
    approveClaim: (id) => apiCall(`/api/admin/claims/${id}/approve`, { method: 'POST' }),
    rejectClaim: (id) => apiCall(`/api/admin/claims/${id}/reject`, { method: 'POST' }),

    getWinnersHistory: (page = 1, limit = 50) => apiCall(`/api/admin/winners?page=${page}&limit=${limit}`),

    getSuspiciousActivity: () => apiCall('/api/admin/suspicious'),

    // Phase 3: Growth & Content
    getReferrals: () => apiCall('/api/admin/referrals'),
    rewardReferrer: (userId, amount, note) => apiCall('/api/admin/referrals/reward', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, note })
    }),

    getSettings: () => apiCall('/api/admin/settings'),
    updateSettings: (settings) => apiCall('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
    }),

    getTickets: () => apiCall('/api/admin/tickets'),
    replyToTicket: (id, message) => apiCall(`/api/admin/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message })
    }),
    closeTicket: (id) => apiCall(`/api/admin/tickets/${id}/close`, { method: 'POST' }),

    getFAQ: () => apiCall('/api/admin/faq'),
    updateFAQ: (faqs) => apiCall('/api/admin/faq', {
        method: 'POST',
        body: JSON.stringify(faqs)
    }),

    sendBroadcast: (data) => apiCall('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    getReports: (days = 7) => apiCall(`/api/admin/reports?days=${days}`),

    getAuditLogs: () => apiCall('/api/admin/audit'),
};
