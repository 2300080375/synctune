import { useState, useEffect, useRef } from 'react';

export default function SongList({ songs = [], currentSong, onSongSelect, onAddToQueue }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, song }
  const menuRef = useRef(null);

  const fmt = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e, song) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  const handleAddToQueue = () => {
    if (contextMenu?.song) {
      onAddToQueue(contextMenu.song);
      setContextMenu(null);
    }
  };

  const handlePlayNow = () => {
    if (contextMenu?.song) {
      onSongSelect(contextMenu.song);
      setContextMenu(null);
    }
  };

  if (!songs.length) {
    return (
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:'12px', color:'#55546a', padding:'40px 0'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}>
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <p style={{fontSize:'14px'}}>Search for songs to start</p>
        <p style={{fontSize:'12px', color:'#3d3c52'}}>Right click a song to add to queue</p>
      </div>
    );
  }

  return (
    <div style={{overflowY:'auto', flex:1, position:'relative'}}>
      {songs.map((song, idx) => {
        const isActive = currentSong?.id === song.id;
        const isHovered = hoveredId === song.id;
        const img = song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url;
        const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown';

        return (
          <div
            key={song.id}
            onClick={() => onSongSelect(song)}
            onContextMenu={(e) => handleContextMenu(e, song)}
            onMouseEnter={() => setHoveredId(song.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="fade-up"
            style={{
              display:'flex', alignItems:'center', gap:'12px', padding:'10px',
              borderRadius:'10px', cursor:'pointer', marginBottom:'2px',
              background: isActive ? 'rgba(167,139,250,0.1)' : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: isActive ? '1px solid rgba(167,139,250,0.2)' : '1px solid transparent',
              transition:'background 0.15s, border-color 0.15s',
              animationDelay: `${idx * 0.03}s`
            }}
          >
            {/* Artwork */}
            <div style={{position:'relative', width:'44px', height:'44px', flexShrink:0, borderRadius:'8px', overflow:'hidden', background:'rgba(255,255,255,0.05)'}}>
              {img ? (
                <img src={img} alt={song.name} style={{width:'100%', height:'100%', objectFit:'cover'}} onError={e => e.target.style.display='none'} />
              ) : (
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#55546a'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
              )}
              {isActive && (
                <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', gap:'3px'}}>
                  <span className="eq-bar" />
                  <span className="eq-bar" />
                  <span className="eq-bar" />
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:'14px', fontWeight:500, color: isActive ? '#a78bfa' : '#f1f0ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{song.name}</p>
              <p style={{fontSize:'12px', color:'#55546a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'2px'}}>{artist}</p>
            </div>

            {/* Duration */}
            <span style={{fontSize:'12px', color:'#55546a', fontVariantNumeric:'tabular-nums', fontFamily:'monospace', flexShrink:0}}>{fmt(song.duration)}</span>
          </div>
        );
      })}

      {/* ✅ Right Click Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          style={{
            position:'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex:1000,
            background:'rgba(22,22,35,0.98)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:'12px',
            padding:'6px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter:'blur(20px)',
            minWidth:'180px'
          }}
        >
          {/* Song info */}
          <div style={{padding:'8px 10px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:'4px'}}>
            <p style={{fontSize:'12px', fontWeight:600, color:'#f1f0ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{contextMenu.song.name}</p>
            <p style={{fontSize:'11px', color:'#55546a', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {contextMenu.song.primaryArtists || 'Unknown'}
            </p>
          </div>

          {/* Play Now */}
          <button
            onClick={handlePlayNow}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:'10px',
              padding:'9px 10px', borderRadius:'8px', border:'none',
              background:'transparent', color:'#f1f0ff', cursor:'pointer',
              fontSize:'13px', textAlign:'left', transition:'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Play Now
          </button>

          {/* Add to Queue */}
          <button
            onClick={handleAddToQueue}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:'10px',
              padding:'9px 10px', borderRadius:'8px', border:'none',
              background:'transparent', color:'#a78bfa', cursor:'pointer',
              fontSize:'13px', textAlign:'left', transition:'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(167,139,250,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Add to Queue
          </button>
        </div>
      )}
    </div>
  );
}