const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const https = require('https');
const roomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3001;
// ✅ ADD THIS to server/index.js — paste after app.use(express.json()) line
// Gift storage (in-memory — gifts survive until server restart)

const gifts = new Map(); // giftId -> gift data

function generateGiftId() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

////////////////////////////////////////////////////////////
// 🎁 GIFT API
////////////////////////////////////////////////////////////

// Create gift
app.post('/api/gift/create', (req, res) => {
  const { photo, song, message, from, vibe } = req.body;

  if (!photo || !song || !message || !from) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const giftId = generateGiftId();
  const gift = {
    giftId,
    photo,
    song,
    message,
    from,
    vibe: vibe || 'dreamy',
    createdAt: Date.now(),
  };

  gifts.set(giftId, gift);
  console.log(`🎁 Gift created: ${giftId} from ${from}`);

  // Auto delete after 7 days
  setTimeout(() => {
    gifts.delete(giftId);
    console.log(`🗑️ Gift expired: ${giftId}`);
  }, 7 * 24 * 60 * 60 * 1000);

  res.json({ giftId });
});

// Get gift
app.get('/api/gift/:giftId', (req, res) => {
  const gift = gifts.get(req.params.giftId);
  if (!gift) return res.status(404).json({ error: 'Gift not found' });
  res.json(gift);
});

// Save reply to gift
app.post('/api/gift/:giftId/reply', (req, res) => {
  const gift = gifts.get(req.params.giftId);
  if (!gift) return res.status(404).json({ error: 'Gift not found' });

  const { replyText, replyFrom } = req.body;
  if (!replyText || !replyText.trim()) return res.status(400).json({ error: 'Reply text required' });

  gift.reply = {
    text: replyText.trim(),
    from: replyFrom || 'them',
    repliedAt: Date.now(),
  };

  console.log(`💌 Reply saved for gift ${req.params.giftId}`);
  res.json({ success: true });
});
////////////////////////////////////////////////////////////
// 🔥 AUDIO PROXY
////////////////////////////////////////////////////////////

app.get('/api/audio', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const audioUrl = decodeURIComponent(url);
  console.log("🎵 Streaming audio:", audioUrl.substring(0, 80));

  const request = https.get(audioUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'audio/*, */*;q=0.01',
      'Referer': 'https://www.jiosaavn.com/',
      'Origin': 'https://www.jiosaavn.com',
      'Accept-Encoding': 'identity'
    },
    timeout: 30000
  }, (audioRes) => {
    console.log(`✅ Audio response - Status: ${audioRes.statusCode}, Size: ${audioRes.headers['content-length']}`);

    if (audioRes.statusCode === 404) return res.status(404).json({ error: 'Audio not found' });
    if (audioRes.statusCode >= 400) return res.status(audioRes.statusCode).json({ error: `Server returned ${audioRes.statusCode}` });

    res.writeHead(audioRes.statusCode, {
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': audioRes.headers['content-length'] || undefined
    });

    audioRes.pipe(res);
    audioRes.on('error', (err) => {
      console.error("❌ Audio stream error:", err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
      else res.end();
    });
  });

  request.on('error', (err) => {
    console.error("❌ Audio Proxy Error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to fetch audio' });
  });

  request.on('timeout', () => {
    console.error("❌ Audio request timeout");
    request.destroy();
    if (!res.headersSent) res.status(504).json({ error: 'Audio request timeout' });
  });
});

////////////////////////////////////////////////////////////
// 🎞 TENOR GIF PROXY  (avoids CORS on mobile browsers)
////////////////////////////////////////////////////////////

const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPmasa5gSpV4bJj8';

app.get('/api/gifs', (req, res) => {
  const { q, limit = '24' } = req.query;
  const params = new URLSearchParams({
    key: TENOR_KEY,
    limit,
    media_filter: 'tinygif,gif',
    contentfilter: 'medium',
    ...(q ? { q } : {}),
  });
  const apiPath = q ? `/v2/search?${params}` : `/v2/featured?${params}`;
  console.log(`🎞 GIF ${q ? `search: "${q}"` : 'featured'}`);

  const gifReq = https.get(
    { hostname: 'tenor.googleapis.com', path: apiPath, headers: { Accept: 'application/json' }, timeout: 8000 },
    (gifRes) => {
      let data = '';
      gifRes.on('data', chunk => data += chunk);
      gifRes.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(gifRes.statusCode).send(data);
      });
    }
  );
  gifReq.on('error', (err) => {
    console.error('❌ GIF proxy error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'GIF fetch failed' });
  });
  gifReq.on('timeout', () => {
    gifReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: 'GIF timeout' });
  });
});

////////////////////////////////////////////////////////////
// 🔍 SEARCH PROXY
////////////////////////////////////////////////////////////

const SAAVN_MIRRORS = [
  'saavn.sumit.co',
  'jiosaavn-api-privatecvc2.vercel.app',
  'saavnapi-nine.vercel.app',
];

function fetchFromMirror(mirror, query) {
  return new Promise((resolve, reject) => {
    const path = `/api/search/songs?query=${encodeURIComponent(query)}&limit=20`;
    const options = {
      hostname: mirror, path, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000,
    };
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Mirror ${mirror} returned ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Query required' });
  console.log("🔍 Search:", query);
  for (const mirror of SAAVN_MIRRORS) {
    try {
      const data = await fetchFromMirror(mirror, query);
      console.log("✅ Mirror success:", mirror);
      return res.json(data);
    } catch (err) {
      console.log("❌ Mirror failed:", mirror);
    }
  }
  res.status(500).json({ error: 'All mirrors failed' });
});

////////////////////////////////////////////////////////////
// 🔌 SOCKET.IO
////////////////////////////////////////////////////////////

const socketToUser = new Map();

// ✅ Track song play timestamps for accurate sync
const roomPlayTimestamps = new Map(); // roomId -> { startedAt, timestamp }

io.on('connection', (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on('join-room', ({ roomId, userId, userName }) => {
    if (!roomManager.roomExists(roomId)) roomManager.createRoom(roomId);

    const room = roomManager.joinRoom(roomId, userId, userName);
    socketToUser.set(socket.id, { roomId, userId, userName });
    socket.join(roomId);

    // ✅ Calculate accurate current timestamp for new joiner
    let accurateTimestamp = room.timestamp || 0;
    if (room.isPlaying && roomPlayTimestamps.has(roomId)) {
      const { startedAt, timestamp } = roomPlayTimestamps.get(roomId);
      const elapsed = (Date.now() - startedAt) / 1000;
      accurateTimestamp = timestamp + elapsed;
    }

    socket.emit('room-state', {
      users: room.users,
      currentSong: room.currentSong,
      currentUrl: room.currentUrl,
      timestamp: accurateTimestamp,
      isPlaying: room.isPlaying,
      chatHistory: roomManager.getChatHistory(roomId),
      queue: roomManager.getQueue(roomId),
    });

    io.to(roomId).emit('users-updated', room.users);

    // ✅ Join notification in chat
    if (room.users.length > 1) {
      io.to(roomId).emit('system-message', { text: `${userName} joined the room 👋` });
    }
  });

  socket.on('play-song', ({ roomId, songData, playUrl, timestamp }) => {
    roomManager.updateSongState(roomId, songData, playUrl, timestamp, true);
    // ✅ Track when song started for sync
    roomPlayTimestamps.set(roomId, { startedAt: Date.now(), timestamp: timestamp || 0 });
    io.to(roomId).emit('play-song', { songData, playUrl, timestamp });
  });

  socket.on('pause-song', ({ roomId, timestamp }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      roomManager.updateSongState(roomId, room.currentSong, room.currentUrl, timestamp, false);
      roomPlayTimestamps.delete(roomId);
      io.to(roomId).emit('pause-song', { timestamp });
    }
  });

  socket.on('seek-song', ({ roomId, timestamp }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      roomManager.updateSongState(roomId, room.currentSong, room.currentUrl, timestamp, room.isPlaying);
      if (room.isPlaying) roomPlayTimestamps.set(roomId, { startedAt: Date.now(), timestamp });
      io.to(roomId).emit('seek-song', { timestamp });
    }
  });

  socket.on('resume-song', ({ roomId, timestamp }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      roomManager.updateSongState(roomId, room.currentSong, room.currentUrl, timestamp, true);
      roomPlayTimestamps.set(roomId, { startedAt: Date.now(), timestamp });
      io.to(roomId).emit('resume-song', { timestamp });
    }
  });

  // ✅ CHAT
  socket.on('chat-message', ({ roomId, user, text, time, msgType = 'text', stickerId, gifUrl, gifTitle, uploadData, uploadName }) => {
    const message = { user, text, time, msgType, stickerId, gifUrl, gifTitle, uploadData, uploadName };
    roomManager.addChatMessage(roomId, message);
    socket.to(roomId).emit('chat-message', message);
    const isUpload = msgType.startsWith('upload-');
    console.log(`💬 Chat [${roomId}] ${user}: ${isUpload ? `[${msgType} - ${uploadName || 'file'}]` : text}`);
  });

  // ✅ QUEUE — Add
  socket.on('add-to-queue', ({ roomId, song }) => {
    roomManager.addToQueue(roomId, song);
    io.to(roomId).emit('queue-updated', roomManager.getQueue(roomId));
    console.log(`🎵 Queue add [${roomId}]:`, song.name);
  });

  // ✅ QUEUE — Remove
  socket.on('remove-from-queue', ({ roomId, index }) => {
    roomManager.removeFromQueue(roomId, index);
    io.to(roomId).emit('queue-updated', roomManager.getQueue(roomId));
  });

  // ✅ QUEUE — Play specific
  socket.on('play-from-queue', ({ roomId, index }) => {
    const song = roomManager.playFromQueue(roomId, index);
    if (song) {
      const audioUrl = song.downloadUrl?.find(d => d.quality === '320kbps')?.url
        || song.downloadUrl?.find(d => d.quality === '160kbps')?.url
        || song.downloadUrl?.[0]?.url;
      if (audioUrl) {
        roomManager.updateSongState(roomId, song, audioUrl, 0, true);
        roomPlayTimestamps.set(roomId, { startedAt: Date.now(), timestamp: 0 });
        io.to(roomId).emit('play-song', { songData: song, playUrl: audioUrl, timestamp: 0 });
        io.to(roomId).emit('queue-updated', roomManager.getQueue(roomId));
      }
    }
  });

  // ✅ QUEUE — Auto next on song end
  socket.on('song-ended', ({ roomId }) => {
    const nextSong = roomManager.playNextFromQueue(roomId);
    if (nextSong) {
      const audioUrl = nextSong.downloadUrl?.find(d => d.quality === '320kbps')?.url
        || nextSong.downloadUrl?.find(d => d.quality === '160kbps')?.url
        || nextSong.downloadUrl?.[0]?.url;
      if (audioUrl) {
        roomManager.updateSongState(roomId, nextSong, audioUrl, 0, true);
        roomPlayTimestamps.set(roomId, { startedAt: Date.now(), timestamp: 0 });
        io.to(roomId).emit('play-song', { songData: nextSong, playUrl: audioUrl, timestamp: 0 });
        io.to(roomId).emit('queue-updated', roomManager.getQueue(roomId));
        console.log(`⏭️ Auto next [${roomId}]:`, nextSong.name);
      }
    }
  });

  socket.on('disconnect', () => {
    const userInfo = socketToUser.get(socket.id);
    if (userInfo) {
      const { roomId, userName } = userInfo;
      const room = roomManager.leaveRoom(roomId, userInfo.userId);
      if (room) {
        io.to(roomId).emit('users-updated', room.users);
        // ✅ Leave notification in chat
        io.to(roomId).emit('system-message', { text: `${userName} left the room` });
      }
      socketToUser.delete(socket.id);
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

////////////////////////////////////////////////////////////
// 🟢 BASE ROUTE
////////////////////////////////////////////////////////////

app.get('/', (req, res) => res.send("🎵 SyncTune Server Running"));

////////////////////////////////////////////////////////////
// 🚀 START
////////////////////////////////////////////////////////////

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));