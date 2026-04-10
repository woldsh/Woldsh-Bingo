require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-app.vercel.app';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'bingoson-secret-123';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || null;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is required in .env file');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🎮 Bingo Son Bot is running...');

// ─── Direct HTTP Broadcast Listener ───
const internalServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/broadcast_batch') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Broadcast Job Accepted' }));

            try {
                const payload = JSON.parse(body);
                const { message, photoUrl, caption, base64Image, delayMs, chatIds } = payload;

                let photoToSend = null;
                let fileOptions = undefined;
                if (base64Image) {
                    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
                    photoToSend = Buffer.from(base64Data, 'base64');
                    fileOptions = { filename: 'image.png', contentType: 'image/png' };
                } else if (photoUrl) {
                    photoToSend = photoUrl;
                }

                const finalCaption = [message, caption].filter(Boolean).join('\n\n');
                const keyboard = {
                    inline_keyboard: [[{ text: '🎮 Play Now', web_app: { url: WEBAPP_URL } }]]
                };

                console.log(`📡 Starting broadcast to ${chatIds.length} users with delay ${delayMs || 500}ms`);

                // Process sequentially to respect Telegram rate limits
                for (const chatId of chatIds) {
                    try {
                        if (photoToSend) {
                            await bot.sendPhoto(chatId, photoToSend, {
                                caption: finalCaption,
                                parse_mode: 'Markdown'
                            }, fileOptions);
                        } else if (finalCaption) {
                            await bot.sendMessage(chatId, finalCaption, {
                                parse_mode: 'Markdown'
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to send broadcast to ${chatId}:`, err.message);
                    }

                    await new Promise(r => setTimeout(r, delayMs || 500));
                }
                console.log('✅ Broadcast complete!');
            } catch (e) {
                console.error('Error processing broadcast payload:', e);
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});
internalServer.listen(3010, () => {
    console.log('✅ Internal Bot Listener checking for Broadcasts on port 3010');
});

// ─── User state tracking for deposit flow ───
// userStates[chatId] = { state: 'awaiting_deposit_amount', bank: 'telebirr'|'cbebirr' }
// userStates[chatId] = { state: 'awaiting_receipt', bank: '...', amount: 123 }
const userStates = {};

// ─── Admin Utility Command ───
bot.onText(/\/myid/, async (msg) => {
    await bot.sendMessage(msg.chat.id, `Your Telegram User ID is:\n\`${msg.chat.id}\`\n\nTo receive deposit receipts, add this ID to your bot/.env file as:\n\`ADMIN_CHAT_ID=${msg.chat.id}\``, { parse_mode: 'Markdown' });
});

// ─── Set bot menu commands ───
bot.setMyCommands([
    { command: 'start', description: 'Start / Register' },
    { command: 'play', description: 'Play Bingo' },
    { command: 'balance', description: 'Check balance' },
    { command: 'deposit', description: 'Deposit money' },
    { command: 'withdraw', description: 'Withdraw money' },
    { command: 'invite', description: 'Invite friends' },
    { command: 'support', description: 'Get help' },
    { command: 'instruction', description: 'How to play' }
]);

// ─── Bank info config ───
const BANK_INFO = {
    telebirr: {
        title: 'TELEBIRR DEPOSIT — የቴሌብር ክፍያ',
        target: '0921843172',
        account: 'Eisayas'
    },
    cbebirr: {
        title: 'CBE BIRR DEPOSIT — የሲቢኢ ብር ክፍያ',
        target: '1000279474493',
        account: 'W/mariam'
    }
};

async function sendMainMenu(chatId, firstName = 'Player') {
    const welcomeText =
        `🎲 *Welcome to Woldsh Bingo! | ወደ ወልድሽ ቢንጎ እንኳን ደህና መጡ* 🎲\n\n` +
        `🔥 *Play & Win | ይጫወቱ ያሸንፉ*\n\n` +
        `🎯 Pick a bingo card\n` +
        `🎮 Join the game\n` +
        `🏆 Call BINGO first to win!\n\n` +
        `👉 ካርቴላ ይምረጡ\n` +
        `👉 ጨዋታውን ይቀላቀሉ\n` +
        `👉 BINGO ቀድሞ በመጫን ያሸንፉ!\n\n` +
        `🍀 *Good Luck | መልካም እድል*`;

    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: '🎮 Play Now',
                    web_app: { url: WEBAPP_URL }
                }
            ],
            [
                { text: '💳 Deposit', callback_data: 'deposit' },
                { text: '🧾 Balance', callback_data: 'balance' }
            ],
            [
                { text: '🎟 Invite Friends', callback_data: 'invite' },
                { text: '🎆 Win Patterns', callback_data: 'patterns' }
            ],
            [
                { text: '📄 How to Play', callback_data: 'howtoplay' },
                { text: '🆘 Support', url: 'https://t.me/+EDLNTrtQlVgwZGU0' }
            ]
        ]
    };

    const bannerPath = path.join(__dirname, 'assets', 'banner.png');

    if (fs.existsSync(bannerPath)) {
        await bot.sendPhoto(chatId, bannerPath, {
            caption: welcomeText,
            reply_markup: keyboard
        });
    } else {
        await bot.sendMessage(chatId, welcomeText, {
            reply_markup: keyboard
        });
    }
}

// ─── Helper: Send deposit info + ask for amount ───
async function sendDepositPrompt(chatId, bankKey) {
    const bank = BANK_INFO[bankKey];

    const depositText =
        `💰 *${bank.title}*\n\n` +
        `📋 Target: ${bank.target}\n` +
        `👛 Account: ${bank.account}\n\n` +
        `✅ To Verify / ለማረጋገጥ:-\n\n` +
        `Copy the Receipt SMS / የደረሰኝ መልዕክቱን ኮፒ ያድርጉ::\n\n` +
        `Paste it here / እዚህ ይላኩት::\n\n` +
        `Or send a Screenshot / ወይም ስክሪንሾት ይላኩ::\n\n` +
        `🆘 Help / እርዳታ: https://t.me/+EDLNTrtQlVgwZGU0`;

    // Set user state to awaiting deposit amount
    userStates[chatId] = { state: 'awaiting_deposit_amount', bank: bankKey };

    // First message: deposit info
    await bot.sendMessage(chatId, depositText, {
        parse_mode: 'Markdown'
    });

    // Second message: enter amount prompt with Cancel button
    await bot.sendMessage(chatId, '💰 Enter Deposit Amount — የገንዘብ መጠን ያስገቡ', {
        reply_markup: {
            keyboard: [
                [{ text: '10' }, { text: '20' }, { text: '50' }],
                [{ text: '100' }, { text: '200' }, { text: '500' }],
                [{ text: 'Cancel' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
            input_field_placeholder: 'Choose or type amount...'
        }
    });
}

// ─── /start command handler ───
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Player';

    // Clear any pending state
    delete userStates[chatId];

    try {
        // Check if user has registered phone number
        const res = await fetch(`${API_URL}/api/users/internal/${msg.from.id}?secret=${INTERNAL_SECRET}`);
        const data = await res.json();

        if (!data.user || !data.user.phone) {
            // Prompt for contact
            const welcomeRequest = `👋 Welcome To Woldsh Bingo, ${firstName}!\n\nPlease share your contact to start playing and receive your 10 ETB welcome gift!`;
            await bot.sendMessage(chatId, welcomeRequest, {
                reply_markup: {
                    keyboard: [
                        [{ text: '📱 Share Contact', request_contact: true }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
            return;
        }

        sendMainMenu(chatId, firstName);
    } catch (err) {
        console.error('Error checking user:', err);
        sendMainMenu(chatId, firstName);
    }
});

// ─── /deposit command handler ───
bot.onText(/\/deposit/, async (msg) => {
    const chatId = msg.chat.id;
    // Go directly to Telebirr deposit prompt (as shown in screenshot)
    await sendDepositPrompt(chatId, 'telebirr');
});

// ─── /play command handler ───
bot.onText(/\/play/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
        '🎮 *Play Bingo Now!*\n\nTap the button below to start playing.',
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎮 Open Game', web_app: { url: WEBAPP_URL } }]
                ]
            }
        }
    );
});

// ─── /balance command handler ───
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const res = await fetch(`${API_URL}/api/users/internal/${msg.from.id}?secret=${INTERNAL_SECRET}`);
        const data = await res.json();
        const balance = data.user ? Number(data.user.balance || 0).toFixed(2) : '0.00';
        const played = data.stats ? data.stats.gamesPlayed : 0;
        const won = data.stats ? data.stats.gamesWon : 0;
        
        await bot.sendMessage(chatId,
            '🧾 *Your Balance*\n\n' +
            `💰 Balance: ${balance} ETB\n` +
            `🎮 Games Played: ${played}\n` +
            `🏆 Games Won: ${won}`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        console.error('Error fetching balance:', err);
        await bot.sendMessage(chatId, '❌ Failed to fetch balance.');
    }
});

// ─── /withdraw command handler ───
bot.onText(/\/withdraw/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
        '🏧 *Withdraw Funds*\n\n' +
        'Withdrawal feature coming soon!\n' +
        'የገንዘብ ማውጣት በቅርቡ ይመጣል!',
        { parse_mode: 'Markdown' }
    );
});

// ─── /invite command handler ───
bot.onText(/\/invite/, async (msg) => {
    const chatId = msg.chat.id;
    const inviteLink = `https://t.me/woldshbingo_bot?start=ref_${msg.from.id}`;
    await bot.sendMessage(chatId,
        '🎟 *Invite Friends*\n\n' +
        'Share this link with your friends:\n' +
        `${inviteLink}\n\n` +
        'You earn 5 ETB bonus for each friend who joins and plays!',
        { parse_mode: 'Markdown' }
    );
});

// ─── /support command handler ───
bot.onText(/\/support/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
        '🆘 *Help & Support*\n\n' +
        'For any questions or issues, contact our support team:\n\n' +
        '👉 https://t.me/+EDLNTrtQlVgwZGU0\n\n' +
        'ለማንኛውም ጥያቄ ወይም ችግር የድጋፍ ቡድናችንን ያግኙ።',
        { parse_mode: 'Markdown' }
    );
});

// ─── /instruction command handler ───
bot.onText(/\/instruction/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
        '🎉 *WOLDSH BINGO | ወልድሽ ቢንጎ* 🎉\n' +
        '✨ Fast • Fair • Fun\n\n' +
        '🚀 *GET STARTED | አጀማመር*\n\n' +
        '👤 *Register | መመዝገብ*\n' +
        'Tap Register to link your phone number.\n' +
        '👉 ስልክ ቁጥርዎን ለማገናኘት Register የሚለውን ይጫኑ።\n\n' +
        '💰 *Deposit Funds | ገንዘብ መሙላት*\n' +
        'Use Deposit Fund to add money to your account.\n' +
        '👉 ሂሳብዎን ለመሙላት Deposit Fund የሚለውን ይጠቀሙ።\n\n' +
        '🎮 *Start Playing | መጫወት*\n' +
        'Tap Start Play and choose your bet amount.\n' +
        '👉 Start Play በመጫን የመወራረጃ መጠን ይምረጡ።\n\n' +
        '🏆 *HOW TO WIN | የአሸናፊነት መንገዶች*\n\n' +
        '🎯 *Pick Your Card | ካርቴላ መምረጥ*\n' +
        'Choose your lucky bingo card and tap Accept.\n' +
        '👉 የሚወዱትን የቢንጎ ካርቴላ መርጠው Accept ይበሉ።\n\n' +
        '🔢 *Mark Numbers | ቁጥሮችን ማቅለም*\n' +
        'Watch the numbers being drawn and mark matches on your card.\n' +
        '👉 የሚወጡትን ቁጥሮች ካርቴላዎ ላይ ያቅልሙ።\n\n' +
        '🎉 *Call BINGO | ቢንጎ ማለት*\n' +
        'You win when you complete one of these:\n\n' +
        '✔️ Horizontal Line – ወደ ጎን መስመር\n' +
        '✔️ Vertical Line – ወደ ታች መስመር\n' +
        '✔️ Diagonal Line – ጋድም መስመር\n' +
        '✔️ Four Corners – አራቱ ጠርዞች\n\n' +
        'Tap BINGO immediately to claim the prize! 🏆\n\n' +
        '⚠️ *RULES | ህግጋት*\n\n' +
        '🚫 *No False Bingo*\n' +
        'Calling Bingo by mistake will disqualify you.\n' +
        '👉 ሳይሞሉ Bingo ቢሉ ከጨዋታው ይባረራሉ።\n\n' +
        '👥 *Minimum Players*\n' +
        'A game round requires at least 2 players to start.\n' +
        '👉 ጨዋታ ለመጀመር ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ።\n\n' +
        '⚡ *Be Fast*\n' +
        'The first player to press BINGO wins the prize.\n' +
        '👉 ቀድሞ Bingo ያለ ተጫዋች አሸናፊ ይሆናል።\n\n' +
        '🍀 *Good Luck & Enjoy the Game!*\n' +
        '🍀 መልካም እድል!',
        { parse_mode: 'Markdown' }
    );
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Acknowledge the callback
    await bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
        case 'deposit':
            await bot.sendMessage(chatId,
                '🏦 *Select Your Bank - ባንክዎን ይምረጡ*\n' +
                'Please choose your preferred bank to complete the deposit.\n' +
                'ክፍያውን ለመፈጸም የሚጠቀሙበትን ባንክ ይምረጡ።',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📱 Telebirr', callback_data: 'telebirr' },
                                { text: '💵 CBE Birr', callback_data: 'cbebirr' }
                            ]
                        ]
                    }
                }
            );
            break;

        case 'telebirr':
            await sendDepositPrompt(chatId, 'telebirr');
            break;

        case 'cbebirr':
            await sendDepositPrompt(chatId, 'cbebirr');
            break;

        case 'cancel_deposit':
            delete userStates[chatId];
            await bot.sendMessage(chatId,
                '❌ Deposit cancelled.\n\nተቋርጧል።',
                { reply_markup: { remove_keyboard: true } }
            );
            break;

        case 'balance':
            try {
                const res = await fetch(`${API_URL}/api/users/internal/${callbackQuery.from.id}?secret=${INTERNAL_SECRET}`);
                const bData = await res.json();
                const balance = bData.user ? Number(bData.user.balance || 0).toFixed(2) : '0.00';
                const played = bData.stats ? bData.stats.gamesPlayed : 0;
                const won = bData.stats ? bData.stats.gamesWon : 0;
                
                await bot.sendMessage(chatId,
                    '🧾 *Your Balance*\n\n' +
                    `💰 Balance: ${balance} ETB\n` +
                    `🎮 Games Played: ${played}\n` +
                    `🏆 Games Won: ${won}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (err) {
                console.error('Error fetching balance:', err);
                await bot.sendMessage(chatId, '❌ Failed to fetch balance.');
            }
            break;

        case 'invite':
            const inviteLink = `https://t.me/woldshbingo_bot?start=ref_${callbackQuery.from.id}`;
            await bot.sendMessage(chatId,
                '🎟 *Invite Friends*\n\n' +
                'Share this link with your friends:\n' +
                `${inviteLink}\n\n` +
                'You earn 5 ETB bonus for each friend who joins and plays!',
                { parse_mode: 'Markdown' }
            );
            break;

        case 'patterns':
            const patternsPath = path.join(__dirname, 'assets', 'patterns.png');
            if (fs.existsSync(patternsPath)) {
                await bot.sendPhoto(chatId, patternsPath, {
                    caption: '🎆 *Win Patterns*\n\nFirst player to complete any pattern wins!',
                    parse_mode: 'Markdown'
                });
            } else {
                await bot.sendMessage(chatId,
                    '🎆 *Win Patterns*\n\n' +
                    '✅ Horizontal line (any row)\n' +
                    '✅ Vertical line (any column)\n' +
                    '✅ Diagonal (corner to corner)\n' +
                    '✅ Full House (all numbers)\n\n' +
                    'First player to complete any pattern wins!',
                    { parse_mode: 'Markdown' }
                );
            }
            break;

        case 'howtoplay':
            await bot.sendMessage(chatId,
                '🎉 *WOLDSH BINGO | ወልድሽ ቢንጎ* 🎉\n' +
                '✨ Fast • Fair • Fun\n\n' +
                '🚀 *GET STARTED | አጀማመር*\n\n' +
                '👤 *Register | መመዝገብ*\n' +
                'Tap Register to link your phone number.\n' +
                '👉 ስልክ ቁጥርዎን ለማገናኘት Register የሚለውን ይጫኑ።\n\n' +
                '💰 *Deposit Funds | ገንዘብ መሙላት*\n' +
                'Use Deposit Fund to add money to your account.\n' +
                '👉 ሂሳብዎን ለመሙላት Deposit Fund የሚለውን ይጠቀሙ።\n\n' +
                '🎮 *Start Playing | መጫወት*\n' +
                'Tap Start Play and choose your bet amount.\n' +
                '👉 Start Play በመጫን የመወራረጃ መጠን ይምረጡ።\n\n' +
                '🏆 *HOW TO WIN | የአሸናፊነት መንገዶች*\n\n' +
                '🎯 *Pick Your Card | ካርቴላ መምረጥ*\n' +
                'Choose your lucky bingo card and tap Accept.\n' +
                '👉 የሚወዱትን የቢንጎ ካርቴላ መርጠው Accept ይበሉ።\n\n' +
                '🔢 *Mark Numbers | ቁጥሮችን ማቅለም*\n' +
                'Watch the numbers being drawn and mark matches on your card.\n' +
                '👉 የሚወጡትን ቁጥሮች ካርቴላዎ ላይ ያቅልሙ።\n\n' +
                '🎉 *Call BINGO | ቢንጎ ማለት*\n' +
                'You win when you complete one of these:\n\n' +
                '✔️ Horizontal Line – ወደ ጎን መስመር\n' +
                '✔️ Vertical Line – ወደ ታች መስመር\n' +
                '✔️ Diagonal Line – ጋድም መስመር\n' +
                '✔️ Four Corners – አራቱ ጠርዞች\n\n' +
                'Tap BINGO immediately to claim the prize! 🏆\n\n' +
                '⚠️ *RULES | ህግጋት*\n\n' +
                '🚫 *No False Bingo*\n' +
                'Calling Bingo by mistake will disqualify you.\n' +
                '👉 ሳይሞሉ Bingo ቢሉ ከጨዋታው ይባረራሉ።\n\n' +
                '👥 *Minimum Players*\n' +
                'A game round requires at least 2 players to start.\n' +
                '👉 ጨዋታ ለመጀመር ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ።\n\n' +
                '⚡ *Be Fast*\n' +
                'The first player to press BINGO wins the prize.\n' +
                '👉 ቀድሞ Bingo ያለ ተጫዋች አሸናፊ ይሆናል።\n\n' +
                '🍀 *Good Luck & Enjoy the Game!*\n' +
                '🍀 መልካም እድል!',
                { parse_mode: 'Markdown' }
            );
            break;

        default:
            await bot.sendMessage(chatId, '🔄 Feature coming soon!');
    }
});

// ─── Handle text messages (for deposit amount + cancel) ───
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip commands and non-text messages
    if (!text || text.startsWith('/')) return;

    // Handle "Cancel" button text
    if (text === 'Cancel') {
        if (userStates[chatId]) {
            delete userStates[chatId];
            await bot.sendMessage(chatId,
                '❌ Deposit cancelled.\n\nተቋርጧል።',
                { reply_markup: { remove_keyboard: true } }
            );
        }
        return;
    }

    const state = userStates[chatId];
    if (!state) return;

    // ─── State: awaiting deposit amount ───
    if (state.state === 'awaiting_deposit_amount') {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount <= 0) {
            await bot.sendMessage(chatId,
                '❌ Please enter a valid amount (number greater than 0).\n\nእባክዎ ትክክለኛ መጠን ያስገቡ።',
                {
                    reply_markup: {
                        force_reply: true,
                        input_field_placeholder: 'e.g. 200'
                    }
                }
            );
            return;
        }

        // Save amount and move to awaiting receipt state
        userStates[chatId] = {
            state: 'awaiting_receipt',
            bank: state.bank,
            amount: amount
        };

        await bot.sendMessage(chatId,
            `✅ Deposit amount saved: *${amount.toFixed(2)} ETB*. Now send your receipt screenshot/photo.\n\n` +
            `የገንዘብ መጠን ተቀምጧል: *${amount.toFixed(2)} ETB*. አሁን የደረሰኝ ስክሪንሾት/ፎቶ ይላኩ።`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: 'Cancel' }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            }
        );
        return;
    }

    // ─── State: awaiting receipt (text pasted as SMS receipt) ───
    if (state.state === 'awaiting_receipt') {
        // User pasted SMS receipt text
        delete userStates[chatId];
        
        // Forward to admin
        if (ADMIN_CHAT_ID) {
            let phone = 'Unknown';
            try {
                const res = await fetch(`${API_URL}/api/users/internal/${msg.from.id}?secret=${INTERNAL_SECRET}`);
                const data = await res.json();
                if (data.user && data.user.phone) phone = data.user.phone;
            } catch (err) { console.error('Error fetching phone:', err.message); }

            const tgUsername = msg.from.username ? `@${msg.from.username}` : 'No Username';
            const adminMsg = `🏦 *NEW DEPOSIT REQUEST*\n\n` +
                `👤 User ID: ${msg.from.id}\n` +
                `🗣 Name: ${msg.from.first_name || 'User'}\n` +
                `🔗 Username: ${tgUsername}\n` +
                `📱 Phone: ${phone}\n` +
                `💰 Amount: ${state.amount.toFixed(2)} ETB\n` +
                `🏦 Bank: ${state.bank === 'telebirr' ? 'Telebirr' : 'CBE Birr'}\n\n` +
                `📝 *Receipt Text:*\n${text}`;
            
            await bot.sendMessage(ADMIN_CHAT_ID, adminMsg, { parse_mode: 'Markdown' })
                .catch(err => console.error('Failed to forward receipt to admin:', err.message));
        } else {
            console.log('Admin Chat ID not set! Missed receipt text:', text);
        }

        await bot.sendMessage(chatId,
            `✅ *Receipt received!*\n\n` +
            `Amount: ${state.amount.toFixed(2)} ETB\n` +
            `Bank: ${state.bank === 'telebirr' ? 'Telebirr' : 'CBE Birr'}\n\n` +
            `Your deposit is being verified. You will be notified once confirmed.\n` +
            `ክፍያዎ እየተረጋገጠ ነው። ሲረጋገጥ ይሳወቃሉ።`,
            {
                parse_mode: 'Markdown',
                reply_markup: { remove_keyboard: true }
            }
        );
        return;
    }
});

// ─── Handle photo messages (for receipt screenshots) ───
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];

    if (state && state.state === 'awaiting_receipt') {
        delete userStates[chatId];
        
        // Forward to admin
        if (ADMIN_CHAT_ID) {
            let phone = 'Unknown';
            try {
                const res = await fetch(`${API_URL}/api/users/internal/${msg.from.id}?secret=${INTERNAL_SECRET}`);
                const data = await res.json();
                if (data.user && data.user.phone) phone = data.user.phone;
            } catch (err) { console.error('Error fetching phone:', err.message); }

            const tgUsername = msg.from.username ? `@${msg.from.username}` : 'No Username';
            const photoId = msg.photo[msg.photo.length - 1].file_id;
            const adminMsg = `🏦 *NEW DEPOSIT REQUEST*\n\n` +
                `👤 User ID: ${msg.from.id}\n` +
                `🗣 Name: ${msg.from.first_name || 'User'}\n` +
                `🔗 Username: ${tgUsername}\n` +
                `📱 Phone: ${phone}\n` +
                `💰 Amount: ${state.amount.toFixed(2)} ETB\n` +
                `🏦 Bank: ${state.bank === 'telebirr' ? 'Telebirr' : 'CBE Birr'}`;
            
            await bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
                caption: adminMsg,
                parse_mode: 'Markdown'
            }).catch(err => console.error('Failed to forward photo to admin:', err.message));
        } else {
            console.log('Admin Chat ID not set! Missed receipt photo from setup.');
        }

        await bot.sendMessage(chatId,
            `✅ *Receipt screenshot received!*\n\n` +
            `Amount: ${state.amount.toFixed(2)} ETB\n` +
            `Bank: ${state.bank === 'telebirr' ? 'Telebirr' : 'CBE Birr'}\n\n` +
            `Your deposit is being verified. You will be notified once confirmed.\n` +
            `ክፍያዎ እየተረጋገጠ ነው። ሲረጋገጥ ይሳወቃሉ።`,
            {
                parse_mode: 'Markdown',
                reply_markup: { remove_keyboard: true }
            }
        );
    }
});

// ─── Handle errors ───
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code, error.message);
});

// ─── Handle contact sharing (for registration) ───
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;

    if (contact.user_id && contact.user_id !== msg.from.id) {
        return bot.sendMessage(chatId, '❌ Please share your own contact.');
    }

    try {
        // Register phone in backend
        const res = await fetch(`${API_URL}/api/users/internal/phone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: INTERNAL_SECRET,
                telegramId: msg.from.id,
                phone: contact.phone_number,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                username: msg.from.username
            })
        });

        const data = await res.json();
        if (data.success) {
            await bot.sendMessage(chatId,
                `✅ ተመዝግበዋል! የ 10 ብር ስጦታ ተሰጥቶዎታል።\n\n` +
                `Welcome ${contact.first_name}! You are now registered and received your 10 ETB bonus.`,
                { reply_markup: { remove_keyboard: true } }
            );

            // Send main menu
            setTimeout(() => sendMainMenu(chatId, contact.first_name), 500);
        } else {
            await bot.sendMessage(chatId, '❌ Registration failed. Please try again.');
        }
    } catch (err) {
        console.error('Registration error:', err);
        await bot.sendMessage(chatId, '❌ An error occurred during registration.');
    }
});

console.log('✅ Bot started successfully!');
console.log(`📱 Open Telegram and message @woldshbingo_bot`);
console.log(`🌐 WebApp URL: ${WEBAPP_URL}`);
