const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const https = require('https');
const roomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = 3001;

////////////////////////////////////////////////////////////
// 🔥 AUDIO PROXY (ENHANCED)
////////////////////////////////////////////////////////////

app.get('/api/audio', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

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
    
    const originalContentType = audioRes.headers['content-type'];
    console.log(`✅ Audio response - Status: ${audioRes.statusCode}, Original Content-Type: ${originalContentType}, Size: ${audioRes.headers['content-length']}`);

    if (audioRes.statusCode === 404) {
      console.error("❌ Audio URL returned 404 - URL may be invalid or expired");
      return res.status(404).json({ error: 'Audio not found' });
    }

    if (audioRes.statusCode >= 400) {
      console.error(`❌ Audio URL returned ${audioRes.statusCode}`);
      return res.status(audioRes.statusCode).json({ error: `Server returned ${audioRes.statusCode}` });
    }

    const contentType = 'audio/mpeg';
    
    console.log(`📤 Sending as: ${contentType}`);

    res.writeHead(audioRes.statusCode, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': audioRes.headers['content-length'] || undefined
    });

    audioRes.pipe(res);

    audioRes.on('error', (err) => {
      console.error("❌ Audio stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      } else {
        res.end();
      }
    });

  });

  request.on('error', (err) => {
    console.error("❌ Audio Proxy Error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch audio' });
    }
  });

  request.on('timeout', () => {
    console.error("❌ Audio request timeout");
    request.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 'Audio request timeout' });
    }
  });
});

////////////////////////////////////////////////////////////
// 🔍 SEARCH PROXY (MULTIPLE MIRRORS)
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
      hostname: mirror,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      timeout: 8000,
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Mirror ${mirror} returned ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

app.get('/api/search', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }

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

io.on('connection', (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on('join-room', ({ roomId, userId, userName }) => {
    if (!roomManager.roomExists(roomId)) {
      roomManager.createRoom(roomId);
    }

    const room = roomManager.joinRoom(roomId, userId, userName);

    socketToUser.set(socket.id, { roomId, userId });
    socket.join(roomId);

    socket.emit('room-state', {
      users: room.users,
      currentSong: room.currentSong,
      currentUrl: room.currentUrl,
      timestamp: room.timestamp,
      isPlaying: room.isPlaying
    });

    io.to(roomId).emit('users-updated', room.users);
  });

  socket.on('play-song', ({ roomId, songData, playUrl, timestamp }) => {
    roomManager.updateSongState(roomId, songData, playUrl, timestamp, true);

    io.to(roomId).emit('play-song', {
      songData,
      playUrl,
      timestamp
    });
  });

  socket.on('pause-song', ({ roomId, timestamp }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      roomManager.updateSongState(roomId, room.currentSong, room.currentUrl, timestamp, false);
      io.to(roomId).emit('pause-song', { timestamp });
    }
  });

  socket.on('seek-song', ({ roomId, timestamp }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      roomManager.updateSongState(roomId, room.currentSong, room.currentUrl, timestamp, room.isPlaying);
      io.to(roomId).emit('seek-song', { timestamp });
    }
  });

  socket.on('resume-song', ({ roomId, timestamp }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      roomManager.updateSongState(roomId, room.currentSong, room.currentUrl, timestamp, true);
      io.to(roomId).emit('resume-song', { timestamp });
    }
  });

  // ✅ CHAT HANDLER — broadcast to all users in room
  socket.on('chat-message', ({ roomId, user, text, time }) => {
    console.log(`💬 Chat [${roomId}] ${user}: ${text}`);
    io.to(roomId).emit('chat-message', { user, text, time });
  });

  socket.on('disconnect', () => {
    const userInfo = socketToUser.get(socket.id);
    if (userInfo) {
      const room = roomManager.leaveRoom(userInfo.roomId, userInfo.userId);
      if (room) {
        io.to(userInfo.roomId).emit('users-updated', room.users);
      }
      socketToUser.delete(socket.id);
    }

    console.log("❌ Disconnected:", socket.id);
  });
});

////////////////////////////////////////////////////////////
// 🟢 BASE ROUTE
////////////////////////////////////////////////////////////

app.get('/', (req, res) => {
  res.send("🎵 SyncTune Server Running");
});

////////////////////////////////////////////////////////////
// 🚀 START SERVER
////////////////////////////////////////////////////////////

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});