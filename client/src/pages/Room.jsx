import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Howl } from 'howler';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import Player from '../components/Player';
import Chat from '../components/Chat';
import Queue from '../components/Queue';
import { showToast } from '../components/Toast';
import {
  getSocket, joinRoom, leaveRoom,
  emitPlaySong, emitPauseSong, emitResumeSong, emitSongEnded,
  emitAddToQueue, emitRemoveFromQueue, emitPlayFromQueue,
  emitSeekSong,           // ✅ ADD THIS
  emitReaction,
  onRoomState, onUsersUpdated, onPlaySong, onPauseSong, onResumeSong, onQueueUpdated,
  onChatMessage, onSystemMessage, onReaction,
  onSeekSong,             // ✅ ADD THIS
  offRoomState, offUsersUpdated, offPlaySong, offPauseSong, offResumeSong, offQueueUpdated,
  offChatMessage, offSystemMessage, offReaction,
  offSeekSong,            // ✅ ADD THIS
} from '../socket';

const getProxyUrl = (url) =>
  `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/api/audio?url=${encodeURIComponent(url)}`;

const selectBestAudioUrl = (song) => {
  if (!song?.downloadUrl || !Array.isArray(song.downloadUrl)) return null;
  const qualityPreference = ['320kbps', '192kbps', '128kbps', '96kbps', '64kbps'];
  for (const quality of qualityPreference) {
    const urlObj = song.downloadUrl.find(d => d.quality === quality && d.url);
    if (urlObj?.url) return { url: urlObj.url, quality };
  }
  if (song.downloadUrl[0]?.url) return { url: song.downloadUrl[0].url, quality: song.downloadUrl[0].quality };
  return null;
};

function UsernameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const submit = (e) => { e.preventDefault(); const t = name.trim(); if (!t) return; onSubmit(t); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '24px', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '380px', background: 'rgba(19,19,30,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', backdropFilter: 'blur(24px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👋</div>
          <h2 style={{ fontFamily: "'Syne',system-ui,sans-serif", fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>What's your name?</h2>
          <p style={{ fontSize: '13px', color: '#6b6a84' }}>So your friends know who's listening</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text" autoFocus placeholder="Enter your name"
            value={name} onChange={e => setName(e.target.value)} maxLength={24}
            style={{ padding: '13px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f1f0ff', fontSize: '15px', outline: 'none', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
          <button type="submit" disabled={!name.trim()}
            style={{ padding: '13px', borderRadius: '12px', border: 'none', background: name.trim() ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 600, fontSize: '15px', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >Join Room</button>
        </form>
      </div>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [userId] = useState(() => `user_${Date.now()}`);
  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(true);
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [rightTab, setRightTab] = useState('chat');
  const [incomingReaction, setIncomingReaction] = useState(null);
  const [panelWidth, setPanelWidth] = useState(280);

  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  const soundRef = useRef(null);
  const currentSongIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pausePositionRef = useRef(0);
  const loadTimeoutRef = useRef(null);
  const roomIdRef = useRef(roomId);

  const shouldBePausedRef = useRef(false);
  const pendingSeekRef = useRef(null);

  // ✅ NEW: tracks if we are currently playing (for seek-while-playing logic)
  const isPlayingRef = useRef(false);

  const handleNameSubmit = (name) => { setUserName(name); setShowNameModal(false); };

  const startResize = (e) => {
    isResizing.current = true;
    resizeStartX.current = e.clientX;
    resizeStartW.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (e) => {
      if (!isResizing.current) return;
      const delta = resizeStartX.current - e.clientX;
      setPanelWidth(Math.min(480, Math.max(260, resizeStartW.current + delta)));
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleExitRoom = () => {
    if (soundRef.current) {
      try { soundRef.current.stop(); soundRef.current.unload(); soundRef.current = null; } catch (e) {}
    }
    leaveRoom();
    navigate('/');
  };

  const getAudioNode = () => {
    try {
      return soundRef.current?._sounds?.[0]?._node || null;
    } catch (_) { return null; }
  };

  const forcePause = (seekTo) => {
    shouldBePausedRef.current = true;
    isPlayingRef.current = false;

    if (typeof seekTo === 'number' && seekTo >= 0) {
      pausePositionRef.current = seekTo;
      pendingSeekRef.current = seekTo;
    }

    try {
      if (soundRef.current?.playing()) soundRef.current.pause();
    } catch (_) {}

    const node = getAudioNode();
    if (node) {
      try { node.pause(); } catch (_) {}
      if (typeof seekTo === 'number' && seekTo >= 0) {
        try { node.currentTime = seekTo; } catch (_) {}
      }
    }

    setIsPlaying(false);
  };

  const forcePlay = (seekTo) => {
    shouldBePausedRef.current = false;
    isPlayingRef.current = true;
    pendingSeekRef.current = null;

    if (typeof seekTo === 'number' && seekTo >= 0) {
      pausePositionRef.current = seekTo;
    }

    const s = soundRef.current;
    if (!s) return;

    try {
      if (typeof seekTo === 'number' && seekTo >= 0) {
        try { s.seek(seekTo); } catch (_) {}
        const node = getAudioNode();
        if (node) { try { node.currentTime = seekTo; } catch (_) {} }
      }

      if (s.state() === 'loaded') {
        if (!s.playing()) s.play();
        setIsPlaying(true);
      } else {
        s.play();
      }
    } catch (e) {
      console.error('forcePlay error:', e);
    }
  };

  // ✅ NEW: forceSeek — seeks without changing play/pause state
  // Used when receiving remote seek events
  const forceSeek = (timestamp) => {
    pausePositionRef.current = timestamp;

    const s = soundRef.current;
    const node = getAudioNode();

    // Seek the raw HTML5 node first — most reliable
    if (node) {
      try { node.currentTime = timestamp; } catch (_) {}
    }
    // Also seek via Howler for its internal state tracking
    if (s) {
      try { s.seek(timestamp); } catch (_) {}
    }

    // If room was playing, resume from new position
    if (isPlayingRef.current) {
      if (node) { try { node.play(); } catch (_) {} }
      else if (s && !s.playing()) { try { s.play(); } catch (_) {} }
      setIsPlaying(true);
    }
  };

  const playSong = (song, url, emit = true, retryCount = 0, seekTo = 0, startPaused = false) => {
    if (!url) { showToast('No playable URL found', 'error'); return; }

    pausePositionRef.current = seekTo;
    shouldBePausedRef.current = startPaused;
    isPlayingRef.current = !startPaused;
    pendingSeekRef.current = seekTo > 0 ? seekTo : null;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }

    setIsLoading(true);
    setIsPlaying(false);
    currentSongIdRef.current = song.id;

    if (soundRef.current) {
      try { soundRef.current.stop(); soundRef.current.unload(); } catch (e) {}
      soundRef.current = null;
    }

    const proxyUrl = getProxyUrl(url);
    const newSound = new Howl({
      src: [proxyUrl],
      html5: true,
      volume: 1,
      preload: true,
      format: ['mp3', 'mpeg'],
      xhr: { timeout: 30000, method: 'GET' },

      onload: () => {
        if (signal.aborted || currentSongIdRef.current !== song.id) {
          newSound.stop(); newSound.unload(); return;
        }
        if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
        setIsLoading(false);

        if (shouldBePausedRef.current) {
          const node = newSound._sounds?.[0]?._node;
          if (node) {
            try { node.pause(); } catch (_) {}
            if (pendingSeekRef.current !== null) {
              try { node.currentTime = pendingSeekRef.current; } catch (_) {}
            }
          }
          try {
            if (pendingSeekRef.current !== null) newSound.seek(pendingSeekRef.current);
          } catch (_) {}
          pendingSeekRef.current = null;
          setIsPlaying(false);
        } else {
          if (pendingSeekRef.current !== null) {
            try { newSound.seek(pendingSeekRef.current); } catch (_) {}
            pendingSeekRef.current = null;
          }
          try { newSound.play(); } catch (e) { setIsLoading(false); }
        }
      },

      onplay: () => {
        if (currentSongIdRef.current !== song.id) return;

        if (shouldBePausedRef.current) {
          try { newSound.pause(); } catch (_) {}
          const node = newSound._sounds?.[0]?._node;
          if (node) {
            try { node.pause(); } catch (_) {}
            if (pendingSeekRef.current !== null) {
              try { node.currentTime = pendingSeekRef.current; } catch (_) {}
            }
          }
          pendingSeekRef.current = null;
          setIsPlaying(false);
          setIsLoading(false);
          return;
        }

        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsLoading(false);
      },

      onpause: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
      },
      onstop: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
      },

      onend: () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        emitSongEnded(roomIdRef.current);
      },

      onloaderror: (id, err) => {
        if (currentSongIdRef.current === song.id && !signal.aborted) {
          const errorMsg = String(err || '').toLowerCase();
          if ((errorMsg.includes('codec') || errorMsg.includes('format')) && retryCount < 1) {
            setTimeout(() => {
              if (currentSongIdRef.current === song.id)
                playSong(song, url, false, retryCount + 1, seekTo, startPaused);
            }, 500);
            return;
          }
          showToast('Could not load audio. Try another song.', 'error');
          setIsLoading(false); setIsPlaying(false);
        }
      },

      onplayerror: () => {
        showToast('Could not play audio', 'error');
        setIsLoading(false); setIsPlaying(false);
      },
    });

    soundRef.current = newSound;
    setSound(newSound);
    setCurrentSong(song);

    loadTimeoutRef.current = setTimeout(() => {
      if (soundRef.current === newSound && currentSongIdRef.current === song.id) {
        setIsLoading(false);
        if (!shouldBePausedRef.current) {
          try { newSound.play(); } catch (_) {}
        }
      }
    }, 6000);

    if (emit) emitPlaySong(roomId, song, url, 0);
  };

  useEffect(() => {
    if (!userName) return;
    const socket = getSocket();
    socket.connect();
    joinRoom(roomId, userId, userName);

    onRoomState(({ users, chatHistory, queue, currentSong, currentUrl, isPlaying, timestamp }) => {
      setUsers(users);
      setChatMessages((chatHistory || []).map(msg => ({ ...msg, type: 'chat' })));
      setQueue(queue || []);
      if (currentSong && currentUrl) {
        playSong(currentSong, currentUrl, false, 0, timestamp || 0, !isPlaying);
      }
    });

    onUsersUpdated((updatedUsers) => setUsers([...updatedUsers]));

    onPlaySong(({ songData, playUrl, timestamp }) => {
      playSong(songData, playUrl, false, 0, timestamp || 0, false);
    });

    onPauseSong(({ timestamp }) => {
      console.log('⏸ Received pause at:', timestamp);
      forcePause(timestamp);
    });

    onResumeSong(({ timestamp }) => {
      console.log('▶ Received resume at:', timestamp);
      forcePlay(timestamp);
    });

    // ✅ THE FIX: wire up seek-song from remote users
    onSeekSong(({ timestamp }) => {
      console.log('⏩ Received seek at:', timestamp);
      forceSeek(timestamp);
    });

    onChatMessage(msg => setChatMessages(p => [...p, { ...msg, type: 'chat' }]));
    onSystemMessage(msg => setChatMessages(p => [...p, { ...msg, type: 'system' }]));
    onQueueUpdated((updatedQueue) => setQueue([...updatedQueue]));
    onReaction(({ userName: fromName, emoji, id }) => {
      setIncomingReaction({ userName: fromName, emoji, id });
    });

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      leaveRoom();
      offRoomState(); offUsersUpdated(); offPlaySong(); offPauseSong();
      offResumeSong(); offQueueUpdated(); offChatMessage(); offSystemMessage();
      offReaction();
      offSeekSong(); // ✅ cleanup
      if (soundRef.current) {
        try { soundRef.current.stop(); soundRef.current.unload(); soundRef.current = null; } catch (e) {}
      }
    };
  }, [userName]);

  const handlePlaySong = (song) => {
    const audioUrlObj = selectBestAudioUrl(song);
    if (!audioUrlObj) { showToast('No audio available for this song', 'error'); return; }
    playSong(song, audioUrlObj.url, true, 0, 0, false);
  };

  const handleAddToQueue = (song) => {
    emitAddToQueue(roomId, song);
    showToast(`Added to queue 🎵`, 'success');
    setRightTab('queue');
    if (!chatOpen) setChatOpen(true);
  };

  const handleRemoveFromQueue = (index) => emitRemoveFromQueue(roomId, index);
  const handlePlayFromQueue = (index) => emitPlayFromQueue(roomId, index);
  const handleNewChatMessage = (msg) => setChatMessages(p => [...p, msg]);

  const handlePlayPause = () => {
    if (!soundRef.current || isLoading) return;
    try {
      const node = getAudioNode();
      const actuallyPlaying = node ? !node.paused : soundRef.current.playing();

      if (actuallyPlaying) {
        const currentPos = node ? node.currentTime : (soundRef.current.seek() || 0);
        pausePositionRef.current = currentPos;
        forcePause(currentPos);
        emitPauseSong(roomId, currentPos);
      } else {
        const resumePos = pausePositionRef.current || 0;
        forcePlay(resumePos);
        emitResumeSong(roomId, resumePos);
      }
    } catch (e) {
      setIsPlaying(false);
      showToast('Error controlling playback', 'error');
    }
  };

  // ✅ NEW: called by Player when user drags and releases the seek bar
  const handleSeek = (newTime) => {
    if (!soundRef.current) return;

    pausePositionRef.current = newTime;

    // Seek locally first — instant feedback
    const node = getAudioNode();
    if (node) { try { node.currentTime = newTime; } catch (_) {} }
    try { soundRef.current.seek(newTime); } catch (_) {}

    // If was playing, keep playing from new position
    if (isPlayingRef.current) {
      if (node) { try { node.play().catch(() => {}); } catch (_) {} }
      else if (!soundRef.current.playing()) {
        try { soundRef.current.play(); } catch (_) {}
      }
      setIsPlaying(true);
    }

    // Broadcast to all other users in the room
    emitSeekSong(roomId, newTime);
  };

  const handleReaction = (emoji) => emitReaction(roomId, userName, emoji);

  const handleShare = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my SyncTune room!', url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Room link copied! 🔗', 'success');
      }
    } catch {
      showToast('Room ID: ' + roomId, 'success');
    }
  };

  return (
    <>
      {showNameModal && <UsernameModal onSubmit={handleNameSubmit} />}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', fontFamily: "'DM Sans',system-ui,sans-serif", overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', height: '52px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(13,13,20,0.8)', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </div>
            <span style={{ fontFamily: "'Syne',system-ui,sans-serif", fontWeight: 700, fontSize: '16px', color: 'white' }}>
              Sync<span style={{ background: 'linear-gradient(135deg,#a78bfa,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tune</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#8b8aa8', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{roomId}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>

            <button onClick={handleExitRoom}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.1)', color: '#ff6b6b', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,80,80,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,80,80,0.1)'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Exit
            </button>
          </div>
        </div>

        {/* Main area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', overflow: 'hidden', minWidth: 0 }}>
            <SearchBar onResultsFound={setSongs} />
            <SongList songs={songs} currentSong={currentSong} onSongSelect={handlePlaySong} onAddToQueue={handleAddToQueue} />
          </div>

          <div style={{ width: chatOpen ? `${panelWidth}px` : '0px', display: 'flex', flexDirection: 'column', borderLeft: chatOpen ? '1px solid rgba(255,255,255,0.05)' : 'none', overflow: 'hidden', transition: isResizing.current ? 'none' : 'width 0.2s ease', flexShrink: 0, position: 'relative' }}>

            {chatOpen && (
              <div onMouseDown={startResize}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', zIndex: 20, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(167,139,250,0.5)' }} />)}
                </div>
              </div>
            )}

            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div onClick={() => setUsersOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b6a84', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Users ({users.length})</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: usersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {usersOpen && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {users.map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `hsl(${(u.name?.charCodeAt(0) || 0) * 42 % 360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: '13px', color: '#c4c3de', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                      {u.name === userName && <span style={{ fontSize: '10px', color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '1px 6px', borderRadius: '99px', flexShrink: 0 }}>you</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <button onClick={() => setRightTab('chat')} style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', color: rightTab === 'chat' ? '#a78bfa' : '#55546a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderBottom: rightTab === 'chat' ? '2px solid #a78bfa' : '2px solid transparent' }}>
                💬 Chat
              </button>
              <button onClick={() => setRightTab('queue')} style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', color: rightTab === 'queue' ? '#a78bfa' : '#55546a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderBottom: rightTab === 'queue' ? '2px solid #a78bfa' : '2px solid transparent' }}>
                🎵 Queue {queue.length > 0 && <span style={{ background: '#7c3aed', color: 'white', fontSize: '10px', borderRadius: '99px', padding: '1px 6px', marginLeft: '4px' }}>{queue.length}</span>}
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: rightTab === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                <Chat roomId={roomId} userName={userName} messages={chatMessages} onNewMessage={handleNewChatMessage} />
              </div>
              <div style={{ display: rightTab === 'queue' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                <Queue queue={queue} currentSong={currentSong} onRemove={handleRemoveFromQueue} onPlayNext={handlePlayFromQueue} />
              </div>
            </div>
          </div>
        </div>

        <div onClick={() => setChatOpen(p => !p)}
          style={{ position: 'fixed', right: chatOpen ? `${panelWidth}px` : '0px', top: '50%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '72px', background: chatOpen ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.06)', border: chatOpen ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.08)', borderRight: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', transition: 'right 0.2s ease', backdropFilter: 'blur(12px)' }}
          onMouseEnter={e => { e.currentTarget.style.background = chatOpen ? 'rgba(124,58,237,0.28)' : 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = chatOpen ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.06)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={chatOpen ? '#a78bfa' : '#6b6a84'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <Player
          currentSong={currentSong}
          isPlaying={isPlaying}
          isLoading={isLoading}
          onPlay={handlePlayPause}
          onSeek={handleSeek}          
          sound={sound}
          onNext={() => emitPlayFromQueue(roomId, 0)}
          hasNext={queue.length > 0}
          onReaction={handleReaction}
          incomingReaction={incomingReaction}
        />
      </div>
    </>
  );
}