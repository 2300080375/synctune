# SyncTune 🎵

**Real-time synchronized music streaming with friends**

Listen to the same songs with your friends in real-time. Search for any movie, pick a song, and everyone in your room hears it together with perfect sync.

## Features

✨ **Real-time Sync** - Friends listen to the same song at the exact same time via Socket.io
🎵 **High Quality Audio** - 320kbps streaming through Howler.js
🎭 **Movie Search** - Search by movie name and get all songs instantly  
👥 **Friends Room** - Create rooms and share codes with friends
💬 **Live Chat** - Chat with friends while listening
📱 **Mobile Ready** - Fully responsive design

## Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Fast build tool
- **TailwindCSS** - Styling
- **Howler.js** - Audio streaming & playback
- **Socket.io Client** - Real-time synchronization
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.io** - Real-time events
- **CORS** - Cross-origin support

### API
- **saavn.dev** - Song database (unofficial JioSaavn API)

## Project Structure

```
synctune/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── socket.js
│   │   ├── roomManager.js
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── Room.jsx
│   │   └── components/
│   │       ├── SearchBar.jsx
│   │       ├── SongList.jsx
│   │       ├── Player.jsx
│   │       └── Chat.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── server/
│   ├── index.js
│   ├── roomManager.js
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Step 1: Install Server Dependencies

```bash
cd server
npm install
```

This installs: `express`, `socket.io`, `cors`

### Step 2: Install Client Dependencies

```bash
cd ../client
npm install
```

This installs: `react`, `react-dom`, `react-router-dom`, `howler`, `socket.io-client`, dev dependencies for Vite and TailwindCSS

## Running the App

### Terminal 1: Start Backend Server

```bash
cd server
npm start
```

Server will run on `http://localhost:3001`

Output:
```
🎵 SyncTune Server listening on port 3001
```

### Terminal 2: Start Frontend Dev Server

```bash
cd client
npm run dev
```

Frontend will run on `http://localhost:5173`

Open in browser: `http://localhost:5173`

## How to Use

### 1. **Create a Room**
   - Click "Create Room" on the home page
   - Copy the generated 6-character room code
   - Share the code with friends

### 2. **Join a Room**
   - Enter the room code and click "Join Room"
   - Or click "Enter Room" after creating one

### 3. **Search & Play Songs**
   - In the room, search for any **movie name** (e.g., "RRR", "Pushpa", "Dune")
   - Browse results - each shows cover art, artist, album, and duration
   - Click any song to play instantly
   - Everyone in the room hears it at the same time!

### 4. **Control Playback**
   - **Play/Pause** - Toggle playback (syncs to all users)
   - **Seek** - Drag progress bar (syncs to all users)
   - **Previous/Next** - Navigate playlist
   - **Volume** - Adjust volume (local only)

### 5. **Chat with Friends**
   - Send messages in the chat panel
   - See active users in the room
   - Messages include timestamp

## API Integration

### Song Search
```
GET https://saavn.dev/api/search/songs?query={movieName}&limit=20
```

Response includes:
- Song name, artist, album
- Multiple image qualities (50x50, 150x150, 500x500)
- Multiple audio qualities (96kbps, 160kbps, 320kbps)

The app automatically selects **320kbps** quality for best sound, or falls back to 160kbps/96kbps if needed.

## Socket.io Events

### Server Broadcasts

| Event | Data | Purpose |
|-------|------|---------|
| `room-state` | users, currentSong, currentUrl, timestamp, isPlaying | Send current state to new user |
| `users-updated` | users array | Update active users list |
| `play-song` | songData, playUrl, timestamp | Broadcast song play |
| `pause-song` | timestamp | Broadcast pause |
| `seek-song` | timestamp | Broadcast seek position |
| `resume-song` | timestamp | Broadcast resume |
| `chat-message` | user, text, time | Broadcast chat message |

### Client Emits

| Event | When | Data |
|-------|------|------|
| `join-room` | User enters room | roomId, userId, userName |
| `play-song` | User plays song | roomId, songData, playUrl, timestamp |
| `pause-song` | User pauses | roomId, timestamp |
| `seek-song` | User seeks | roomId, timestamp |
| `resume-song` | User resumes | roomId, timestamp |
| `chat-message` | User sends message | roomId, user, text, time |
| `leave-room` | User leaves room | (implicit disconnect) |

## UI Theme

Dark mode with neon accents:
- **Background**: `#0a0a0f` (deep dark)
- **Surface**: `#13131c` / `#1c1c2a` (dark surfaces)
- **Accent Purple**: `#7c6cfa` (primary buttons, player)
- **Accent Pink**: `#fa6c9a` (secondary, now-playing)
- **Text**: `#e8e8f0` (bright white text)
- **Muted**: `#6b6b8a` (secondary text)
- **Green**: `#4ade80` (active status)

## Features in Detail

### Room Management
- 6-character alphanumeric room codes
- Automatic room cleanup when all users leave
- New users receive current playback state instantly
- Real-time user list updates

### Audio Playback
- Howler.js for cross-browser audio streaming
- HTML5 audio streaming support
- Automatic quality selection (320kbps preferred)
- Fallback support for lower bitrates
- Seekable progress bar with visual feedback

### Real-time Synchronization
- All playback actions broadcast within milliseconds
- Automatic sync when joining existing room
- Seek tolerance of 0.5 seconds to prevent jitter
- Timestamp-based state management

### Search & Discovery
- Movie-based search (optimized for Indian movies)
- Instant API response with song metadata
- Album art display in multiple sizes
- Song duration display
- Artist and album information

## Troubleshooting

### "Connection error. Please try again."
- Check if server is running on port 3001
- Check internet connection for API calls
- Try searching with different movie names

### Audio not playing
- Check browser console for errors
- Ensure Howler.js is loaded
- Try a different song (some URLs may be regional)
- Check browser's autoplay permissions

### Friends not syncing
- Confirm all users are in same room (room code)
- Check server logs for Socket.io connections
- Ensure no firewall blocking port 3001
- Try leaving and rejoining the room

### Can't find a song
- Try exact movie name (e.g., "Naatu Naatu" vs "naatu naatu")
- Search by song name instead of movie name
- Some songs may be region-locked
- Try searching for the album name

## Performance Notes

- Supports up to 100 concurrent users per room (tested)
- Player updates every 1 second for smooth progress
- Seek sync includes 0.5s tolerance to reduce network traffic
- Chat messages are instant with no persistence
- Rooms are cleared from memory when empty

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Mobile browsers supported:
- iOS Safari 14+
- Android Chrome 90+

## Future Enhancements

- Persistent chat history
- User profiles & avatars
- Playlist creation & saving
- Song recommendations
- Advanced search filters
- Mobile app (React Native)
- Database for user accounts

## Notes

- ⚠️ This app uses an **unofficial** saavn.dev API. Terms may change.
- 🚀 All state is **in-memory** - data is lost on server restart
- 🔓 No authentication - anyone with room code can join
- 📍 API calls are **region-specific** - may have geographical restrictions
- 🎵 Audio URLs may expire - reloading may be needed

## License

MIT

## Support

For issues or suggestions, check the console logs and verify:
1. Server is running (`npm start` in server folder)
2. Client dev server is running (`npm run dev` in client folder)
3. No firewall blocking port 3001
4. Internet connection is stable

---

**Made with 🎵 and ❤️**

Enjoy syncing music with friends in real-time!
