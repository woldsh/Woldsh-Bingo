const prisma = require('../lib/prisma');

let memoryCache = null;

/**
 * Get current settings from cache or database
 */
async function getSettings() {
    if (memoryCache) {
        return memoryCache;
    }
    await refreshSettingsCache();
    return memoryCache;
}

/**
 * Force a refresh of the settings cache from the database
 */
async function refreshSettingsCache() {
    try {
        const dbSettings = await prisma.setting.findMany();
        memoryCache = {};
        for (const s of dbSettings) {
            memoryCache[s.key] = s.value;
        }
        console.log('[SettingsCache] Global settings cached into memory successfully.');
    } catch (error) {
        console.error('[SettingsCache] Error refreshing cache:', error);
        if (!memoryCache) {
            // Provide sensible defaults if completely failed
            memoryCache = {
                numberCallInterval: '3',
                waitingTimeSeconds: '30',
                minPlayersToStart: '2'
            };
        }
    }
}

module.exports = {
    getSettings,
    refreshSettingsCache
};
