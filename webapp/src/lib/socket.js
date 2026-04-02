import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});

export const adminSocket = io(`${SOCKET_URL}/admin`, {
    autoConnect: false,
    withCredentials: true
});

/**
 * Join a game socket room to receive real-time updates
 */
export function joinGameRoom(gameId) {
    socket.emit('join_game', gameId);
}

/**
 * Leave a game socket room
 */
export function leaveGameRoom(gameId) {
    socket.emit('leave_game', gameId);
}
