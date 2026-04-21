import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';

const BACKEND = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const VIBES = [
  { id: 'dreamy',  label: '🌙 Dreamy',  gradient: 'linear-gradient(135deg,#1a1a3e,#2d1b69)' },
  { id: 'warm',    label: '💜 Warm',    gradient: 'linear-gradient(135deg,#2d1b69,#831843)' },
  { id: 'intense', label: '🔥 Intense', gradient: 'linear-gradient(135deg,#450a0a,#7c2d12)' },
  { id: 'sweet',   label: '🌸 Sweet',   gradient: 'linear-gradient(135deg,#500724,#831843)' },
];

/* ─── Waveform bars (static decorative) ─── */
function WaveformBars({ count = 60, accent, playProgress, cropStart, cropEnd, duration }) {
  const bars = Array.from({ length: count }, (_, i) => {
    const pct    = i / count;
    const inCrop = duration > 0
      ? pct >= (cropStart / duration) && pct <= (cropEnd / duration)
      : true;
    const isPlayed = duration > 0 && pct <= (playProgress / duration);

    const seed = Math.sin(i * 7.3 + i * 0.4) * 0.5 + 0.5;
    const h    = 18 + seed * 28;

    let color;
    if (inCrop && isPlayed) color = accent;
    else if (inCrop)        color = `${accent}88`;
    else                    color = 'rgba(255,255,255,0.12)';

    return { h, color };
  });

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'48px', width:'100%' }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${b.h}px`,
            borderRadius: '2px',
            background: b.color,
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Song Crop Editor ─── */
function SongCropEditor({ song, accent, glow, cropStart, setCropStart, cropEnd, setCropEnd }) {
  const PROXY = `${BACKEND}/api/audio?url=${encodeURIComponent(
    song.downloadUrl?.find(d => d.quality === '320kbps')?.url ||
    song.downloadUrl?.find(d => d.quality === '160kbps')?.url ||
    song.downloadUrl?.[0]?.url || ''
  )}`;

  const audioRef     = useRef(null);
  const timelineRef  = useRef(null);
  const animRef      = useRef(null);
  const dragging     = useRef(null);
  const pauseTimeout = useRef(null);
  const endSecRef    = useRef(null); // resolved after metadata loads

  const [duration,    setDuration]    = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [loaded,      setLoaded]      = useState(false);
  const [hoverPct,    setHoverPct]    = useState(null);

  /* ── Load audio ── */
  useEffect(() => {
    const audio = new Audio(PROXY);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration;
      setDuration(dur);

      // Set cropEnd to full duration only if it hasn't been set yet
      if (cropEnd === 0) {
        setCropEnd(dur);
        endSecRef.current = dur;
      } else {
        endSecRef.current = Math.min(cropEnd, dur);
      }
      setLoaded(true);
    });

    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(pauseTimeout.current);
      audio.pause();
      audio.src = '';
    };
  }, [PROXY]);

  /* ── Sync cropEnd once duration known ── */
  useEffect(() => {
    if (duration > 0 && cropEnd === 0) {
      setCropEnd(duration);
      endSecRef.current = duration;
    }
  }, [duration]);

  /* ── Animation loop ── */
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const cur = audio.currentTime;
    setCurrentTime(cur);
    const end = endSecRef.current ?? cropEnd;
    // Loop within crop range
    if (cur >= end - 0.05) {
      audio.currentTime = cropStart;
    }
    animRef.current = requestAnimationFrame(tick);
  }, [cropStart, cropEnd]);

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, tick]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !loaded) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Always seek to cropStart if outside crop range
      if (audio.currentTime < cropStart || audio.currentTime >= (endSecRef.current ?? cropEnd)) {
        audio.currentTime = cropStart;
      }
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const pauseForDrag = () => {
    clearTimeout(pauseTimeout.current);
    const audio = audioRef.current;
    if (audio && isPlaying) audio.pause();
  };

  const resumeAfterDrag = () => {
    clearTimeout(pauseTimeout.current);
    pauseTimeout.current = setTimeout(() => {
      const audio = audioRef.current;
      if (audio && isPlaying) audio.play().catch(() => {});
    }, 400);
  };

  const getPctFromEvent = (e) => {
    if (!timelineRef.current) return 0;
    const rect    = timelineRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const startDrag = (e, type) => {
    e.preventDefault();
    dragging.current = type;
    pauseForDrag();

    const move = (ev) => {
      const pct = getPctFromEvent(ev);
      const t   = pct * duration;
      if (type === 'start') {
        const newStart = Math.max(0, Math.min(t, cropEnd - 2));
        setCropStart(newStart);
        if (audioRef.current) audioRef.current.currentTime = newStart;
        setCurrentTime(newStart);
      } else if (type === 'end') {
        const newEnd = Math.max(cropStart + 2, Math.min(t, duration));
        setCropEnd(newEnd);
        endSecRef.current = newEnd;
      } else if (type === 'playhead') {
        const clamp = Math.max(cropStart, Math.min(t, cropEnd));
        if (audioRef.current) audioRef.current.currentTime = clamp;
        setCurrentTime(clamp);
      }
    };

    const up = () => {
      dragging.current = null;
      resumeAfterDrag();
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  const handleTimelineClick = (e) => {
    if (dragging.current) return;
    const pct     = getPctFromEvent(e);
    const t       = pct * duration;
    const clamped = Math.max(cropStart, Math.min(t, cropEnd));
    if (audioRef.current) audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const fmt = t => (!t || isNaN(t)) ? '0:00' : `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

  const startPct  = duration > 0 ? (cropStart / duration) * 100 : 0;
  const endPct    = duration > 0 ? (cropEnd / duration) * 100 : 100;
  const playPct   = duration > 0 ? (currentTime / duration) * 100 : 0;
  const cropWidth = endPct - startPct;
  const cropLen   = cropEnd - cropStart;

  return (
    <div style={{ marginTop:'16px' }}>

      {/* Playback header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
        <button
          onClick={togglePlay}
          disabled={!loaded}
          style={{
            width:'36px', height:'36px', borderRadius:'50%', border:'none', flexShrink:0,
            background: loaded ? `linear-gradient(135deg,${accent},${glow})` : 'rgba(255,255,255,0.1)',
            color:'white', cursor: loaded ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: loaded ? `0 0 16px ${glow}66` : 'none',
            transition:'all 0.2s',
          }}
        >
          {!loaded ? (
            <div style={{ width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'cropSpin 0.7s linear infinite' }} />
          ) : isPlaying ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft:'2px' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>

        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:'#f1f0ff', fontWeight:600, fontSize:'13px', margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {song.name}
          </p>
          <p style={{ color:'#55546a', fontSize:'11px', margin:0 }}>{song.primaryArtists}</p>
        </div>

        {/* Crop length badge */}
        <div style={{
          padding:'4px 10px', borderRadius:'99px',
          background:`${accent}18`,
          border:`1px solid ${accent}44`,
          color:accent, fontSize:'11px', fontWeight:700, flexShrink:0,
        }}>
          {fmt(cropLen)}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ position:'relative', userSelect:'none' }}>

        {/* Waveform */}
        <WaveformBars
          count={60}
          accent={accent}
          playProgress={currentTime}
          cropStart={cropStart}
          cropEnd={cropEnd}
          duration={duration}
        />

        {/* Clickable overlay */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          onMouseMove={(e) => {
            const pct = getPctFromEvent(e);
            setHoverPct(pct);
          }}
          onMouseLeave={() => setHoverPct(null)}
          style={{ position:'absolute', inset:0, cursor:'crosshair', zIndex:2 }}
        />

        {/* Crop region highlight */}
        <div style={{
          position:'absolute',
          top:0, bottom:0,
          left:`${startPct}%`,
          width:`${cropWidth}%`,
          background:`${accent}18`,
          borderTop:`2px solid ${accent}88`,
          borderBottom:`2px solid ${accent}88`,
          pointerEvents:'none',
          zIndex:1,
          transition:'left 0.05s, width 0.05s',
        }} />

        {/* Hover ghost line */}
        {hoverPct !== null && (
          <div style={{
            position:'absolute', top:0, bottom:0, zIndex:3, pointerEvents:'none',
            left:`${hoverPct * 100}%`,
            width:'1px',
            background:'rgba(255,255,255,0.25)',
            transform:'translateX(-50%)',
          }} />
        )}

        {/* Playhead */}
        {loaded && (
          <div
            onMouseDown={(e) => startDrag(e, 'playhead')}
            onTouchStart={(e) => startDrag(e, 'playhead')}
            style={{
              position:'absolute', top:'-4px', bottom:'-4px',
              left:`${playPct}%`,
              transform:'translateX(-50%)',
              zIndex:5, cursor:'ew-resize',
            }}
          >
            <div style={{ width:'2px', height:'100%', background:'white', borderRadius:'2px', boxShadow:'0 0 8px rgba(255,255,255,0.8)' }} />
            <div style={{
              position:'absolute', top:'-3px', left:'50%',
              width:'10px', height:'10px',
              background:'white',
              borderRadius:'2px',
              transform:'translateX(-50%) rotate(45deg)',
              boxShadow:'0 0 8px rgba(255,255,255,0.9)',
            }} />
          </div>
        )}

        {/* START handle */}
        {loaded && (
          <div
            onMouseDown={(e) => startDrag(e, 'start')}
            onTouchStart={(e) => startDrag(e, 'start')}
            style={{
              position:'absolute', top:0, bottom:0,
              left:`${startPct}%`,
              transform:'translateX(-50%)',
              zIndex:6, cursor:'ew-resize',
              display:'flex', alignItems:'center',
            }}
          >
            <div style={{
              width:'14px', height:'100%',
              background:accent,
              borderRadius:'4px 0 0 4px',
              opacity:0.9,
              boxShadow:`0 0 12px ${accent}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div style={{ width:'2px', height:'16px', background:'rgba(255,255,255,0.7)', borderRadius:'2px' }} />
            </div>
            <div style={{
              position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)',
              marginBottom:'5px', background:accent, color:'white',
              fontSize:'9px', fontWeight:700, padding:'2px 6px',
              borderRadius:'4px', whiteSpace:'nowrap',
              boxShadow:`0 2px 8px ${accent}88`,
            }}>
              {fmt(cropStart)}
            </div>
          </div>
        )}

        {/* END handle */}
        {loaded && (
          <div
            onMouseDown={(e) => startDrag(e, 'end')}
            onTouchStart={(e) => startDrag(e, 'end')}
            style={{
              position:'absolute', top:0, bottom:0,
              left:`${endPct}%`,
              transform:'translateX(-50%)',
              zIndex:6, cursor:'ew-resize',
              display:'flex', alignItems:'center',
            }}
          >
            <div style={{
              width:'14px', height:'100%',
              background:accent,
              borderRadius:'0 4px 4px 0',
              opacity:0.9,
              boxShadow:`0 0 12px ${accent}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div style={{ width:'2px', height:'16px', background:'rgba(255,255,255,0.7)', borderRadius:'2px' }} />
            </div>
            <div style={{
              position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)',
              marginBottom:'5px', background:accent, color:'white',
              fontSize:'9px', fontWeight:700, padding:'2px 6px',
              borderRadius:'4px', whiteSpace:'nowrap',
              boxShadow:`0 2px 8px ${accent}88`,
            }}>
              {fmt(cropEnd)}
            </div>
          </div>
        )}

      </div>

      {/* Time labels row */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px' }}>
        <span style={{ fontSize:'10px', color:'#55546a', fontFamily:'monospace' }}>{fmt(0)}</span>
        <span style={{ fontSize:'10px', color:'#6b6a84', fontFamily:'monospace' }}>
          {isPlaying ? `▶ ${fmt(currentTime)}` : fmt(currentTime)}
        </span>
        <span style={{ fontSize:'10px', color:'#55546a', fontFamily:'monospace' }}>{fmt(duration)}</span>
      </div>

      <p style={{ color:'#3d3c52', fontSize:'11px', textAlign:'center', margin:'10px 0 0' }}>
        Drag <span style={{ color:accent }}>▌handles▐</span> to set start & end · gift will loop this clip
      </p>

      <style>{`@keyframes cropSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════ */
export default function ForYouCreate() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [photo,        setPhoto]        = useState(null);
  const [photoName,    setPhotoName]    = useState('');
  const [query,        setQuery]        = useState('');
  const [songs,        setSongs]        = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [message,      setMessage]      = useState('');
  const [from,         setFrom]         = useState('');
  const [vibe,         setVibe]         = useState('dreamy');
  const [creating,     setCreating]     = useState(false);
  const [createdUrl,   setCreatedUrl]   = useState(null);
  const [urlCopied,    setUrlCopied]    = useState(false);

  const [cropStart, setCropStart] = useState(0);
  const [cropEnd,   setCropEnd]   = useState(0);

  // Reset crop when song changes
  useEffect(() => {
    setCropStart(0);
    setCropEnd(0);
  }, [selectedSong]);

  const copyCreatedUrl = () => {
    navigator.clipboard.writeText(createdUrl).then(() => {
      setUrlCopied(true);
      showToast('Link copied! 🔗', 'success');
      setTimeout(() => setUrlCopied(false), 2500);
    });
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo too large (max 5MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPhoto(ev.target.result); setPhotoName(file.name); };
    reader.readAsDataURL(file);
  };

  const searchSongs = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSongs([]);
    try {
      const res  = await fetch(`${BACKEND}/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSongs(data?.data?.results || []);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const decode = (str) => {
    if (!str) return '';
    const t = document.createElement('textarea');
    t.innerHTML = str;
    return t.value;
  };

  const handleCreate = async () => {
    if (!photo)          { showToast('Please upload a photo', 'error');   return; }
    if (!selectedSong)   { showToast('Please select a song', 'error');    return; }
    if (!message.trim()) { showToast('Please write a message', 'error');  return; }
    if (!from.trim())    { showToast('Please enter your name', 'error');  return; }

    setCreating(true);
    try {
      // Always prefer highest quality URL
      const audioUrl =
        selectedSong.downloadUrl?.find(d => d.quality === '320kbps')?.url ||
        selectedSong.downloadUrl?.find(d => d.quality === '160kbps')?.url ||
        selectedSong.downloadUrl?.[0]?.url;

      const payload = {
        photo,
        song: {
          id:          selectedSong.id,
          name:        decode(selectedSong.name),
          artist:      decode(
            selectedSong.primaryArtists ||
            selectedSong.artists?.primary?.map(a => a.name).join(', ') ||
            'Unknown'
          ),
          image:
            selectedSong.image?.[2]?.url ||
            selectedSong.image?.[1]?.url ||
            selectedSong.image?.[0]?.url,
          audioUrl,
          downloadUrl: selectedSong.downloadUrl,
          cropStart:   cropStart,
          cropEnd:     cropEnd > 0 ? cropEnd : null,
        },
        message: message.trim(),
        from:    from.trim(),
        vibe,
      };

      const res  = await fetch(`${BACKEND}/api/gift/create`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.giftId) {
        showToast('Gift created! 🎉', 'success');
        const giftUrl = `${window.location.origin}/for-you/${data.giftId}`;
        setCreatedUrl(giftUrl);
      } else {
        throw new Error('No giftId');
      }
    } catch {
      showToast('Failed to create gift', 'error');
    } finally {
      setCreating(false);
    }
  };

  const ACCENT = '#a78bfa';
  const GLOW   = '#7c3aed';

  return (
    <>
      <div style={{ minHeight:'100vh', background:'#0d0d14', fontFamily:"'DM Sans',system-ui,sans-serif", padding:'24px 16px', overflowY:'auto' }}>
        <div style={{ maxWidth:'520px', margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>💝</div>
            <h1 style={{ fontFamily:"'Syne',system-ui,sans-serif", fontSize:'28px', fontWeight:800, color:'white', margin:0 }}>
              Create a <span style={{ background:'linear-gradient(135deg,#a78bfa,#f472b6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>For You</span>
            </h1>
            <p style={{ color:'#6b6a84', fontSize:'14px', marginTop:'8px' }}>A personal gift with a song, photo & message</p>
          </div>

          {/* Step 1 — Photo */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', fontWeight:700, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 14px' }}>📸 Photo</p>
            {photo ? (
              <div style={{ position:'relative', textAlign:'center' }}>
                <img src={photo} alt="preview" style={{ maxHeight:'200px', maxWidth:'100%', borderRadius:'12px', objectFit:'cover', border:'2px solid rgba(167,139,250,0.3)' }} />
                <button
                  onClick={() => { setPhoto(null); setPhotoName(''); }}
                  style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(0,0,0,0.6)', border:'none', borderRadius:'50%', width:'28px', height:'28px', color:'white', cursor:'pointer', fontSize:'14px' }}
                >✕</button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:'2px dashed rgba(167,139,250,0.3)', borderRadius:'12px', padding:'32px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(167,139,250,0.6)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(167,139,250,0.3)'}
              >
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>📸</div>
                <p style={{ color:'#a78bfa', fontWeight:600, margin:'0 0 4px' }}>Upload Photo</p>
                <p style={{ color:'#55546a', fontSize:'12px', margin:0 }}>JPG, PNG — max 5MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handlePhoto} />
          </div>

          {/* Step 2 — Song */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', fontWeight:700, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 14px' }}>🎵 Song</p>
            {selectedSong ? (
              <>
                {/* Selected song header */}
                <div style={{ display:'flex', alignItems:'center', gap:'12px', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:'12px', padding:'12px', marginBottom:'4px' }}>
                  <img src={selectedSong.image?.[1]?.url} alt="" style={{ width:'44px', height:'44px', borderRadius:'8px', objectFit:'cover', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#a78bfa', fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'14px' }}>{decode(selectedSong.name)}</p>
                    <p style={{ color:'#55546a', fontSize:'12px', margin:0 }}>{decode(selectedSong.primaryArtists)}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedSong(null); setSongs([]); setQuery(''); setCropStart(0); setCropEnd(0); }}
                    style={{ background:'none', border:'none', color:'#55546a', cursor:'pointer', fontSize:'18px', flexShrink:0 }}
                  >✕</button>
                </div>

                {/* ── CROP EDITOR ── */}
                <div style={{
                  marginTop:'12px',
                  background:'rgba(0,0,0,0.3)',
                  border:'1px solid rgba(167,139,250,0.15)',
                  borderRadius:'12px',
                  padding:'14px 14px 10px',
                }}>
                  <p style={{ fontSize:'11px', fontWeight:700, color:'#6b6a84', letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 4px', display:'flex', alignItems:'center', gap:'6px' }}>
                    ✂️ Trim Clip
                    <span style={{ fontWeight:400, letterSpacing:0, textTransform:'none', color:'#3d3c52', fontSize:'10px' }}>— pick the moment you want them to hear</span>
                  </p>
                  <SongCropEditor
                    song={selectedSong}
                    accent={ACCENT}
                    glow={GLOW}
                    cropStart={cropStart}
                    setCropStart={setCropStart}
                    cropEnd={cropEnd}
                    setCropEnd={setCropEnd}
                  />
                </div>
              </>
            ) : (
              <>
                <form onSubmit={searchSongs} style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search a song..."
                    style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#f1f0ff', fontSize:'14px', outline:'none', fontFamily:'inherit' }}
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    style={{ padding:'10px 16px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', fontWeight:600, cursor:'pointer', fontSize:'13px', flexShrink:0 }}
                  >
                    {searching ? '...' : 'Search'}
                  </button>
                </form>
                {songs.length > 0 && (
                  <div style={{ maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'4px' }}>
                    {songs.slice(0, 8).map((song) => (
                      <div
                        key={song.id}
                        onClick={() => { setSelectedSong(song); setSongs([]); }}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', borderRadius:'8px', cursor:'pointer', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <img src={song.image?.[0]?.url} alt="" style={{ width:'36px', height:'36px', borderRadius:'6px', objectFit:'cover', flexShrink:0 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:'#f1f0ff', fontSize:'13px', fontWeight:500, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{decode(song.name)}</p>
                          <p style={{ color:'#55546a', fontSize:'11px', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{decode(song.primaryArtists)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3 — Message */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', fontWeight:700, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 14px' }}>💌 Message</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write something special... 'This song reminded me of you...'"
              maxLength={300}
              rows={4}
              style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#f1f0ff', fontSize:'14px', outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.6, boxSizing:'border-box' }}
            />
            <p style={{ color:'#3d3c52', fontSize:'11px', textAlign:'right', margin:'4px 0 0' }}>{message.length}/300</p>
          </div>

          {/* Step 4 — From */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
            <p style={{ fontSize:'12px', fontWeight:700, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 14px' }}>👤 From</p>
            <input
              value={from}
              onChange={e => setFrom(e.target.value)}
              placeholder="Your name"
              maxLength={30}
              style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#f1f0ff', fontSize:'14px', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {/* Step 5 — Vibe */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'24px' }}>
            <p style={{ fontSize:'12px', fontWeight:700, color:'#6b6a84', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 14px' }}>🎨 Vibe</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px' }}>
              {VIBES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVibe(v.id)}
                  style={{ padding:'12px', borderRadius:'10px', border: vibe===v.id ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)', background: vibe===v.id ? 'rgba(167,139,250,0.12)' : 'transparent', color: vibe===v.id ? '#a78bfa' : '#6b6a84', fontWeight:600, fontSize:'13px', cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit' }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background: creating ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg,#7c3aed,#db2777)', color:'white', fontWeight:700, fontSize:'16px', cursor: creating ? 'not-allowed' : 'pointer', boxShadow: creating ? 'none' : '0 4px 24px rgba(124,58,237,0.4)', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'all 0.2s' }}
          >
            {creating ? (
              <><div style={{ width:'18px', height:'18px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /> Creating...</>
            ) : (
              <>✨ Create & Share</>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        </div>
      </div>

      {/* ── SHARE MODAL ── */}
      {createdUrl && (
        <div style={{
          position:'fixed', inset:0, zIndex:999,
          background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'24px',
        }}>
          <div style={{
            background:'#1a1a2e', border:'1px solid rgba(167,139,250,0.3)',
            borderRadius:'24px', padding:'32px', maxWidth:'420px', width:'100%',
            boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>🎉</div>
              <h2 style={{ color:'#fff', fontFamily:"'Syne',system-ui,sans-serif", fontSize:'22px', fontWeight:800, margin:'0 0 8px' }}>
                Gift Created!
              </h2>
              <p style={{ color:'#6b6a84', fontSize:'14px', margin:0 }}>
                Share this link with the special person 💝
              </p>
            </div>

            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              <div style={{
                flex:1, padding:'12px 14px',
                background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:'12px', color:'rgba(255,255,255,0.6)',
                fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>
                {createdUrl}
              </div>
              <button
                onClick={copyCreatedUrl}
                style={{
                  padding:'12px 20px', borderRadius:'12px', border:'none', flexShrink:0,
                  background: urlCopied ? 'rgba(52,211,153,0.25)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
                  color: urlCopied ? '#34d399' : 'white',
                  fontWeight:700, fontSize:'14px', cursor:'pointer', fontFamily:'inherit',
                  transition:'all 0.2s',
                }}
              >
                {urlCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button
                onClick={() => navigate(createdUrl.replace(window.location.origin, ''))}
                style={{
                  flex:1, padding:'12px', borderRadius:'12px', border:'1px solid rgba(167,139,250,0.3)',
                  background:'transparent', color:'#a78bfa',
                  fontWeight:600, fontSize:'14px', cursor:'pointer', fontFamily:'inherit',
                }}
              >
                Preview Gift 👁
              </button>
              <button
                onClick={() => {
                  setCreatedUrl(null);
                  setPhoto(null); setPhotoName('');
                  setSelectedSong(null);
                  setMessage(''); setFrom('');
                  setVibe('dreamy');
                  setQuery(''); setSongs([]);
                  setCropStart(0); setCropEnd(0);
                }}
                style={{
                  flex:1, padding:'12px', borderRadius:'12px', border:'none',
                  background:'linear-gradient(135deg,#7c3aed,#db2777)',
                  color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer', fontFamily:'inherit',
                }}
              >
                Make Another 💝
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}