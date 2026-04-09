/**
 * Settings Cache — Redis-backed with in-memory fallback
 * 
 * Strategy:
 * 1. Try Redis first (shared across instances, survives restarts)
 * 2. Fall back to in-memory cache if Redis is unavailable
 * 3. Fall back to database if both caches are empty
 * 4. Fall back to hardcoded defaults if database fails
 */

const prisma = require('../lib/prisma');
const { getRedisClient, isRedisConnected } = require('../lib/redis');

const REDIS_KEY = 'bingo:settings';
const REDIS_TTL = 3600; // 1 hour TTL (refreshed on every save)

// In-memory fallback cache (always kept in sync)
let memoryCache = null;

const DEFAULT_SETTINGS = {
    numberCallInterval: '3',
    waitingTimeSeconds: '30',
    minPlayersToStart: '2',
    maxCardsPerPlayer: '2',
    minDeposit: '10',
    minWithdrawal: '100',
    maxWithdrawal: '10000',
    welcomeBonus: '10',
    referralBonus: '50',
    houseFeePercent: '20',
    maintenanceMode: 'false',
    platformName: 'Woldsh Bingo',
    currency: 'ETB',
    supportContact: '@woldsh_support',
    botAnnouncements: '',
};

/**
 * Get current settings — tries Redis → memory → database → defaults
 */
async function getSettings() {
    // 1. Try Redis
    if (isRedisConnected()) {
        try {
            const redis = getRedisClient();
            const cached = await redis.get(REDIS_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                memoryCache = parsed; // Keep memory in sync
                return parsed;
            }
        } catch (err) {
            console.warn('[SettingsCache] Redis read failed:', err.message);
        }
    }

    // 2. Try in-memory cache
    if (memoryCache) {
        return memoryCache;
    }

    // 3. Fetch from database and populate both caches
    await refreshSettingsCache();
    return memoryCache;
}

/**
 * Force a refresh of the settings cache from the database.
 * Writes to both Redis and in-memory cache.
 */
async function refreshSettingsCache() {
    try {
        const dbSettings = await prisma.setting.findMany();
        const settings = {};
        for (const s of dbSettings) {
            settings[s.key] = s.value;
        }

        // Update in-memory cache
        memoryCache = settings;

        // Update Redis cache
        if (isRedisConnected()) {
            try {
                const redis = getRedisClient();
                await redis.set(REDIS_KEY, JSON.stringify(settings), 'EX', REDIS_TTL);
                console.log('[SettingsCache] ✅ Settings cached to Redis successfully');
            } catch (err) {
                console.warn('[SettingsCache] Redis write failed:', err.message);
            }
        }

        console.log('[SettingsCache] ✅ Settings cached to memory successfully');
    } catch (error) {
        console.error('[SettingsCache] Error refreshing cache from DB:', error);
        if (!memoryCache) {
            // Last resort: use hardcoded defaults
            memoryCache = { ...DEFAULT_SETTINGS };
            console.warn('[SettingsCache] ⚠️ Using hardcoded default settings');
        }
    }
}

/**
 * Invalidate the cache (called when settings are updated).
 * Clears both Redis and memory cache, then re-fetches from DB.
 */
async function invalidateSettingsCache() {
    // Clear Redis
    if (isRedisConnected()) {
        try {
            const redis = getRedisClient();
            await redis.del(REDIS_KEY);
        } catch (err) {
            console.warn('[SettingsCache] Redis delete failed:', err.message);
        }
    }

    // Clear memory
    memoryCache = null;

    // Re-populate from DB
    await refreshSettingsCache();
}

module.exports = {
    getSettings,
    refreshSettingsCache,
    invalidateSettingsCache,
};
