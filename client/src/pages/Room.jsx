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
  onRoomState, onUsersUpdated, onPlaySong, onPauseSong, onResumeSong, onQueueUpdated,
  offRoomState, offUsersUpdated, offPlaySong, offPauseSong, offResumeSong, offQueueUpdated
} from '../socket';

const getProxyUrl = (url) => `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/api/audio?url=${encodeURIComponent(url)}`;

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
  const submit = (e) => {
    e.preventDefault();
    const t = name.trim();
    if (!t) return;
    onSubmit(t);
  };
  return (
    <div style={{position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', padding:'24px', fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{width:'100%', maxWidth:'380px', background:'rgba(19,19,30,0.95)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'28px', backdropFilter:'blur(24px)'}}>
        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <div style={{fontSize:'32px', marginBottom:'12px'}}>👋</div>
          <h2 style={{fontFamily:"'Syne',system-ui,sans-serif", fontSize:'20px', fontWeight:700, color:'white', marginBottom:'6px'}}>What's your name?</h2>
          <p style={{fontSize:'13px', color:'#6b6a84'}}>So your friends know who's listening</p>
        </div>
        <form onSubmit={submit} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          <input
            type="text" autoFocus placeholder="Enter your name"
            value={name} onChange={e => setName(e.target.value)} maxLength={24}
            style={{padding:'13px 16px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', color:'#f1f0ff', fontSize:'15px', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s'}}
            onFocus={e => e.target.style.borderColor='rgba(167,139,250,0.5)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
          />
          <button
            type="submit" disabled={!name.trim()}
            style={{padding:'13px', borderRadius:'12px', border:'none', background: name.trim() ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.08)', color:'white', fontWeight:600, fontSize:'15px', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit', boxShadow: name.trim() ? '0 4px 20px rgba(124,58,237,0.4)' : 'none', transition:'background 0.2s, box-shadow 0.2s'}}
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // ✅ FIX: Persist userId & userName in sessionStorage so page refresh doesn't reset them
  const [userId] = useState(() => {
    const existing = sessionStorage.getItem('userId');
    if (existing) return existing;
    const newId = `user_${Date.now()}`;
    sessionStorage.setItem('userId', newId);
    return newId;
  });

  const [userName, setUserName] = useState(() => sessionStorage.getItem('userName') || '');
  const [showNameModal, setShowNameModal] = useState(() => !sessionStorage.getItem('userName'));

  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [rightTab, setRightTab] = useState('chat'); // 'chat' | 'queue'

  const soundRef = useRef(null);
  const currentSongIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pausePositionRef = useRef(0);
  const loadTimeoutRef = useRef(null);
  const roomIdRef = useRef(roomId);

  // ✅ FIX: Save userName to sessionStorage when set
  const handleNameSubmit = (name) => {
    sessionStorage.setItem('userName', name);
    setUserName(name);
    setShowNameModal(false);
  };

  const handleExitRoom = () => {
    // ✅ FIX: Clear session on intentional exit so next visit asks for name again
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userId');
    if (soundRef.current) {
      try { soundRef.current.stop(); soundRef.current.unload(); soundRef.current = null; } catch (e) {}
    }
    leaveRoom();
    navigate('/');
  };

  useEffect(() => {
    if (!userName) return;
    const socket = getSocket();
    socket.connect();
    joinRoom(roomId, userId, userName);

    onRoomState(({ users, chatHistory, queue }) => {
      setUsers(users);
      setChatHistory(chatHistory || []);
      setQueue(queue || []);
    });

    onUsersUpdated((updatedUsers) => setUsers([...updatedUsers]));
    onPlaySong(({ songData, playUrl }) => playSong(songData, playUrl, false));
    onPauseSong(() => console.log('📢 Pause event from room'));
    onResumeSong(() => console.log('📢 Resume event from room'));

    // ✅ Queue updates from server
    onQueueUpdated((updatedQueue) => setQueue([...updatedQueue]));

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      leaveRoom();
      offRoomState();
      offUsersUpdated();
      offPlaySong();
      offPauseSong();
      offResumeSong();
      offQueueUpdated();
      if (soundRef.current) {
        try { soundRef.current.stop(); soundRef.current.unload(); soundRef.current = null; } catch (e) {}
      }
    };
  }, [userName]);

  const playSong = (song, url, emit = true, retryCount = 0) => {
    if (!url) { showToast('No playable URL found', 'error'); return; }
    pausePositionRef.current = 0;
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
      preload: 'metadata',
      format: ['mp3', 'mpeg'],
      xhr: { timeout: 30000, method: 'GET' },
      onload: () => {
        if (signal.aborted || currentSongIdRef.current !== song.id) { newSound.stop(); newSound.unload(); return; }
        if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
        setIsLoading(false);
        try { newSound.play(); } catch (e) { setIsLoading(false); }
      },
      onplay: () => { if (currentSongIdRef.current === song.id) { setIsPlaying(true); setIsLoading(false); } },
      onpause: () => setIsPlaying(false),
      onend: () => {
        setIsPlaying(false);
        // ✅ Song ended — tell server to play next from queue
        emitSongEnded(roomIdRef.current);
      },
      onstop: () => setIsPlaying(false),
      onloaderror: (id, err) => {
        if (currentSongIdRef.current === song.id && !signal.aborted) {
          const errorMsg = String(err || '').toLowerCase();
          const isCodecError = errorMsg.includes('codec') || errorMsg.includes('format');
          if (isCodecError && retryCount < 1) {
            setTimeout(() => { if (currentSongIdRef.current === song.id) playSong(song, url, false, retryCount + 1); }, 500);
            return;
          }
          showToast('Could not load audio. Try another song.', 'error');
          setIsLoading(false);
          setIsPlaying(false);
        }
      },
      onplayerror: () => { showToast('Could not play audio', 'error'); setIsLoading(false); setIsPlaying(false); }
    });
    soundRef.current = newSound;
    setSound(newSound);
    setCurrentSong(song);
    loadTimeoutRef.current = setTimeout(() => {
      if (soundRef.current === newSound && currentSongIdRef.current === song.id) {
        try {
          if (newSound.state() === 'loaded' || newSound.state() === 'loading') {
            newSound.play(); setIsLoading(false);
          }
        } catch (e) {}
      }
    }, 5000);
    if (emit) emitPlaySong(roomId, song, url, 0);
  };

  const handlePlaySong = (song) => {
    const audioUrlObj = selectBestAudioUrl(song);
    if (!audioUrlObj) { showToast('No audio available for this song', 'error'); return; }
    playSong(song, audioUrlObj.url, true);
  };

  // ✅ Add to queue
  const handleAddToQueue = (song) => {
    emitAddToQueue(roomId, song);
    showToast(`Added "${song.name}" to queue`, 'success');
    // Switch to queue tab so user can see it
    setRightTab('queue');
    if (!chatOpen) setChatOpen(true);
  };

  // ✅ Remove from queue
  const handleRemoveFromQueue = (index) => {
    emitRemoveFromQueue(roomId, index);
  };

  // ✅ Play specific song from queue
  const handlePlayFromQueue = (index) => {
    emitPlayFromQueue(roomId, index);
  };

  const handlePlayPause = () => {
    if (!soundRef.current || isLoading) return;
    try {
      const isCurrentlyPlaying = soundRef.current.playing();
      if (isCurrentlyPlaying) {
        pausePositionRef.current = soundRef.current.seek() || 0;
        soundRef.current.pause();
        setIsPlaying(false);
        emitPauseSong(roomId, pausePositionRef.current);
      } else {
        const resumePos = pausePositionRef.current || 0;
        if (Math.abs(soundRef.current.seek() - resumePos) > 1.0) soundRef.current.seek(resumePos);
        soundRef.current.play();
        setIsPlaying(true);
        emitResumeSong(roomId, resumePos);
      }
    } catch (e) {
      setIsPlaying(false);
      showToast('Error controlling playback', 'error');
    }
  };

  return (
    <>
      {showNameModal && <UsernameModal onSubmit={handleNameSubmit} />}

      <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#0d0d14', fontFamily:"'DM Sans',system-ui,sans-serif", overflow:'hidden'}}>

        {/* Top bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:'52px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0, background:'rgba(13,13,20,0.8)', backdropFilter:'blur(20px)'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#7c3aed,#db2777)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <span style={{fontFamily:"'Syne',system-ui,sans-serif", fontWeight:700, fontSize:'16px', color:'white'}}>Sync<span style={{background:'linear-gradient(135deg,#a78bfa,#f472b6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>Tune</span></span>
          </div>

          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'6px', padding:'4px 10px', background:'rgba(255,255,255,0.04)', borderRadius:'99px', border:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{width:'6px', height:'6px', borderRadius:'50%', background:'#34d399'}} />
              <span style={{fontSize:'12px', color:'#8b8aa8', fontFamily:'monospace', letterSpacing:'0.05em'}}>{roomId}</span>
            </div>

            <button
              onClick={() => setChatOpen(p => !p)}
              style={{background:'none', border:'none', cursor:'pointer', padding:'6px', color: chatOpen ? '#a78bfa' : '#55546a', display:'flex', alignItems:'center', justifyContent:'center', transition:'color 0.2s'}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>

            <button
              onClick={handleExitRoom}
              style={{display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(255,80,80,0.3)', background:'rgba(255,80,80,0.1)', color:'#ff6b6b', cursor:'pointer', fontSize:'12px', fontWeight:600, transition:'all 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,80,80,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,80,80,0.1)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Exit
            </button>
          </div>
        </div>

        {/* Main area */}
        <div style={{display:'flex', flex:1, overflow:'hidden'}}>

          {/* Left: search + song list */}
          <div style={{flex:1, display:'flex', flexDirection:'column', padding:'16px', overflow:'hidden', minWidth:0}}>
            <SearchBar onResultsFound={setSongs} />
            <SongList
              songs={songs}
              currentSong={currentSong}
              onSongSelect={handlePlaySong}
              onAddToQueue={handleAddToQueue}
            />
          </div>

          {/* Right panel */}
          <div style={{width: chatOpen ? '300px' : '60px', display:'flex', flexDirection:'column', borderLeft:'1px solid rgba(255,255,255,0.05)', overflow:'hidden', transition:'width 0.2s ease', flexShrink:0}}>

            {/* Users Dropdown */}
            <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0}}>
              <div
                onClick={() => setUsersOpen(p => !p)}
                style={{display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none'}}
              >
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style={{fontSize:'12px', fontWeight:600, color:'#6b6a84', letterSpacing:'0.05em', textTransform:'uppercase'}}>Users ({users.length})</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{transform: usersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s', flexShrink:0}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {usersOpen && (
                <div style={{marginTop:'10px', display:'flex', flexDirection:'column', gap:'6px'}}>
                  {users.map((u, i) => (
                    <div key={i} style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <div style={{width:'28px', height:'28px', borderRadius:'50%', background:`hsl(${(u.name?.charCodeAt(0) || 0) * 42 % 360},60%,55%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', flexShrink:0}}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{fontSize:'13px', color:'#c4c3de', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.name}</span>
                      {u.name === userName && <span style={{fontSize:'10px', color:'#7c3aed', background:'rgba(124,58,237,0.1)', padding:'1px 6px', borderRadius:'99px', flexShrink:0}}>you</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ Chat / Queue Tabs */}
            {chatOpen && (
              <>
                <div style={{display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0}}>
                  <button
                    onClick={() => setRightTab('chat')}
                    style={{flex:1, padding:'10px', border:'none', background:'transparent', color: rightTab === 'chat' ? '#a78bfa' : '#55546a', fontSize:'12px', fontWeight:600, cursor:'pointer', borderBottom: rightTab === 'chat' ? '2px solid #a78bfa' : '2px solid transparent', transition:'all 0.2s'}}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => setRightTab('queue')}
                    style={{flex:1, padding:'10px', border:'none', background:'transparent', color: rightTab === 'queue' ? '#a78bfa' : '#55546a', fontSize:'12px', fontWeight:600, cursor:'pointer', borderBottom: rightTab === 'queue' ? '2px solid #a78bfa' : '2px solid transparent', transition:'all 0.2s', position:'relative'}}
                  >
                    🎵 Queue {queue.length > 0 && <span style={{background:'#7c3aed', color:'white', fontSize:'10px', borderRadius:'99px', padding:'1px 6px', marginLeft:'4px'}}>{queue.length}</span>}
                  </button>
                </div>

                <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
                  {rightTab === 'chat' ? (
                    <Chat roomId={roomId} userName={userName} chatHistory={chatHistory} />
                  ) : (
                    <Queue
                      queue={queue}
                      currentSong={currentSong}
                      onRemove={handleRemoveFromQueue}
                      onPlayNext={handlePlayFromQueue}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Player */}
        <Player
          currentSong={currentSong}
          isPlaying={isPlaying}
          isLoading={isLoading}
          onPlay={handlePlayPause}
          sound={sound}
          onNext={() => emitPlayFromQueue(roomId, 0)}
          hasNext={queue.length > 0}
        />
      </div>
    </>
  );
}