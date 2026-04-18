const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const generateRoomId = () =>
  Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

const roomManager = { generateRoomId };
export default roomManager;