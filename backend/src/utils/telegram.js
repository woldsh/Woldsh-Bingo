const crypto = require('crypto');

/**
 * Validate Telegram WebApp initData
 * @param {string} initData - raw initData string from Telegram WebApp
 * @param {string} botToken - your bot's token
 * @returns {object|null} - parsed data if valid, null otherwise
 */
function validateInitData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');

        if (!hash) return null;

        // Remove hash from params and sort alphabetically
        urlParams.delete('hash');
        const dataCheckArr = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        // Create secret key: HMAC-SHA256 of bot token with "WebAppData"
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Create hash: HMAC-SHA256 of data check string with secret key
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) return null;

        // Parse user data
        const result = {};
        for (const [key, value] of urlParams.entries()) {
            try {
                result[key] = JSON.parse(value);
            } catch {
                result[key] = value;
            }
        }

        return result;
    } catch (error) {
        console.error('Error validating initData:', error);
        return null;
    }
}

/**
 * Extract user info from validated initData
 */
function getUserFromInitData(validatedData) {
    if (!validatedData || !validatedData.user) return null;
    return {
        telegramId: validatedData.user.id,
        username: validatedData.user.username || null,
        firstName: validatedData.user.first_name || null,
        lastName: validatedData.user.last_name || null,
    };
}

module.exports = { validateInitData, getUserFromInitData };
