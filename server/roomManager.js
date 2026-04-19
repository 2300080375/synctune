class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: [],
        currentSong: null,
        currentUrl: null,
        timestamp: 0,
        isPlaying: false,
        chatHistory: [],
        queue: [],
        createdAt: Date.now(),
      });
      return true;
    }
    return false;
  }

  joinRoom(roomId, userId, userName) {
    if (!this.rooms.has(roomId)) return null;
    const room = this.rooms.get(roomId);
    if (!room.users.some(u => u.id === userId)) {
      room.users.push({ id: userId, name: userName });
    }
    return room;
  }

  leaveRoom(roomId, userId) {
    if (!this.rooms.has(roomId)) return null;
    const room = this.rooms.get(roomId);
    room.users = room.users.filter(u => u.id !== userId);
    if (room.users.length === 0) {
      this.rooms.delete(roomId);
      return { users: [] };
    }
    return room;
  }

  updateSongState(roomId, songData, url, timestamp, isPlaying) {
    if (!this.rooms.has(roomId)) return null;
    const room = this.rooms.get(roomId);
    room.currentSong = songData;
    room.currentUrl = url;
    room.timestamp = timestamp;
    room.isPlaying = isPlaying;
    return room;
  }

  addChatMessage(roomId, message) {
    if (!this.rooms.has(roomId)) return;
    const room = this.rooms.get(roomId);
    room.chatHistory.push(message);
    if (room.chatHistory.length > 50) {
      room.chatHistory.shift();
    }
  }

  getChatHistory(roomId) {
    return this.rooms.get(roomId)?.chatHistory || [];
  }

  // ✅ Queue methods
  addToQueue(roomId, song) {
    if (!this.rooms.has(roomId)) return;
    const room = this.rooms.get(roomId);
    if (!room.queue) room.queue = [];
    room.queue.push(song);
  }

  removeFromQueue(roomId, index) {
    if (!this.rooms.has(roomId)) return;
    const room = this.rooms.get(roomId);
    if (!room.queue) return;
    room.queue.splice(index, 1);
  }

  playFromQueue(roomId, index) {
    if (!this.rooms.has(roomId)) return null;
    const room = this.rooms.get(roomId);
    if (!room.queue || room.queue.length === 0) return null;
    const song = room.queue[index];
    room.queue.splice(index, 1);
    return song;
  }

  // ✅ Auto play next song from queue when song ends
  playNextFromQueue(roomId) {
    if (!this.rooms.has(roomId)) return null;
    const room = this.rooms.get(roomId);
    if (!room.queue || room.queue.length === 0) return null;
    const song = room.queue.shift();
    return song;
  }

  getQueue(roomId) {
    return this.rooms.get(roomId)?.queue || [];
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  getRoomCount() {
    return this.rooms.size;
  }
}

module.exports = new RoomManager();