/**
 * Redis Client - Centralized Redis connection
 * 
 * Used for:
 * - Settings cache (shared across potential multi-process deployments)
 * - Session/rate limiting (future)
 * - Socket.IO adapter (future)
 * 
 * Falls back gracefully if Redis is unavailable — the app
 * will continue to work with in-memory caching.
 */

const Redis = require('ioredis');

let redisClient = null;
let isConnected = false;

function getRedisClient() {
    if (redisClient) return redisClient;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 5) {
                console.warn('[Redis] Max retries reached, giving up reconnection');
                return null; // Stop retrying
            }
            const delay = Math.min(times * 500, 3000);
            console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
            return delay;
        },
        lazyConnect: true, // Don't connect until first command
        connectTimeout: 5000,
        enableReadyCheck: true,
    });

    redisClient.on('connect', () => {
        isConnected = true;
        console.log('[Redis] ✅ Connected successfully');
    });

    redisClient.on('ready', () => {
        isConnected = true;
        console.log('[Redis] ✅ Ready to accept commands');
    });

    redisClient.on('error', (err) => {
        isConnected = false;
        // Only log once, not on every retry
        if (err.code === 'ECONNREFUSED') {
            console.warn('[Redis] ⚠️ Connection refused — falling back to in-memory cache');
        } else {
            console.error('[Redis] Error:', err.message);
        }
    });

    redisClient.on('close', () => {
        isConnected = false;
    });

    return redisClient;
}

/**
 * Check if Redis is currently connected and ready
 */
function isRedisConnected() {
    return isConnected && redisClient && redisClient.status === 'ready';
}

/**
 * Attempt to connect to Redis. Returns true if successful, false otherwise.
 */
async function connectRedis() {
    try {
        const client = getRedisClient();
        await client.connect();
        return true;
    } catch (err) {
        console.warn('[Redis] ⚠️ Could not connect:', err.message);
        console.warn('[Redis] ⚠️ App will use in-memory cache as fallback');
        return false;
    }
}

/**
 * Gracefully disconnect Redis
 */
async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        isConnected = false;
        console.log('[Redis] Disconnected');
    }
}

module.exports = {
    getRedisClient,
    isRedisConnected,
    connectRedis,
    disconnectRedis,
};
