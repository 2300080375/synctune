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