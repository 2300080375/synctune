import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
  socket.on('connect_error', (err) => console.error('❌ Socket error:', err.message));
  socket.on('disconnect', () => console.log('🔌 Socket disconnected'));

  return socket;
};

export const getSocket = () => socket;

export const joinRoom = (roomId, userId, userName) => {
  socket?.emit('join-room', { roomId, userId, userName });
};

export const leaveRoom = () => {
  socket?.emit('leave-room');
};

export const emitPlaySong = (roomId, songData, playUrl, timestamp = 0) => {
  socket?.emit('play-song', { roomId, songData, playUrl, timestamp });
};

export const emitPauseSong = (roomId, timestamp) => {
  socket?.emit('pause-song', { roomId, timestamp });
};

export const emitSeekSong = (roomId, timestamp) => {
  socket?.emit('seek-song', { roomId, timestamp });
};

export const emitResumeSong = (roomId, timestamp) => {
  socket?.emit('resume-song', { roomId, timestamp });
};

export const emitChatMessage = (roomId, user, text) => {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  socket?.emit('chat-message', { roomId, user, text, time });
};

const on = (event, cb) => socket?.on(event, cb);
const off = (event) => socket?.off(event);

export const onRoomState = (cb) => on('room-state', cb);
export const onUsersUpdated = (cb) => on('users-updated', cb);
export const onPlaySong = (cb) => on('play-song', cb);
export const onPauseSong = (cb) => on('pause-song', cb);
export const onSeekSong = (cb) => on('seek-song', cb);
export const onResumeSong = (cb) => on('resume-song', cb);
export const onChatMessage = (cb) => on('chat-message', cb);
export const onSystemMessage = (cb) => on('system-message', cb);

export const offRoomState = () => off('room-state');
export const offUsersUpdated = () => off('users-updated');
export const offPlaySong = () => off('play-song');
export const offPauseSong = () => off('pause-song');
export const offSeekSong = () => off('seek-song');
export const offResumeSong = () => off('resume-song');
export const offChatMessage = () => off('chat-message');
export const offSystemMessage = () => off('system-message');