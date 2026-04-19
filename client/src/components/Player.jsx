import { useEffect, useState, useRef } from 'react';

const fmt = (t) => {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t/60), s = Math.floor(t%60);
  return `${m}:${s.toString().padStart(2,'0')}`;
};

export default function Player({ currentSong, isPlaying, isLoading, onPlay, sound, onNext, hasNext }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const progressUpdateRef = useRef(null);

  useEffect(() => {
    if (!sound) return;
    const updateProgress = () => {
      try {
        if (sound && !isSeeking) {
          const currentTime = sound.seek() || 0;
          const dur = sound.duration() || 0;
          setProgress(currentTime);
          setDuration(dur);
        }
      } catch (e) {}
    };
    if (isPlaying) {
      progressUpdateRef.current = setInterval(updateProgress, 100);
    }
    return () => { if (progressUpdateRef.current) clearInterval(progressUpdateRef.current); };
  }, [sound, isPlaying, isSeeking]);

  useEffect(() => {
    if (!sound) return;
    try {
      const dur = sound.duration() || 0;
      if (dur > 0) setDuration(dur);
    } catch {}
  }, [sound, currentSong]);

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (sound && !isLoading) {
      try { sound.seek(newTime); setProgress(newTime); } catch (e) {}
    }
  };

  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekEnd = (e) => { setIsSeeking(false); handleSeek(e); };

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (sound) { try { sound.volume(v); } catch (e) {} }
  };

  const pct = duration && duration > 0 ? (progress / duration) * 100 : 0;
  const img = currentSong?.image?.[2]?.url || currentSong?.image?.[1]?.url;

  return (
    <div style={{background:'rgba(13,13,20,0.95)', borderTop:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(24px)', padding:'12px 20px 14px', flexShrink:0}}>
      
      {/* Progress */}
      <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
        <span style={{fontSize:'11px', color:'#55546a', fontFamily:'monospace', width:'34px', textAlign:'right', flexShrink:0}}>{fmt(progress)}</span>
        <div style={{flex:1, position:'relative', height:'8px', background:'rgba(255,255,255,0.08)', borderRadius:'99px', cursor:'pointer', padding:'0 2px'}}>
          <div style={{position:'absolute', left:0, top:0, height:'100%', borderRadius:'99px', width:`${pct}%`, background:'linear-gradient(90deg,#7c3aed,#a855f7)', transition: isSeeking ? 'none' : 'width 0.1s linear'}} />
          <input
            type="range" min="0" max={duration || 0} step="0.1" value={progress}
            onChange={handleSeek} onMouseDown={handleSeekStart} onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd}
            disabled={isLoading || !sound}
            style={{position:'absolute', inset:0, width:'100%', height:'100%', cursor:'pointer', zIndex:10, appearance:'slider-horizontal'}}
          />
        </div>
        <span style={{fontSize:'11px', color:'#55546a', fontFamily:'monospace', width:'34px', flexShrink:0}}>{fmt(duration)}</span>
      </div>

      {/* Controls row */}
      <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
        
        {/* Song info */}
        <div style={{display:'flex', alignItems:'center', gap:'12px', flex:1, minWidth:0}}>
          <div style={{width:'40px', height:'40px', borderRadius:'8px', overflow:'hidden', background:'rgba(255,255,255,0.05)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
            {img ? <img src={img} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} /> :
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            }
          </div>
          <div style={{minWidth:0}}>
            <p style={{fontSize:'13px', fontWeight:600, color:'#f1f0ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {currentSong?.name || 'No song selected'}
            </p>
            <p style={{fontSize:'11px', color:'#55546a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'1px'}}>
              {currentSong?.primaryArtists || 'Select a song'}
            </p>
          </div>
        </div>

        {/* Playback controls */}
        <div style={{display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
          
          {/* Previous — disabled */}
          <button
            style={{background:'none', border:'none', cursor:'not-allowed', padding:'6px', opacity:0.2, color:'#8b8aa8'}}
            disabled
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onPlay}
            disabled={isLoading || !currentSong}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              width:'42px', height:'42px', borderRadius:'50%', border:'none',
              cursor: (isLoading || !currentSong) ? 'not-allowed' : 'pointer',
              background: (isLoading || !currentSong) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: (isLoading || !currentSong) ? 'none' : '0 0 20px rgba(124,58,237,0.5)',
              transition:'transform 0.15s, box-shadow 0.15s', color:'white'
            }}
            onMouseEnter={e => { if (!isLoading && currentSong) { e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 0 28px rgba(124,58,237,0.65)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=(isLoading || !currentSong)?'none':'0 0 20px rgba(124,58,237,0.5)'; }}
          >
            {isLoading ? (
              <div style={{width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite'}} />
            ) : isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:'2px'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
          </button>

          {/* ✅ Next Track Button */}
          <button
            onClick={onNext}
            disabled={!hasNext}
            title={hasNext ? 'Next track' : 'Queue is empty'}
            style={{
              background:'none', border:'none', padding:'6px',
              cursor: hasNext ? 'pointer' : 'not-allowed',
              opacity: hasNext ? 1 : 0.2,
              color: hasNext ? '#a78bfa' : '#8b8aa8',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'color 0.2s, transform 0.15s'
            }}
            onMouseEnter={e => { if (hasNext) e.currentTarget.style.transform='scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div style={{display:'flex', alignItems:'center', gap:'8px', width:'120px', flexShrink:0}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>}
            {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>}
          </svg>
          <div style={{flex:1, position:'relative'}}>
            <div style={{position:'absolute', top:'50%', left:0, height:'3px', borderRadius:'99px', background:'rgba(255,255,255,0.08)', width:'100%', transform:'translateY(-50%)'}} />
            <div style={{position:'absolute', top:'50%', left:0, height:'3px', borderRadius:'99px', background:'linear-gradient(90deg,#7c3aed,#a855f7)', width:`${volume*100}%`, transform:'translateY(-50%)'}} />
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume}
              style={{position:'relative', zIndex:1, opacity:0, cursor:'pointer', width:'100%'}} />
          </div>
        </div>
      </div>
    </div>
  );
}