'use client';

/**
 * Telegram WebApp SDK helpers
 * Provides safe access to the Telegram WebApp object
 */

export function getTelegramWebApp() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        return window.Telegram.WebApp;
    }
    return null;
}

export function getTelegramUser() {
    const webapp = getTelegramWebApp();
    if (webapp?.initDataUnsafe?.user) {
        return webapp.initDataUnsafe.user;
    }
    // Dev fallback
    return {
        id: 7570292128,
        first_name: 'Dev',
        last_name: 'User',
        username: 'sonempireg',
        photo_url: '',
    };
}

export function getInitData() {
    const webapp = getTelegramWebApp();
    return webapp?.initData || '';
}

export function expandWebApp() {
    const webapp = getTelegramWebApp();
    if (webapp) {
        webapp.expand();
        webapp.ready();
    }
}

export function hapticFeedback(type = 'medium') {
    const webapp = getTelegramWebApp();
    if (webapp?.HapticFeedback) {
        webapp.HapticFeedback.impactOccurred(type);
    }
}

export function closeWebApp() {
    const webapp = getTelegramWebApp();
    if (webapp) {
        webapp.close();
    }
}

export function getThemeParams() {
    const webapp = getTelegramWebApp();
    return webapp?.themeParams || {};
}
