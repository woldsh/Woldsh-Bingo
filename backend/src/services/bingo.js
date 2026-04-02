/**
 * Bingo Game Logic Service
 * Handles card generation, number calling, and win detection
 * 
 * Winning Patterns (priority order):
 * 1. Four Corners - all 4 corner cells marked
 * 2. Horizontal Line - any complete row
 * 3. Vertical Line - any complete column  
 * 4. Diagonal - either diagonal
 */

const crypto = require('crypto');

// Standard Bingo ranges: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
const BINGO_RANGES = {
    B: { min: 1, max: 15 },
    I: { min: 16, max: 30 },
    N: { min: 31, max: 45 },
    G: { min: 46, max: 60 },
    O: { min: 61, max: 75 },
};

// Pattern priority (lower number = higher priority, checked first)
const PATTERN_PRIORITY = {
    four_corners: 1,
    horizontal_line: 2,
    vertical_line: 3,
    diagonal: 4,
};

/**
 * Generate a random bingo card (5x5 grid)
 * Each column has numbers from its respective range
 * Center cell is FREE (value = 0)
 * Uses crypto.randomInt for secure randomness
 */
function generateCard() {
    const columns = Object.values(BINGO_RANGES);
    const card = [];

    for (let col = 0; col < 5; col++) {
        const { min, max } = columns[col];
        const available = [];
        for (let n = min; n <= max; n++) {
            available.push(n);
        }

        // Fisher-Yates shuffle with secure RNG
        for (let i = available.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            [available[i], available[j]] = [available[j], available[i]];
        }

        const selected = available.slice(0, 5);
        card.push(selected);
    }

    // Set FREE space at center (col 2, row 2)
    card[2][2] = 0;

    return card;
}

/**
 * Generate a random number that hasn't been called yet
 * Uses crypto.randomInt for fair, secure randomness
 * @param {number[]} calledNums - array of already called numbers
 * @returns {number|null} - next number to call, or null if all called
 */
function callNumber(calledNums) {
    const remaining = [];
    for (let i = 1; i <= 75; i++) {
        if (!calledNums.includes(i)) {
            remaining.push(i);
        }
    }

    if (remaining.length === 0) return null;

    const index = crypto.randomInt(0, remaining.length);
    return remaining[index];
}

/**
 * Get the BINGO letter for a number
 */
function getLetterForNumber(num) {
    if (num >= 1 && num <= 15) return 'B';
    if (num >= 16 && num <= 30) return 'I';
    if (num >= 31 && num <= 45) return 'N';
    if (num >= 46 && num <= 60) return 'G';
    if (num >= 61 && num <= 75) return 'O';
    return '';
}

/**
 * Build a 5x5 boolean grid showing which cells are marked
 * Card format: card[col][row], where col 0-4 = B,I,N,G,O
 * @param {number[][]} card - 5x5 bingo card
 * @param {number[]} markedNums - numbers marked on this card
 * @returns {boolean[][]} - 5x5 grid of marked status
 */
function buildMarkedGrid(card, markedNums) {
    const marked = [];
    for (let col = 0; col < 5; col++) {
        marked.push([]);
        for (let row = 0; row < 5; row++) {
            const num = card[col][row];
            // FREE space (0) is always marked
            marked[col].push(num === 0 || markedNums.includes(num));
        }
    }
    return marked;
}

/**
 * Check Four Corners pattern
 * Cells: [0][0], [4][0], [0][4], [4][4] (top-left, top-right, bottom-left, bottom-right)
 */
function checkFourCorners(card, markedNums) {
    const marked = buildMarkedGrid(card, markedNums);
    return marked[0][0] && marked[4][0] && marked[0][4] && marked[4][4];
}

/**
 * Check Horizontal Line pattern (any complete row)
 * Returns the row index if found, or -1
 */
function checkHorizontalLine(card, markedNums) {
    const marked = buildMarkedGrid(card, markedNums);
    for (let row = 0; row < 5; row++) {
        let complete = true;
        for (let col = 0; col < 5; col++) {
            if (!marked[col][row]) {
                complete = false;
                break;
            }
        }
        if (complete) return row;
    }
    return -1;
}

/**
 * Check Vertical Line pattern (any complete column)
 * Returns the column index if found, or -1
 */
function checkVerticalLine(card, markedNums) {
    const marked = buildMarkedGrid(card, markedNums);
    for (let col = 0; col < 5; col++) {
        let complete = true;
        for (let row = 0; row < 5; row++) {
            if (!marked[col][row]) {
                complete = false;
                break;
            }
        }
        if (complete) return col;
    }
    return -1;
}

/**
 * Check Diagonal pattern (either diagonal)
 * Returns 'main' for top-left to bottom-right, 'anti' for top-right to bottom-left, or null
 */
function checkDiagonal(card, markedNums) {
    const marked = buildMarkedGrid(card, markedNums);

    // Main diagonal: [0][0], [1][1], [2][2], [3][3], [4][4]
    let mainDiag = true;
    for (let i = 0; i < 5; i++) {
        if (!marked[i][i]) {
            mainDiag = false;
            break;
        }
    }
    if (mainDiag) return 'main';

    // Anti diagonal: [4][0], [3][1], [2][2], [1][3], [0][4]
    let antiDiag = true;
    for (let i = 0; i < 5; i++) {
        if (!marked[i][4 - i]) {
            antiDiag = false;
            break;
        }
    }
    if (antiDiag) return 'anti';

    return null;
}

/**
 * Check ALL winning patterns in priority order
 * Returns the first (highest priority) pattern found
 * 
 * @param {number[][]} card - 5x5 bingo card
 * @param {number[]} markedNums - numbers marked on this card
 * @returns {{ won: boolean, pattern: string|null, detail: any }}
 */
function checkAllPatterns(card, markedNums) {
    // Priority 1: Four Corners
    if (checkFourCorners(card, markedNums)) {
        return { won: true, pattern: 'four_corners', detail: 'Four Corners' };
    }

    // Priority 2: Horizontal Line
    const hRow = checkHorizontalLine(card, markedNums);
    if (hRow >= 0) {
        return { won: true, pattern: 'horizontal_line', detail: `Horizontal Line (row ${hRow + 1})` };
    }

    // Priority 3: Vertical Line
    const vCol = checkVerticalLine(card, markedNums);
    if (vCol >= 0) {
        return { won: true, pattern: 'vertical_line', detail: `Vertical Line (col ${vCol + 1})` };
    }

    // Priority 4: Diagonal
    const diag = checkDiagonal(card, markedNums);
    if (diag) {
        return { won: true, pattern: 'diagonal', detail: `Diagonal (${diag})` };
    }

    return { won: false, pattern: null, detail: null };
}

/**
 * Find which numbers on a card match the called numbers
 * Used for server-side auto-marking
 * @param {number[][]} card - 5x5 bingo card
 * @param {number[]} calledNums - all called numbers so far
 * @returns {number[]} - numbers that should be marked
 */
function getMatchingNumbers(card, calledNums) {
    const matches = [];
    for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 5; row++) {
            const num = card[col][row];
            if (num !== 0 && calledNums.includes(num)) {
                matches.push(num);
            }
        }
    }
    return matches;
}

/**
 * Legacy checkWin for backward compatibility
 */
function checkWin(card, markedNums, pattern = 'any') {
    const result = checkAllPatterns(card, markedNums);
    return result.won;
}

module.exports = {
    generateCard,
    callNumber,
    getLetterForNumber,
    checkWin,
    checkAllPatterns,
    checkFourCorners,
    checkHorizontalLine,
    checkVerticalLine,
    checkDiagonal,
    getMatchingNumbers,
    buildMarkedGrid,
    BINGO_RANGES,
    PATTERN_PRIORITY,
};
