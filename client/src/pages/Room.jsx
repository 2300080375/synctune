import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Howl } from 'howler';
import SearchBar from '../components/SearchBar';
import SongList from '../components/SongList';
import Player from '../components/Player';
import Chat from '../components/Chat';
import { showToast } from '../components/Toast';
import {
  getSocket, joinRoom, leaveRoom,
  emitPlaySong, emitPauseSong, emitResumeSong,
  onRoomState, onUsersUpdated, onPlaySong, onPauseSong, onResumeSong,
  offRoomState, offUsersUpdated, offPlaySong, offPauseSong, offResumeSong
} from '../socket';

const getProxyUrl = (url) => `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/api/audio?url=${encodeURIComponent(url)}`;

// Enhanced URL quality selection with fallback logic
const selectBestAudioUrl = (song) => {
  if (!song?.downloadUrl || !Array.isArray(song.downloadUrl)) {
    return null;
  }
  
  // Quality preference order: highest quality first
  const qualityPreference = ['320kbps', '192kbps', '128kbps', '96kbps', '64kbps'];
  
  for (const quality of qualityPreference) {
    const urlObj = song.downloadUrl.find(d => d.quality === quality && d.url);
    if (urlObj?.url) {
      console.log(`✅ Selected quality: ${quality}`);
      return { url: urlObj.url, quality };
    }
  }
  
  // Fallback: use first available URL with a URL
  if (song.downloadUrl[0]?.url) {
    console.log(`⚠️ Using first available URL with quality: ${song.downloadUrl[0].quality}`);
    return { url: song.downloadUrl[0].url, quality: song.downloadUrl[0].quality };
  }
  
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
            style={{
              padding:'13px 16px', background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px',
              color:'#f1f0ff', fontSize:'15px', outline:'none', fontFamily:'inherit',
              transition:'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor='rgba(167,139,250,0.5)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
          />
          <button
            type="submit" disabled={!name.trim()}
            style={{
              padding:'13px', borderRadius:'12px', border:'none',
              background: name.trim() ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.08)',
              color:'white', fontWeight:600, fontSize:'15px',
              cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit',
              boxShadow: name.trim() ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
              transition:'background 0.2s, box-shadow 0.2s'
            }}
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
  
  // Refs for managing sound lifecycle and preventing race conditions
  const soundRef = useRef(null);
  const currentSongIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pausePositionRef = useRef(0); // Track pause position for resume
  const loadTimeoutRef = useRef(null); // Track load timeout for cleanup

  const handleNameSubmit = (name) => { setUserName(name); setShowNameModal(false); };

  useEffect(() => {
    if (!userName) return;
    const socket = getSocket();
    socket.connect();
    joinRoom(roomId, userId, userName);
    onRoomState(({ users }) => setUsers(users));
    onUsersUpdated(setUsers);
    onPlaySong(({ songData, playUrl }) => playSong(songData, playUrl, false));
    onPauseSong(() => {
      // This is for OTHER users in the room pausing
      // Don't do anything locally if we're not the one who initiated it
      console.log('📢 Pause event from room');
    });
    onResumeSong(() => {
      // This is for OTHER users in the room resuming
      // Don't do anything locally if we're not the one who initiated it
      console.log('📢 Resume event from room');
    });
    return () => {
      // Cancel any pending song load
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear any pending load timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      leaveRoom();
      offRoomState();
      offUsersUpdated();
      offPlaySong();
      offPauseSong();
      offResumeSong();
      
      if (soundRef.current) {
        try {
          soundRef.current.stop();
          soundRef.current.unload();
          soundRef.current = null;
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
    };
  }, [userName]);

  const playSong = (song, url, emit = true, retryCount = 0) => {
    if (!url) {
      showToast('No playable URL found', 'error');
      return;
    }
    
    // Reset pause position for new song
    pausePositionRef.current = 0;
    
    // Cancel any previous pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Clear any pending load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    // Update UI to show loading state
    setIsLoading(true);
    setIsPlaying(false);
    currentSongIdRef.current = song.id;
    
    // Cleanup previous sound BEFORE creating new one
    if (soundRef.current) {
      try {
        soundRef.current.stop();
        soundRef.current.unload();
      } catch (e) {
        console.error('Cleanup error:', e);
      }
      soundRef.current = null;
    }
    
    const proxyUrl = getProxyUrl(url);
    console.log(`🎵 Loading song: ${song.name} (Attempt ${retryCount + 1})`);
    
    // Create new Howl instance with enhanced codec handling
    const newSound = new Howl({
      src: [proxyUrl],
      html5: true,
      volume: 1,
      preload: 'metadata', // Load metadata immediately, stream audio on play
      format: ['mp3', 'mpeg'], // Explicitly declare formats
      xhr: {
        timeout: 30000, // 30 second timeout
        method: 'GET'
      },
      onload: () => {
        // Only proceed if this is still the active song
        if (signal.aborted || currentSongIdRef.current !== song.id) {
          newSound.stop();
          newSound.unload();
          return;
        }
        
        // Clear the fallback timeout since onload fired
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        
        console.log(`✅ Song loaded successfully: ${song.name}`);
        setIsLoading(false);
        
        // Auto-play after successful load
        try {
          newSound.play();
        } catch (e) {
          console.error('Auto-play failed:', e);
          setIsLoading(false);
        }
      },
      onplay: () => {
        if (currentSongIdRef.current === song.id) {
          console.log('▶️ Song playing:', song.name);
          setIsPlaying(true);
          setIsLoading(false);
        }
      },
      onpause: () => {
        console.log('⏸️ Song paused');
        setIsPlaying(false);
      },
      onend: () => {
        console.log('⏹️ Song ended');
        setIsPlaying(false);
      },
      onstop: () => {
        console.log('🛑 Song stopped');
        setIsPlaying(false);
      },
      onloaderror: (id, err) => {
        // Only show error if this is still the active song AND not aborted
        if (currentSongIdRef.current === song.id && !signal.aborted) {
          console.error('❌ Audio Load Error:', err);
          
          const errorMsg = String(err || 'unknown error').toLowerCase();
          const isCodecError = errorMsg.includes('codec') || errorMsg.includes('format');
          
          // If it's a codec error and we haven't retried, try again with different settings
          if (isCodecError && retryCount < 1) {
            console.warn('⚠️ Codec error detected, retrying with fallback settings...');
            setTimeout(() => {
              if (currentSongIdRef.current === song.id) {
                playSong(song, url, false, retryCount + 1);
              }
            }, 500);
            return;
          }
          
          // Only show error if we're already loading (not a retry scenario)
          if (isLoading) {
            showToast(`Could not load audio. Try another song.`, 'error');
            setIsLoading(false);
            setIsPlaying(false);
          }
        }
      },
      onplayerror: (id, err) => {
        console.error('❌ Play Error:', err);
        if (currentSongIdRef.current === song.id && isLoading) {
          showToast('Could not play audio', 'error');
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
    });
    
    // Store the new sound
    soundRef.current = newSound;
    setSound(newSound);
    setCurrentSong(song);
    
    // Clear any previous timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    // Fallback: If onload doesn't fire within 5 seconds, try playing anyway
    loadTimeoutRef.current = setTimeout(() => {
      if (soundRef.current === newSound && currentSongIdRef.current === song.id && isLoading) {
        console.warn('⚠️ onload did not fire within 5s, attempting to play anyway...');
        try {
          if (newSound.state() === 'loaded' || newSound.state() === 'loading') {
            newSound.play();
            setIsLoading(false);
          }
        } catch (e) {
          console.error('Fallback play failed:', e);
        }
      }
    }, 5000);
    
    if (emit) {
      emitPlaySong(roomId, song, url, 0);
    }
  };

  const handlePlaySong = (song) => {
    const audioUrlObj = selectBestAudioUrl(song);
    
    if (!audioUrlObj) {
      showToast('No audio available for this song', 'error');
      console.error('No valid download URL found for song:', song);
      return;
    }
    
    console.log(`Playing ${song.name} at ${audioUrlObj.quality}`);
    playSong(song, audioUrlObj.url, true);
  };

  const handlePlayPause = () => {
    if (!soundRef.current || isLoading) {
      console.log('⚠️ Cannot toggle play/pause - sound not ready or loading');
      return;
    }
    
    try {
      const isCurrentlyPlaying = soundRef.current.playing();
      
      if (isCurrentlyPlaying) {
        // PAUSE - directly pause the Howl instance
        console.log(`⏸️ Pausing at: ${soundRef.current.seek().toFixed(2)}s`);
        pausePositionRef.current = soundRef.current.seek() || 0;
        soundRef.current.pause();
        setIsPlaying(false);
        
        // Notify other users in the room
        const seekPos = pausePositionRef.current;
        emitPauseSong(roomId, seekPos);
        
      } else {
        // RESUME - directly resume from the paused position
        console.log(`▶️ Resuming from: ${pausePositionRef.current.toFixed(2)}s`);
        
        // Make absolutely sure we're at the right position
        const resumePos = pausePositionRef.current || 0;
        if (Math.abs(soundRef.current.seek() - resumePos) > 1.0) {
          console.log(`🔄 Correcting seek position: ${soundRef.current.seek().toFixed(2)}s → ${resumePos.toFixed(2)}s`);
          soundRef.current.seek(resumePos);
        }
        
        soundRef.current.play();
        setIsPlaying(true);
        
        // Notify other users in the room
        emitResumeSong(roomId, resumePos);
      }
    } catch (e) {
      console.error('❌ Play/Pause error:', e);
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
          </div>
        </div>

        {/* Main area */}
        <div style={{display:'flex', flex:1, overflow:'hidden'}}>

          {/* Left: search + song list */}
          <div style={{flex:1, display:'flex', flexDirection:'column', padding:'16px', overflow:'hidden', minWidth:0}}>
            <SearchBar onResultsFound={setSongs} />
            <SongList songs={songs} currentSong={currentSong} onSongSelect={handlePlaySong} />
          </div>

          {/* Right panel */}
          <div style={{width: chatOpen ? '300px' : '200px', display:'flex', flexDirection:'column', borderLeft:'1px solid rgba(255,255,255,0.05)', overflow:'hidden', transition:'width 0.2s ease', flexShrink:0}}>

            {/* Users */}
            <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0}}>
              <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span style={{fontSize:'12px', fontWeight:600, color:'#6b6a84', letterSpacing:'0.05em', textTransform:'uppercase'}}>Users ({users.length})</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
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
            </div>

            {/* Chat */}
            {chatOpen && (
              <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
                <Chat roomId={roomId} userName={userName} />
              </div>
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
        />
      </div>
    </>
  );
}