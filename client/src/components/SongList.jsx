import { useState } from 'react';

export default function SongList({ songs = [], currentSong, onSongSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  const fmt = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  };

  if (!songs.length) {
    return (
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:'12px', color:'#55546a', padding:'40px 0'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}>
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <p style={{fontSize:'14px'}}>Search for songs to start</p>
      </div>
    );
  }

  return (
    <div style={{overflowY:'auto', flex:1}}>
      {songs.map((song, idx) => {
        const isActive = currentSong?.id === song.id;
        const isHovered = hoveredId === song.id;
        const img = song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url;
        const artist = song.primaryArtists || song.artists?.primary?.map(a=>a.name).join(', ') || 'Unknown';

        return (
          <div
            key={song.id}
            onClick={() => onSongSelect(song)}
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
    </div>
  );
}